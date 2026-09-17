const express = require("express");
const router = express.Router();
const { getTaxonomies, createTaxonomy } = require("../controllers/taxonomyController");
const { protect } = require("../middleware/authMiddleware"); 
const { adminOnly } = require("../middleware/adminMiddleware"); 

// Anyone authenticated can fetch
router.get("/", protect, getTaxonomies);

// Only admins can create taxonomy items
router.post("/", protect, adminOnly, createTaxonomy);

module.exports = router;
