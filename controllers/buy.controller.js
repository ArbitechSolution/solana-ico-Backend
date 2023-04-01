const User = require('../models/user.model'); // Import your User model
const UserPurchaseHistory = require('../models/user.purchaseHistroy');
const ReferralCashReward = require('../models/user.referralCashReward');
const axios = require('axios');
const mongoose = require('mongoose');
const OPT = require('../models/OPT.model');

const getRoaCorePriceInKRW = async () => {
	try {
		const apiKey = process.env.COIN_MARKET_CAP_API_KEY;
		const url =
			'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest';

		// Get the ROA Core (symbol: ROA) price in KRW (South Korean Won)
		const response = await axios.get(url, {
			headers: { 'X-CMC_PRO_API_KEY': apiKey },
			params: { symbol: 'ROA', convert: 'KRW' },
		});

		const roaCoreData = response.data.data.ROA;
		const roaCorePriceInKRW = roaCoreData.quote.KRW.price;

		// Apply a 30% discount to the live price
		const discountedPrice = roaCorePriceInKRW * 0.7;

		console.log(`ROA Core price in KRW with 30% discount: ${discountedPrice}`);
		return discountedPrice;
	} catch (error) {
		console.error('Error fetching ROA Core price in KRW:', error.message);
		return null;
	}
};
const getPrice = async (req, res) => {
	const price = await getRoaCorePriceInKRW();
	res.status(201).json({
		status: 'success',
		message: 'price of token in won',
		showableMessage: 'price of token in won',
		price,
	});
};

const buyToken = async (req, res) => {
	try {
		const { amountsOfWon, refCode, user_id } = req.body;
		const priceOfOneTokenInKRW = await getRoaCorePriceInKRW();
		const coinAmount = amountsOfWon / priceOfOneTokenInKRW;
		// Create and save UserPurchaseHistory
		const userPurchaseHistory = new UserPurchaseHistory({
			user_id: user_id,
			depositedWon: amountsOfWon,
			coinAmount: coinAmount,
			status: 0,
		});
		await userPurchaseHistory.save();

		let referralCashReward;

		if (refCode) {
			// Calculate referral reward (10% of amountsOfWon)
			const referralReward = coinAmount * 0.1;

			// Find the user with the given refCode
			const referringUser = await User.findOne({ refCode });

			// Check if referring user exists
			if (!referringUser) {
				return res.status(404).json({
					status: 'fail',
					message: 'Referring user not found',
					showableMessage: 'The referral code provided is not valid.',
				});
			}

			// Create and save ReferralCashReward
			referralCashReward = new ReferralCashReward({
				user_id: referringUser._id,
				referredTo: user_id,
				depositedWon: amountsOfWon,
				myReward: referralReward,
				status: 0,
			});
			await referralCashReward.save();
		}

		res.status(201).json({
			status: 'success',
			message: 'Purchase and referral data saved successfully',
			showableMessage: 'Your token purchase has been processed successfully.',
			userPurchaseHistory,
			referralCashReward,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			status: 'fail',
			message: 'An error occurred while saving the purchase and referral data',
			showableMessage:
				'An error occurred during the token purchase. Please try again.',
			error,
		});
	}
};
const getUserPurchaseHistory = async (req, res) => {
	try {
		const { user_id } = req.params;
		const userPurchaseHistory = await UserPurchaseHistory.find({
			user_id: user_id,
		});

		if (!userPurchaseHistory) {
			return res.status(404).json({
				status: 'fail',
				message: 'User purchase history not found',
				showableMessage: 'No purchase history found for this user.',
			});
		}

		res.status(200).json({
			status: 'success',
			message: 'User purchase history retrieved successfully',
			showableMessage: 'User purchase history has been retrieved.',
			userPurchaseHistory,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			status: 'fail',
			message: 'An error occurred while retrieving user purchase history',
			showableMessage:
				'An error occurred while fetching user purchase history. Please try again.',
			error,
		});
	}
};

const getReferralCashRewards = async (req, res) => {
	try {
		const { user_id } = req.params;

		const referralCashRewards = await ReferralCashReward.find({
			user_id: user_id,
		}).populate('referredTo', 'fullName -_id');

		if (!referralCashRewards) {
			return res.status(404).json({
				status: 'fail',
				message: 'Referral cash rewards not found',
				showableMessage: 'No referral cash rewards found for this user.',
			});
		}

		res.status(200).json({
			status: 'success',
			message: 'Referral cash rewards retrieved successfully',
			showableMessage: 'User referral cash rewards have been retrieved.',
			referralCashRewards,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			status: 'fail',
			message: 'An error occurred while retrieving referral cash rewards',
			showableMessage:
				'An error occurred while fetching referral cash rewards. Please try again.',
			error,
		});
	}
};

const getTokenPurchaseSummary = async (req, res) => {
	try {
		const { user_id } = req.params;

		// Fetch user purchase history for the given user_id
		const userPurchaseHistories = await UserPurchaseHistory.find({ user_id });

		if (!userPurchaseHistories.length) {
			return res.status(404).json({
				status: 'fail',
				message: 'User purchase history not found',
				showableMessage: 'No purchase history found for this user.',
			});
		}

		// Initialize the required data
		let totalPurchasedToken = 0;
		let totalUnLockupTokens = 0;
		let availableToWithdraw = 0;
		let totalDepositPending = 0;

		// Calculate the required data
		userPurchaseHistories.forEach((history) => {
			switch (history.status) {
				case 0:
					totalDepositPending += history.coinAmount;
					break;
				case 1:
					totalUnLockupTokens += history.coinAmount;
					break;
				case 2:
					availableToWithdraw += history.coinAmount;
					break;
				case 3:
					totalPurchasedToken += history.coinAmount;
					break;
			}
		});

		res.status(200).json({
			status: 'success',
			message: 'User purchase summary retrieved successfully',
			showableMessage: 'User purchase summary has been retrieved.',
			totalPurchasedToken,
			totalUnLockupTokens,
			availableToWithdraw,
			totalDepositPending,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			status: 'fail',
			message: 'An error occurred while retrieving user purchase summary',
			showableMessage:
				'An error occurred while fetching user purchase summary. Please try again.',
			error,
		});
	}
};

const getReferralRewardSummary = async (req, res) => {
	try {
		const { user_id } = req.params;

		const referralRewards = await ReferralCashReward.aggregate([
			{ $match: { user_id: mongoose.Types.ObjectId(user_id) } },
			{
				$group: {
					_id: '$status',
					totalReward: { $sum: '$myReward' },
				},
			},
		]);

		const rewardSummary = {
			totalPendingReward: 0,
			totalUnLockupQuantity: 0,
			availableReward: 0,
			totalRewardReceived: 0,
		};

		referralRewards.forEach((reward) => {
			switch (reward._id) {
				case 0:
					rewardSummary.totalPendingReward = reward.totalReward;
					break;
				case 1:
					rewardSummary.totalUnLockupQuantity = reward.totalReward;
					break;
				case 2:
					rewardSummary.availableReward = reward.totalReward;
					break;
				case 3:
					rewardSummary.totalRewardReceived = reward.totalReward;
					break;
			}
		});

		res.status(200).json({
			status: 'success',
			message: 'Referral reward summary retrieved successfully',
			showableMessage: 'Referral reward summary has been retrieved.',
			rewardSummary,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			status: 'fail',
			message: 'An error occurred while retrieving referral reward summary',
			showableMessage:
				'An error occurred while fetching the referral reward summary. Please try again.',
			error,
		});
	}
};
const withdrawPurchasedToken = async (req, res, next) => {
	try {
		const { user_id, purchaseHistoryId, otp } = req.body;
		// Check if user with given ID exists
		const user = await User.findById(user_id);
		if (!user) {
			return res.status(404).json({
				status: 'fail',
				showableMessage: 'User with this ID does not exist',
			});
		}

		// Check if reset code is valid and not expired
		const opt = await OPT.findOne({
			userId: user_id,
			code: otp,
			type: 'withdrawPurchasedToken',
		});
		if (!otp || otp.expiresAt < new Date()) {
			return res.status(400).json({
				status: 'fail',
				showableMessage: 'Invalid or expired  code',
			});
		}

		// Find the purchase history with given ID
		const purchaseHistory = await UserPurchaseHistory.findById(
			purchaseHistoryId
		);
		if (!purchaseHistory) {
			return res.status(404).json({
				status: 'fail',
				showableMessage: 'Purchase history with this ID does not exist',
			});
		}

		// Check if purchase history status is 2 (unlocked)
		if (purchaseHistory.status !== 2) {
			return res.status(400).json({
				status: 'fail',
				showableMessage: 'Purchase history status must be unlocked',
			});
		}

		// Update the purchase history status to 4 (withdrawn)
		purchaseHistory.status = 3;
		await purchaseHistory.save();

		// Respond with success message
		return res.json({
			status: 'success',
			showableMessage: 'Token purchase history withdrawn successfully',
		});
	} catch (error) {
		return next(error);
	}
};
const withdrawReward = async (req, res) => {
	try {
		const { user_id, referralCashRewardId, otp } = req.body;

		// Check if user with given user_id exists
		const user = await User.findById(user_id);
		if (!user) {
			return res.status(404).json({
				status: 'fail',
				showableMessage: 'User with this ID does not exist',
			});
		}

		// Check if referral cash reward with given id exists
		const referralCashReward = await ReferralCashReward.findById(
			referralCashRewardId
		);
		if (!referralCashReward) {
			return res.status(404).json({
				status: 'fail',
				showableMessage: 'Referral cash reward with this ID does not exist',
			});
		}

		// Check if referral cash reward status is 2
		if (referralCashReward.status !== 2) {
			return res.status(400).json({
				status: 'fail',
				showableMessage: 'Referral cash reward cannot be withdrawn',
			});
		}

		// Check if OTP is valid and not expired
		// Check if reset code is valid and not expired
		const opt = await OPT.findOne({
			userId: user_id,
			code: otp,
			type: 'withdrawReward',
		});
		if (!opt || opt.expiresAt < new Date()) {
			return res.status(400).json({
				status: 'fail',
				showableMessage: 'Invalid or expired  code',
			});
		}

		// Update referral cash reward status to 3 (withdrawn)
		referralCashReward.status = 3;
		await referralCashReward.save();

		// Respond with success message
		return res.json({
			status: 'success',
			showableMessage: 'Referral cash reward has been withdrawn',
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			status: 'fail',
			message: 'An error occurred while withdrawing referral cash reward',
			showableMessage:
				'An error occurred while withdrawing referral cash reward. Please try again.',
			error,
		});
	}
};

module.exports = {
	buyToken,
	getUserPurchaseHistory,
	getReferralCashRewards,
	getTokenPurchaseSummary,
	getReferralRewardSummary,
	withdrawPurchasedToken,
	withdrawReward,
	getPrice,
};
