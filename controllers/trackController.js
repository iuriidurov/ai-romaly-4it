const Track = require('../models/Track');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// @route   GET api/tracks
// @desc    Get all tracks
// @access  Public
exports.getTracks = async (req, res) => {
    try {
                                const tracks = await Track.find().populate('author', 'username _id').sort({ createdAt: -1 });
        res.json(tracks);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @route   POST api/tracks
// @desc    Upload a new track
// @access  Private
exports.uploadTrack = async (req, res) => {
    const { title, collectionName } = req.body;
    const filePath = req.file.path;

    try {
        const newTrack = new Track({
            title,
            collectionName,
            filePath,
            author: req.user.id
        });

        const track = await newTrack.save();
        // Populate author info for the response
                const populatedTrack = await Track.findById(track._id).populate('author', 'username _id');

        res.json(populatedTrack);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
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
        if (track.author.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Delete file from server
        fs.unlink(path.join(__dirname, '..', track.filePath), async (err) => {
            if (err) {
                console.error(err);
                // Still try to remove from DB even if file deletion fails
            }
            await Track.findByIdAndDelete(req.params.id);
            res.json({ msg: 'Track removed' });
        });

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
