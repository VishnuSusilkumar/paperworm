const { response } = require("express");
const fs = require("fs");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const session = require("express-session");
dotenv.config();

const user = require("../models/userModel");
const author = require("../models/authorModel");
const book = require("../models/bookModel");
const genre = require("../models/genreModel");
const coupon = require("../models/couponModel");
const order = require("../models/orderModel");
const banner = require("../models/bannerModel");


// Banner Management

const renderBannerManagement = async (req, res) => {
    try {
      const books = await book.find().populate("author").populate("genre");
      const banners = await banner
        .findOne({ banner: true })
        .populate("bigCard1ProductId")
        .populate("bigCard2ProductId");
      const warning = req.session.errormsg;
      req.session.errormsg = false;
      res.render("admin/bannerManagement.ejs", { books, banners, warning });
    } catch (err) {
      console.error(`Error Get Banner Management : ${err}`);
      res.redirect("/admin/admin_panel");
    }
  };
  

  
  const mainHeading = async (req, res) => {
    try {
      const existingBanner = await banner.find().count();
      if (existingBanner == 0) {
        const newBanner = new banner({
          mainHeading: req.body.mainHeading,
        });
        newBanner.save();
        return res
          .status(200)
          .send({ data: "success", mainHeading: req.body.mainHeading });
      }
      await banner.updateOne(
        { banner: true },
        {
          $set: {
            mainHeading: req.body.mainHeading,
          },
        }
      );
      res
        .status(200)
        .send({ data: "success", mainHeading: req.body.mainHeading });
    } catch (err) {
      console.error(`Error Get mainHeading Management : ${err}`);
      res.redirect("/admin/admin_panel");
    }
  };
  
  const subHeading1 = async (req, res) => {
    try {
      const existingBanner = await banner.find().count();
      if (existingBanner == 0) {
        const newBanner = new banner({
          subHeading1: req.body.subHeading1,
        });
        newBanner.save();
        return res
          .status(200)
          .send({ data: "success", subHeading1: req.body.subHeading1 });
      }
      await banner.updateOne(
        { banner: true },
        {
          $set: {
            subHeading1: req.body.subHeading1,
          },
        }
      );
      res
        .status(200)
        .send({ data: "success", subHeading1: req.body.subHeading1 });
    } catch (err) {
      console.error(`Error Get subHeading1 Management : ${err}`);
      res.redirect("/admin/admin_panel");
    }
  };
  
  const subHeading2 = async (req, res) => {
    try {
      const existingBanner = await banner.find().count();
      if (existingBanner == 0) {
        const newBanner = new banner({
          subHeading2: req.body.subHeading2,
        });
        newBanner.save();
        return res
          .status(200)
          .send({ data: "success", subHeading2: req.body.subHeading2 });
      }
      await banner.updateOne(
        { banner: true },
        {
          $set: {
            subHeading2: req.body.subHeading2,
          },
        }
      );
      res
        .status(200)
        .send({ data: "success", subHeading2: req.body.subHeading2 });
    } catch (err) {
      console.error(`Error Get subHeading2 Management : ${err}`);
      res.redirect("/admin/admin_panel");
    }
  };
  
  
  
  const bigCard1Heading1 = async (req, res) => {
    try {
      const existingBanner = await banner.find().count();
      if (existingBanner == 0) {
        const newBanner = new banner({
          bigCard1Heading1: req.body.bigCard1Heading1,
        });
        newBanner.save();
        return res
          .status(200)
          .send({ data: "success", bigCard1Heading1: req.body.bigCard1Heading1 });
      }
      await banner.updateOne(
        { banner: true },
        {
          $set: {
            bigCard1Heading1: req.body.bigCard1Heading1,
          },
        }
      );
      res
        .status(200)
        .send({ data: "success", bigCard1Heading1: req.body.bigCard1Heading1 });
    } catch (err) {
      console.error(`Error Get bigCard1Heading1 Management : ${err}`);
      res.redirect("/admin/admin_panel");
    }
  };
  
  const bigCard1Heading2 = async (req, res) => {
    try {
      const existingBanner = await banner.find().count();
      if (existingBanner == 0) {
        const newBanner = new banner({
          bigCard1Heading2: req.body.bigCard1Heading2,
        });
        newBanner.save();
        return res
          .status(200)
          .send({ data: "success", bigCard1Heading2: req.body.bigCard1Heading2 });
      }
      await banner.updateOne(
        { banner: true },
        {
          $set: {
            bigCard1Heading2: req.body.bigCard1Heading2,
          },
        }
      );
      res
        .status(200)
        .send({ data: "success", bigCard1Heading2: req.body.bigCard1Heading2 });
    } catch (err) {
      console.error(`Error Get bigCard1Heading2 Management : ${err}`);
      res.redirect("/admin/admin_panel");
    }
  };
  
  const bigCard1Discription = async (req, res) => {
    try {
      const existingBanner = await banner.find().count();
      if (existingBanner == 0) {
        const newBanner = new banner({
          bigCard1Discription: req.body.bigCard1Discription,
        });
        newBanner.save();
        return res
          .status(200)
          .send({
            data: "success",
            bigCard1Discription: req.body.bigCard1Discription,
          });
      }
      await banner.updateOne(
        { banner: true },
        {
          $set: {
            bigCard1Discription: req.body.bigCard1Discription,
          },
        }
      );
      res
        .status(200)
        .send({
          data: "success",
          bigCard1Discription: req.body.bigCard1Discription,
        });
    } catch (err) {
      console.error(`Error Get bigCard1Discription Management : ${err}`);
      res.redirect("/admin/admin_panel");
    }
  };
  
  const bigCard1ProductId = async (req, res) => {
    try {
      const existingBanner = await banner.find().count();
      if (existingBanner == 0) {
        const newBanner = new banner({
          bigCard1ProductId: req.body.bigCard1ProductId,
        });
        newBanner.save();
        return res
          .status(200)
          .send({
            data: "success",
            bigCard1ProductId: req.body.bigCard1ProductId,
          });
      }
      await banner.updateOne(
        { banner: true },
        {
          $set: {
            bigCard1ProductId: req.body.bigCard1ProductId,
          },
        }
      );
      const product = await banner
        .findOne({ banner: true })
        .populate("bigCard1ProductId");
      res.status(200).send({ data: "success", product });
    } catch (err) {
      console.error(`Error Get bigCard1ProductId Management : ${err}`);
      res.redirect("/admin/admin_panel");
    }
  };
  
  const bigCard1Image = async (req, res) => {
    try {
      if (!req.file) {
        throw new Error("No file uploaded!");
      }
      const existingBanner = await banner.find().count();
      if (existingBanner == 0) {
        const newBanner = new banner({
          bigCard1Image: req.file.filename,
        });
        newBanner.save();
        res.redirect("/admin/bannerManagement");
        // return res.status(200).send({ data: "success", bigCard1Image: req.file.filename });
      }
      await banner.updateOne(
        { banner: true },
        {
          $set: {
            bigCard1Image: req.file.filename,
          },
        }
      );
  
      const directoryPath = "public/" + req.body.oldBigCard1Image;
      fs.unlink(directoryPath, (err) => {
        try {
          if (err) {
            throw err;
          }
          console.log("Delete Home Image successfully.");
        } catch (err) {
          console.error(`Error Deleting Book : ${err}`);
        }
      });
  
      res.redirect("/admin/bannerManagement");
      //   res.status(200).send({ data: "success", bigCard1Image: req.file.filename });
    } catch (err) {
      console.error(`Error Get bigCard1Image Management : ${err}`);
      res.redirect("/admin/admin_panel");
    }
  };
  
  const bigCard2Heading1 = async (req, res) => {
    try {
      const existingBanner = await banner.find().count();
      if (existingBanner == 0) {
        const newBanner = new banner({
          bigCard2Heading1: req.body.bigCard2Heading1,
        });
        newBanner.save();
        return res
          .status(200)
          .send({ data: "success", bigCard2Heading1: req.body.bigCard2Heading1 });
      }
      await banner.updateOne(
        { banner: true },
        {
          $set: {
            bigCard2Heading1: req.body.bigCard2Heading1,
          },
        }
      );
      res
        .status(200)
        .send({ data: "success", bigCard2Heading1: req.body.bigCard2Heading1 });
    } catch (err) {
      console.error(`Error Get bigCard2Heading1 Management : ${err}`);
      res.redirect("/admin/admin_panel");
    }
  };
  
  const bigCard2Heading2 = async (req, res) => {
    try {
      const existingBanner = await banner.find().count();
      if (existingBanner == 0) {
        const newBanner = new banner({
          bigCard2Heading2: req.body.bigCard2Heading2,
        });
        newBanner.save();
        return res
          .status(200)
          .send({ data: "success", bigCard2Heading2: req.body.bigCard2Heading2 });
      }
      await banner.updateOne(
        { banner: true },
        {
          $set: {
            bigCard2Heading2: req.body.bigCard2Heading2,
          },
        }
      );
      res
        .status(200)
        .send({ data: "success", bigCard2Heading2: req.body.bigCard2Heading2 });
    } catch (err) {
      console.error(`Error Get bigCard2Heading2 Management : ${err}`);
      res.redirect("/admin/admin_panel");
    }
  };
  
  const bigCard2Discription = async (req, res) => {
    try {
      const existingBanner = await banner.find().count();
      if (existingBanner == 0) {
        const newBanner = new banner({
          bigCard2Discription: req.body.bigCard2Discription,
        });
        newBanner.save();
        return res
          .status(200)
          .send({
            data: "success",
            bigCard2Discription: req.body.bigCard2Discription,
          });
      }
      await banner.updateOne(
        { banner: true },
        {
          $set: {
            bigCard2Discription: req.body.bigCard2Discription,
          },
        }
      );
      res
        .status(200)
        .send({
          data: "success",
          bigCard2Discription: req.body.bigCard2Discription,
        });
    } catch (err) {
      console.error(`Error Get bigCard2Discription Management : ${err}`);
      res.redirect("/admin/admin_panel");
    }
  };
  
  const bigCard2ProductId = async (req, res) => {
    try {
      const existingBanner = await banner.find().count();
      if (existingBanner == 0) {
        const newBanner = new banner({
          bigCard2ProductId: req.body.bigCard2ProductId,
        });
        newBanner.save();
        return res
          .status(200)
          .send({
            data: "success",
            bigCard2ProductId: req.body.bigCard2ProductId,
          });
      }
      await banner.updateOne(
        { banner: true },
        {
          $set: {
            bigCard2ProductId: req.body.bigCard2ProductId,
          },
        }
      );
      const product = await banner
        .findOne({ banner: true })
        .populate("bigCard2ProductId");
      res.status(200).send({ data: "success", product });
    } catch (err) {
      console.error(`Error Get bigCard2ProductId Management : ${err}`);
      res.redirect("/admin/admin_panel");
    }
  };
  
  const bigCard2Image = async (req, res) => {
    try {
      if (!req.file) {
        throw new Error("No file uploaded!");
      }
      const existingBanner = await banner.find().count();
      if (existingBanner == 0) {
        const newBanner = new banner({
          bigCard2Image: req.file.filename,
        });
        newBanner.save();
        res.redirect("/admin/bannerManagement");
        // return res.status(200).send({ data: "success", bigCard2Image: req.file.filename });
      }
      await banner.updateOne(
        { banner: true },
        {
          $set: {
            bigCard2Image: req.file.filename,
          },
        }
      );
  
      const directoryPath = "public/" + req.body.oldBigCard2Image;
      fs.unlink(directoryPath, (err) => {
        try {
          if (err) {
            throw err;
          }
          console.log("Delete Home Image successfully.");
        } catch (err) {
          console.error(`Error Deleting Book : ${err}`);
        }
      });
  
      res.redirect("/admin/bannerManagement");
      //   res.status(200).send({ data: "success", bigCard2Image: req.file.filename });
    } catch (err) {
      console.error(`Error Get bigCard2Image Management : ${err}`);
      res.redirect("/admin/admin_panel");
    }
  };
  
  const bottomImage1 = async (req, res) => {
    try {
      if (!req.file) {
        throw new Error("No file uploaded!");
      }
      const existingBanner = await banner.find().count();
      if (existingBanner == 0) {
        const newBanner = new banner({
          bottomImage1: req.file.filename,
        });
        newBanner.save();
        res.redirect("/admin/bannerManagement");
        // return res.status(200).send({ data: "success", homeImage: req.file.filename });
      }
      await banner.updateOne(
        { banner: true },
        {
          $set: {
            bottomImage1: req.file.filename,
          },
        }
      );
  
      const directoryPath = "public/" + req.body.oldBottomImage1;
      fs.unlink(directoryPath, (err) => {
        try {
          if (err) {
            throw err;
          }
          console.log("Delete old Bottom Image 1 successfully.");
        } catch (err) {
          console.error(`Error Deleting Book : ${err}`);
        }
      });
  
      res.redirect("/admin/bannerManagement");
    } catch (err) {
      console.error(`Error Get bottomImage1 Management : ${err}`);
      res.redirect("/admin/admin_panel");
    }
  };
  
  const bottomImage2 = async (req, res) => {
    try {
      if (!req.file) {
        throw new Error("No file uploaded!");
      }
      const existingBanner = await banner.find().count();
      if (existingBanner == 0) {
        const newBanner = new banner({
          bottomImage2: req.file.filename,
        });
        newBanner.save();
        res.redirect("/admin/bannerManagement");
        // return res.status(200).send({ data: "success", homeImage: req.file.filename });
      }
      await banner.updateOne(
        { banner: true },
        {
          $set: {
            bottomImage2: req.file.filename,
          },
        }
      );
  
      const directoryPath = "public/" + req.body.oldBottomImage2;
      fs.unlink(directoryPath, (err) => {
        try {
          if (err) {
            throw err;
          }
        } catch (err) {
          console.error(`Error Deleting Book : ${err}`);
        }
      });
  
      res.redirect("/admin/bannerManagement");
    } catch (err) {
      console.error(`Error Get bottomImage2 Management : ${err}`);
      res.redirect("/admin/admin_panel");
    }
  };

  module.exports = {
    // BannerMangement
    renderBannerManagement,
    mainHeading,
    subHeading1,
    subHeading2,
    
    
    bigCard1Heading1,
    bigCard1Heading2,
    bigCard1Discription,
    bigCard1ProductId,
    bigCard1Image,
    
    bigCard2Heading1,
    bigCard2Heading2,
    bigCard2Discription,
    bigCard2ProductId,
    bigCard2Image,
    
    bottomImage1,
    bottomImage2,
  }