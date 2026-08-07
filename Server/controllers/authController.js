const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const logAction = require("../utils/logger");

// Register User
const registerUser = async (req, res) => {
  try {
    const {
  fullName,
  email,
  phone,
  password,
  district,
  state,
  role,
  adminSecretKey,
} = req.body;

    const userExists = await User.findOne({ email });

    // Check existing user
    if (userExists) {
      if (userExists.isDeleted) {
        return res.status(400).json({
          success: false,
          message: "This account has been deleted. Please contact support to restore it.",
        });
      }
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // Determine Role and Validate Admin Key
    let finalRole = "user";
    if (role === "admin") {
      if (adminSecretKey !== process.env.ADMIN_SECRET_KEY) {
        return res.status(400).json({
          success: false,
          message: "Invalid Admin Registration Key",
        });
      }
      finalRole = "admin";
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      fullName,
      email,
      phone,
      password: hashedPassword,
      district,
      state,
      role: finalRole,
    });

    res.status(201).json({
      success: true,
      message: "Registration Successful",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        district: user.district,
        state: user.state,
        role: user.role,
      },
    });
    await logAction("REGISTER_USER", user.fullName, `User registered account: ${user.email}`, "Auth", req.ip);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });

    if (!user || user.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Invalid Email or Password",
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid Email or Password",
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // Calculate Permissions
    let userPermissions = [];
    if (user.role === "superadmin") {
      userPermissions = ["full_access"];
    } else if (user.role === "user") {
      userPermissions = ["student_dashboard", "my_exams", "practice_tests", "results", "leaderboard", "help_support"];
    } else if (user.role === "admin") {
      userPermissions = [...(user.permissions || [])];
      if (user.department) {
        const Department = require("../models/Department");
        const dept = await Department.findOne({ name: user.department });
        if (dept && dept.permissions) {
          userPermissions = [...new Set([...userPermissions, ...dept.permissions])];
        }
      }
    }

    // Success Response
    res.status(200).json({
      success: true,
      message: "Login Successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        department: user.department,
        permissions: userPermissions,
        avatar: user.avatar,
      },
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
module.exports = {
  registerUser,
  loginUser,
};