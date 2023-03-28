// Verify JWT token middleware
const jwt = require('jsonwebtoken');
exports.verifyToken = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ status: 'fail', message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ status: 'fail', message: 'Invalid token' });
  }
};