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




const renderWallet = async (req, res) => {
    try {
      const userId = req.session.user;
      const userDetails = await user.findOne({ _id: userId }); // Assuming you have a user model
  
      // Fetch user's wallet balance
      const walletBalance = userDetails.walletBalance; // Assuming walletBalance is a field in your user model
  
      // Fetch user's wallet transaction history
      const transactions = await WalletTransaction.find({ userId });
      // Assuming you have a WalletTransaction model with userId field
  
      res.render('wallet', { title: 'Wallet', userDetails, walletBalance, transactions });
    } catch (error) {
      console.error(`Error rendering wallet page: ${error}`);
      res.status(500).send('Internal server error');
    }
  };

  const razorpayInstance = new Razorpay({
    key_id: process.env.razorpayKey, // Your Razorpay key ID
    key_secret: process.env.razorpaySecret // Your Razorpay secret key
  });
  
  const addFunds = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.session.user;

        // Update user's wallet balance
        const userDetails = await user.findOne({ _id: userId });
        const newBalance = userDetails.walletBalance + parseInt(amount);
        userDetails.walletBalance = newBalance;
        await userDetails.save();

        // Record the transaction
        const transaction = new WalletTransaction({
            userId: userId,
            type: 'credit',
            amount: parseInt(amount),
            description: 'Added funds'
        });
        await transaction.save();

        // Redirect to wallet page with updated data
        res.redirect(`/wallet/${req.session.user}`);
    } catch (error) {
        console.error(`Error adding funds to wallet: ${error}`);
        res.status(500).send('Internal server error');
    }
};
  
  const createRazorpayOrder = async (req, res) => {
    try {
      const { amount } = req.body;
  
      // Create Razorpay order
      const orderOptions = {
        amount: amount * 100, // Amount in paise
        currency: 'INR',
        receipt: `order_${new Date().getTime()}`, // Unique order ID
      };
  
      const order = await razorpayInstance.orders.create(orderOptions);
  
      // Response with order details
      res.json({ orderId: order.id, razorpayKey: process.env.razorpayKey }); // Return Razorpay key for frontend
    } catch (error) {
      console.error(`Error creating Razorpay order: ${error}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  };


const applyWallet = async (req, res) => {
  try {
    const userId = req.body.userId;
    const amount = req.body.totalAmount;
    console.log('userId',userId);
    console.log('amount:', amount);
    
    // Find the user by userId
    const users = await user.findById(userId);
    if (!users) {
      return res.status(404).send({ message: "User not found" });
    }

     // Check if the user has sufficient wallet balance
     if (users.walletBalance >= amount) {
      
      // Sufficient balance to cover the entire amount
      const amountToBePaid = 0
      users.walletBalance -= amount;
      await users.save();
      console.log(users.walletBalance);

      return res.status(200).json({ 
        message: "Wallet balance applied successfully", 
        newWalletBalance: users.walletBalance,
        amountToBePaid: amountToBePaid // No amount left to be paid
      });
    } else {
      // Insufficient balance to cover the entire amount
      const amountToBePaid = amount - users.walletBalance;
      users.walletBalance = 0;
      await users.save();
      console.log('amounttobe paid',amountToBePaid);

      return res.status(200).json({ 
        message: "Wallet balance partially applied", 
        amountToBePaid: amountToBePaid
      });
    }
  } catch (err) {
    console.error(`Error applying wallet balance: ${err}`);
    res.status(500).send({ message: "Internal Server Error" });
  }
};

const deleteWallet = async (req, res) => {
  try {
    const userId = req.body.userId;
    const amount = parseInt(req.body.totalAmount);
    const currentAmount = parseInt(req.body.currentAmount);
    console.log('total:', amount);

    const users = await user.findById(userId);
    if (!users) {
      return res.status(404).send({ message: "User not found" });
    }

    console.log('Before',users.walletBalance);
    const amountToBePaid = amount + currentAmount;
    users.walletBalance += amount;
    await users.save();
    console.log('after',users.walletBalance);

    return res.status(200).json({ message: "Wallet balance deleted successfully", newWalletBalance: user.walletBalance, amountToBePaid:amountToBePaid });
  } catch (err) {
    console.error(`Error deleting wallet balance: ${err}`);
    res.status(500).send({ message: "Internal Server Error" });
  }
}


const paymentUsingWallet = async (req, res) => {
  try {
    const userId = req.query.userId;
    const cartItems = await cart.find({ user: userId });
    let couponName = req.body.couponName;
    let discountAmount = 0;
    
    if(couponName){
      const couponInfo = await coupon.findOne({ couponName });

      console.log(couponInfo);
      const carts = await cart.find({user: userId}).populate('user').populate('product').
      populate({path: 'product', populate: {path: 'author'}}).populate({path: 'product', populate: {path: 'genre'}})
      
      let totalAmount = productTotal(carts)
      let shipping = false;

      if(!couponInfo){
        if(totalAmount<400){
          totalAmount = totalAmount + 40;
          shipping = true;
        }
        return res.status(400).send({message:"Coupon name not valid",totalAmount,shipping})
      }

      const discountPercentage = couponInfo.discountPercentage / 100;
      discountAmount = totalAmount * discountPercentage;

      if (discountAmount > couponInfo.maximumDiscountPrice) {
        discountAmount = couponInfo.maximumDiscountPrice;
      }
      discountAmount = parseInt(discountAmount);


      couponInfo.users.push(userId);
      await couponInfo.save();

    }

    console.log(discountAmount);
    


    const productArray = cartItems.map(item => {
      return { productId: item.product, quantity: item.quantity};
    });

    const lastOrder = await order.find().sort({ _id: -1 }).limit(1);
    let orderId = 'BKWM000001';
    if (lastOrder.length > 0) {
      const lastOrderId = lastOrder[0].orderId;
      const orderIdNumber = parseInt(lastOrderId.slice(4));
      orderId = `BKWM${("000000" + (orderIdNumber + 1)).slice(-6)}`;
    }


    const newOrder = new order({
      orderId,
      user: userId,
      product: productArray,
      address: req.body.address,
      totalAmount: req.body.totalAmount,
      paymentMethod: "Online",
      discountAmount: discountAmount,
      orderTime: new Date(),
    });

    await newOrder.save();

    // Record the debit transaction
    const transaction = new WalletTransaction({
      userId: userId,
      type: 'debit',
      amount: req.body.totalAmount,
      description: 'Payment made using wallet'
    });
    await transaction.save();

    // Update stock of each product
    for (const item of cartItems) {
      const product = await book.findById(item.product._id);
      if (product) {
        product.stock -= item.quantity; // Decrease stock by the quantity in the cart
        await product.save();
      }
    }

    await cart.deleteMany({ user: userId });

    res.status(200).send({ orderId });
  } catch (err) {
    console.error(`Error Product Remove:`,err);
    res.status(500).send("Internal server error");
    res.redirect("/");
  }
};


  module.exports = {
     renderWallet,
     addFunds,
     createRazorpayOrder,
     applyWallet,
     deleteWallet,
     paymentUsingWallet
    };