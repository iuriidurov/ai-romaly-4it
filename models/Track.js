const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TrackSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    collectionName: {
        type: String,
        required: false // A track might not belong to a collection
    },
    filePath: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Track', TrackSchema);
