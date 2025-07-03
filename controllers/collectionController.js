const Collection = require('../models/Collection');
const Track = require('../models/Track');

// @desc    Get all collections
// @route   GET /api/collections
// @access  Public
exports.getCollections = async (req, res) => {
    try {
        const collections = await Collection.find().sort({ name: 1 });
        res.json(collections);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера');
    }
};

// @desc    Get a single collection by ID with its tracks
// @route   GET /api/collections/:id
// @access  Public
exports.getCollectionById = async (req, res) => {
    try {
        const collection = await Collection.findById(req.params.id).populate({
            path: 'tracks',
            populate: {
                path: 'author',
                select: 'name' // Populate author of each track, select only name
            }
        });

        if (!collection) {
            return res.status(404).json({ msg: 'Сборник не найден' });
        }

        res.json(collection);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера');
    }
};

// @desc    Create a new collection
// @route   POST /api/collections
// @access  Private/Admin
exports.createCollection = async (req, res) => {
    const { name, description } = req.body;

    try {
        let collection = await Collection.findOne({ name });
        if (collection) {
            return res.status(400).json({ msg: 'Сборник с таким названием уже существует' });
        }

        const newCollectionData = {
            name,
            description,
            createdBy: req.user.id,
            tracks: []
        };

        if (req.file) {
            newCollectionData.coverImagePath = req.file.path;
        }

        collection = new Collection(newCollectionData);

        await collection.save();
        res.status(201).json(collection);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера');
    }
};

// @desc    Update a collection's details
// @route   PUT /api/collections/:id
// @access  Private/Admin
exports.updateCollection = async (req, res) => {
    const { name, description } = req.body;

    try {
        let collection = await Collection.findById(req.params.id);
        if (!collection) {
            return res.status(404).json({ msg: 'Сборник не найден' });
        }

        // Update fields if they are provided
        if (name) collection.name = name;
        if (description) collection.description = description;
        if (req.file) {
            collection.coverImagePath = req.file.path;
        }

        await collection.save();

        res.json(collection);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера');
    }
};

// @desc    Add a track to a collection
// @route   PUT /api/collections/:id/add-track
// @access  Private/Admin
exports.addTrackToCollection = async (req, res) => {
    const { trackId } = req.body;

    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Доступ запрещен' });
        }

        const collection = await Collection.findById(req.params.id);
        if (!collection) {
            return res.status(404).json({ msg: 'Сборник не найден' });
        }

        const track = await Track.findById(trackId);
        if (!track) {
            return res.status(404).json({ msg: 'Трек не найден' });
        }

        // Check if track is already in the collection to avoid duplicates
        if (collection.tracks.includes(trackId)) {
            return res.status(400).json({ msg: 'Трек уже в этом сборнике' });
        }

        collection.tracks.push(trackId);
        await collection.save();

        res.json(collection);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера');
    }
};


// @desc    Remove a track from a collection
// @route   PUT /api/collections/:id/remove-track
// @access  Private/Admin
exports.removeTrackFromCollection = async (req, res) => {
    const { trackId } = req.body;

    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Доступ запрещен' });
        }

        const collection = await Collection.findById(req.params.id);
        if (!collection) {
            return res.status(404).json({ msg: 'Сборник не найден' });
        }

        // Remove the track from the array
        collection.tracks = collection.tracks.filter(
            (id) => id.toString() !== trackId
        );

        await collection.save();

        res.json(collection);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера');
    }
};


// @desc    Delete a collection
// @route   DELETE /api/collections/:id
// @access  Private/Admin
exports.deleteCollection = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Доступ запрещен' });
        }

        const collection = await Collection.findById(req.params.id);
        if (!collection) {
            return res.status(404).json({ msg: 'Сборник не найден' });
        }

        await Collection.findByIdAndDelete(req.params.id);

        res.json({ msg: 'Сборник удален' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера');
    }
};
