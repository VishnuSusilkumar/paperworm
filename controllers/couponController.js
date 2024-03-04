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



const renderCouponManagement = async (req, res) => {
    try {
      const warning = req.session.errormsg;
      req.session.errormsg = false;
      const coupons = await coupon.find();
      res.render("admin/couponManagement.ejs", { coupons, warning });
    } catch (err) {
      console.error(`Error Get Coupon Management : ${err}`);
      res.redirect("/admin/admin_panel");
    }
  };
  
  const addCoupon = async (req, res) => {
    try {
      const existingCoupon = await coupon.findOne({
        couponName: req.body.couponName,
      });
      if (existingCoupon) {
        req.session.errormsg = "Coupon Already Exit";
        return res.redirect("/admin/couponManagement");
      }
  
      const newCoupon = new coupon({
        couponName: req.body.couponName,
        discountPercentage: req.body.discountPercentage,
        maximumDiscountPrice: req.body.maxDiscountPrice,
        minimumTotal: req.body.minTotalAmount,
        ExpiredDate: req.body.expDate,
      });
      await newCoupon.save();
      res.redirect("/admin/couponManagement");
    } catch (err) {
      console.error(`Error Add Genre : ${err}`);
      res.redirect("/admin/couponManagement");
    }
  };
  
  const editCoupon = async (req, res) => {
    try {
      const couponId = req.body.couponId;
  
      await coupon.updateOne(
        { _id: couponId },
        {
          $set: {
            couponName: req.body.couponName,
            discountPercentage: req.body.discountPercentage,
            maximumDiscountPrice: req.body.maximumDiscountPrice,
            minimumTotal: req.body.minimumTotal,
            ExpiredDate: req.body.expDate,
          },
        }
      );
  
      res.status(200).send(
        {
          data:"Success",
          couponName: req.body.couponName,
          discountPercentage: req.body.discountPercentage,
          maximumDiscountPrice: req.body.maximumDiscountPrice,
          minimumTotal: req.body.minTotalAmount,
          ExpiredDate: new Date(req.body.ExpiredDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      })
    } catch (err) {
      console.error(`Error Edit Genre : ${err}`);
      res.redirect("/admin/couponManagement");
    }
  };
  
  const deleteCoupon = async (req, res) => {
    try {
      const couponId = req.body.couponId;
  
      await coupon.deleteOne({ _id: couponId });
  
      res.status(200).send({ data: "success" });
    } catch (err) {
      console.error(`Error Edit Genre : ${err}`);
      res.redirect("/admin/couponManagement");
    }
  };

  module.exports = {
    renderCouponManagement,
    addCoupon,
    editCoupon,
    deleteCoupon,
  }