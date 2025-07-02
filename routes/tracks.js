const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
    getTracks,
    uploadTrack,
    deleteTrack,
    getTracksByAuthor,
    getCollections
} = require('../controllers/trackController');

// Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'uploads/';
        // Ensure the uploads directory exists
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Use a timestamp for unique filenames to avoid conflicts
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// File filter for MP3 files
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3') {
        cb(null, true); // Accept file
    } else {
        cb(new Error('Разрешены только .mp3 файлы!'), false); // Reject file
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 1024 * 1024 * 20 } // 20 MB file size limit
});

// @route   GET api/tracks/collections
// @desc    Get all unique collection names
// @access  Public
router.get('/collections', getCollections);

// @route   GET api/tracks
// @desc    Get all tracks
// @access  Public
router.get('/', getTracks);

// @route   POST api/tracks/upload
// @desc    Upload a track
// @access  Private
router.post('/upload', [auth, upload.single('trackFile')], uploadTrack);

// @route   DELETE api/tracks/:id
// @desc    Delete a track
// @access  Private
router.delete('/:id', auth, deleteTrack);

// @route   GET api/tracks/author/:authorId
// @desc    Get tracks by a specific author
// @access  Public
router.get('/author/:authorId', getTracksByAuthor);

module.exports = router;
