const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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

    // Check existing user
    const userExists = await User.findOne({ email });

    if (userExists) {
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

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid Email",
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
        message: "Invalid Password",
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