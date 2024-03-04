const { response } = require("express");
const fs = require("fs");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const session = require("express-session");
dotenv.config();
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const moment = require('moment');


const user = require("../models/userModel");
const author = require("../models/authorModel");
const book = require("../models/bookModel");
const genre = require("../models/genreModel");
const order = require("../models/orderModel");
const coupon = require("../models/couponModel");
const WalletTransaction = require('../models/walletModel');


const renderProductOffer = async (req, res) => {
    try {
      const books = await book.find().populate("author").populate("genre");
      
  
      res.render("admin/productOffer.ejs", { books });
    } catch (err) {
      console.error(`Error Get Product Offer : ${err}`);
      res.redirect("/admin/admin_panel");
    }
  };


  const createProductOffer = async (req, res) => {
    try {
        const { bookId, discountPercentage } = req.body;
        const books = await book.findById(bookId).populate('genre');

        if (!books) {
            return res.status(404).json({ error: 'Book not found' });
        }

        // Apply the discount offer
        const discount = (discountPercentage / 100) * books.price;
        const newRetailPrice = books.price - discount;
         
        // Apply the discount offer
        books.discountOffer = discountPercentage;
        books.isOfferProduct = true;
        books.offerType = 'productOffer';
        books.productOfferPrice = parseInt(newRetailPrice);
        
        if(books.genre.isOfferCategory == true && books.genreOfferPrice < newRetailPrice){
          books.retailPrice = books.genreOfferPrice;
        } else {
          books.retailPrice = parseInt(newRetailPrice);
        }
        
        // Save the updated book
        await books.save();
        
        res.redirect("/admin/productOffer");

    } catch (err) {
        console.error(`Error Create Product Offer : ${err}`);
        res.redirect("/admin/admin_panel");
    }
  }

  const editProductOffer = async (req, res) => {
    try {
        const { newDiscountPercentage, bookId } = req.body;
        

        const books = await book.findById(bookId);

        if (!books) {
            return res.status(404).json({ error: 'Book not found' });
        }

        const discount = (newDiscountPercentage / 100) * books.price;
        const newRetailPrice = books.price - discount;
         
        // Update the discount offer
        books.discountOffer = newDiscountPercentage;
        books.productOfferPrice = parseInt(newRetailPrice);
        if(books.genre.isOfferCategory == true && books.genreOfferPrice < newRetailPrice){
          books.retailPrice = books.genreOfferPrice;
        } else {
          books.retailPrice = parseInt(newRetailPrice);
        }
        
        // Save the updated book
        await books.save();

        res.redirect("/admin/productOffer");
    } catch (err) {
        console.error(`Error Edit Product Offer: ${err}`);
        res.redirect("/admin/admin_panel");
    }
};

  const inActiveOffer = async (req, res) => {
    try {
      const bookId = req.params.id;
      const bookDetails = await book.findById(bookId).populate('genre');

      let retailPrice;
      let offerType;
      if(bookDetails.genre.isOfferCategory == true){
        retailPrice = bookDetails.genreOfferPrice;
        offerType = 'categoryOffer';
      } else {
        retailPrice = bookDetails.price;
        offerType = '';
      }
      
      await book.updateOne({ _id: req.params.id }, { $set: { isOfferProduct: false, offerType: offerType, retailPrice: retailPrice } });
      res.redirect("/admin/productOffer");
    } catch (err) {
      console.error(`Error Delete Book : ${err}`);
      res.redirect("/admin/productOffer");
    }
  };
  
  const activeOffer = async (req, res) => {
    try {
      const bookId = req.params.id;
      const bookDetails = await book.findById(bookId).populate('genre');
      let retailPrice;
      let offerType;
      if(bookDetails.genre.isOfferCategory == true && bookDetails.genreOfferPrice < bookDetails.productOfferPrice){
        retailPrice = bookDetails.genreOfferPrice;
        offerType = 'categoryOffer';
      } else {
        retailPrice = bookDetails.productOfferPrice;
        offerType = 'productOffer';
      }

      await book.updateOne({ _id: req.params.id }, { $set: { isOfferProduct: true, offerType: offerType, retailPrice: retailPrice } });
      res.redirect("/admin/productOffer");
    } catch (err) {
      console.error(`Error Un Delete Book : ${err}`);
      res.redirect("/admin/productOffer");
    }
  };


  const renderGenreOffer = async (req, res) => {
    try {
      const books = await book.find().populate("genre");
      const genres = await genre.find();
  
      res.render("admin/genreOffer.ejs", { books, genres });
    } catch (err) {
      console.error(`Error Get Product Offer : ${err}`);
      res.redirect("/admin/admin_panel");
    }
  };


  const createGenreOffer = async (req, res) => {
    try {
      const { genreId, discountPercentage } = req.body;
      const genres = await genre.findById(genreId);

      if (!genres) {
          return res.status(404).json({ error: 'Genre not found' });
      }
      genres.isOfferCategory = true;
      genres.discountOffer = discountPercentage;
      await genres.save();

      const booksToUpdate = await book.find({ genre: genreId });
      const genreDiscount = (discountPercentage / 100);

      // Apply discount to each book under this genre
      await Promise.all(booksToUpdate.map(async book => {
          const newRetailPrice = book.price * (1 - genreDiscount);
          book.genreOfferPrice = parseInt(newRetailPrice);
          if(book.isOfferProduct == true && book.productOfferPrice < newRetailPrice) {
            book.retailPrice = book.productOfferPrice;
          } else {
            book.retailPrice = parseInt(newRetailPrice);
          }
          book.offerType = 'categoryOffer';
          await book.save();
      }));

      res.redirect("/admin/genreOffer");

  } catch (err) {
      console.error(`Error applying Genre Offer: ${err}`);
      res.redirect("/admin/admin_panel");
  }
};

const inActiveCategoryOffer = async (req, res) => {
  try {
    const genreId = req.params.id;
    await genre.findByIdAndUpdate(genreId, { isOfferCategory: false });
    // Apply the genre discount to books under this genre
    const booksToUpdate = await book.find({ genre: genreId });
    await Promise.all(booksToUpdate.map(async book => {
        if(book.isOfferProduct == true){
          book.retailPrice = book.productOfferPrice;
          book.offerType = 'productOffer';
        } else {
          book.retailPrice = book.price;
          book.offerType = '';
        }
        await book.save();
    }));
    res.redirect("/admin/genreOffer");
} catch (err) {
    console.error(`Error activating Genre Offer: ${err}`);
    res.redirect("/admin/genreOffer");
}
};

const activeCategoryOffer = async (req, res) => {
  try {
    const genreId = req.params.id;
    await genre.findByIdAndUpdate(genreId, { isOfferCategory: true });
    
    const booksToUpdate = await book.find({ genre: genreId });
    await Promise.all(booksToUpdate.map(async book => {
      if(book.isOfferProduct == true && book.productOfferPrice < book.genreOfferPrice){
        book.retailPrice = book.productOfferPrice;
        book.offerType = 'productOffer';
      } else {
        book.retailPrice = book.genreOfferPrice;
        book.offerType = 'categoryOffer';
      }
        await book.save();
    }));
    res.redirect("/admin/genreOffer");
} catch (err) {
    console.error(`Error deactivating Genre Offer: ${err}`);
    res.redirect("/admin/genreOffer");
}
};
  

  module.exports = {
    renderProductOffer,
    createProductOffer,
    editProductOffer,
    inActiveOffer,
    activeOffer,
    renderGenreOffer,
    createGenreOffer,
    inActiveCategoryOffer,
    activeCategoryOffer

  }