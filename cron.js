const cron = require('node-cron');
const mongoose = require('mongoose');
const UserPurchaseHistory = require('./models/user.purchaseHistroy');
const ReferralCashReward = require('./models/user.referralCashReward');

const updateStatusAfter14Days = async () => {
	const now = new Date();
	const dateBefore14Days = new Date(now - 14 * 24 * 60 * 60 * 1000);

	// Update status in UserPurchaseHistory model
	await UserPurchaseHistory.updateMany(
		{ status: 1, createdAt: { $lte: dateBefore14Days } },
		{ status: 2 }
	);

	// Update status in ReferralCashReward model
	await ReferralCashReward.updateMany(
		{ status: 1, createdAt: { $lte: dateBefore14Days } },
		{ status: 2 }
	);
};

// Schedule the cron job to run every day at 00:00 (midnight)
cron.schedule('0 0 * * *', async () => {
	console.log('Running update status cron job');
	await updateStatusAfter14Days();
	console.log('Update status cron job completed');
});
