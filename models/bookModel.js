const mongoose = require('mongoose');
const Scheme = mongoose.Schema
const bookScheme = new Scheme({
    bookName : {
        type : String,
        required : true
    },
    bookDetails : {
        type : String,
        required : true
    },
    author : {
        type : mongoose.SchemaTypes.ObjectId,
        ref : 'author'
    },
    genre : {
        type : mongoose.SchemaTypes.ObjectId,
        ref : 'genre'
    },
    language : {
        type : String,
        required : true
    },
    coverImage : {
        type : String,
    },
    image1 : {
        type : String,
        required : true
    },
    image2 : {
        type : String,
        required : true
    },
    image3 : {
        type : String,
        required : true
    },
    rating : {
        type : Number,
        required : true
    },
    pages : {
        type : Number,
        required : true
    },
    retailPrice : {
        type : Number,
        required : true
    },
    price: {
        type : Number,
    },
    discountOffer: {
        type: Number,
    },
    stock: {
        type: Number,  
        required: true,
        default: 0     
    },
    delete : Boolean,
    offerType: {
        type: String,
        enum: ['productOffer','categoryOffer', ''],
    },
    isOfferProduct: Boolean,
    productOfferPrice: {
        type : Number,
    },
    genreOfferPrice: {
        type: Number
    }
   
});

const book = mongoose.model('book', bookScheme);

module.exports = book;