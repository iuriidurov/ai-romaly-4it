const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin'); // Импортируем middleware админа
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
    getTracks,
    uploadTrack,
    deleteTrack,
    getTracksByAuthor,
    getPendingTracks, // Импортируем новые функции
    approveTrack,
    rejectTrack,
    getTrackById,
    updateTrack
} = require('../controllers/trackController');

// Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'uploads/';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// File filter for MP3 files
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3') {
        cb(null, true);
    } else {
        cb(new Error('Разрешены только .mp3 файлы!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 1024 * 1024 * 20 } // 20 MB
});

// --- Основные маршруты ---

// @route   GET api/tracks
// @desc    Get all approved tracks
// @access  Public
router.get('/', getTracks);


// --- Маршруты для модерации (только для админа) ---

// @route   GET api/tracks/pending
// @desc    Get all tracks pending moderation
// @access  Admin
router.get('/pending', [auth, admin], getPendingTracks);

// --- Основные маршруты ---

// @route   GET api/tracks/:id
// @desc    Get a single track by ID
// @access  Public
router.get('/:id', getTrackById);

// @route   POST api/tracks/upload
// @desc    Upload a track for moderation
// @access  Private
router.post('/upload', [auth, upload.single('trackFile')], uploadTrack);

// @route   DELETE api/tracks/:id
// @desc    Delete a track
// @access  Private
router.delete('/:id', auth, deleteTrack);

// @route   PUT api/tracks/:id
// @desc    Update a track
// @access  Private
router.put('/:id', auth, updateTrack);

// @route   GET api/tracks/author/:authorId
// @desc    Get tracks by a specific author
// @access  Public
router.get('/author/:authorId', getTracksByAuthor);

// @route   PUT api/tracks/:id/approve
// @desc    Approve a track
// @access  Admin
router.put('/:id/approve', [auth, admin], approveTrack);

// @route   PUT api/tracks/:id/reject
// @desc    Reject a track
// @access  Admin
router.put('/:id/reject', [auth, admin], rejectTrack);


module.exports = router;
