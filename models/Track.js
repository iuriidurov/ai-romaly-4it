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
    collectionId: {
        type: Schema.Types.ObjectId,
        ref: 'Collection',
        required: false
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    filePath: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Track', TrackSchema);
