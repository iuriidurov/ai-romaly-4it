const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const {
    getTracks,
    uploadTrack,
    deleteTrack,
    getTracksByAuthor
} = require('../controllers/trackController');

// Multer config for file upload
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function(req, file, cb){
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 }, // Limit file size to 10MB
    fileFilter: function(req, file, cb){
        checkFileType(file, cb);
    }
}).single('track'); // 'track' is the field name in the form

// Check File Type
function checkFileType(file, cb){
    // Allowed ext
    const filetypes = /jpeg|jpg|png|gif|mp3|wav/;
    // Check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime
    const mimetype = filetypes.test(file.mimetype);

    if(mimetype && extname){
        return cb(null,true);
    } else {
        cb('Error: Audio Files Only!');
    }
}

// @route   GET api/tracks
// @desc    Get all tracks
// @access  Public
router.get('/', getTracks);

// @route   POST api/tracks
// @desc    Upload a new track
// @access  Private
router.post('/', [auth, upload], uploadTrack);

// @route   DELETE api/tracks/:id
// @desc    Delete a track
// @access  Private
router.delete('/:id', auth, deleteTrack);

// @route   GET api/tracks/author/:authorId
router.get('/author/:authorId', getTracksByAuthor);

module.exports = router;
