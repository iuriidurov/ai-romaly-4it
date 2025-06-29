const express = require('express');
const router = express.Router();

const { register, login, getUsers } = require('../controllers/userController');

// @route   POST api/users/register
// @desc    Register a new user (author)
// @access  Public
router.post('/register', register);

// @route   POST api/users/login
// @desc    Login user
// @access  Public
router.post('/login', login);

// @route   GET api/users
router.get('/', getUsers);

module.exports = router;
