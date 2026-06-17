const Result = require("../models/Result");

const saveResult = async (req, res) => {
  try {
    const {
      userId,
      score,
      total,
      correct,
      incorrect,
      percentage,
    } = req.body;

    const result = await Result.create({
      userId,
      score,
      total,
      correct,
      incorrect,
      percentage,
    });

    res.status(201).json({
      success: true,
      result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = { saveResult };