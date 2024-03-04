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
const banner = require('../models/bannerModel');
const review = require('../models/reviewModel');

const bookRecommendations = async (userId) => {
  try {
     
      const userOrders = await order.find({ user: userId }).populate('product.productId');

      
      const productIds = userOrders.flatMap(order => order.product.map(item => item.productId));

       // Find the genres and authors of the user's orders
       const genres = [...new Set(userOrders.flatMap(order => order.product.map(item => item.productId.genre)))];
       const authors = [...new Set(userOrders.flatMap(order => order.product.map(item => item.productId.author)))];

      
       const recommendations = await book.find({
        $and: [
            { _id: { $nin: productIds } }, // Exclude books already ordered by the user
            { $or: [
                { genre: { $in: genres } }, // Match books with the same genre
                { author: { $in: authors } } // Match books with the same author
            ]}
        ]
    }).limit(6).populate('author').populate('genre');
      return recommendations;
  } catch (err) {
      console.error(`Error fetching book recommendations: ${err}`);
      return [];
  }
};

const renderHome = async (req,res)=>{
  const books = await book.find({delete: {$ne: false}}).populate('author').populate('genre');
  const banners = await banner.findOne({banner: true}).populate('bigCard1ProductId').populate('bigCard2ProductId');

  req.session.userInfo = false
  const userId = req.session.user;

  let userDetails = false;
  if(userId){
    userDetails = await user.findOne({_id: userId})
  }
  const warning = req.session.errormsg;
  req.session.errormsg = false;
  const recommendations = await bookRecommendations(userId);
  res.render('index',{ title: "Home",books,banners,userDetails,warning,recommendations});
}


const loginVarification = async(req,res)=>{
  try {
      const email = req.body.email;
      const password = req.body.password;

      const userdb = await user.findOne({ email: email});

      if(userdb) {
        if(userdb.block){
          bcrypt.compare(password,userdb.password).then((result)=>{
              if(result){
                  response._id=userdb._id;
                  req.session.user = response._id;
                  res.status(200).send({message:"Success",status:200})
              }else{                  
                  res.status(401).send({message:"Incorrect Password",status:401})
              }
          })
        }else{
          res.status(401).send({message:"This Email Id Blocked",status:401})
        }
      }else {        
          res.status(401).send({message:"Incorrect Email",status:401})
      }
    }catch(err){
      console.error(`Error Login Varification : ${err}`);
      res.redirect('/');
  }
}


// Forgot Password - Render Page
const renderForgot = (req, res) => {
  console.log('Rendering forgot password page');
  const warning = req.session.errormsg;
  req.session.errormsg = false;
  res.render('forgot-password', { title: 'Forgot Password',warning });
};

// Forgot Password - Handle Form Submission
const forgotPassword = async (req, res) => {
  try {
    const userEmail = req.body.email;
    const userdb = await user.findOne({ email: userEmail });

    if (!userdb) {
      // User with provided email not found
      req.session.errormsg = 'No user found with that email address.';
      return res.redirect('/forgot-password');
    }

    // Generate a unique reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Set the reset token and expiration in the user's document
    userdb.resetPasswordToken = resetToken;
    userdb.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    // Save the user document with the reset token
    await userdb.save();

    // Send the OTP for email verification
    const OTP = Math.floor(1000 + Math.random() * 9000).toString();
    const options = { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
    const expirationTime = new Date(Date.now() + 1 * 60 * 1000);

    await UserOTPVerification.deleteMany({ email: userdb.email });

    const newOTPVerification = new UserOTPVerification({
      email: userdb.email,
      otp: OTP,
      expiresAt: expirationTime,
    });

    await newOTPVerification.save();

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.userNodemailer,
        pass: process.env.appPassword,
      },
    });

    const mailOptions = {
      from: process.env.userNodemailer,
      to: userdb.email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${OTP}. It is valid for 1 minutes.`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP sent to ${userdb.email}: ${OTP}`);

    
    res.redirect('/otp-validation/' + userdb.email);
  } catch (error) {
    console.error(`Error in Forgot Password: ${error}`);
    res.redirect('/forgot-password');
  }
};




// Inside your routes or middleware file
const otpForgot = async (req, res) => {
  const email = req.params.email;
  const userOTPVerification = await UserOTPVerification.findOne({ email });
  if (!userOTPVerification) {
    // Handle case where OTP verification record is not found
    return res.redirect('/forgot-password');
  }
  const expirationTime = userOTPVerification.expiresAt;
  console.log('expirationTime :', expirationTime);
  const warning = req.session.errormsg;
  req.session.errormsg = false;
  res.render('otp-validation', { title: 'OTP Validation', email, warning, expirationTime });
};

const otpValidation = async (req, res) => {
  try {
    const enteredOTP = req.body.otp;
    const userEmail = req.body.email; // Access email from the form submission
    const userOtp = await UserOTPVerification.findOne({ email: userEmail });

    if (!userOtp || enteredOTP !== userOtp.otp) {
      req.session.errormsg = 'Invalid OTP. Please try again.';
      return res.redirect(`/otp-validation/${req.body.email}`);
    }

    const date = new Date(Date.now());
    if (date >= new Date(userOtp.expiresAt)) {
      req.session.errormsg = 'OTP Expired. Please request a new OTP.';
      return res.redirect(`/otp-validation/${req.body.email}`);
    }

    // Clear the OTP record
    await UserOTPVerification.deleteOne({ email: req.body.email });

    // Redirect to the reset password page
    res.redirect('/reset-password/' + req.body.email);
  } catch (error) {
    console.error(`Error in OTP validation: ${error}`);
    res.redirect('/otp-validation/' + req.body.email);
  }
};

// Resend Forgot Password OTP
const resendForgotPasswordOTP = async (req, res) => {
  try {
    const userEmail = req.body.email;

    // Retrieve user with the provided email
    const userdb = await user.findOne({ email: userEmail });

    if (!userdb) {
      // User with provided email not found
      req.session.errormsg = 'No user found with that email address.';
      return res.redirect('/forgot-password');
    }

    // Generate a new OTP and update the expiration time
    const OTP = Math.floor(1000 + Math.random() * 9000).toString();
    const expirationTime = new Date(Date.now() + 1 * 60 * 1000);

    // Delete existing OTP records for the user
    await UserOTPVerification.deleteMany({ email: userdb.email });

    const newOTPVerification = new UserOTPVerification({
      email: userdb.email,
      otp: OTP,
      expiresAt: expirationTime,
    });

    await newOTPVerification.save();

    // Send the new OTP for email verification
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.userNodemailer,
        pass: process.env.appPassword,
      },
    });

    console.log(OTP);

    const mailOptions = {
      from: process.env.userNodemailer,
      to: userdb.email,
      subject: 'Password Reset Resend OTP',
      text: `Your new OTP for password reset is: ${OTP}. It is valid for 5 minutes.`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP sent to ${userdb.email}: ${OTP}`);

    // Redirect the user to a confirmation page
    res.redirect('/otp-validation/' + userdb.email);
  } catch (error) {
    console.error(`Error in Resend Forgot Password OTP: ${error}`);
    res.redirect('/forgot-password');
  }
};






// Reset Password - Render Page
const renderReset = async (req, res) => {
  try {
    const resetToken = req.params.token;
    const userdb = await user.findOne({
      resetPasswordToken: resetToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!userdb) {
      // Invalid or expired token
      req.session.errormsg = 'Password reset token is invalid or has expired.';
      return res.redirect('/forgot-password');
    }

    // Render the reset password page with the token
    res.render('reset-password', { title: 'Reset Password', token: resetToken });
  } catch (error) {
    console.error(`Error in Reset Password Page: ${error}`);
    res.redirect('/forgot-password');
  }
};

// Reset Password - Handle Form Submission
const resetPassword = async (req, res) => {
  try {
    const resetToken = req.params.token;
    const userdb = await user.findOne({
      resetPasswordToken: resetToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!userdb) {
      // Invalid or expired token
      req.session.errormsg = 'Password reset token is invalid or has expired.';
      return res.redirect('/forgot-password');
    }

    // Set the new password and clear the reset token fields
    userdb.password = await bcrypt.hash(req.body.newPassword, 10);
    userdb.resetPasswordToken = undefined;
    userdb.resetPasswordExpires = undefined;

    // Save the updated user document
    await userdb.save();

    // Redirect the user to a confirmation page
    res.redirect('/');
  } catch (error) {
    console.error(`Error in Reset Password: ${error}`);
    res.redirect('/forgot-password');
  }
};




const renderSignup = async (req,res)=>{
  const warning = req.session.errormsg;
  req.session.errormsg = false;
  res.render('signup',{title: 'Signup',warning});
}


const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.userNodemailer,
      pass: process.env.appPassword,
    }
});
   


const userSignup = async (req, res) => {
  try {
      const existingUser = await user.findOne({ email: req.body.email });

      if (existingUser) {
        req.session.errormsg = 'Email already exists';
        return res.redirect('/signup');
      }

      const hashedPassword = await bcrypt.hash(req.body.password, 10);

      const User = {
          username: req.body.userName,
          email: req.body.email,
          phoneNumber: req.body.phoneNumber,
          age: req.body.age,
          password: hashedPassword,
          block: true,
      };

      const OTP = Math.floor(1000 + Math.random() * 9000).toString();
      const options = { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
      const expirationTime = new Date(Date.now() + 5 * 60 * 1000);

      await UserOTPVerification.deleteMany({email: User.email})

      const newOTPVerification = new UserOTPVerification({
        email: User.email,
        otp: OTP,
        expiresAt: expirationTime
      });

      await newOTPVerification.save();

      const mailOptions = {
        from: `${process.env.userNodemailer}`,
        to: User.email,
        subject: 'OTP',
        text: `You otp :${OTP}`,
        html: `
        <div style="border-bottom:1px solid #eee">
          <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">Paperworm</a>
        </div>
        <p style="font-size:1.1em">Hi ${User.username},</p>
        <p>Thank you for choosing Paperworm. Use the following OTP to complete your Sign Up procedures. OTP is valid for 5 minutes</p>
        <h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;">${OTP}</h2>
        <p style="font-size:0.9em;">Regards,<br />Paperworm</p>
        <hr style="border:none;border-top:1px solid #eee" />
        <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
          <p>Paperworm</p>
        </div>
        </div>
        </div>`
      };

      await transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error(`Error sending email: ${error}`);
        }
        console.log(`OTP sent to ${User.email}: ${OTP}`);

        req.session.userInfo = {
          userName : User.username,
          email : User.email,
          phoneNumber : User.phoneNumber,
          age : User.age,
          password : User.password,
          block : User.block,
          expiresAt : expirationTime
        };

        res.redirect('/otp')
      });
    } catch (err) {
      console.error(`Error inserting user: ${err}`);
    }
};

const renderOTP = (req,res) => {
    const userInfo = req.session.userInfo;
    warning = false;
    return res.render('otp',{title: 'Otp',userInfo})
}


const verifyOTP = async (req,res)=> {
    try{
        const userOtp = await UserOTPVerification.findOne({email : req.body.email});
        const userInfo = {
          userName: req.body.userName,
          email: req.body.email,
          phoneNumber: req.body.phoneNumber,
          age: req.body.age,
          password: req.body.password,
          expiresAt : req.body.expirationTime,
          block: true,
        };
        if(req.body.otp == userOtp.otp){
          const date = new Date(Date.now());
          if(date < userOtp.expiresAt){
            const newUser = new user({
                username: req.body.userName,
                email: req.body.email,
                phoneNumber: req.body.phoneNumber,
                age: req.body.age,
                password: req.body.password,
                block: true,
            });

            await newUser.save();
            await UserOTPVerification.deleteOne({email : req.body.email});

            const userdb = await user.findOne({ email: req.body.email});
            response.username=userdb;
            req.session.user = response.username;

            res.redirect("/");
          }else{
              req.session.errormsg = "OTP Expired";
              warning = req.session.errormsg;
              req.session.errormsg = false;
              res.render('otp',{title: 'Otp',warning,userInfo});
          }
        }else{
            req.session.errormsg = "Invalid Otp";
            warning = req.session.errormsg;
            req.session.errormsg = false;
            res.render('otp',{title: 'Otp',warning,userInfo});
        }
      }catch(err){
        console.error(`Error Add Genre : ${err}`);
        res.redirect('/');
    }
}


const resendOTP = async (req,res) =>{
    try{
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const User = {
            username: req.body.userName,
            email: req.body.email,
            phoneNumber: req.body.phoneNumber,
            age: req.body.age,
            password: hashedPassword,
            block: true,
        };

        const OTP = Math.floor(1000 + Math.random() * 9000).toString();
        const options = { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
        const expirationTime = new Date(Date.now() + 5 * 60 * 1000);
    
        await UserOTPVerification.deleteMany({email: User.email})

        const newOTPVerification = new UserOTPVerification({
          email: User.email,
          otp: OTP,
          expiresAt: expirationTime
        });
    
        await newOTPVerification.save();
    
        const mailOptions = {
          from: 'bookwormwebstore@gmail.com',
          to: User.email,
          subject: 'Resend OTP',
          text: `You otp : ${OTP}`,
          html: `
          <div style="border-bottom:1px solid #eee">
            <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">Bookworm</a>
          </div>
          <p style="font-size:1.1em">Hi ${User.username},</p>
          <p>Thank you for choosing Brandworm. Use the following Resend OTP to complete your Sign Up procedures. Resend OTP is valid for 5 minutes</p>
          <h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;">${OTP}</h2>
          <p style="font-size:0.9em;">Regards,<br />Bookworm</p>
          <hr style="border:none;border-top:1px solid #eee" />
          <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
            <p>Bookworm </p>
          </div>
          </div>
          </div>`
        };
    
        await transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error(`Error sending email: ${error}`);
          }
          console.log(`OTP sent to ${User.email}: ${OTP}`);
          req.session.userInfo = {
            userName : User.username,
            email : User.email,
            phoneNumber : User.phoneNumber,
            age : User.age,
            password : User.password,
            block : User.block,
            expiresAt : expirationTime
          };
          res.redirect('/otp')
          // res.redirect(`/otp?userName=${User.username}&email=${User.email}&phoneNumber=${User.phoneNumber}&age=${User.age}&password=${User.password}&block=${User.block}&expiresAt=${expirationTime}`);
        });
    }catch(err){
        console.error(`Error Resend OTP : ${err}`);
        res.redirect('/signup');
    }
}



const renderMyProfile = async (req,res) =>{
  const warning = req.session.errormsg;
  req.session.errormsg = false;
  const userId = req.params.id;
  const userDetails = await user.findOne({_id: userId})
  res.render('userProfile',{ title: "User Profile",userDetails,warning});
}


const editUser = async (req,res) =>{
  try{
    await user.updateOne({_id: req.params.id},
      {$set:
        {
          username: req.body.userName,
          email: req.body.email,
          phoneNumber: req.body.phoneNumber,
          age: req.body.age,
        }
      })
      res.redirect(`/myProfile/${req.params.id}`);
  }catch(err){
    console.error(`Error Edit User Info : ${err}`);
    res.redirect(`/myProfile/${req.params.id}`);
  }
}


const changePassword = async (req,res) =>{
  try{
    const userId = req.params.id;
    const oldPassword = req.body.oldPassword;
    const newPassword = req.body.newPassword;
    const userdb = await user.findOne({ _id: userId});

    bcrypt.compare(oldPassword,userdb.password).then(async(result)=>{
      if(result){
        bcrypt.compare(newPassword,userdb.password).then(async(equal)=>{
          if(equal){
            return res.status(401).send({message:"New Password And Old Password Same",status:401})
          }else{
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await user.updateOne({_id: userId},
              {$set:
                {
                  password: hashedPassword
                }
              })
            req.session.user = false
            return res.status(200).send({message:"Success",status:200})
          }
        })
      }else{                  
          return res.status(401).send({message:"Old Password not correct",status:401})
      }
    })
  }catch(err){
    console.error(`Error Edit User Info : ${err}`);
    res.redirect(`/myProfile/${req.params.id}`);
  }
}





const renderBook = async (req, res) => {
  try {
    const books = await book.find({ delete: { $ne: false } }).populate('author').populate('genre');
    const reviews = await review.find({product: req.params.id}).populate('user');
    req.session.userInfo = false;
    const userId = req.session.user;
    let userDetails = false;

    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    if (userId) {
      userDetails = await user.findOne({ _id: userId });
    }
    const warning = req.session.errormsg;
    req.session.errormsg = false;
    res.render('book', { title: "Books", books, userDetails, warning, averageRating });
  } catch (err) {
    console.error(`Error rendering books: ${err}`);
    res.status(500).send({ message: "Internal Server Error" });
  }
};

const bookDetails = async (req, res) => {
  try {
    const books = await book.findOne({ _id: req.params.id }).populate('author').populate('genre');
    const relatedbooks = await book.find({ $or: [{ author: books.author }, { genre: books.genre }] }).populate('author').populate('genre');
    const reviews = await review.find({product: req.params.id}).populate('user');
    const userId = req.session.user;

    // Calculate average rating
    let totalRating = 0;
    for (let i = 0; i < reviews.length; i++) {
      totalRating += reviews[i].rating;
    }
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
    

    let userDetails = false;
    if (userId) {
      userDetails = await user.findOne({ _id: userId });
    }
    const warning = req.session.errormsg;
    req.session.errormsg = false;
    res.render('book-detail', { title: 'Bookdetails', books, relatedbooks, userDetails, warning, reviews, averageRating });
  } catch (err) {
    console.error(`Error fetching book details: ${err}`);
    res.status(500).send({ message: "Internal Server Error" });
  }
};


const address = async (req,res) =>{
  try{

    const userId = req.params.id;
    const newAddress = {
      address : true,
      houseName: req.body.houseName,
      streetName: req.body.streetName,
      town: req.body.town,
      state: req.body.state,
      country: req.body.country,
      zipCode: req.body.zipCode,
    };

    await user.updateOne({_id: userId}, 
      {$set: {"address.0": newAddress}})

    res.status(200).send({data:"Success"})
  }catch(err){
    console.error(`Error Edit User Info : ${err}`);
    res.redirect(`/myProfile/${req.params.id}`);
  }
}


const seleteAddress = async (req,res) =>{
  try{
    const addressId = req.body.addressId;
    const userDetails = await user.findOne({_id: req.session.user})
    // const address = userDetails.address.find(addressItems=> addressItems === addressId)
    const address = userDetails.address.id(addressId)
    res.status(200).send({address})

  }catch(err){
    console.error(`Error Edit User Info : ${err}`);
  }
}
 

const updateAddress = async (req,res) =>{
  try{
    const userId = req.params.id;
    const addressId = req.params.id;
    const updateAddress = {
      address : true,
      houseName: req.body.houseName,
      streetName: req.body.streetName,
      town: req.body.town,
      state: req.body.state,
      country: req.body.country,
      zipCode: req.body.zipCode,
    };

   const update =  await user.findOneAndUpdate({_id: userId, 'address._id': addressId}, 
      {$set: {"address.$": updateAddress}})
    res.status(200).send({data:"Success"})

  }catch(err){
    console.error(`Error Edit User Info : ${err}`);
    res.redirect(`/myProfile/${req.params.id}`);
  }
}


const deleteAddress = async (req,res) =>{
  try{
    const addressId = req.params.id;
    const userId = req.body.userId
    // Check if req.session.user is a valid ObjectId
    if (!mongoose.isValidObjectId(userId)) {
      throw new Error(`Invalid user ID: ${userId}`);
    }

    await user.deleteOne({ _id: userId, 'address._id' : addressId })

    res.status(200).send({ data: "Success" })

  }catch(err){
    console.error(`Error Edit User Info : ${err}`);
    res.redirect(`/myProfile/${req.session.user}`);
  }
}


const addOtherAddress = async (req, res) => {
  try {
    const userId = req.params.id;
    const newAddress = {
      address: true,
      houseName: req.body.addHouseName,
      streetName: req.body.addStreetName,
      town: req.body.addTown,
      state: req.body.addState,
      country: req.body.addCountry,
      zipCode: req.body.addZipCode,
    };
    const userDetails = await user.findOne({ _id: userId });
    userDetails.address.push(newAddress);
    await userDetails.save();
    res.redirect(`/myProfile/${req.params.id}`);
  } catch (err) {
    console.error(`Error adding other address: ${err}`);
    res.redirect(`/myProfile/${req.params.id}`);
  }
};




const addUserImage = async (req,res) =>{
  try{

    const base64Data = req.body.croppedImageData.split(';base64,').pop();

    await user.findOneAndUpdate({_id: req.params.id},
      {$set: 
          { 
              userImage : base64Data,
          }
      });

    
      res.redirect(`/myProfile/${req.params.id}`);

  }catch(err){
      console.error(`Error Add User Image : ${err}`);
      res.redirect(`/myProfile/${req.params.id}`);
  }
}


const renderMyOrder = async (req,res) =>{
  try{

    const warning = req.session.errormsg;
    req.session.errormsg = false;
    const userId = req.params.id;
    const userDetails = await user.findOne({_id: userId})
    const orders = await order.find({user : userId}).populate("user")
    .populate({
      path: "product.productId",
      model: "book",
      populate: [
        {
          path: "author",
          model: "author"
        },
        {
          path: "genre",
          model: "genre"
        }
      ]
    }).sort({orderTime : -1});
    const count =  await order.find({user : userId}).count()
    res.render('myOrder',{title: "my Order",userDetails,orders,count,warning});
  }catch(err){
    console.error(`Error Render myOrder page : ${err}`);
    res.redirect("/");
  }
}



const orderDelete = async (req,res) => {
  try{
    const orderId = req.query.orderId;
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

    await order.updateOne({_id: orderId},{$set: { status: "Delete" }})

     // Increase stock for each product in the cancelled order
     for (const item of orders.product) {
      const product = await book.findById(item.productId);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }

    res.status(200).send({
      data: "this is data"
    })
  }catch(err){
      console.error(`Error Product Remove : ${err}`);
      res.redirect("/");
  }
}



const renderCart = async (req,res) => {
  try{
    const warning = req.session.errormsg;
    req.session.errormsg = false;
    const userDetails = await user.findOne({_id: req.params.id})
    const carts = await cart.find({user: req.params.id}).populate('user').populate('product').
    populate({path: 'product', populate: {path: 'author'}}).populate({path: 'product', populate: {path: 'genre'}}).populate({path: 'product', populate: {path: 'stock'}})
    const count = await cart.find({user: req.params.id}).count()
    let totalAmount = productTotal(carts)
    let shipping = false;
    if(totalAmount<400){
      totalAmount = totalAmount + 40;
      shipping = true;
    }
    if(carts){
    res.render('cart',{carts,userDetails,totalAmount,shipping,count,warning});
    }else{
      res.redirect('/')
    }
  }catch(err){
    console.error(`Error Render Cart Page : ${err}`);
    res.redirect("/");
  }
}


const addToCart = async (req,res) => {
  try{
    const userId = req.query.userId;
    const productId = req.query.productId;
    
    const userDetails = await user.findOne({_id: userId});
    const userBlock = userDetails.block
    console.log("userBlock", userBlock);

    const existingProduct = await cart.findOne({ user: userId, product: productId }).populate('product')
    
    if(existingProduct){
      if(existingProduct.quantity + 1 <= existingProduct.product.stock){
        await cart.findOneAndUpdate({ user: userId, product: productId },
          {$inc:{
            quantity : 1
            }
          })
          return res.status(200).json({ message: "Item added to cart successfully" });
      } else {
        return res.status(400).json({ error: "Adding more quantity exceeds available stock" });
      }
    } 

    const newCart = new cart({
      user : userId,
      product : productId
    });
    await newCart.save()
    return res.status(200).json({ message: "Item added to cart successfully" });
    
  }catch(err){
      console.error(`Error Add To Cart Product : ${err}`);
      res.redirect("/");
  }
}


const productDec = async (req, res) => {
  try {
    const cartId = req.query.cartId;
    const userId = req.query.userId;
    let shipping = false;
    let quantityZero = false;

      await cart.findOneAndUpdate({ _id: cartId },
        {
          $inc: {
            quantity: -1,
          },
        }
      );

      const carts = await cart.find({ user: userId }).populate("user")
        .populate("product").populate({ path: "product", populate: { path: "author" } })
        .populate({ path: "product", populate: { path: "genre" } });

      let totalAmount = productTotal(carts);

      if (totalAmount < 400) {
        totalAmount = totalAmount + 40;
        shipping = true;
      }
      product = await cart.findOne({ _id: cartId }).populate('product');

      if(product.quantity <= 0){
        await cart.deleteOne({ _id: cartId });
        quantityZero = true;
      }

      const count = await cart.find({user: userId}).count()

      productPriceAndQuantity = parseInt(product.product.retailPrice*product.quantity)
      console.log(productPriceAndQuantity);

      res.status(200).send({
        data: "this is data",totalAmount,shipping,product,productPriceAndQuantity,quantityZero,count
      });

  } catch (err) {
    console.error(`Error Product Count Deccriment : ${err}`);
    res.redirect("/");
  }
};



const productInc = async (req,res) => {
 try {
    const cartId = req.query.cartId;
    const userId = req.query.userId;
    let shipping = false;

    // Find the cart item
    const cartItem = await cart.findOne({ _id: cartId }).populate('product');

    // Check if adding one more quantity will exceed the available stock
    if (cartItem.quantity + 1 <= cartItem.product.stock) {
      await cart.findOneAndUpdate({ _id: cartId },
        {
          $inc: {
            quantity: 1,
          },
        }
      );
    } else {
      return res.status(400).send({ error: "Quantity exceeds available stock"});
    }

      const carts = await cart.find({ user: userId }).populate("user")
        .populate("product").populate({ path: "product", populate: { path: "author" } })
        .populate({ path: "product", populate: { path: "genre" } });

      let totalAmount = productTotal(carts);

      if (totalAmount < 400) {
        totalAmount = totalAmount + 40;
        shipping = true;
      }

      product = await cart.findOne({ _id: cartId }).populate('product');

      productPriceAndQuantity = parseInt(product.product.retailPrice*product.quantity)

      res.status(200).send({
        data: "this is data",totalAmount,shipping,product,productPriceAndQuantity,
      });
  
      
  } catch (err) {
    console.error(`Error Product Count Increment : ${err}`);
    res.redirect("/");
  }
}


const productRemove = async (req,res) => {
  try{
    const cartId = req.query.cartId;
    const userId = req.query.userId;
    let shipping = false;

    const product = await cart.findOne({ _id: cartId }).populate('product');
    
    await cart.deleteOne({_id: cartId})

    const carts = await cart.find({ user: userId }).populate("user")
    .populate("product").populate({ path: "product", populate: { path: "author" } })
    .populate({ path: "product", populate: { path: "genre" } });

    let totalAmount = productTotal(carts);

    if (totalAmount < 400) {
      totalAmount = totalAmount + 40;
      shipping = true;
    }
    const count = await cart.find({user: userId}).count()
    res.status(200).send({
      data: "this is data",totalAmount,shipping,product,count,
    })
  }catch(err){
      console.error(`Error Product Remove : ${err}`);
      res.redirect("/");
  }
}


function productTotal(books){
  let totalPrice = 0;
  for(let i=0; i< books.length; i++){
    let book = books[i];
    totalPrice += book.product.retailPrice * book.quantity;
  }
  return totalPrice;
}


const renderCheckout = async (req,res) => {
  try{
    const warning = req.session.errormsg;
    req.session.errormsg = false;
    const userDetails = await user.findOne({_id: req.params.id})
    const carts = await cart.find({user: req.params.id}).populate('user').populate('product').
    populate({path: 'product', populate: {path: 'author'}}).populate({path: 'product', populate: {path: 'genre'}})
    const count = await cart.find({user: req.params.id}).count()
    const coupons = await coupon.find({});
    if(!count){
      res.redirect('/');
    }
  
    let totalAmount = productTotal(carts)
    let shipping = false;
    if(totalAmount<400){
      totalAmount = totalAmount + 40;
      shipping = true;
    }
    if(carts){
    res.render('checkout',{carts,userDetails,totalAmount,shipping,count,warning,coupons});
    }else{
      res.redirect('/')
    }
  }catch(err){
    console.error(`Error Render Cart Page : ${err}`);
    res.redirect("/");
  }
}


const checkOutAddress = async (req,res) =>{
  try{

    const userId = req.params.id;
    const newAddress = {
      address : true,
      houseName: req.body.houseName,
      streetName: req.body.streetName,
      town: req.body.town,
      state: req.body.state,
      country: req.body.country,
      zipCode: req.body.zipCode,
    };

    await user.updateOne({_id: userId}, 
      {$set: {"address.0": newAddress}})

    res.redirect(`/checkout/${req.params.id}`);

  }catch(err){
    console.error(`Error Edit User Info : ${err}`);
    res.redirect(`/checkout/${req.params.id}`);
  }
}


const checkOutUpdateAddress = async (req,res) =>{
  try{

    const addressId = req.params.id;
    const updateAddress = {
      address : true,
      houseName: req.body.houseName,
      streetName: req.body.streetName,
      town: req.body.town,
      state: req.body.state,
      country: req.body.country,
      zipCode: req.body.zipCode,
    };

    await user.updateOne({_id: req.session.user, 'address._id': addressId}, 
      {$set: {"address.$": updateAddress}})

    res.status(200).send({data:"Success"})

  }catch(err){
    console.error(`Error Edit User Info : ${err}`);
    res.redirect(`/checkout/${req.session.user}`);
  }
}


const checkOutAddOtherAddress = async (req, res) => {
  try {
    const userId = req.params.id;
    const newAddress = {
      address: true,
      houseName: req.body.addHouseName,
      streetName: req.body.addStreetName,
      town: req.body.addTown,
      state: req.body.addState,
      country: req.body.addCountry,
      zipCode: req.body.addZipCode,
    };
    const userDetails = await user.findOne({ _id: userId });
    userDetails.address.push(newAddress);
    await userDetails.save();
    res.redirect(`/checkout/${req.params.id}`);
  } catch (err) {
    console.error(`Error adding other address: ${err}`);
    res.redirect(`/checkout/${req.params.id}`);
  }
};


const applyCoupon = async (req,res) => {
  try{
    const couponName = req.body.couponName

    const carts = await cart.find({user: req.body.userId}).populate('user').populate('product').
    populate({path: 'product', populate: {path: 'author'}}).populate({path: 'product', populate: {path: 'genre'}})

    const couponInfo = await coupon.findOne({ couponName });

    // const count = await cart.find({user: req.body.userId}).count()
    
    let totalAmount = productTotal(carts)
    let shipping = false;

    if(!couponName){
      if(totalAmount<400){
        totalAmount = totalAmount + 40;
        shipping = true;
      }
      return res.status(400).send({message:"Add Coupon Name",totalAmount,shipping})
    }

    if(!couponInfo){
      if(totalAmount<400){
        totalAmount = totalAmount + 40;
        shipping = true;
      }
      return res.status(400).send({message:"Coupon name not valid",totalAmount,shipping})
    }

    const currentDate = new Date();

    if (couponInfo.ExpiredDate < currentDate) {
      if(totalAmount<400){
        totalAmount = totalAmount + 40;
        shipping = true;
      }
      return res.status(400).send({ message: "Coupan has expired",totalAmount,shipping});
    }

    if (couponInfo.users.includes(req.body.userId)) {
      if(totalAmount<400){
        totalAmount = totalAmount + 40;
        shipping = true;
      }
      return res.status(400).send({ message: "You have already used this coupon",totalAmount,shipping});
    }

    if (req.body.total < couponInfo.minimumTotal) {
      if(totalAmount<400){
        totalAmount = totalAmount + 40;
        shipping = true;
      }
      return res.status(400).send({ message: "Total is below the minimum required to use this coupon",totalAmount,shipping});
    }


    const discountPercentage = couponInfo.discountPercentage / 100;
    let discountAmount = totalAmount * discountPercentage;

    if (discountAmount > couponInfo.maximumDiscountPrice) {
      discountAmount = couponInfo.maximumDiscountPrice;
    }

    let discountTotal = totalAmount - discountAmount;
    if(discountTotal<400){
      discountTotal = discountTotal + 40;
      shipping = true;
    }


    couponInfo.users.push(req.body.userId);
    // await couponInfo.save();
    res.status(200).send({message:"Coupon added",discountTotal,totalAmount,discountAmount,shipping})

  }catch(err){
    console.error(`Error Render Cart Page : ${err}`);
    res.redirect("/");
  }
}


const deleteCoupon = async (req,res) => {
  try{
    const couponName = req.body.couponName

    const carts = await cart.find({user: req.session.user}).populate('user').populate('product').
    populate({path: 'product', populate: {path: 'author'}}).populate({path: 'product', populate: {path: 'genre'}})

    let totalAmount = productTotal(carts)
    let shipping = false;
    if(totalAmount<400){
      totalAmount = totalAmount + 40;
      shipping = true;
    }

    res.status(200).send({message:"Coupon Remove",totalAmount,shipping})
  }catch(err){
    console.error(`Error Render Cart Page : ${err}`);
    res.redirect("/");
  }
}




const cashOnDelivary = async (req, res) => {
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
      paymentMethod: "COD",
      discountAmount: discountAmount,
      orderTime: new Date(),
    });

    await newOrder.save();

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

const onlinePayment = async (req, res) => {
  try {

    const userId = req.query.userId;
    const couponName = req.body.couponName;
    
    if(couponName){
      const couponInfo = await coupon.findOne({ couponName });

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
    }

    const amount = req.body.totalAmount;
    const lastOrder = await order.find().sort({ _id: -1 }).limit(1);
    let orderId = 'BKWM000001';
    if (lastOrder.length > 0) {
      const lastOrderId = lastOrder[0].orderId;
      const orderIdNumber = parseInt(lastOrderId.slice(4));
      orderId = `BKWM${("000000" + (orderIdNumber + 1)).slice(-6)}`;
    }


    const razorpayInstance = new Razorpay({
      key_id: process.env.razorpayKey,
      key_secret: process.env.razorpaySecret
    });



    const options = await razorpayInstance.orders.create({
      amount: amount * 100, 
      currency: "INR",
      receipt: orderId
    });

    const userDetails = await user.findOne({_id: userId});
    console.log(userDetails);

    res.status(201).json({
      success: true,
      options,
      userDetails,
      amount,
      couponName,
      razorpayKey: process.env.razorpayKey
    });
  } catch (err) {
    console.error(`Error Online Payment:`, err);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};



const verifyOnlinePayment = async (req, res) => {
  try {
    const payment = req.body.payment;
    const orderDetails = req.body.order;
    
    let discountAmount = 0;

    let hmac = crypto.createHmac('sha256','I7gobX3hkGj2uFqwCbSddYRA')
    hmac.update(payment.razorpay_order_id +'|'+ payment.razorpay_payment_id)
    hmac=hmac.digest('hex')

    if(hmac == payment.razorpay_signature){
      const userId = req.body.userId;
      const cartItems = await cart.find({ user: userId });

      let productArray = cartItems.map(item => {
        return { productId: item.product, quantity: item.quantity };
      });

      const couponName = req.body.couponName;
      if(couponName){
        const couponInfo = await coupon.findOne({ couponName });

        const carts = await cart.find({user: userId}).populate('user').populate('product').
        populate({path: 'product', populate: {path: 'author'}}).populate({path: 'product', populate: {path: 'genre'}})
        let totalAmount = productTotal(carts)
        
        const discountPercentage = couponInfo.discountPercentage / 100;
        discountAmount = totalAmount * discountPercentage;
        
        if (discountAmount > couponInfo.maximumDiscountPrice) {
          discountAmount = couponInfo.maximumDiscountPrice;
        }
        discountAmount = parseInt(discountAmount);

        couponInfo.users.push(userId);
        await couponInfo.save();
      }
      const fullAmount = req.body.fullAmount;
      console.log('full Amount =', fullAmount);

      const newOrder = new order({
        orderId : orderDetails.receipt,
        user: userId,
        product: productArray,
        address: req.body.address,
        totalAmount: fullAmount,
        paymentMethod: "Online",
        discountAmount: discountAmount,
        orderTime: new Date(),
      });
  
      await newOrder.save();

      if(req.body.walletAmount) {
          // Record the debit transaction
          const transaction = new WalletTransaction({
            userId: userId,
            type: 'debit',
            amount: req.body.walletAmount,
            description: 'Payment partially made using wallet'
          });
          await transaction.save();
      }

       // Update stock of each product
    for (const item of cartItems) {
      const product = await book.findById(item.product._id);
      if (product) {
        product.stock -= item.quantity; // Decrease stock by the quantity in the cart
        await product.save();
      }
    }
  
      await cart.deleteMany({ user: userId });
  
      const orderId = orderDetails.receipt
      res.status(200).send({ orderId });
    }

  } catch (err) {
    console.error(`Error Verify Online Payment:`, err);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};


const requestRefund = async (req, res) => {
  try {
    const { orderId, reason } = req.body;

    // Fetch the order details
    const orders = await order.findOne({ _id: orderId }).populate('user');

    const userId = orders.user.id;
    // Check if the order exists and is eligible for a refund
    if (!orders) {
      return res.status(404).send({ error: "Order not found" });
    }

    // Check if the order status is 'Complete'
    if (orders.status !== 'Complete') {
      return res.status(400).send({ error: "Order is not complete. Refund cannot be requested." });
    }

    // Record the refund request
    orders.refundReason = reason;
    orders.refundStatus = 'Pending';

    await orders.save();

    res.redirect(`/myOrder/${userId}`)
  } catch (error) {
    console.error(`Error requesting refund: ${error}`);
    res.status(500).send("Internal server error");
  }
};

const addReview = async (req, res) => {
  try {
    const { productId, userId, rating, reviewText,bookName } = req.body;

    console.log('productId:', productId);
    console.log('userId', userId);
    console.log('rating', rating);
    console.log('review:', reviewText);
    console.log('bookName:', bookName);

      // Validate incoming data
      if (!productId || !userId || !rating || !reviewText) {
          return res.status(400).json({ message: 'Missing required fields' });
      }
      const existingReview = await review.findOne({ product: productId, user: userId });
      if (existingReview) {
        return res.status(400).json({ message: 'User has already submitted a review for this product' });
      }
      // Create a new review instance
      const newReview = new review({
          product: productId,
          user: userId,
          rating: rating,
          reviewText: reviewText
      });
      // Save the review to the database
      await newReview.save();
      res.status(200).json({ message: 'Review added successfully', bookName });
  
  } catch (error) {
      console.error('Error adding review:', error);
      res.status(500).json({ message: 'Failed to add review' });
  }
}

const logout = (req,res)=>{
  req.session.user = null;
  res.redirect("/");
}





module.exports = {
    renderHome,
    loginVarification,
    renderForgot,
    forgotPassword,
    otpForgot,
    otpValidation,
    resendForgotPasswordOTP,
    renderReset,
    resetPassword,
    userSignup,
    renderSignup,
    renderOTP,
    verifyOTP,
    resendOTP,
    renderMyProfile,
    editUser,
    changePassword,
    renderBook,
    bookDetails,
    address, 
    seleteAddress,
    updateAddress,
    deleteAddress,
    addOtherAddress,
    addUserImage,
    renderMyOrder,
    orderDelete,
    renderCart,
    addToCart,
    productDec,
    productInc,
    productRemove,
    renderCheckout,
    checkOutAddress,
    checkOutUpdateAddress,
    checkOutAddOtherAddress,
    applyCoupon,
    deleteCoupon,
    cashOnDelivary,
    onlinePayment,
    verifyOnlinePayment,
    requestRefund,
    addReview,
    logout,
}