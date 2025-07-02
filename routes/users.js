const express = require('express');
const router = express.Router();

// Import all required controller functions
const {
    register,
    login,
    getUsers,
    forgotPassword,
    resetPassword,
    getAuthors,
    deleteUser
} = require('../controllers/userController');

const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// @route   POST api/users/register
// @desc    Register a new user
// @access  Public
router.post('/register', register);

// @route   POST api/users/login
// @desc    Login user & get token
// @access  Public
router.post('/login', login);

// @route   POST api/users/forgot-password
// @desc    Forgot password - generate token
// @access  Public
router.post('/forgot-password', forgotPassword);

// @route   POST api/users/reset-password/:token
// @desc    Reset password using token
// @access  Public
router.post('/reset-password/:token', resetPassword);

// @route   GET api/users
// @desc    Get all users
// @access  Public
router.get('/', getUsers);

// @route   GET api/users/authors
// @desc    Get top authors
// @access  Public
router.get('/authors', getAuthors);

// @route   DELETE api/users/:id
// @desc    Delete a user and their tracks
// @access  Private (Admin only)
router.delete('/:id', [auth, admin], deleteUser);

module.exports = router;
