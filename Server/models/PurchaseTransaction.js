const mongoose = require("mongoose");

const purchaseTransactionSchema = new mongoose.Schema(
  {
    // -------------------------------------------------------------
    // 1. IDENTIFICATION
    // -------------------------------------------------------------
    transactionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    orderId: {
      type: String,
      trim: true,
      index: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    itemModel: {
      type: String,
      enum: ["AiPlan", "Quiz", "PracticeQuiz", "ExamSeries", "FlashcardSet"],
      required: true
    },
    itemTitleSnapshot: {
      type: String,
      required: true,
      trim: true
    },

    // -------------------------------------------------------------
    // 2. PRODUCT CATEGORY
    // -------------------------------------------------------------
    productCategory: {
      type: String,
      enum: ["ai_plan", "exam", "practice", "exam_series", "flashcard"],
      required: true,
      index: true
    },

    // -------------------------------------------------------------
    // 3. FINANCIAL INFORMATION
    // -------------------------------------------------------------
    amount: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true
    },
    originalPriceSnapshot: {
      type: Number,
      default: 0
    },
    discountSnapshot: {
      type: Number,
      default: 0
    },

    // -------------------------------------------------------------
    // 4. PAYMENT GATEWAY & VERIFICATION
    // -------------------------------------------------------------
    gateway: {
      type: String,
      enum: ["razorpay", "phonepe", "admin_grant", "manual", "free_checkout", "none"],
      default: "none",
      required: true,
      index: true
    },
    gatewayTxnId: {
      type: String,
      trim: true,
      sparse: true,
      index: true
    },
    paymentStatus: {
      type: String,
      enum: ["initiated", "pending", "paid", "failed", "cancelled", "refunded"],
      default: "initiated",
      required: true,
      index: true
    },
    paymentVerificationStatus: {
      type: String,
      enum: ["unverified", "verified", "simulated", "admin_authorized", "not_applicable"],
      default: "unverified",
      index: true
    },
    paymentTimestamp: {
      type: Date,
      default: null
    },

    // -------------------------------------------------------------
    // 5. PROVENANCE & LEDGER STATUS
    // -------------------------------------------------------------
    provenance: {
      type: String,
      enum: [
        "verified_payment", // Real bank/gateway verified payment
        "admin_grant",      // Authorized manual grant by administrator
        "dev_simulation",   // Local development sandbox payment simulation
        "free_access",      // Legitimately free product checkout (₹0)
        "legacy_import",    // Pre-ledger migration record
        "manual"            // Manual offline entry
      ],
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ["initiated", "pending", "paid", "failed", "cancelled", "refunded"],
      default: "initiated",
      required: true,
      index: true
    },

    // -------------------------------------------------------------
    // 6. RELATIONSHIPS & AUDITING
    // -------------------------------------------------------------
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      sparse: true,
      index: true
    },
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    adminNotes: {
      type: String,
      default: "",
      trim: true
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: ["initiated", "pending", "paid", "failed", "cancelled", "refunded"],
          required: true
        },
        changedAt: {
          type: Date,
          default: Date.now
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null
        },
        note: {
          type: String,
          default: ""
        }
      }
    ],
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// -----------------------------------------------------------------
// COMPOUND INDEXES FOR ANALYTICS, AUDITING & HIGH-VOLUME QUERIES
// -----------------------------------------------------------------
purchaseTransactionSchema.index({ studentId: 1, createdAt: -1 });
purchaseTransactionSchema.index({ productCategory: 1, status: 1, createdAt: -1 });
purchaseTransactionSchema.index({ provenance: 1, status: 1, createdAt: -1 });
purchaseTransactionSchema.index({ gateway: 1, gatewayTxnId: 1 });
purchaseTransactionSchema.index({ orderId: 1, studentId: 1 });

// Helper instance method to add status change record
purchaseTransactionSchema.methods.recordStatusChange = function (newStatus, changedBy = null, note = "") {
  this.status = newStatus;
  this.paymentStatus = newStatus;
  this.statusHistory.push({
    status: newStatus,
    changedAt: new Date(),
    changedBy,
    note
  });
};

module.exports = mongoose.model("PurchaseTransaction", purchaseTransactionSchema);
