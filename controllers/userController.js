const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const User = require('../models/User');

// @route   POST api/users/register
// @desc    Register a new user
// @access  Public
exports.register = async (req, res) => {
    const { username, password, role } = req.body;

    try {
        // Check if user exists
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Create new user instance
        user = new User({
            username,
            password,
            role
        });

        // Encrypt password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // Save user to DB
        await user.save();

        // Create and return JWT
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            config.get('jwtSecret'),
            { expiresIn: 3600 }, // Expires in 1 hour
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @route   POST api/users/login
// @desc    Login user & get token
// @access  Public
exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
        // Check if user exists
        let user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Create and return JWT
        const payload = {
            user: {
                id: user.id,
                role: user.role,
                username: user.username
            }
        };

        jwt.sign(
            payload,
            config.get('jwtSecret'),
            { expiresIn: 3600 }, // Expires in 1 hour
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @route   GET api/users
// @desc    Get all users
// @access  Public
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ username: 1 });
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};
