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
				showableMessage: '관리자를 찾을 수 없습니다.',
			});
		}

		// Check if password is correct
		const isPasswordCorrect = await bcrypt.compare(password, admin.password);
		if (!isPasswordCorrect) {
			return res.status(401).json({
				status: 'fail',
				showableMessage: '유효하지 않은 비밀번호',
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
			showableMessage: '성공적으로 로그인했습니다',
		});
	} catch (error) {
		console.error('Error in register:', error);
		return res
			.status(500)
			.json({ status: 'fail', showableMessage: '내부 서버 오류' });
	}
};

exports.register = async (req, res, next) => {
	try {
		const { fullName, email, password, confirmPassword } = req.body;
		// Check if passwords match
		if (password !== confirmPassword) {
			return res.status(400).json({
				status: 'fail',
				showableMessage: '비밀번호가 일치하지 않습니다',
			});
		}

		// Check if user with the same email already exists
		const existingAdmin = await Admin.findOne({ email });
		if (existingAdmin) {
			return res.status(409).json({
				status: 'fail',
				showableMessage: '이 이메일을 가진 관리자는 이미 존재합니다',
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
			showableMessage: '관리자가 성공적으로 등록되었습니다',
		});
	} catch (error) {
		console.error('Error in register:', error);
		return res
			.status(500)
			.json({ status: 'fail', showableMessage: '내부 서버 오류' });
	}
};

exports.getAllUsers = async (req, res) => {
	try {
		const { page, limit, name } = req.body;

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

				if (history.status === 1) {
					totalLockedPurchasedCoin += history.coinAmount;
				}
			}
			const referralCashReward = await ReferralCashReward.find(
				{ user_id: user._id },
				'myReward status'
			).lean();

			for (let history of referralCashReward) {
				totalRewardCoin += history.myReward;

				if (history.status === 1) {
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
			showableMessage: '사용자가 성공적으로 검색되었습니다',
		});
	} catch (error) {
		console.error('Error in getAllUsers:', error);
		return res
			.status(500)
			.json({ status: 'fail', showableMessage: '인터넷 서버 오류' });
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
			.populate('user_id', '-_id fullName walletAddress')
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
			.json({ status: 'fail', showableMessage: '인터넷 서버 오류' });
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
			.populate('referredTo', '-_id fullName walletAddress')
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
			showableMessage: '추천 캐시 보상 내역이 성공적으로 검색되었습니다.',
		});
	} catch (error) {
		console.error('Error in getAllReferralCashRewardHistory:', error);
		return res
			.status(500)
			.json({ status: 'fail', showableMessage: '인터넷 서버 오류' });
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
			showableMessage: '사용자 구매 내역 상태가 성공적으로 업데이트되었습니다.',
		});
	} catch (error) {
		console.error('Error in changeUserPurchaseHistoryStatus:', error);
		return res
			.status(500)
			.json({ status: 'fail', showableMessage: '인터넷 서버 오류' });
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
				showableMessage: '추천 캐시 보상을 찾을 수 없음',
			});
		}

		return res.json({
			status: 'success',
			data: referralCashReward,
			showableMessage: '추천 캐시 보상 상태가 성공적으로 업데이트되었습니다.',
		});
	} catch (error) {
		console.error('Error in updateReferralCashRewardStatus:', error);
		return res
			.status(500)
			.json({ status: 'fail', showableMessage: '인터넷 서버 오류' });
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
			showableMessage: '추천 현금 보상 상태가 성공적으로 업데이트되었습니다.',
		});
	} catch (error) {
		console.error('Error in updateReferralCashRewardStatus:', error);
		return res.status(500).json({
			status: 'fail',
			showableMessage: '추천 현금 보상 상태가 성공으로 업데이트되었습니다.',
		});
	}
};
exports.changePassword = async (req, res, next) => {
	try {
		const { oldPassword, newPassword, confirmNewPassword, user_id } = req.body;

		// Check if passwords match
		if (newPassword !== confirmNewPassword) {
			return res.status(400).json({
				status: 'fail',
				showableMessage: '새 비밀번호가 일치하지 않습니다',
			});
		}

		// Check if old password is correct
		const admin = await Admin.findById(user_id);
		if (!admin) {
			return res
				.status(404)
				.json({ status: 'fail', showableMessage: '관리자를 찾을 수 없음' });
		}
		const oldPasswordMatches = await bcrypt.compare(
			oldPassword,
			admin.password
		);
		if (!oldPasswordMatches) {
			return res.status(401).json({
				status: 'fail',
				showableMessage: '이전 암호가 올바르지 않습니다',
			});
		}

		// Hash the new password
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(newPassword, salt);

		// Update the admin's password
		admin.password = hashedPassword;
		await admin.save();

		// Respond with success message
		return res.status(200).json({
			status: 'success',
			showableMessage: '비밀번호가 성공적으로 변경되었습니다.',
		});
	} catch (error) {
		console.error('Error in changePassword:', error);
		return res
			.status(500)
			.json({ status: 'fail', showableMessage: '인터넷 서버 오류' });
	}
};
exports.changeAdminDetails = async (req, res, next) => {
	try {
		const { fullName, email, user_id } = req.body;

		const admin = await Admin.findById(user_id);
		if (!admin) {
			return res
				.status(404)
				.json({ status: 'fail', showableMessage: '관리자를 찾을 수 없음' });
		}

		if (email) {
			// Check if email is already taken
			const existingAdmin = await Admin.findOne({ email });
			if (existingAdmin && existingAdmin._id.toString() !== user_id) {
				return res.status(409).json({
					status: 'fail',
					showableMessage: '이 이메일을 사용하는 관리자가 이미 존재합니다.',
				});
			}
			admin.email = email;
		}

		if (fullName) {
			admin.fullName = fullName;
		}

		await admin.save();

		return res.status(200).json({
			status: 'success',
			data: {
				admin: { id: admin._id, fullName: admin.fullName, email: admin.email },
			},
			showableMessage: '관리자 세부정보가 성공적으로 변경되었습니다.',
		});
	} catch (error) {
		console.error('Error in changeAdminDetails:', error);
		return res
			.status(500)
			.json({ status: 'fail', showableMessage: '인터넷 서버 오류' });
	}
};
exports.getAdminDetails = async (req, res, next) => {
	try {
		const { user_id } = req.params;

		const admin = await Admin.findById(user_id).select('-password');
		if (!admin) {
			return res
				.status(404)
				.json({ status: 'fail', showableMessage: '관리자를 찾을 수 없음' });
		}

		return res.status(200).json({
			status: 'success',
			data: {
				admin: { id: admin._id, fullName: admin.fullName, email: admin.email },
			},
			showableMessage: '관리자 세부정보를 성공적으로 반환하였습니다.',
		});
	} catch (error) {
		console.error('Error in getAdminDetails:', error);
		return res
			.status(500)
			.json({ status: 'fail', showableMessage: '인터넷 서버 오류' });
	}
};
