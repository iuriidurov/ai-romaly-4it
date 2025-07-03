const Track = require('../models/Track');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// @route   GET api/tracks
// @desc    Get all approved tracks
// @access  Public
exports.getTracks = async (req, res) => {
    try {
        // Только одобренные треки для главной страницы
        const tracks = await Track.find({ status: 'approved' }).populate('author', 'name _id').populate('collectionId', 'name').sort({ createdAt: -1 });
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
        const { title, collectionId } = req.body; // Используем collectionId

        if (!req.file) {
            return res.status(400).json({ message: 'Файл не был загружен.' });
        }

        const newTrack = new Track({
            title,
            collectionId: collectionId || null,
            filePath: req.file.path.replace(/\\/g, "/"),
            author: req.user.id
            // Статус по умолчанию 'pending' из модели
        });

        const track = await newTrack.save();
        const populatedTrack = await Track.findById(track._id).populate('author', 'name');
        res.status(201).json(populatedTrack);

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Ошибка на сервере: ' + err.message });
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
        console.error(err.message);
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
