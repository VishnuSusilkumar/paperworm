const { response } = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { count, log } = require('console');
const Razorpay = require('razorpay'); 

const dotenv = require('dotenv');
dotenv.config({path : '.env'});

const user = require('../models/userModel');
const cart = require('../models/cartModel');
const coupon = require('../models/couponModel')
const order = require('../models/orderModel')
const author = require('../models/authorModel')
const book = require('../models/bookModel')
const genre = require('../models/genreModel')
const UserOTPVerification = require('../models/userOTPVerification');
const WalletTransaction = require('../models/walletModel');
const banner = require('../models/bannerModel')





  // Admin side

  const renderProductManagement = async (req, res) => {
    try {
      const books = await book.find().populate("author").populate("genre");
      const authors = await author.find();
      const genres = await genre.find();
  
      res.render("admin/productManagement.ejs", { books, genres, authors });
    } catch (err) {
      console.error(`Error Get Product Management : ${err}`);
      res.redirect("/admin/admin_panel");
    }
  };
  
  const renderAddBook = async (req, res) => {
    try {
      const warning = req.session.errormsg;
      req.session.errormsg = false;
      const authors = await author.find();
      const genres = await genre.find();
      res.render("admin/addBook.ejs", {
        title: "Add Book",
        warning,
        authors,
        genres,
      });
    } catch (err) {
      console.error(`Error Get Add Book : ${err}`);
      res.redirect("/admin/productManagement");
    }
  };
  
  const addBook = async (req, res) => {
    try {
      const existingBookName = await book.findOne({
        bookName: req.body.bookName,
      });
      if (existingBookName) {
        req.session.errormsg = "Book Already Exit";
        return res.redirect("/admin/addBook");
      }
  
      const newBook = new book({
        bookName: req.body.bookName,
        bookDetails: req.body.bookDetails,
        author: req.body.author,
        genre: req.body.genre,
        language: req.body.language,
        image1: req.files[0].filename,
        image2: req.files[1].filename,
        image3: req.files[2].filename,
        rating: req.body.rating,
        pages: req.body.pages,
        retailPrice: req.body.retailPrice,
        price: req.body.retailPrice,
        stock: req.body.stock,
        delete: true,
        isOfferProduct: false,
      });
      newBook.save();
      res.redirect("/admin/productManagement");
    } catch (err) {
      console.error(`Error Add Book: ${err}`);
      res.redirect("/admin/productManagement");
    }
  };
  
  const editBook= async (req, res) => {
    try {
      await book.updateOne(
        { _id: req.params.id },
        {
          $set: {
            bookName: req.body.bookName,
            bookDetails: req.body.bookDetails,
            author: req.body.author,
            genre: req.body.genre,
            language: req.body.language,
            rating: req.body.rating,
            pages: req.body.pages,
            retailPrice: req.body.retailPrice,
            price: req.body.retailPrice,
            stock: req.body.stock,
            delete: req.body.authorDelete,
          },
        }
      );
      const books = await book.findById(req.params.id).populate('genre');
      if(books.isOfferProduct || books.genre.isOfferCategory){
        const productDiscount = (books.discountOffer / 100) * req.body.retailPrice;
        const genreDiscount = (books.genre.discountOffer / 100) * req.body.retailPrice;

        const newProductOfferPrice = req.body.retailPrice - productDiscount;
        const newGenreOfferPrice = req.body.retailPrice - genreDiscount;

        books.productOfferPrice = newProductOfferPrice;
        books.genreOfferPrice = newGenreOfferPrice;

        if(books.offerType == 'productOffer'){
          books.retailPrice = newProductOfferPrice;
        } else if(books.offerType == 'categoryOffer'){
          books.retailPrice = newGenreOfferPrice;
        } else {
          books.retailPrice = req.body.retailPrice;
        }
      }
      await books.save();

      res.redirect("/admin/productManagement");
    } catch (err) {
      console.error(`Error edit Book : ${err}`);
      res.redirect("/admin/productManagement");
    }
  };
  
  const unlistBook = async (req, res) => {
    try {
      await book.updateOne({ _id: req.params.id }, { $set: { delete: false } });
      res.redirect("/admin/productManagement");
    } catch (err) {
      console.error(`Error list Book : ${err}`);
      res.redirect("/admin/productManagement");
    }
  };
  
  const listBook = async (req, res) => {
    try {
      await book.updateOne({ _id: req.params.id }, { $set: { delete: true } });
      res.redirect("/admin/productManagement");
    } catch (err) {
      console.error(`Error Unlist Book : ${err}`);
      res.redirect("/admin/productManagement");
    }
  };
  
  const addAuthorInAddBook = async (req, res) => {
    try {
      const existingAuthor = await author.findOne({
        authorName: req.body.authorName,
      });
      if (existingAuthor) {
        return res.status(400).json({ error: "Author Already Exist", warning: "Author Already Exist" });
      }
      console.log(req.file.filename);
  
      const newAuthor = new author({
        authorName: req.body.authorName,
        authorDetails: req.body.authorDetails,
        authorImage: req.file.filename,
        delete: true,
      });
      await newAuthor.save();
      res.status(200).json({ success: true, author: newAuthor, message: "Author added successfully" });
    } catch (err) {
      console.error(`Error Add Book To Add Author Details : ${err}`);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };
  
  const addGenreInAddBook = async (req, res) => {
    try {
      const existingGenre = await genre.findOne({ genreName: req.body.genre });
      if (existingGenre) {
        return res.status(400).json({ error: "Genre Already Exist", warning: "Genre Already Exist" });
      }
  
      const newGenre = new genre({
        genreName: req.body.genre,
        delete: true,
      });
      await newGenre.save();
      res.status(200).json({ success: true, genre: newGenre,  message: "Genre added successfully" });
    } catch (err) {
      console.error(`Error Add Book To Add Genere : ${err}`);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };
  
 
  
  const changeImage1 = async (req, res) => {
    try {
      await book.updateOne(
        { _id: req.params.id },
        {
          $set: {
            image1: req.file.filename,
          },
        }
      );
  
      const directoryPath = "public/" + req.body.image1;
      fs.unlink(directoryPath, (err) => {
        try {
          if (err) {
            throw err;
          }
          console.log("Delete Image 1 successfully.");
        } catch (err) {
          console.error(`Error Deleting Book : ${err}`);
        }
      });
      res.redirect("/admin/productManagement");
    } catch (err) {
      console.error(`Error Change Image 1 : ${err}`);
      res.redirect("/admin/productManagement");
    }
  };
  
  const changeImage2 = async (req, res) => {
    try {
      await book.updateOne(
        { _id: req.params.id },
        {
          $set: {
            image2: req.file.filename,
          },
        }
      );
  
      const directoryPath = "public/" + req.body.image2;
  
      fs.unlink(directoryPath, (err) => {
        try {
          if (err) {
            throw err;
          }
          console.log("Delete Image 2 successfully.");
        } catch (err) {
          console.error(`Error Deleting Book : ${err}`);
        }
      });
  
      res.redirect("/admin/productManagement");
    } catch (err) {
      console.error(`Error Change Image 2: ${err}`);
      res.redirect("/admin/productManagement");
    }
  };
  
  const changeImage3 = async (req, res) => {
    try {
      await book.updateOne(
        { _id: req.params.id },
        {
          $set: {
            image3: req.file.filename,
          },
        }
      );
  
      const directoryPath = "public/" + req.body.image3;
  
      fs.unlink(directoryPath, (err) => {
        try {
          if (err) {
            throw err;
          }
          console.log("Delete Image 3 successfully.");
        } catch (err) {
          console.error(`Error Deleting Book : ${err}`);
        }
      });
      res.redirect("/admin/productManagement");
    } catch (err) {
      console.error(`Error Change Image 3 : ${err}`);
      res.redirect("/admin/productManagement");
    }
  };

  module.exports = {
    
    renderProductManagement,
    renderAddBook,
    addBook,
    editBook,
    listBook,
    unlistBook,
    addAuthorInAddBook,
    addGenreInAddBook,
    changeImage1,
    changeImage2,
    changeImage3,
  }