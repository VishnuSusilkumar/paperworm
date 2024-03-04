const mongoose = require('mongoose');
const Scheme = mongoose.Schema
const genreScheme = new Scheme({
    genreName : String,
    delete : Boolean,
    isOfferCategory: Boolean,
    discountOffer: Number
})

const genre = mongoose.model('genre', genreScheme);

module.exports = genre;