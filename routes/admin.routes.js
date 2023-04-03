const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifyToken } = require('../middleware/verifyToken');

// Register a new user
router.all('/register', adminController.register);

// Login with existing user
router.all('/login', adminController.login);

router.all('/getAllUsers', adminController.getAllUsers);

router.all('/changePassword', adminController.changePassword);

router.all('/changeAdminDetails', adminController.changeAdminDetails);

router.all(
	'/getAllUserPurchaseHistory',
	adminController.getAllUserPurchaseHistory
);

router.all(
	'/getAllReferralCashRewardHistory',
	adminController.getAllReferralCashRewardHistory
);

router.all(
	'/updateUserPurchaseHistoryStatus',
	adminController.updateUserPurchaseHistoryStatus
);

router.all(
	'/updateReferralCashRewardStatus',
	adminController.updateReferralCashRewardStatus
);

module.exports = router;
