const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
var bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json({ limit: '50mb' }));
// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

// Listen for MongoDB connection success
mongoose.connection.on('open', () => {
	console.log('\x1b[32m%s\x1b[0m', 'MongoDB connected successfully');

	// Middleware
	app.use(express.json());
	app.use(cors());

	// Routes
	const authRoutes = require('./routes/auth.routes');

	app.use('/api/auth', authRoutes);

	// Error handling middleware
	app.use((err, req, res, next) => {
		console.error(err.stack);
		res.status(500).json({ message: 'Internal server error' });
	});

	// Start server
	const PORT = process.env.PORT || 3000;
	app.listen(PORT, () => {
		console.log(`Server listening on port ${PORT}`);
	});
});

// Listen for MongoDB connection errors
mongoose.connection.on('error', (err) => {
	console.error('\x1b[31m%s\x1b[0m', 'MongoDB connection error:', err);
});
