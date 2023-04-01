const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/user.model');
const OPT = require('../models/OPT.model');

const generateCode = () => {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let code = '';
	for (let i = 0; i < 10; i++) {
		code += characters.charAt(Math.floor(Math.random() * characters.length));
	}
	return code;
};

exports.register = async (req, res, next) => {
	try {
		const {
			fullName,
			email,
			phoneNumber,
			password,
			confirmPassword,
			walletAddress,
		} = req.body;
		console.log('email', req.body);

		// Check if passwords match
		if (password !== confirmPassword) {
			return res
				.status(400)
				.json({ status: 'fail', showableMessage: 'Passwords do not match' });
		}

		// Check if user with the same email already exists
		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return res.status(409).json({
				status: 'fail',
				showableMessage: 'User with this email already exists',
			});
		}

		// Generate user code
		const refCode = generateCode();

		// Hash the password
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		// Create new user
		const newUser = new User({
			fullName,
			email,
			phoneNumber,
			refCode,
			walletAddress,
			password: hashedPassword,
		});

		// Save user to database
		await newUser.save();

		// Create JWT token
		const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, {
			expiresIn: '1h',
		});

		// Respond with token and user data
		return res.status(201).json({
			status: 'success',
			data: { token, user: { id: newUser._id, email: newUser.email } },
			showableMessage: '회원가입 성공',
		});
	} catch (error) {
		console.error('Error in register:', error);
		return res
			.status(500)
			.json({ status: 'fail', showableMessage: 'Internal server error' });
	}
};

exports.login = async (req, res, next) => {
	try {
		const { email, password } = req.body;

		// Check if user with given email exists
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(401).json({
				status: 'fail',
				showableMessage: '잘못된 이메일 또는 비밀번호',
			});
		}

		// Check if password is correct
		const isPasswordCorrect = await bcrypt.compare(password, user.password);
		if (!isPasswordCorrect) {
			return res.status(401).json({
				status: 'fail',
				showableMessage: '잘못된 이메일 또는 비밀번호',
			});
		}

		// Create JWT token
		const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
			expiresIn: '1h',
		});

		// Respond with token and user data
		return res.json({
			status: 'success',
			data: { token, user: { id: user._id, email: user.email } },
			showableMessage: '로그인 성공',
		});
	} catch (error) {
		return res
			.status(500)
			.json({ status: 'fail', showableMessage: 'Internal server error' });
	}
};
exports.updateWalletAddress = async (req, res, next) => {
	try {
		const { user_id, walletAddress, resetCode } = req.body;

		// Check if user with given email exists
		const user = await User.findById(user_id);
		if (!user) {
			return res.status(404).json({
				status: 'fail',
				showableMessage: '이 ID를 가진 사용자가 존재하지 않습니다',
			});
		}

		// Check if reset code is valid and not expired
		const opt = await OPT.findOne({
			userId: user._id,
			code: resetCode,
			type: 'changeWalletAddress',
		});
		if (!opt || opt.expiresAt < new Date()) {
			return res.status(400).json({
				status: 'fail',
				showableMessage: '유효하지 않거나 만료된  코드',
			});
		}

		// Update user walletAddress and reset code fields
		user.walletAddress = walletAddress;
		await user.save();

		// Respond with success message
		return res.json({
			status: 'success',
			showableMessage: '지갑 주소가 성공적으로 업데이트되었습니다.',
		});
	} catch (error) {
		return next(error);
	}
};

exports.updateUserDetails = async (req, res, next) => {
	try {
		const { user_id, fullName, email, phoneNumber } = req.body;

		// Check if user with given ID exists
		const user = await User.findById(user_id);
		if (!user) {
			return res.status(404).json({
				status: 'fail',
				showableMessage: '이 ID를 가진 사용자가 존재하지 않습니다',
			});
		}

		// Update user details
		if (fullName) {
			user.fullName = fullName;
		}
		if (email) {
			// Check if the new email is already in use
			const existingUser = await User.findOne({ email });
			if (existingUser && existingUser._id.toString() !== user_id) {
				return res.status(400).json({
					status: 'fail',
					showableMessage: '이메일이 이미 사용 중입니다.',
				});
			}
			user.email = email;
		}
		if (phoneNumber) {
			user.phoneNumber = phoneNumber;
		}

		await user.save();

		// Respond with success message
		return res.json({
			status: 'success',
			showableMessage: '사용자 정보 업데이트 성공',
		});
	} catch (error) {
		return next(error);
	}
};

exports.getUserInfo = async (req, res) => {
	try {
		const { user_id } = req.params;

		const user = await User.findById(user_id, '-password');

		if (!user) {
			return res.status(404).json({
				status: 'fail',
				message: 'User not found',
				showableMessage: 'User not found.',
			});
		}

		res.status(200).json({
			status: 'success',
			message: 'User information retrieved successfully',
			showableMessage: 'User information has been retrieved.',
			user,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			status: 'fail',
			message: 'An error occurred while retrieving user information',
			showableMessage:
				'An error occurred while fetching user information. Please try again.',
			error,
		});
	}
};

exports.getUserIdByEmail = async (req, res) => {
	try {
		const { email } = req.body;
		const user = await User.findOne({ email }, { _id: 1 });

		if (!user) {
			return res.status(404).json({
				status: 'fail',
				showableMessage: '사용자가 없습니다',
			});
		}

		return res.status(200).json({
			status: 'success',
			data: { userId: user._id },
			showableMessage: '사용자 발견',
		});
	} catch (error) {
		console.error('Error in getUserIdByEmail:', error);
		return res.status(500).json({
			status: 'fail',
			showableMessage: 'Internal server error',
		});
	}
};
