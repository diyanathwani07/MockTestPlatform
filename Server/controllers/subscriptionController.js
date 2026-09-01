const Subscription = require("../models/Subscription");

/**
 * Fetches the logged-in student's subscription history, newest first.
 */
const getMySubscriptionHistory = async (req, res) => {
  try {
    const history = await Subscription.find({ studentId: req.user._id })
      .populate("planId")
      .sort({ createdAt: -1 });

    res.json(history);
  } catch (error) {
    console.error("Get My Subscription History Error:", error);
    res.status(500).json({ message: "Failed to fetch subscription history.", error: error.message });
  }
};

module.exports = {
  getMySubscriptionHistory
};
