const express = require('express');
const path = require('path');   
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');


// Configuration for Multer
const multerStorage = multer.diskStorage({ 
    destination: (req, file, cb) => { 
      cb(null, 'public');
    },
    filename: (req, file, cb) => {
      const ext = file.mimetype.split('/')[1];
      cb(null, `books/book-${file.fieldname}-${Date.now()}.${ext}`);
    }
});

// Multer Filter
const multerFilter = (req, file, cb) => {
    if (file.mimetype.split('/')[1] === 'jpeg' || 
        file.mimetype.split('/')[1] === 'png' || 
        file.mimetype.split('/')[1] === 'jpg') {
      cb(null, true);
    } else {
      cb(new Error("Not a JPEG, PNG or JPG File!!"), false);
    }
};


const upload = multer({
    storage: multerStorage, 
    fileFilter: multerFilter
});


const cropImages = async (req, res, next) => {
  try {
    console.log('cropImage middleware called');
    if (!req.files || req.files.length === 0) {
      console.log('No files found for cropping');
      return next();
    }

    await Promise.all(req.files.map(async (file, index) => {
      const filePath = file.path;
      console.log('Processing file:', filePath);
      
      const width = 1080; 
      const height = 1440; 
      const croppedFilePath = `${filePath}-cropped`;

      await sharp(filePath)
        .resize(width, height, {
          fit: sharp.fit.cover,
          position: sharp.strategy.entropy
        })
        .toFile(croppedFilePath); 

      fs.unlink(filePath, (err) => {
        if (err) {
          console.error('Error deleting original file:', err);
        } else {
          console.log('Original file deleted successfully:', filePath);
        }
      });

      fs.rename(croppedFilePath, filePath, (err) => {
        if (err) {
          console.error('Error renaming file:', err);
        } else {
          console.log('File cropped and saved:', filePath);
        }
      });
    }));

    next();
  } catch (error) {
    console.error('Error in cropImage middleware:', error);
    next(error);
  }
};

const singleImageCrop = (width, height) => {
  return async (req, res, next) => {
    try {
      console.log(`cropImage middleware called for image with width ${width} and height ${height}`);
      if (!req.file) {
        console.log('No file found for cropping');
        return next();
      }
      const filePath = req.file.path;
      console.log('Processing file:', filePath);
      
      const croppedFilePath = `${filePath}-cropped`;

      await sharp(filePath)
        .resize(width, height, {
          fit: sharp.fit.cover,
          position: sharp.strategy.entropy
        })
        .toFile(croppedFilePath); 

      fs.unlink(filePath, (err) => {
        if (err) {
          console.error('Error deleting original file:', err);
        } else {
          console.log('Original file deleted successfully:', filePath);
        }
      });

      fs.rename(croppedFilePath, filePath, (err) => {
        if (err) {
          console.error('Error renaming file:', err);
        } else {
          console.log('File cropped and saved:', filePath);
        }
      });

      next();
    } catch (error) {
      console.error(`Error in cropImage middleware for image with width ${width} and height ${height}:`, error);
      next(error);
    }
  };
};

const bookImageCrop = singleImageCrop(1080, 1440);
const authorImageCrop = singleImageCrop(1080, 1080);



module.exports = { upload, cropImages, bookImageCrop, authorImageCrop };