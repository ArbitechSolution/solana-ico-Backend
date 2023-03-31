const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Admin = require('../models/admin.model');
const User = require('../models/user.model');
const UserPurchaseHistory = require('../models/user.purchaseHistroy');
const ReferralCashReward = require('../models/user.referralCashReward');
exports.login = async (req, res, next) => {
	try {
		const { email, password } = req.body;

		// Check if user with given email exists
		const admin = await Admin.findOne({ email });
		if (!admin) {
			return res.status(401).json({
				status: 'fail',
				showableMessage: 'No admin found!',
			});
		}

		// Check if password is correct
		const isPasswordCorrect = await bcrypt.compare(password, admin.password);
		if (!isPasswordCorrect) {
			return res.status(401).json({
				status: 'fail',
				showableMessage: 'Invalid password',
			});
		}

		// Create JWT token
		const token = jwt.sign({ userId: admin._id }, process.env.JWT_SECRET, {
			expiresIn: '1h',
		});

		// Respond with token and user data
		return res.json({
			status: 'success',
			data: { token, admin: { id: admin._id, email: admin.email } },
			showableMessage: 'Logged in successfully',
		});
	} catch (error) {
		console.error('Error in register:', error);
		return res
			.status(500)
			.json({ status: 'fail', showableMessage: 'Internal server error' });
	}
};

exports.register = async (req, res, next) => {
	try {
		const { fullName, email, password, confirmPassword } = req.body;
		// Check if passwords match
		if (password !== confirmPassword) {
			return res
				.status(400)
				.json({ status: 'fail', showableMessage: 'Passwords do not match' });
		}

		// Check if user with the same email already exists
		const existingAdmin = await Admin.findOne({ email });
		if (existingAdmin) {
			return res.status(409).json({
				status: 'fail',
				showableMessage: 'admin with this email already exists',
			});
		}

		// Hash the password
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		// Create new Admin
		const newAdmin = new Admin({
			fullName,
			email,
			password: hashedPassword,
		});
		// Create JWT token
		const token = jwt.sign({ userId: newAdmin._id }, process.env.JWT_SECRET, {
			expiresIn: '1h',
		});

		// Save user to database
		await newAdmin.save();

		// Respond with token and user data
		return res.status(201).json({
			status: 'success',
			data: { token, admin: { id: newAdmin._id, email: newAdmin.email } },
			showableMessage: 'Admin registered successfully',
		});
	} catch (error) {
		console.error('Error in register:', error);
		return res
			.status(500)
			.json({ status: 'fail', showableMessage: 'Internal server error' });
	}
};

exports.getAllUsers = async (req, res) => {
	try {
		const { page = 1, limit = 10, name } = req.body;

		let filter = {};
		if (name) {
			filter.fullName = { $regex: name, $options: 'i' };
		}

		const count = await User.countDocuments(filter);
		const users = await User.find(
			filter,
			'fullName email phoneNumber refCode walletAddress'
		)
			.skip((page - 1) * limit)
			.limit(parseInt(limit))
			.lean();

		let totalPurchasedCoin = 0;
		let totalLockedPurchasedCoin = 0;
		let totalRewardCoin = 0;
		let totalLockedRewardCoin = 0;

		for (let user of users) {
			const purchaseHistory = await UserPurchaseHistory.find(
				{ user_id: user._id },
				'coinAmount status'
			).lean();

			for (let history of purchaseHistory) {
				totalPurchasedCoin += history.coinAmount;

				if (history.status === 2) {
					totalLockedPurchasedCoin += history.coinAmount;
				}
			}
			const referralCashReward = await ReferralCashReward.find(
				{ user_id: user._id },
				'myReward status'
			).lean();

			for (let history of referralCashReward) {
				totalRewardCoin += history.myReward;

				if (history.status === 2) {
					totalLockedRewardCoin += history.myReward;
				}
			}

			user.coinAmount = totalPurchasedCoin;
			user.totalLockedPurchasedCoin = totalLockedPurchasedCoin;
			user.totalRewardCoin = totalRewardCoin;
			user.totalLockedRewardCoin = totalLockedRewardCoin;

			// reset the variables
			totalPurchasedCoin = 0;
			totalLockedPurchasedCoin = 0;
			totalRewardCoin = 0;
			totalLockedRewardCoin = 0;
		}

		return res.json({
			status: 'success',
			data: { users },
			meta: {
				totalCount: count,
				totalPages: Math.ceil(count / limit),
				currentPage: parseInt(page),
				limit: parseInt(limit),
			},
			showableMessage: 'Users retrieved successfully',
		});
	} catch (error) {
		console.error('Error in getAllUsers:', error);
		return res
			.status(500)
			.json({ status: 'fail', showableMessage: 'Internal server error' });
	}
};

exports.getAllUserPurchaseHistory = async (req, res) => {
	try {
		const { page, limit, status } = req.body;

		let query = {};

		if (status !== undefined) {
			query.status = status;
		}

		const count = await UserPurchaseHistory.countDocuments(query);
		const userPurchaseHistory = await UserPurchaseHistory.find(query)
			.skip((page - 1) * limit)
			.limit(parseInt(limit))
			.lean();

		return res.json({
			status: 'success',
			data: userPurchaseHistory,
			meta: {
				totalCount: count,
				totalPages: Math.ceil(count / limit),
				currentPage: parseInt(page),
				limit: parseInt(limit),
			},
			showableMessage: 'User purchase history retrieved successfully',
		});
	} catch (error) {
		console.error('Error in getAllUserPurchaseHistory:', error);
		return res
			.status(500)
			.json({ status: 'fail', showableMessage: 'Internal server error' });
	}
};

exports.getAllReferralCashRewardHistory = async (req, res) => {
	try {
		const { page, limit, status } = req.body;

		let query = {};

		if (status !== undefined) {
			query.status = status;
		}

		const count = await ReferralCashReward.countDocuments(query);
		const referralCashReward = await ReferralCashReward.find(query)
			.skip((page - 1) * limit)
			.limit(parseInt(limit))
			.lean();

		return res.json({
			status: 'success',
			data: referralCashReward,
			meta: {
				totalCount: count,
				totalPages: Math.ceil(count / limit),
				currentPage: parseInt(page),
				limit: parseInt(limit),
			},
			showableMessage: 'Referral cash reward history retrieved successfully',
		});
	} catch (error) {
		console.error('Error in getAllReferralCashRewardHistory:', error);
		return res
			.status(500)
			.json({ status: 'fail', showableMessage: 'Internal server error' });
	}
};

exports.updateUserPurchaseHistoryStatus = async (req, res) => {
	try {
		const { status, id } = req.body;

		const updatedUserPurchaseHistory =
			await UserPurchaseHistory.findByIdAndUpdate(
				id,
				{ status },
				{ new: true }
			).lean();

		return res.json({
			status: 'success',
			data: updatedUserPurchaseHistory,
			showableMessage: 'User purchase history status updated successfully',
		});
	} catch (error) {
		console.error('Error in changeUserPurchaseHistoryStatus:', error);
		return res
			.status(500)
			.json({ status: 'fail', showableMessage: 'Internal server error' });
	}
};

exports.updateReferralCashRewardStatus = async (req, res) => {
	try {
		const { id, status } = req.body;

		const referralCashReward = await ReferralCashReward.findByIdAndUpdate(
			id,
			{ status },
			{ new: true }
		).lean();

		if (!referralCashReward) {
			return res.status(404).json({
				status: 'fail',
				showableMessage: 'Referral cash reward not found',
			});
		}

		return res.json({
			status: 'success',
			data: referralCashReward,
			showableMessage: 'Referral cash reward status updated successfully',
		});
	} catch (error) {
		console.error('Error in updateReferralCashRewardStatus:', error);
		return res
			.status(500)
			.json({ status: 'fail', showableMessage: 'Internal server error' });
	}
};
