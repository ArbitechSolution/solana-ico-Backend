const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
	{
		fullName: {
			type: String,
			required: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
		},
		phoneNumber: {
			type: String,
			required: true,
		},
		password: {
			type: String,
		},
		refCode: {
			type: String,
			required: true,
		},
		walletAddress: {
			type: String,
			required: true,
		},
		status: { type: Number, default: 1 },
	},
	{ timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
