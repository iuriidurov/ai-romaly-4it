const Track = require('../models/Track');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// @route   GET api/tracks
// @desc    Get all approved tracks
// @access  Public
// @route   GET api/tracks/:id
// @desc    Get single track by ID
// @access  Public
exports.getTrackById = async (req, res) => {
    try {
        const track = await Track.findById(req.params.id).populate('author', 'name _id');

        if (!track) {
            return res.status(404).json({ msg: 'Трек не найден' });
        }

        // Трек доступен публично, если он одобрен
        if (track.status === 'approved') {
            return res.json(track);
        }

        // Если трек не одобрен, проверяем права доступа
        // Эта логика требует, чтобы у пользователя был токен.
        // Мы не будем использовать middleware, чтобы не блокировать публичный доступ к одобренным трекам.
        const token = req.header('authorization')?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ msg: 'Нет токена, доступ запрещен' });
        }

        try {
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded.user;

            // Доступ разрешен админу или автору трека
            if (req.user.role === 'admin' || track.author._id.toString() === req.user.id) {
                return res.json(track);
            } else {
                return res.status(403).json({ msg: 'Доступ к этому треку ограничен' });
            }
        } catch (jwtError) {
            return res.status(401).json({ msg: 'Невалидный токен' });
        }

    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Трек не найден' });
        }
        res.status(500).send('Ошибка сервера');
    }
};

exports.getTracks = async (req, res) => {
    try {
        // Только одобренные треки для главной страницы
        const tracks = await Track.find({ status: 'approved' }).populate('author', 'name _id').sort({ createdAt: -1 });
        res.json(tracks);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @route   POST api/tracks/upload
// @desc    Upload a track for moderation
// @access  Private
exports.uploadTrack = async (req, res) => {
    try {
        const { title } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'Файл не был загружен.' });
        }

        const status = req.user.role === 'admin' ? 'approved' : 'pending';

        const newTrack = new Track({
            title,
            filePath: req.file.path.replace(/\\/g, "/"),
            author: req.user.id,
            status
        });

        const track = await newTrack.save();
        const populatedTrack = await Track.findById(track._id).populate('author', 'name');
        res.status(201).json(populatedTrack);

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Ошибка на сервере: ' + err.message });
    }
};

// @route   PUT api/tracks/:id
// @desc    Update a track
// @access  Private
exports.updateTrack = async (req, res) => {
    const { title } = req.body;

    try {
        let track = await Track.findById(req.params.id);

        if (!track) {
            return res.status(404).json({ msg: 'Трек не найден' });
        }

        // Проверка прав: пользователь - автор трека или админ
        if (track.author.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ msg: 'Нет прав для редактирования' });
        }

        track = await Track.findByIdAndUpdate(
            req.params.id,
            { $set: { title } },
            { new: true }
        ).populate('author', 'name _id');

        res.json(track);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера');
    }
};

// @route   DELETE api/tracks/:id
// @desc    Delete a track
// @access  Private
exports.deleteTrack = async (req, res) => {
    try {
        const track = await Track.findById(req.params.id);
        if (!track) {
            return res.status(404).json({ msg: 'Track not found' });
        }

        if (req.user.role !== 'admin' && track.author.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        const filePath = path.join(__dirname, '..', track.filePath);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await Track.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Track removed' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @route   GET api/tracks/author/:authorId
// @desc    Get tracks by a specific author (all statuses)
// @access  Public
exports.getTracksByAuthor = async (req, res) => {
    const { authorId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    try {
        const tracks = await Track.find({ author: authorId })
            .populate('author', 'name _id')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalTracks = await Track.countDocuments({ author: authorId });

        res.json({
            tracks,
            totalPages: Math.ceil(totalTracks / limit),
            currentPage: page
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- Маршруты для модерации ---

// @route   GET api/tracks/pending
// @desc    Get all tracks pending moderation
// @access  Admin
exports.getPendingTracks = async (req, res) => {
    try {
        const tracks = await Track.find({ status: 'pending' }).populate('author', 'name').sort({ createdAt: 'desc' });
        res.json(tracks);
    } catch (err) {
        console.error('TRACK CONTROLLER_ERROR: Failed to fetch pending tracks', err.message);
        res.status(500).send('Server Error');
    }
};

// @route   PUT api/tracks/:id/approve
// @desc    Approve a track
// @access  Admin
exports.approveTrack = async (req, res) => {
    try {
        const track = await Track.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
        if (!track) {
            return res.status(404).json({ msg: 'Track not found' });
        }
        res.json(track);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @route   PUT api/tracks/:id/reject
// @desc    Reject a track
// @access  Admin
exports.rejectTrack = async (req, res) => {
    try {
        const track = await Track.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true });
        if (!track) {
            return res.status(404).json({ msg: 'Track not found' });
        }
        res.json(track);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
