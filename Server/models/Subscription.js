const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AiPlan",
      required: true
    },
    planNameSnapshot: {
      type: String
    },
    purchaseId: {
      type: String,
      required: true,
      unique: true
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: "INR"
    },
    aiCreditsGranted: {
      type: Number,
      required: true
    },
    startDate: {
      type: Date,
      required: true
    },
    expiryDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled", "refunded"],
      default: "active",
      index: true
    },
    paymentGateway: {
      type: String,
      enum: ["phonepe", "razorpay", "admin_grant", "manual"],
      required: true
    },
    gatewayTxnId: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Compound index for hottest query "get my active subscription"
subscriptionSchema.index({ studentId: 1, status: 1 });

module.exports = mongoose.model("Subscription", subscriptionSchema);
