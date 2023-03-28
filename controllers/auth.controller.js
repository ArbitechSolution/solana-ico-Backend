const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/user.model");
const { OAuth2Client } = require("google-auth-library");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.register = async (req, res, next) => {
  try {
    const {
      fullName,
      id,
      email,
      phoneNumber,
      password,
      confirmPassword,
      code,
      walletAddress,
    } = req.body;
    console.log("email", req.body);

    // Check if passwords match
    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ status: "fail", showableMessage: "Passwords do not match" });
    }

    // Check if user with the same email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        status: "fail",
        showableMessage: "User with this email already exists",
      });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      fullName,
      id,
      email,
      phoneNumber,
      code,
      walletAddress,
      password: hashedPassword,
    });

    // Save user to database
    await newUser.save();

    // Create JWT token
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Respond with token and user data
    return res.status(201).json({
      status: "success",
      data: { token, user: { id: newUser._id, email: newUser.email } },
      showableMessage: "User registered successfully",
    });
  } catch (error) {
    console.error("Error in register:", error);
    return res
      .status(500)
      .json({ status: "fail", showableMessage: "Internal server error" });
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if user with given email exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        status: "fail",
        showableMessage: "Invalid email or password",
      });
    }

    // Check if password is correct
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        status: "fail",
        showableMessage: "Invalid email or password",
      });
    }

    // Create JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Respond with token and user data
    return res.json({
      status: "success",
      data: { token, user: { id: user._id, email: user.email } },
      showableMessage: "Logged in successfully",
    });
  } catch (error) {
    console.error("Error in register:", error);
    return res
      .status(500)
      .json({ status: "fail", showableMessage: "Internal server error" });
  }
};

exports.getUserIdByEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email }, { _id: 1 });

    if (!user) {
      return res.status(404).json({
        status: "fail",
        showableMessage: "User not found",
      });
    }

    return res.status(200).json({
      status: "success",
      data: { userId: user._id },
      showableMessage: "User found successfully",
    });
  } catch (error) {
    console.error("Error in getUserIdByEmail:", error);
    return res.status(500).json({
      status: "fail",
      showableMessage: "Internal server error",
    });
  }
};
