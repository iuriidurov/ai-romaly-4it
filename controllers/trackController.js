const Track = require('../models/Track');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// @route   GET api/tracks
// @desc    Get all tracks
// @access  Public
exports.getTracks = async (req, res) => {
    try {
        const tracks = await Track.find().populate('author', 'name _id').sort({ createdAt: -1 });
        res.json(tracks);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @route   POST api/tracks/upload
// @desc    Upload a track
// @access  Private
exports.uploadTrack = async (req, res) => {
    try {
        const { title, collectionName } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'Файл не был загружен. Убедитесь, что это MP3 файл размером до 20МБ.' });
        }

        const newTrack = new Track({
            title,
            collectionName,
            filePath: req.file.path.replace(/\\/g, "/"), // Normalize path for consistency
            author: req.user.id
        });

        const track = await newTrack.save();
        
        // Populate author details to send back to the client
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

        // Check user authorization
        // User must be the author or an admin to delete
                if (req.user.role !== 'admin' && (!track.author || track.author.toString() !== req.user.id)) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Delete the actual file from the server
        const filePath = path.join(__dirname, '..', track.filePath);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await Track.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Track removed' });

    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Track not found' });
        }
        res.status(500).send('Server Error');
    }
};

// @route   GET api/tracks/author/:authorId
// @desc    Get tracks by a specific author with pagination
// @access  Public
exports.getTracksByAuthor = async (req, res) => {
    const { authorId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    try {
        const tracks = await Track.find({ author: authorId })
            .populate('author', 'username _id')
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

// @route   GET api/tracks/collections
// @desc    Get all unique collection names
// @access  Public
const predefinedCollections = [
    "Каверы известных песен",
    "Извинение после ссоры",
    "Признание в любви",
    "Предложение руки и сердца",
    "Свадебный подарок от друзей",
    "Годовщина отношений",
    "На день рождения/юбилей",
    "Для ребёнка от родителей",
    "Для друзей",
    "Ребёнку на выступление",
    "Прощание (переезд, утрата)",
    "Для коллег по работе, начальнику",
    "Мои топ-10"
];

// @route   GET api/tracks/collections
// @desc    Get all unique collection names, merging predefined and DB ones
// @access  Public
exports.getCollections = async (req, res) => {
    try {
        // Find all distinct collection names from tracks in the DB
        const dbCollections = await Track.distinct('collectionName', { collectionName: { $ne: null, $ne: "" } });
        
        // Merge predefined with DB collections, ensure uniqueness, and sort alphabetically
        const allCollections = [...new Set([...predefinedCollections, ...dbCollections])].sort();
        
        res.json(allCollections);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Ошибка на сервере при получении списка сборников.' });
    }
};
