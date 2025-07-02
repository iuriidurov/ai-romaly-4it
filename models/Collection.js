const mongoose = require('mongoose');

const CollectionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Название сборника обязательно'],
        unique: true,
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Collection', CollectionSchema);
