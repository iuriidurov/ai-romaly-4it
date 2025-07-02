const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    getCollections,
    createCollection,
    updateCollection,
    deleteCollection
} = require('../controllers/collectionController');

// @route   GET api/collections
// @desc    Get all collections
// @access  Private
router.get('/', auth, getCollections);

// @route   POST api/collections
// @desc    Create a collection
// @access  Private (Admin only)
router.post('/', auth, createCollection);

// @route   PUT api/collections/:id
// @desc    Update a collection
// @access  Private (Admin only)
router.put('/:id', auth, updateCollection);

// @route   DELETE api/collections/:id
// @desc    Delete a collection
// @access  Private (Admin only)
router.delete('/:id', auth, deleteCollection);

module.exports = router;
