const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const Subscription = require("../models/Subscription");
const PurchaseTransaction = require("../models/PurchaseTransaction");
const User = require("../models/User");
const AiPlan = require("../models/AiPlan");

/**
 * Executes a safe, idempotent migration of legacy AI subscriptions to the Unified Purchase Transaction Ledger.
 *
 * Rules:
 * - Idempotent: checks for existing transaction by `subscriptionId` or `orderId` before inserting.
 * - Honest Provenance: Distinguishes 'admin_grant', 'dev_simulation', 'free_access', and 'manual'.
 * - Zero Fabrication: Does NOT manufacture fake exam/practice payment records from User.purchasedExams entitlement arrays.
 * - Dry-Run support: inspects without writing to the database.
 *
 * @param {Object} options
 * @param {Boolean} [options.dryRun=false]
 * @returns {Promise<Object>}
 */
async function migrateToUnifiedLedger(options = {}) {
  const dryRun = !!options.dryRun;
  const quiet = !!options.quiet;

  if (!quiet) {
    console.log(`\n============================================================`);
    console.log(`  PREPMARK UNIFIED LEDGER MIGRATION ${dryRun ? "[DRY RUN]" : "[LIVE EXECUTION]"}`);
    console.log(`============================================================\n`);
  }

  const summary = {
    dryRun,
    totalSubscriptions: 0,
    migratedSubscriptions: 0,
    skippedSubscriptions: 0,
    legacyEntitlementsInspected: {
      usersWithPurchasedExams: 0,
      totalPurchasedExamsEntitlements: 0,
      usersWithPurchasedPractice: 0,
      totalPurchasedPracticeEntitlements: 0
    },
    errors: []
  };

  try {
    // 1. Inspect and Migrate Subscription Records
    const subscriptions = await Subscription.find({}).sort({ createdAt: 1 });
    summary.totalSubscriptions = subscriptions.length;
    if (!quiet) console.log(`Found ${subscriptions.length} subscription records to inspect.`);

    for (const sub of subscriptions) {
      try {
        // Idempotency check: see if transaction already exists for this subscription
        const existingTxn = await PurchaseTransaction.findOne({
          $or: [
            { subscriptionId: sub._id },
            { orderId: sub.purchaseId }
          ]
        });

        if (existingTxn) {
          summary.skippedSubscriptions++;
          continue;
        }

        // Determine honest provenance and verification status
        let provenance = "dev_simulation";
        let paymentVerificationStatus = "simulated";
        let gateway = sub.paymentGateway || "phonepe";
        const amount = Number(sub.amount) || 0;

        if (gateway === "admin_grant") {
          provenance = "admin_grant";
          paymentVerificationStatus = "admin_authorized";
        } else if (amount === 0) {
          provenance = "free_access";
          paymentVerificationStatus = "not_applicable";
          gateway = "free_checkout";
        } else if (gateway === "phonepe") {
          provenance = "dev_simulation";
          paymentVerificationStatus = "simulated";
        } else if (gateway === "razorpay") {
          provenance = "verified_payment";
          paymentVerificationStatus = "verified";
        } else if (gateway === "manual") {
          provenance = "manual";
          paymentVerificationStatus = "unverified";
        }

        // Map subscription status to ledger payment status
        let paymentStatus = "paid";
        if (["active", "expired"].includes(sub.status)) {
          paymentStatus = "paid";
        } else if (sub.status === "cancelled") {
          paymentStatus = "cancelled";
        } else if (sub.status === "refunded") {
          paymentStatus = "refunded";
        } else if (sub.status === "pending_payment") {
          paymentStatus = "pending";
        }

        const transactionId = `TXN-MIG-${sub._id.toString()}`;
        const itemTitle = sub.planNameSnapshot || "AI Subscription Plan";

        const ledgerDoc = {
          transactionId,
          orderId: sub.purchaseId || `LEGACY-${sub._id}`,
          studentId: sub.studentId,
          itemId: sub.planId,
          itemModel: "AiPlan",
          itemTitleSnapshot: itemTitle,
          productCategory: "ai_plan",
          amount: provenance === "admin_grant" ? 0 : amount,
          currency: sub.currency || "INR",
          originalPriceSnapshot: amount,
          discountSnapshot: provenance === "admin_grant" ? amount : 0,
          gateway,
          gatewayTxnId: sub.gatewayTxnId || undefined,
          paymentStatus,
          paymentVerificationStatus,
          paymentTimestamp: sub.startDate || sub.createdAt || new Date(),
          provenance,
          status: paymentStatus,
          subscriptionId: sub._id,
          metadata: {
            migratedFromSubscriptionId: sub._id,
            migratedAt: new Date(),
            originalStatus: sub.status,
            maxAITests: sub.maxAITests,
            aiTestsUsed: sub.aiTestsUsed
          },
          statusHistory: [
            {
              status: paymentStatus,
              changedAt: sub.createdAt || new Date(),
              note: `Migrated from legacy Subscription (${sub._id}) with provenance '${provenance}'`
            }
          ]
        };

        if (!dryRun) {
          await PurchaseTransaction.create(ledgerDoc);
        }

        summary.migratedSubscriptions++;
      } catch (err) {
        console.error(`Error migrating subscription ${sub._id}:`, err.message);
        summary.errors.push({ subscriptionId: sub._id, error: err.message });
      }
    }

    // 2. Audit Legacy Entitlements (without manufacturing fake transactions)
    const usersWithExams = await User.find({ "purchasedExams.0": { $exists: true } }).select("purchasedExams");
    summary.legacyEntitlementsInspected.usersWithPurchasedExams = usersWithExams.length;
    summary.legacyEntitlementsInspected.totalPurchasedExamsEntitlements = usersWithExams.reduce(
      (sum, u) => sum + (u.purchasedExams ? u.purchasedExams.length : 0),
      0
    );

    const usersWithPractice = await User.find({ "purchasedPractice.0": { $exists: true } }).select("purchasedPractice");
    summary.legacyEntitlementsInspected.usersWithPractice = usersWithPractice.length;
    summary.legacyEntitlementsInspected.totalPurchasedPracticeEntitlements = usersWithPractice.reduce(
      (sum, u) => sum + (u.purchasedPractice ? u.purchasedPractice.length : 0),
      0
    );

    if (!quiet) {
      console.log(`\n--- Migration Summary ---`);
      console.log(`Dry Run Mode:               ${summary.dryRun}`);
      console.log(`Total Subscriptions:        ${summary.totalSubscriptions}`);
      console.log(`Migrated Subscriptions:     ${summary.migratedSubscriptions}`);
      console.log(`Skipped (Already Exists):   ${summary.skippedSubscriptions}`);
      console.log(`Users with Legacy Exams:    ${summary.legacyEntitlementsInspected.usersWithPurchasedExams}`);
      console.log(`Total Exam Entitlements:    ${summary.legacyEntitlementsInspected.totalPurchasedExamsEntitlements}`);
      console.log(`Users with Legacy Practice: ${summary.legacyEntitlementsInspected.usersWithPractice}`);
      console.log(`Total Practice Entitlements:${summary.legacyEntitlementsInspected.totalPurchasedPracticeEntitlements}`);
      console.log(`Errors Encountered:         ${summary.errors.length}`);
      console.log(`============================================================\n`);
    }

    return summary;
  } catch (globalErr) {
    console.error("Fatal error during ledger migration:", globalErr);
    throw globalErr;
  }
}

// Support running directly from CLI: `node Server/scripts/migrateToUnifiedLedger.js [--dry-run]`
if (require.main === module) {
  const isDryRun = process.argv.includes("--dry-run");
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoUri) {
    console.error("MONGODB_URI not set in environment.");
    process.exit(1);
  }

  mongoose
    .connect(mongoUri)
    .then(async () => {
      console.log("Connected to MongoDB for ledger migration.");
      const result = await migrateToUnifiedLedger({ dryRun: isDryRun });
      await mongoose.disconnect();
      console.log("Disconnected from MongoDB.");
      process.exit(result.errors.length > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error("MongoDB Connection Failed:", err);
      process.exit(1);
    });
}

module.exports = { migrateToUnifiedLedger };
