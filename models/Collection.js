const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CollectionSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        maxlength: 1000
    },
    coverImagePath: {
        type: String,
        required: true
    },
    tracks: [{
        type: Schema.Types.ObjectId,
        ref: 'Track'
    }],
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Collection', CollectionSchema);
