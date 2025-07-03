const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

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
// These routes are protected and require admin privileges.
router.post('/', [auth, admin], createCollection);
router.put('/:id', [auth, admin], updateCollection);
router.delete('/:id', [auth, admin], deleteCollection);
router.put('/:id/add-track', [auth, admin], addTrackToCollection);
router.put('/:id/remove-track', [auth, admin], removeTrackFromCollection);

module.exports = router;
