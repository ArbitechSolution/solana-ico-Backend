const mongoose = require('mongoose');
const { Schema } = mongoose;

const referralCashRewardSchema = new Schema({
	user_id: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	referredTo: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	depositedWon: {
		type: String,
		required: true,
	},
	myReward: {
		type: Number,
		required: true,
	},
	status: {
		type: Number,
		required: true,
		enum: [0, 1, 2, 3, 4],
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

referralCashRewardSchema.index({ code: 1 }); // Add index for faster queries

referralCashRewardSchema.virtual('user', {
	ref: 'User',
	localField: 'code',
	foreignField: 'code',
	justOne: true,
});

module.exports = mongoose.model('ReferralCashReward', referralCashRewardSchema);
