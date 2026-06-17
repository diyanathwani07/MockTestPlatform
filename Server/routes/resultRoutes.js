const express = require("express");

const {
  saveResult,
} = require("../controllers/resultController");

const router = express.Router();

router.post("/save", saveResult);

module.exports = router;