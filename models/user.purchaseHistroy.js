const mongoose = require('mongoose');
const { Schema } = mongoose;

const userPurchaseHistorySchema = new Schema({
	user_id: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	depositedWon: {
		type: Number,
		required: true,
	},
	coinAmount: {
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

module.exports = mongoose.model(
	'UserPurchaseHistory',
	userPurchaseHistorySchema
);
