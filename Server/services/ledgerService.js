const crypto = require("crypto");
const PurchaseTransaction = require("../models/PurchaseTransaction");

/**
 * Generates an auditable, collision-resistant transaction ID
 * Example format: TXN-1731146400000-A1B2C3
 */
function generateTransactionId() {
  const timestamp = Date.now();
  const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `TXN-${timestamp}-${randomHex}`;
}

/**
 * Creates a new purchase transaction in the unified ledger.
 *
 * @param {Object} params
 * @param {String} [params.transactionId] - Optional explicit ID, otherwise generated automatically
 * @param {String} [params.orderId] - Internal or gateway order reference
 * @param {mongoose.Types.ObjectId|String} params.studentId - Student User ID
 * @param {mongoose.Types.ObjectId|String} params.itemId - Item ID
 * @param {String} params.itemModel - "AiPlan" | "Quiz" | "PracticeQuiz" | "ExamSeries" | "FlashcardSet"
 * @param {String} params.itemTitleSnapshot - Human-readable item title
 * @param {String} params.productCategory - "ai_plan" | "exam" | "practice" | "exam_series" | "flashcard"
 * @param {Number} params.amount - Price actually charged
 * @param {String} [params.currency="INR"] - Currency code
 * @param {Number} [params.originalPriceSnapshot=0] - Original sticker price
 * @param {Number} [params.discountSnapshot=0] - Discount amount
 * @param {String} params.gateway - "razorpay" | "phonepe" | "admin_grant" | "manual" | "free_checkout" | "none"
 * @param {String} [params.gatewayTxnId] - Gateway-provided transaction reference
 * @param {String} [params.paymentStatus="paid"] - "initiated" | "pending" | "paid" | "failed" | "cancelled" | "refunded"
 * @param {String} params.provenance - "verified_payment" | "admin_grant" | "dev_simulation" | "free_access" | "legacy_import" | "manual"
 * @param {String} [params.paymentVerificationStatus="unverified"] - "unverified" | "verified" | "simulated" | "admin_authorized" | "not_applicable"
 * @param {Date} [params.paymentTimestamp] - Timestamp of confirmed payment
 * @param {mongoose.Types.ObjectId|String} [params.subscriptionId] - Associated Subscription doc ID (for AI plans)
 * @param {mongoose.Types.ObjectId|String} [params.grantedBy] - Admin who authorized access (for admin_grant)
 * @param {String} [params.adminNotes] - Notes or reason for grant/manual action
 * @param {Object} [params.metadata] - Extra audit details (e.g. client IP, plan metadata)
 * @returns {Promise<PurchaseTransaction>}
 */
async function recordTransaction(params) {
  const {
    transactionId = generateTransactionId(),
    orderId,
    studentId,
    itemId,
    itemModel,
    itemTitleSnapshot,
    productCategory,
    amount = 0,
    currency = "INR",
    originalPriceSnapshot = 0,
    discountSnapshot = 0,
    gateway = "none",
    gatewayTxnId = null,
    paymentStatus = "paid",
    provenance,
    paymentVerificationStatus = "unverified",
    paymentTimestamp = new Date(),
    subscriptionId = null,
    grantedBy = null,
    adminNotes = "",
    metadata = {}
  } = params;

  // 1. Idempotency Check by Subscription ID (prevent double-entry for same subscription)
  if (subscriptionId) {
    const existing = await PurchaseTransaction.findOne({ subscriptionId });
    if (existing) {
      return existing;
    }
  }

  // 2. Gateway Transaction Replay Prevention
  if (gatewayTxnId && typeof gatewayTxnId === "string" && gatewayTxnId.trim() !== "") {
    const cleanGatewayTxn = gatewayTxnId.trim();
    const duplicate = await PurchaseTransaction.findOne({
      gatewayTxnId: cleanGatewayTxn,
      gateway: { $ne: "admin_grant" } // Admin grants might have null/generated placeholder IDs
    });

    if (duplicate) {
      const error = new Error(`Transaction with gateway reference '${cleanGatewayTxn}' has already been processed.`);
      error.code = "DUPLICATE_GATEWAY_TRANSACTION";
      error.existingTransactionId = duplicate.transactionId;
      throw error;
    }
  }

  // 3. Create canonical ledger record
  const transaction = new PurchaseTransaction({
    transactionId,
    orderId: orderId || transactionId,
    studentId,
    itemId,
    itemModel,
    itemTitleSnapshot,
    productCategory,
    amount: Number(amount) || 0,
    currency,
    originalPriceSnapshot: Number(originalPriceSnapshot) || Number(amount) || 0,
    discountSnapshot: Number(discountSnapshot) || 0,
    gateway,
    gatewayTxnId: gatewayTxnId ? gatewayTxnId.trim() : undefined,
    paymentStatus,
    paymentVerificationStatus,
    paymentTimestamp: paymentStatus === "paid" ? paymentTimestamp : null,
    provenance,
    status: paymentStatus,
    subscriptionId,
    grantedBy,
    adminNotes,
    metadata,
    statusHistory: [
      {
        status: paymentStatus,
        changedAt: new Date(),
        changedBy: grantedBy,
        note: `Initial transaction recording with provenance: ${provenance}`
      }
    ]
  });

  await transaction.save();
  return transaction;
}

/**
 * Updates transaction status with audit trail and immutability controls.
 * Prevents non-superadmin users from arbitrarily modifying amounts or past statuses.
 */
async function transitionTransactionStatus(transactionId, newStatus, changedByUser, note = "") {
  const transaction = await PurchaseTransaction.findOne({ transactionId });
  if (!transaction) {
    throw new Error(`Transaction '${transactionId}' not found.`);
  }

  // Enforce valid transitions
  const validTransitions = {
    initiated: ["pending", "paid", "failed", "cancelled"],
    pending: ["paid", "failed", "cancelled"],
    paid: ["refunded"],
    failed: [],
    cancelled: [],
    refunded: []
  };

  const allowedNext = validTransitions[transaction.status] || [];
  if (!allowedNext.includes(newStatus)) {
    throw new Error(`Invalid status transition from '${transaction.status}' to '${newStatus}'.`);
  }

  transaction.recordStatusChange(newStatus, changedByUser?._id || null, note);
  await transaction.save();
  return transaction;
}

module.exports = {
  generateTransactionId,
  recordTransaction,
  transitionTransactionStatus
};
