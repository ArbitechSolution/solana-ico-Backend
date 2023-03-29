const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../services/email.services');
const OPT = require('../models/OPT.model');
exports.sendOtpCode = async (req, res, next) => {
	try {
		const { email, type } = req.body;
		let newOPT;
		// Check if user with given email exists
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(404).json({
				status: 'fail',
				showableMessage: 'User with this email does not exist',
			});
		}

		// Check if there is an existing code for the same user and type
		const existingOPT = await OPT.findOne({ userId: user._id, type: type });

		// If there is an existing code, update it with a new code and expiry time
		if (existingOPT) {
			existingOPT.code = Math.floor(100000 + Math.random() * 900000);
			existingOPT.expiresAt = Date.now() + 3600000; // Code expires in 1 hour
			await existingOPT.save();
		}
		// If there is no existing code, create a new OPT document for the user
		else {
			newOPT = new OPT({
				userId: user._id,
				code: Math.floor(100000 + Math.random() * 900000),
				type: type,
				expiresAt: Date.now() + 3600000, // Code expires in 1 hour
			});
			await newOPT.save();
		}

		// Get the code from either the existing or new OPT document
		const code = existingOPT ? existingOPT.code : newOPT.code;

		// Send email with reset code
		const message = `Your password reset code is ${code}. Please use this code to reset your password.`;
		await sendEmail(user.email, 'Password Reset Code', message);

		return res.json({
			status: 'success',
			showableMessage: 'Reset code sent successfully',
		});
	} catch (error) {
		return next(error);
	}
};

exports.resetPassword = async (req, res, next) => {
	try {
		const { user_id, password, confirmPassword, resetCode } = req.body;

		// Check if passwords match
		if (password !== confirmPassword) {
			return res
				.status(400)
				.json({ status: 'fail', showableMessage: 'Passwords do not match' });
		}

		// Check if user with given email exists
		const user = await User.findById(user_id);
		if (!user) {
			return res.status(404).json({
				status: 'fail',
				showableMessage: 'User with this ID does not exist',
			});
		}

		// Check if reset code is valid and not expired
		const opt = await OPT.findOne({
			userId: user._id,
			code: resetCode,
			type: 'reset',
		});
		if (!opt || opt.expiresAt < new Date()) {
			return res.status(400).json({
				status: 'fail',
				showableMessage: 'Invalid or expired reset code',
			});
		}

		// Hash the new password
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		// Update user password and reset code fields
		user.password = hashedPassword;
		user.resetCode = null;
		user.resetCodeExpiration = null;
		await user.save();

		// Respond with success message
		return res.json({
			status: 'success',
			showableMessage: 'Password reset successfully',
		});
	} catch (error) {
		return next(error);
	}
};
