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


const renderAuthorManagement = async (req, res) => {
    try {
      const warning = req.session.errormsg;
      req.session.errormsg = false;
      const authors = await author.find();
      res.render("admin/authorManagement.ejs", { authors, warning });
    } catch (err) {
      console.error(`Error Get Author Management : ${err}`);
      res.redirect("/admin/admin_panel");
    }
  };
  
  const addAuthor = async (req, res) => {
    try {
      const existingAuthor = await author.findOne({ authorName: req.body.authorName});
      if (existingAuthor) {
          req.session.errormsg = 'Author Already Exit';
          return res.redirect('/admin/authorManagement');
      }
      const newAuthor = new author({
        authorName: req.body.authorName,
        authorDetails: req.body.authorDetails,
        authorImage: req.file.filename,
        delete: true,
      });
      await newAuthor.save();
  
      res.redirect("/admin/authorManagement");
    } catch (err) {
      console.error(`Error Add Author : ${err}`);
      res.redirect("/admin/authorManagement");
    }
  };
  
  const editAuthor = async (req, res) => {
    try {
      await author.updateOne(
        { _id: req.params.id },
        {
          $set: {
            authorName: req.body.authorName,
            authorDetails: req.body.authorDetails,
            authorImage: req.body.authorFile,
            delete: req.body.authorDelete,
          },
        }
      );
      res.redirect("/admin/authorManagement");
    } catch (err) {
      console.error(`Error Edit Author : ${err}`);
      res.redirect("/admin/authorManagement");
    }
  };
  
  const changeAuthorImage = async (req, res) => {
    try {
      await author.updateOne(
        { _id: req.params.id },
        {
          $set: {
            authorName: req.body.authorName,
            authorDetails: req.body.authorDetails,
            authorImage: req.file.filename,
            delete: req.body.authorDelete,
          },
        }
      );
  
      const directoryPath = "public/" + req.body.authorFile;
      fs.unlink(directoryPath, (err) => {
        try {
          if (err) {
            throw err;
          }
          console.log("Delete Author Image successfully.");
        } catch (err) {
          console.error(`Error Deleting Book : ${err}`);
        }
      });
      res.redirect("/admin/authorManagement");
    } catch (err) {
      console.error(`Error Change Author Image : ${err}`);
      res.redirect("/admin/authorManagement");
    }
  };
  
  const unlistAuthor = async (req, res) => {
    try {
      await author.updateOne({ _id: req.params.id }, { $set: { delete: false } });
      res.redirect("/admin/authorManagement");
    } catch (err) {
      console.error(`Error Delete Author : ${err}`);
      res.redirect("/admin/authorManagement");
    }
  };
  
  const listAuthor = async (req, res) => {
    try {
      await author.updateOne({ _id: req.params.id }, { $set: { delete: true } });
      res.redirect("/admin/authorManagement");
    } catch (err) {
      console.error(`Error Un Delete Author : ${err}`);
      res.redirect("/admin/authorManagement");
    }
  };
  
  const renderGenreManagement = async (req, res) => {
    try {
      const warning = req.session.errormsg;
      req.session.errormsg = false;
      const genres = await genre.find();
      res.render("admin/genreManagement.ejs", { genres, warning });
    } catch (err) {
      console.error(`Error Get Genre Management : ${err}`);
      res.redirect("/admin/admin_panel");
    }
  };
  
  const addGenre = async (req, res) => {
    try {
      const existingGenre = await genre.findOne({ genreName: req.body.genre });
      if (existingGenre) {
        req.session.errormsg = "Genre Already Exit";
        return res.redirect("/admin/genreManagement");
      }
  
      const newGenre = new genre({
        genreName: req.body.genre,
        delete: true,
      });
      await newGenre.save();
      res.redirect("/admin/genreManagement");
    } catch (err) {
      console.error(`Error Add Genre : ${err}`);
      res.redirect("/admin/genreManagement");
    }
  };
  
  const editGenre = async (req, res) => {
    try {
      await genre.updateOne(
        { _id: req.params.id },
        {
          $set: {
            genreName: req.body.editGenreName,
            delete: req.body.genreDelete,
          },
        }
      );
      res.redirect("/admin/genreManagement");
    } catch (err) {
      console.error(`Error Edit Genre : ${err}`);
      res.redirect("/admin/genreManagement");
    }
  };
  
  const unlistGenre = async (req, res) => {
    try {
      await genre.updateOne({ _id: req.params.id }, { $set: { delete: false } });
      res.redirect("/admin/genreManagement");
    } catch (err) {
      console.error(`Error Delete Genre : ${err}`);
      res.redirect("/admin/genreManagement");
    }
  };
  
  const listGenre = async (req, res) => {
    try {
      await genre.updateOne({ _id: req.params.id }, { $set: { delete: true } });
      res.redirect("/admin/genreManagement");
    } catch (err) {
      console.error(`Error Un Delete Genre : ${err}`);
      res.redirect("/admin/genreManagement");
    }
  };


  module.exports = {
    renderAuthorManagement,
    addAuthor,
    editAuthor,
    changeAuthorImage,
    unlistAuthor,
    listAuthor,
    renderGenreManagement,
    addGenre,
    editGenre,
    unlistGenre,
    listGenre,
  }