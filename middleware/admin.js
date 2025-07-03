const jwt = require('jsonwebtoken');
const config = require('config');

// Middleware to check for admin role
const admin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied. Admin role required.' });
    }
    next();
};

module.exports = admin;
