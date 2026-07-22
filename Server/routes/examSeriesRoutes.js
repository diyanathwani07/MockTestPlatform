const express = require("express");
const router = express.Router();
const { protect, optionalProtect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");


const {
  createSeries,
  getSeries,
  getSeriesById,
  updateSeries,
  deleteSeries,
  getAllSeriesWithQuizzes,
} = require("../controllers/examSeriesController");

router.get("/with-quizzes", optionalProtect, getAllSeriesWithQuizzes);
router.get("/", optionalProtect, getSeries);
router.get("/:id", optionalProtect, getSeriesById);



// Admin-only endpoints
router.post("/", protect, adminOnly, createSeries);
router.put("/:id", protect, adminOnly, updateSeries);
router.delete("/:id", protect, adminOnly, deleteSeries);

module.exports = router;
