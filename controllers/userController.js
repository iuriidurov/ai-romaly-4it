const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Track = require('../models/Track');
const fs = require('fs');
const path = require('path');

// Helper function to generate and send JWT
const generateToken = (user, res) => {
    const payload = { user: { id: user.id, role: user.role, name: user.name } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 3600 }, (err, token) => {
        if (err) {
            console.error('USER_CONTROLLER_ERROR: JWT Signing failed', err);
            return res.status(500).json({ msg: 'Ошибка при создании токена' });
        }
        res.json({ token, role: user.role });
    });
};

// @route   POST api/users/register
// @desc    Register a new user
// @access  Public
exports.register = async (req, res) => {
    const { name, emailOrPhone, password, password2 } = req.body;

    if (!name || !emailOrPhone || !password || !password2) {
        return res.status(400).json({ msg: 'Пожалуйста, заполните все поля' });
    }
    if (password !== password2) {
        return res.status(400).json({ msg: 'Пароли не совпадают' });
    }

    try {
        let user = await User.findOne({ emailOrPhone });
        if (user) {
            return res.status(400).json({ msg: 'Пользователь с таким E-mail или телефоном уже существует' });
        }

        user = new User({ name, emailOrPhone, password, role: 'author' });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        generateToken(user, res);

    } catch (err) {
        console.error('USER_CONTROLLER_ERROR: Register failed', err);
        res.status(500).json({ msg: 'Ошибка на сервере' });
    }
};

// @route   POST api/users/login
// @desc    Login user & get token
// @access  Public
exports.login = async (req, res) => {
    const { emailOrPhone, password } = req.body;
    try {
        let user = await User.findOne({ $or: [{ emailOrPhone }, { name: emailOrPhone }] });
        if (!user) {
            return res.status(400).json({ msg: 'Неверные учетные данные' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Неверные учетные данные' });
        }

        generateToken(user, res);

    } catch (err) {
        console.error('USER_CONTROLLER_ERROR: Login failed', err);
        res.status(500).json({ msg: 'Ошибка на сервере' });
    }
};

// @route   GET api/users
// @desc    Get all users
// @access  Public
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ name: 1 });
        res.json(users);
    } catch (err) {
        console.error('USER_CONTROLLER_ERROR: GetUsers failed', err);
        res.status(500).json({ msg: 'Ошибка на сервере' });
    }
};

// @route   POST api/users/forgot-password
// @desc    Forgot password - generate token
// @access  Public
exports.forgotPassword = async (req, res) => {
    const { emailOrPhone } = req.body;
    try {
        const user = await User.findOne({ emailOrPhone });
        if (!user) {
            return res.json({ msg: 'Если такой пользователь существует, на его адрес отправлены инструкции по восстановлению.' });
        }

        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password.html?token=${resetToken}`;
        console.log('Ссылка для сброса пароля:', resetUrl);

        res.json({ msg: 'Если такой пользователь существует, на его адрес отправлены инструкции по восстановлению.' });
    } catch (err) {
        console.error('USER_CONTROLLER_ERROR: ForgotPassword failed', err);
        res.status(500).json({ msg: 'Ошибка на сервере' });
    }
};

// @route   POST api/users/reset-password/:token
// @desc    Reset password using token
// @access  Public
exports.resetPassword = async (req, res) => {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    try {
        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ msg: 'Токен недействителен или срок его действия истек.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ msg: 'Пароль успешно обновлен.' });
    } catch (err) {
        console.error('USER_CONTROLLER_ERROR: ResetPassword failed', err);
        res.status(500).json({ msg: 'Ошибка на сервере' });
    }
};

// @desc    Get all users with role 'author'
// @access  Public
exports.getAuthors = async (req, res) => {
    try {
        const authors = await User.find({ role: { $in: ['author', 'admin'] } }).select('name -_id').limit(10);
        res.json(authors);
    } catch (err) {
        console.error('USER_CONTROLLER_ERROR: GetAuthors failed', err);
        res.status(500).send('Ошибка сервера');
    }
};

// @route   DELETE api/users/:id
// @desc    Delete a user and their tracks by Admin
// @access  Private (Admin)
exports.deleteUser = async (req, res) => {
    try {
        const userIdToDelete = req.params.id;
        const adminId = req.user.id;

        if (userIdToDelete === adminId) {
            return res.status(400).json({ msg: 'Администратор не может удалить собственную учетную запись.' });
        }

        const user = await User.findById(userIdToDelete);
        if (!user) {
            return res.status(404).json({ msg: 'Пользователь не найден.' });
        }

        const tracks = await Track.find({ author: userIdToDelete });

        for (const track of tracks) {
            const trackPath = path.join(__dirname, '..', track.filePath);
            try {
                if (fs.existsSync(trackPath)) {
                    fs.unlinkSync(trackPath);
                }
            } catch (err) {
                console.error(`USER_CONTROLLER_ERROR: Failed to delete track file ${trackPath}`, err);
            }
        }

        await Track.deleteMany({ author: userIdToDelete });
        await User.findByIdAndDelete(userIdToDelete);

        res.json({ msg: `Пользователь ${user.name} и все его треки были успешно удалены.` });

    } catch (err) {
        console.error('USER_CONTROLLER_ERROR: DeleteUser failed', err);
        res.status(500).json({ msg: 'Ошибка на сервере при удалении пользователя.' });
    }
};
