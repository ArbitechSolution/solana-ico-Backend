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
		const discountedPrice = roaCorePriceInKRW * 0.8;

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
		if (!refCode) {
			return res.json({
				status: 'fail',
				message: 'RefCode is must',
				showableMessage: '추천인 코드를 입력하세요',
			});
		}
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
		// Calculate referral reward (10% of amountsOfWon)
		const referralReward = coinAmount * 0.1;

		// Find the user with the given refCode
		const referringUser = await User.findOne({ refCode });

		// Check if referring user exists
		if (!referringUser) {
			return res.status(404).json({
				status: 'fail',
				message: 'Referring user not found',
				showableMessage: '추천 코드가 유효하지 않습니다.',
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

		res.status(201).json({
			status: 'success',
			message: 'Purchase and referral data saved successfully',
			showableMessage: '토큰 구매가 성공적으로 처리되었습니다',
			userPurchaseHistory,
			referralCashReward,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			status: 'fail',
			message: 'An error occurred while saving the purchase and referral data',
			showableMessage: '토큰 구매 중 오류가 발생했습니다. 다시 시도해 주세요.',
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
				showableMessage: '이 사용자의 구매 내역이 없습니다.',
			});
		}

		res.status(200).json({
			status: 'success',
			message: 'User purchase history retrieved successfully',
			showableMessage: '사용자 구매 내역이 검색되었습니다.',
			userPurchaseHistory,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			status: 'fail',
			message: 'An error occurred while retrieving user purchase history',
			showableMessage:
				'사용자 구매 내역을 가져오는 중에 오류가 발생했습니다. 다시 시도해 주세요.',
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
				showableMessage: '이 사용자에 대한 추천 보상이 없습니다.',
			});
		}

		res.status(200).json({
			status: 'success',
			message: 'Referral cash rewards retrieved successfully',
			showableMessage: '사용자 추천 현금 보상이 검색되었습니다.',
			referralCashRewards,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			status: 'fail',
			message: 'An error occurred while retrieving referral cash rewards',
			showableMessage:
				'추천 보상을 가져오는 동안 오류가 발생했습니다. 다시 시도해 주세요.',
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
				showableMessage: '이 사용자에 대한 구매 내역이 없습니다.',
			});
		}

		// Initialize the required data
		let totalPurchasedToken = 0;
		let totalLockupTokens = 0;
		let totalUnLockupQuantity = 0;
		let totalDepositPending = 0;

		// Calculate the required data
		userPurchaseHistories.forEach((history) => {
			switch (history.status) {
				case 0:
					totalDepositPending += history.coinAmount;
					break;
				case 1:
					totalLockupTokens += history.coinAmount;
					break;
				case 2:
					totalUnLockupQuantity += history.coinAmount;
					break;
			}
			totalPurchasedToken += history.coinAmount;
		});

		res.status(200).json({
			status: 'success',
			message: 'User purchase summary retrieved successfully',
			showableMessage: '사용자 구매 요약이 검색되었습니다.',
			totalPurchasedToken,
			totalLockupTokens,
			totalUnLockupQuantity,
			totalDepositPending,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			status: 'fail',
			message: 'An error occurred while retrieving user purchase summary',
			showableMessage:
				'사용자 구매 요약을 가져오는 중에 오류가 발생했습니다. 다시 시도하십시오.',
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
			totalRewardReceived: 0,
			totalLockupQuantity: 0,
			totalUnLockupQuantity: 0,
			totalPendingReward: 0,
		};

		referralRewards.forEach((reward) => {
			switch (reward._id) {
				case 0:
					rewardSummary.totalPendingReward = reward.totalReward;
					break;
				case 1:
					rewardSummary.totalLockupQuantity = reward.totalReward;
					break;
				case 2:
					rewardSummary.totalUnLockupQuantity = reward.totalReward;
					break;
			}
			rewardSummary.totalRewardReceived += reward.totalReward;
		});

		res.status(200).json({
			status: 'success',
			message: 'Referral reward summary retrieved successfully',
			showableMessage: '추천 보상 요약이 검색되었습니다.',
			rewardSummary,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			status: 'fail',
			message: 'An error occurred while retrieving referral reward summary',
			showableMessage:
				'추천 보상 요약을 가져오는 중에 오류가 발생했습니다. 다시 시도해 주세요.',
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
				showableMessage: '이 ID를 가진 사용자가 존재하지 않습니다',
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
				showableMessage: '유효하지 않거나 만료된 코드',
			});
		}

		// Find the purchase history with given ID
		const purchaseHistory = await UserPurchaseHistory.findById(
			purchaseHistoryId
		);
		if (!purchaseHistory) {
			return res.status(404).json({
				status: 'fail',
				showableMessage: '이 ID의 구매 내역이 존재하지 않습니다.',
			});
		}

		// Check if purchase history status is 2 (unlocked)
		if (purchaseHistory.status !== 2) {
			return res.status(400).json({
				status: 'fail',
				showableMessage: '구매 내역 상태가 잠금 해제되어야 합니다',
			});
		}

		// Update the purchase history status to 4 (withdrawn)
		purchaseHistory.status = 3;
		await purchaseHistory.save();

		// Respond with success message
		return res.json({
			status: 'success',
			showableMessage: '토큰 출금 성공 ',
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
				showableMessage: '이 ID를 가진 사용자가 존재하지 않습니다',
			});
		}

		// Check if referral cash reward with given id exists
		const referralCashReward = await ReferralCashReward.findById(
			referralCashRewardId
		);
		if (!referralCashReward) {
			return res.status(404).json({
				status: 'fail',
				showableMessage: '이 ID의 추천 보상이 존재하지 않습니다.',
			});
		}
		// Check if referral cash reward status is 2
		if (referralCashReward.status !== 2) {
			return res.status(400).json({
				status: 'fail',
				showableMessage: '추천인  보상 출금이 불가합니다',
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
				showableMessage: '잘못되었거나 만료된 코드',
			});
		}

		// Update referral cash reward status to 3 (withdrawn)
		referralCashReward.status = 3;
		await referralCashReward.save();

		// Respond with success message
		return res.json({
			status: 'success',
			showableMessage: '추천인 현금 보상 출금완료',
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			status: 'fail',
			message: 'An error occurred while withdrawing referral cash reward',
			showableMessage:
				'추천인 리워드 출금 중 오류가 발생했습니다. 다시 시도해 주세요.',
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
