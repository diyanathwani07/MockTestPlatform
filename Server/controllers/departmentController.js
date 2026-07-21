const Department = require("../models/Department");
const User = require("../models/User");
const logAction = require("../utils/logger");

// GET all departments with user counts
exports.getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.find().sort({ createdAt: 1 });
    // Attach user count for each department
    const deptsWithCounts = await Promise.all(
      departments.map(async (dept) => {
        const count = await User.countDocuments({
          role: { $in: ["admin", "superadmin"] },
          department: dept.name,
          isDeleted: { $ne: true }
        });
        return { ...dept.toObject(), userCount: count };
      })
    );
    res.json(deptsWithCounts);
  } catch (err) {
    console.error("Failed to fetch departments:", err);
    res.status(500).json({ message: "Failed to fetch departments." });
  }
};

// GET single department
exports.getDepartment = async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ message: "Department not found." });
    const userCount = await User.countDocuments({
      role: { $in: ["admin", "superadmin"] },
      department: dept.name,
      isDeleted: { $ne: true }
    });
    res.json({ ...dept.toObject(), userCount });
  } catch (err) {
    console.error("Failed to fetch department:", err);
    res.status(500).json({ message: "Failed to fetch department." });
  }
};

// POST create department
exports.createDepartment = async (req, res) => {
  try {
    const { name, description, permissions, color } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required." });
    
    const exists = await Department.findOne({ name });
    if (exists) return res.status(400).json({ message: "Department with this name already exists." });
    
    const dept = await Department.create({
      name,
      description: description || "",
      permissions: permissions || [],
      color: color || "#6E3FF3"
    });
    
    await logAction(
      "CREATE_DEPARTMENT",
      req.user?.fullName || "Admin",
      `Created department: ${name}`,
      "DepartmentManagement",
      req.ip
    );
    
    res.status(201).json(dept);
  } catch (err) {
    console.error("Failed to create department:", err);
    res.status(500).json({ message: "Failed to create department." });
  }
};

// PUT update department
exports.updateDepartment = async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ message: "Department not found." });
    
    const { name, description, permissions, color } = req.body;
    const oldName = dept.name;
    
    if (name) dept.name = name;
    if (description !== undefined) dept.description = description;
    if (permissions) dept.permissions = permissions;
    if (color) dept.color = color;
    
    await dept.save();
    
    // Update users' department string if name changed
    if (name && name !== oldName) {
      await User.updateMany({ department: oldName }, { department: name });
    }
    
    await logAction(
      "UPDATE_DEPARTMENT",
      req.user?.fullName || "Admin",
      `Updated department: ${dept.name} — permissions count: ${permissions?.length || 0}`,
      "DepartmentManagement",
      req.ip
    );
    
    res.json(dept);
  } catch (err) {
    console.error("Failed to update department:", err);
    res.status(500).json({ message: "Failed to update department." });
  }
};

// DELETE department
exports.deleteDepartment = async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ message: "Department not found." });
    
    // Check if there are default departments we don't want to delete, or warn
    const name = dept.name;
    await dept.deleteOne();
    
    // Clear user departments if they belonged to this department
    await User.updateMany({ department: name }, { department: null });
    
    await logAction(
      "DELETE_DEPARTMENT",
      req.user?.fullName || "Admin",
      `Deleted department: ${name}`,
      "DepartmentManagement",
      req.ip
    );
    
    res.json({ message: "Department deleted successfully." });
  } catch (err) {
    console.error("Failed to delete department:", err);
    res.status(500).json({ message: "Failed to delete department." });
  }
};

// POST duplicate department
exports.duplicateDepartment = async (req, res) => {
  try {
    const source = await Department.findById(req.params.id);
    if (!source) return res.status(404).json({ message: "Department not found." });
    
    const newName = `${source.name} (Copy)`;
    const exists = await Department.findOne({ name: newName });
    if (exists) return res.status(400).json({ message: "Duplicated department already exists." });
    
    const newDept = await Department.create({
      name: newName,
      description: source.description,
      permissions: [...source.permissions],
      color: source.color || "#6E3FF3"
    });
    
    await logAction(
      "DUPLICATE_DEPARTMENT",
      req.user?.fullName || "Admin",
      `Duplicated department: ${source.name} → ${newName}`,
      "DepartmentManagement",
      req.ip
    );
    
    res.status(201).json(newDept);
  } catch (err) {
    console.error("Failed to duplicate department:", err);
    res.status(500).json({ message: "Failed to duplicate department." });
  }
};
