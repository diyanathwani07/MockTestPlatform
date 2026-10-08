const express = require("express");
const router = express.Router();
const { registerDevice, unregisterDevice } = require("../controllers/deviceController");
const { protect } = require("../middleware/authMiddleware");

router.post("/register", protect, registerDevice);
router.delete("/unregister", protect, unregisterDevice);

module.exports = router;
