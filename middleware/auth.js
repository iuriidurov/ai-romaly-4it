const jwt = require('jsonwebtoken');
const config = require('config');

module.exports = function(req, res, next) {
    // Get token from header
    const authHeader = req.header('Authorization');

    // Check if token exists and has the correct format ('Bearer <token>')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ msg: 'Authorization denied, token missing or malformed' });
    }

    try {
        // Get token from header by removing 'Bearer ' prefix
        const token = authHeader.substring(7);
        
        // Verify token
        const decoded = jwt.verify(token, config.get('jwtSecret'));
        
        // Add user from payload to request object
        req.user = decoded.user;
        
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};
