const User = require("../models/UserRegistrationModel");
const EmployeeRegistrationService = require("../services/EmployeeRegistrationService");
const UserRegistrationService = require("../services/UserRegistrationService");
const InvalidTokenListService = require("../services/InvalidTokenListService");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.createUser = async (req, res) => {
  try {
    const { enrollmentNumber, email, password, confirmPassword } = req.body;

    //check if an enroll registration exists
    const existingUserWithThisEnrollmentNumber =
      await EmployeeRegistrationService.findOne({
        enrollmentNumber: enrollmentNumber,
      });
    if (!existingUserWithThisEnrollmentNumber) {
      return res
        .status(404)
        .json({ error: "Enrollment number not found in the institution" });
    }

    //check if a user with this enrollmentNumber exists
    const existingUser = await User.findOne({ enrollmentNumber });
    if (existingUser) {
      return res
        .status(409)
        .json({ error: "A user with this enrollment number already exists" });
    }

    //check if passwords match
    if (password !== confirmPassword) {
      return res.status(422).json({ message: "Passwords do not match." });
    }

    //create password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({
      enrollmentNumber,
      email,
      password: passwordHash,
    });

    await UserRegistrationService.createUser(user);
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Registration failed" });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    console.error("Error getting users:", error);
    res.status(500).json({ error: "Failed to retrieve users" });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error("Error getting user by ID:", error);
    res.status(500).json({ error: "Failed to retrieve user" });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { password } = req.body;
    const user = await User.findByIdAndUpdate(
      userId,
      { password },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
};

// login with email or enrollmentNumber
exports.userLogin = async (req, res) => {
  const { email, enrollmentNumber, password } = req.body;

  try {
    let userExists;

    if (email) {
      userExists = await UserRegistrationService.findOne({ email });
    } else if (enrollmentNumber) {
      userExists = await UserRegistrationService.findOne({ enrollmentNumber });
    }

    if (!userExists) {
      return res.status(400).json({
        message:
          "Invalid credentials. Please check your email or enrollment number and password.",
      });
    }

    const checkPassword = await bcrypt.compare(password, userExists.password);

    if (!checkPassword) {
      return res.status(401).json({
        message:
          "Invalid credentials. Please check your email or enrollment number and password.",
      });
    }

    const secret = process.env.SECRET;
    const token = jwt.sign({ id: userExists._id }, secret, {
      expiresIn: "24h",
    });

    res.status(200).json({ message: "Authentication successful.", token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

//logout
exports.userLogout = async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    await InvalidTokenListService.createToken(token);

    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
