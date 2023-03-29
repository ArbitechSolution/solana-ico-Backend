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
router.all('/sendOtp', resetController.sendOtpCode);

// Reset user's password with the code
router.all('/reset-password', resetController.resetPassword);
//change wallet address
router.all(
	'/updateWalletAddress',
	verifyToken,
	authController.updateWalletAddress
);
//change user details
router.all('/updateUserDetails', verifyToken, authController.updateUserDetails);
//get user by email
router.all('/getUserId', authController.getUserIdByEmail);

//get user info
router.all('/getUserInfo/:user_id', verifyToken, authController.getUserInfo);

module.exports = router;
