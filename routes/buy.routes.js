const express = require('express');
const router = express.Router();
const buyController = require('../controllers/buy.controller');
const { verifyToken } = require('../middleware/verifyToken');

// Register a new user
router.all('/buyToken', verifyToken, buyController.buyToken);
router.all(
	'/getReferralCashRewards/:user_id',
	verifyToken,
	buyController.getReferralCashRewards
);
router.all(
	'/getUserPurchaseHistory/:user_id',
	verifyToken,
	buyController.getUserPurchaseHistory
);
router.all(
	'/getTokenPurchaseSummary/:user_id',
	verifyToken,
	buyController.getTokenPurchaseSummary
);
router.all(
	'/getReferralRewardSummary/:user_id',
	verifyToken,
	buyController.getReferralRewardSummary
);

router.all(
	'/withdrawPurchasedToken',
	verifyToken,
	buyController.withdrawPurchasedToken
);
router.all('/withdrawReward', verifyToken, buyController.withdrawReward);

module.exports = router;
