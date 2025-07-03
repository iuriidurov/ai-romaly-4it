const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Ensure upload directory exists
const uploadDir = 'uploads/covers';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config for cover images
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

const {
    getCollections,
    getCollectionById,
    createCollection,
    updateCollection,
    deleteCollection,
    addTrackToCollection,
    removeTrackFromCollection
} = require('../controllers/collectionController');

// Public routes
router.get('/', getCollections);
router.get('/:id', getCollectionById);

// Private/Admin routes
router.post('/', [auth, admin, upload.single('coverImage')], createCollection);
router.put('/:id', [auth, admin, upload.single('coverImage')], updateCollection);
router.delete('/:id', [auth, admin], deleteCollection);
router.put('/:id/add-track', [auth, admin], addTrackToCollection);
router.put('/:id/remove-track', [auth, admin], removeTrackFromCollection);

module.exports = router;
