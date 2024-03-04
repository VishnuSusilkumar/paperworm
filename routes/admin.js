const { response } = require('express');
const express = require('express');

const adminController = require('../controllers/adminController');
const bannerController = require('../controllers/bannerController');
const downloadController = require('../controllers/downloadController');
const offerController = require('../controllers/offerController');
const productController = require('../controllers/productController');
const categoryController = require('../controllers/categoryController');
const couponController = require('../controllers/couponController');
const orderController = require('../controllers/orderController');

const midleware = require('../midlewares/middleware');
const { upload, cropImages, bookImageCrop, authorImageCrop } = require('../midlewares/multer')
const { get } = require('mongoose');
const router = express.Router();

router.get('/',adminController.renderLogin);

router.post('/adminLogin',adminController.adminLogin);

router.get('/admin_panel',midleware.adminSession,adminController.adminPanel);

router.get('/userManagement',midleware.adminSession,adminController.renderUserManagement);

router.get('/blockUser/:id',midleware.adminSession,adminController.blockUser);

router.get('/unblockUser/:id',midleware.adminSession,adminController.unblockUser);

router.get('/productManagement',midleware.adminSession,productController.renderProductManagement);

router.get('/addBook',midleware.adminSession,productController.renderAddBook);

router.post('/addBook',upload.array('myFiles', 3),cropImages,productController.addBook);

router.post('/editBook/:id',midleware.adminSession,productController.editBook);

router.get('/unlistBook/:id',midleware.adminSession,productController.unlistBook);

router.get('/listBook/:id',midleware.adminSession,productController.listBook);

router.post('/addAuthorInAddBook',upload.single('authorImageAddBook'),productController.addAuthorInAddBook);

router.post('/addGenreInAddBook',productController.addGenreInAddBook);

router.post('/changeImage1/:id',upload.single('myFile1'),bookImageCrop, productController.changeImage1);

router.post('/changeImage2/:id',upload.single('myFile2'),bookImageCrop,productController.changeImage2);

router.post('/changeImage3/:id',upload.single('myFile3'),bookImageCrop,productController.changeImage3);

//Category Management

router.get('/authorManagement',midleware.adminSession,categoryController.renderAuthorManagement);

router.post('/addAuthor',upload.single('authorImage'),categoryController.addAuthor);

router.post('/changeAuthorImage/:id',upload.single('authorImage'), authorImageCrop, categoryController.changeAuthorImage);

router.post('/editAuthor/:id',categoryController.editAuthor);

router.get('/unlistAuthor/:id',midleware.adminSession,categoryController.unlistAuthor);

router.get('/listAuthor/:id',midleware.adminSession,categoryController.listAuthor);

router.get('/genreManagement',midleware.adminSession,categoryController.renderGenreManagement);

router.post('/addGenre',categoryController.addGenre);

router.post('/editGenre/:id',categoryController.editGenre);

router.get('/unlistGenre/:id',midleware.adminSession,categoryController.unlistGenre);

router.get('/listGenre/:id',midleware.adminSession,categoryController.listGenre);

// Coupon Mangement

router.get('/couponManagement',midleware.adminSession,couponController.renderCouponManagement);

router.post('/addCoupon',midleware.adminSession,couponController.addCoupon);

router.post('/editCoupon',midleware.adminSession,couponController.editCoupon);

router.delete('/deleteCoupon',midleware.adminSession,couponController.deleteCoupon);


// Order management

router.get('/pendingManagement',midleware.adminSession,orderController.renderPendingManagement);

router.post('/changeOnTheWayOrder/:id',midleware.adminSession,orderController.changeOnTheWayOrder);

router.get('/onthewayManagement',midleware.adminSession,orderController.renderOnTheWayManagement);

router.post('/changeCompleteOrder/:id',midleware.adminSession,orderController.changeCompleteOrder);

router.get('/completeManagement',midleware.adminSession,orderController.renderCompleteManagement);

router.post('/changeDeleteOrder/:id',midleware.adminSession,orderController.changeDeleteOrder);

router.get('/deleteManagement',midleware.adminSession,orderController.renderDeleteManagement);

//wallet

router.get('/requestRefundRender', midleware.adminSession, adminController.renderRefundManagement);

router.post('/approveRefund/:id', midleware.adminSession, adminController.approveRefund);

router.get('/approvedRefunds', midleware.adminSession, adminController.renderApprovedRefunds);

router.post('/rejectRefund/:id', midleware.adminSession, adminController.rejectRefund);

router.get('/rejectedRefunds', midleware.adminSession, adminController.renderRejectedRefunds);

//Banner Management

router.get('/bannerManagement',midleware.adminSession,bannerController.renderBannerManagement);



router.post('/mainHeading',midleware.adminSession,bannerController.mainHeading);

router.post('/subHeading1',midleware.adminSession,bannerController.subHeading1);

router.post('/subHeading2',midleware.adminSession,bannerController.subHeading2);



router.post('/bigCard1Heading1',midleware.adminSession,bannerController.bigCard1Heading1);

router.post('/bigCard1Heading2',midleware.adminSession,bannerController.bigCard1Heading2);

router.post('/bigCard1Discription',midleware.adminSession,bannerController.bigCard1Discription);

router.post('/bigCard1ProductId',midleware.adminSession,bannerController.bigCard1ProductId);

router.post('/bigCard1Image',upload.single('bigCard1Image'),midleware.adminSession,bannerController.bigCard1Image);

router.post('/bigCard2Heading1',midleware.adminSession,bannerController.bigCard2Heading1);

router.post('/bigCard2Heading2',midleware.adminSession,bannerController.bigCard2Heading2);

router.post('/bigCard2Discription',midleware.adminSession,bannerController.bigCard2Discription);

router.post('/bigCard2ProductId',midleware.adminSession,bannerController.bigCard2ProductId);

router.post('/bigCard2Image',upload.single('bigCard2Image'),midleware.adminSession,bannerController.bigCard2Image);

router.post('/bottomImage1',upload.single('bottomImage1'),midleware.adminSession,bannerController.bottomImage1);

router.post('/bottomImage2',upload.single('bottomImage2'),midleware.adminSession,bannerController.bottomImage2);

// Offer

router.get('/productOffer',midleware.adminSession, offerController.renderProductOffer);

router.post('/createProductOffer/:bookId', midleware.adminSession, offerController.createProductOffer);

router.post('/editProductOffer/:bookId', midleware.adminSession, offerController.editProductOffer);


router.get('/inActiveOffer/:id',midleware.adminSession,offerController.inActiveOffer);

router.get('/activeOffer/:id',midleware.adminSession,offerController.activeOffer);

router.get('/genreOffer', midleware.adminSession, offerController.renderGenreOffer);

router.post('/createGenreOffer/:id', midleware.adminSession, offerController.createGenreOffer);

router.get('/activeCategoryOffer/:id',midleware.adminSession,offerController.activeCategoryOffer);

router.get('/inActiveCategoryOffer/:id',midleware.adminSession,offerController.inActiveCategoryOffer);

//Sales Report

router.get('/salesReport', midleware.adminSession, downloadController.salesReport);



router.get('/logout',adminController.logout);


module.exports=router;