const { response } = require('express');
const express = require('express');


const userController = require('../controllers/userController');
const walletController = require('../controllers/walletController');
const downloadController = require('../controllers/downloadController');

const midleware = require('../midlewares/middleware') 
const { upload, cropImage } = require('../midlewares/multer')
const router = express.Router();


router.get('/',userController.renderHome);

router.post('/login', userController.loginVarification);

// router.post('/searchBox',userController.searchBox);

router.get('/forgot-password', userController.renderForgot);

router.post('/forgot-password', userController.forgotPassword);

router.get('/otp-validation/:email', userController.otpForgot);

router.post('/otp-validation', userController.otpValidation);

router.post('/resend-forgot-otp', userController.resendForgotPasswordOTP)

router.get('/reset-password/:token', userController.renderReset);

router.post('/reset-password/:token', userController.resetPassword);

router.get('/signup',midleware.signupSession,userController.renderSignup);

router.post('/register',midleware.signupSession,userController.userSignup);

router.get('/otp',midleware.signupSession,userController.renderOTP);

router.post('/verifyOTP',midleware.signupSession,userController.verifyOTP);

router.post('/resendOTP',midleware.signupSession,userController.resendOTP);

router.get('/book',userController.renderBook);
 
router.get('/book-details/:id',userController.bookDetails);

router.get('/myProfile/:id',midleware.userSession,userController.renderMyProfile);

router.get('/myOrder/:id',midleware.userSession,userController.renderMyOrder);

router.post('/orderDelete',midleware.userSession,userController.orderDelete);

router.post('/editUser/:id',midleware.userSession,userController.editUser);

router.put('/changePassword/:id',midleware.userSession,userController.changePassword);

router.post('/address/:id',midleware.userSession,userController.address);

router.post('/selectAddress',midleware.userSession,userController.seleteAddress);

router.post('/updateAddress/:id',midleware.userSession,userController.updateAddress);

router.post('/deleteAddress/:id',midleware.userSession,userController.deleteAddress);

router.post('/addOtherAddress/:id',midleware.userSession,userController.addOtherAddress);

router.post('/addUserImage/:id',midleware.userSession,upload.single('userImage'),userController.addUserImage);

router.get('/cart/:id',midleware.userSession,userController.renderCart);

router.post('/addToCart',midleware.userSession,userController.addToCart);

router.put('/productDec',midleware.userSession,userController.productDec);

router.put('/productInc',midleware.userSession,userController.productInc);

router.put('/productRemove',midleware.userSession,userController.productRemove);

router.get('/checkout/:id',midleware.userSession,userController.renderCheckout);

router.post('/checkOutAddress/:id',midleware.userSession,userController.checkOutAddress);

router.post('/checkOutUpdateAddress/:id',midleware.userSession,userController.checkOutUpdateAddress);

router.post('/checkOutAddOtherAddress/:id',midleware.userSession,userController.checkOutAddOtherAddress);

router.post('/applyCoupon',midleware.userSession,userController.applyCoupon);

router.delete('/deleteCoupon',midleware.userSession,userController.deleteCoupon);

router.put('/cashOnDelivary',midleware.userSession,userController.cashOnDelivary);

router.put('/onlinePayment',midleware.userSession,userController.onlinePayment);

router.put('/verifyOnlinePayment',midleware.userSession,userController.verifyOnlinePayment);

router.post('/addReview', midleware.userSession, userController.addReview);


router.get('/wallet/:id', midleware.userSession, walletController.renderWallet);

router.post('/addFunds', midleware.userSession, walletController.addFunds);

router.post('/razorpay/order', midleware.userSession, walletController.createRazorpayOrder);

router.post('/requestRefund', midleware.userSession, userController.requestRefund);

router.post('/applyWallet', midleware.userSession, walletController.applyWallet);

router.delete('/deleteWallet', midleware.userSession, walletController.deleteWallet);

router.put('/paymentUsingWallet',midleware.userSession,walletController.paymentUsingWallet);

router.get('/invoiceDownload/:orderId', midleware.userSession, downloadController.invoiceDownload);

router.get('/logout',userController.logout);

module.exports=router;