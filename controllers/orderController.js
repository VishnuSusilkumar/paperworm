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

// Order Management

const renderPendingManagement = async (req, res) => {
    try {
      const orders = await order
        .find({ status: "Pending" })
        .populate("user")
        .populate({
          path: "product.productId",
          model: "book",
          populate: [
            {
              path: "author",
              model: "author",
            },
            {
              path: "genre",
              model: "genre",
            },
          ],
        });
      res.render("admin/orderPendingManagment.ejs", { orders });
    } catch (err) {
      console.error(`Error Get Pending Management : ${err}`);
      res.redirect("/admin/admin_panel");
    }
  };
  
  const changeOnTheWayOrder = async (req, res) => {
    try {
      await order.updateOne(
        { _id: req.params.id },
        { $set: { status: "On The Way" } }
      );
      res.status(200).send({ data: "Success" });
      // res.redirect('/admin/pendingManagement');
    } catch (err) {
      console.error(`Error change On The Way Order : ${err}`);
      res.redirect("/admin/admin_panel");
    }
  };
  
  const renderOnTheWayManagement = async (req, res) => {
    try {
      const orders = await order
        .find({ status: "On The Way" })
        .populate("user")
        .populate({
          path: "product.productId",
          model: "book",
          populate: [
            {
              path: "author",
              model: "author",
            },
            {
              path: "genre",
              model: "genre",
            },
          ],
        });
      res.render("admin/orderOnTheWayManagment.ejs", { orders });
    } catch (err) {
      console.error(`Error Get Pending Management : ${err}`);
      res.redirect("/admin/admin_panel");
    }
  };
  
  const changeCompleteOrder = async (req, res) => {
    try {
      await order.updateOne(
        { _id: req.params.id },
        { $set: { status: "Complete" } }
      );
      res.status(200).send({ data: "Success" });
      // res.redirect('/admin/onthewayManagement');
    } catch (err) {
      console.error(`Error change Complete Order : ${err}`);
      res.redirect("/admin/genreManagement");
    }
  };
  
  const renderCompleteManagement = async (req, res) => {
    try {
      const orders = await order
        .find({ status: "Complete" })
        .populate("user")
        .populate({
          path: "product.productId",
          model: "book",
          populate: [
            {
              path: "author",
              model: "author",
            },
            {
              path: "genre",
              model: "genre",
            },
          ],
        });
      res.render("admin/orderCompleteManagment.ejs", { orders });
    } catch (err) {
      console.error(`Error Get Complete Management : ${err}`);
      res.redirect("/admin/admin_panel");
    }
  };
  
  const changeDeleteOrder = async (req, res) => {
    try {
      const orderId = req.params.id;
      const orders = await order.findOne({ _id: orderId }).populate('user');
  
      if (orders.paymentMethod === 'Online') {
        // Refund the order amount to the user's wallet
        const userDetails = await user.findOne({ _id: orders.user._id })
        userDetails.walletBalance += orders.totalAmount;
        await userDetails.save();
        
        // Record the refund transaction
        const transaction = new WalletTransaction({
          userId: userDetails._id,
          type: 'credit',
          amount: orders.totalAmount,
          description: 'Refund for cancelled order'
        });
        await transaction.save();
      }
  
      await order.updateOne(
        { _id: req.params.id },
        { $set: { status: "Delete" } }
      );
  
       // Increase stock for each product in the cancelled order
       for (const item of orders.product) {
        const product = await book.findById(item.productId);
        if (product) {
          product.stock += item.quantity;
          await product.save();
        }
      }
  
      res.status(200).send({ data: "Success" });
      // res.redirect('/admin/orderDeleteManagement');
    } catch (err) {
      console.error(`Error change Complete Order : ${err}`);
      res.redirect("/admin/genreManagement");
    }
  };
  
  const renderDeleteManagement = async (req, res) => {
    try {
      const orders = await order
        .find({ status: "Delete" })
        .populate("user")
        .populate({
          path: "product.productId",
          model: "book",
          populate: [
            {
              path: "author",
              model: "author",
            },
            {
              path: "genre",
              model: "genre",
            },
          ],
        });
      res.render("admin/orderDeleteManagment.ejs", { orders });
    } catch (err) {
      console.error(`Error Get Delete Management : ${err}`);
      res.redirect("/admin/admin_panel");
    }
  };

  module.exports = {
    renderPendingManagement,
    changeOnTheWayOrder,
    renderOnTheWayManagement,
    changeCompleteOrder,
    renderCompleteManagement,
    changeDeleteOrder,
    renderDeleteManagement,
  }