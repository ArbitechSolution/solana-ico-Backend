const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const resetController = require('../controllers/reset.controller');
const { verifyToken } = require('../middleware/verifyToken');

// Register a new user
router.all('/register', authController.register);

// Login with existing user
router.all('/login', authController.login);

// Send reset code to user's email
router.all('/reset-code', verifyToken, resetController.sendResetCode);

// Reset user's password with the code
router.all('/reset-password', resetController.resetPassword);

//get user by email
router.all('/getUserId', authController.getUserIdByEmail);

module.exports = router;
