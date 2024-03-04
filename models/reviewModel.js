const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
    product: {
        type: Schema.Types.ObjectId,
        ref: 'book',
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    rating: {
        type: Number,
        required: true
    },
    reviewText: {
        type: String,
        required: true
    },
});

const review = mongoose.model('Review', reviewSchema);

module.exports = review;