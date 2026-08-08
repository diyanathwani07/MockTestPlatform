const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { fixGrammar } = require("../controllers/aiController");

router.post("/fix-grammar", protect, fixGrammar);

module.exports = router;
