const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { superAdminOnly, adminOnly } = require("../middleware/adminMiddleware");
const {
  getAllDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  duplicateDepartment
} = require("../controllers/departmentController");

router.get("/", protect, adminOnly, getAllDepartments);
router.get("/:id", protect, adminOnly, getDepartment);
router.post("/", protect, superAdminOnly, createDepartment);
router.put("/:id", protect, superAdminOnly, updateDepartment);
router.delete("/:id", protect, superAdminOnly, deleteDepartment);
router.post("/:id/duplicate", protect, superAdminOnly, duplicateDepartment);

module.exports = router;
