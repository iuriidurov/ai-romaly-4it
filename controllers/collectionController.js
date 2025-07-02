const Collection = require('../models/Collection');
const Track = require('../models/Track');

// @desc    Get all collections
// @route   GET /api/collections
// @access  Private
exports.getCollections = async (req, res) => {
    try {
        const collections = await Collection.find().sort({ name: 1 });
        res.json(collections);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера');
    }
};

// @desc    Create a new collection
// @route   POST /api/collections
// @access  Private (Admin only)
exports.createCollection = async (req, res) => {
    const { name } = req.body;
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Доступ запрещен' });
        }
        let collection = await Collection.findOne({ name });
        if (collection) {
            return res.status(400).json({ msg: 'Сборник с таким названием уже существует' });
        }

        collection = new Collection({ name });
        await collection.save();
        res.status(201).json(collection);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера');
    }
};

// @desc    Update a collection
// @route   PUT /api/collections/:id
// @access  Private (Admin only)
exports.updateCollection = async (req, res) => {
    const { name } = req.body;
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Доступ запрещен' });
        }
        let collection = await Collection.findById(req.params.id);
        if (!collection) {
            return res.status(404).json({ msg: 'Сборник не найден' });
        }

        const oldName = collection.name;
        
        collection.name = name;
        await collection.save();

        await Track.updateMany({ collectionName: oldName }, { collectionName: name });

        res.json(collection);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера');
    }
};

// @desc    Delete a collection
// @route   DELETE /api/collections/:id
// @access  Private (Admin only)
exports.deleteCollection = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Доступ запрещен' });
        }
        const collection = await Collection.findById(req.params.id);
        if (!collection) {
            return res.status(404).json({ msg: 'Сборник не найден' });
        }

        await Track.updateMany({ collectionName: collection.name }, { collectionName: 'Без сборника' });

        await Collection.findByIdAndDelete(req.params.id);

        res.json({ msg: 'Сборник удален. Все треки из этого сборника были перемещены в "Без сборника".' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Ошибка сервера');
    }
};
