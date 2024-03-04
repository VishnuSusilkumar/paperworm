const { response } = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { count, log } = require('console');
const Razorpay = require('razorpay'); 
const PDFDocument = require('pdfkit');
const table = require('pdfkit-table');
const path = require('path');
const ExcelJS = require('exceljs');
const PdfPrinter = require('pdfmake');
const moment = require('moment');

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


const invoiceDownload = async (req, res) => {
    try {
        const orderId = req.params.orderId;

        // Fetch order details from the database
        const orders = await order.findById(orderId).populate('product.productId').populate('user');

        if (!orders) {
            return res.status(404).send("Order not found");
        }

        // Define table data for the products
        const tableBody = orders.product.map(item => [
            { text: item.productId.bookName, bold: true }, // Make Product Name bold
            { text: item.quantity.toString(), bold: false }, // Make Quantity bold
            { text: item.productId.retailPrice, bold: false }, // Make Price bold
            { text: orders.discountAmount, bold: false }, // Make Discount bold
        ]);

        // Define the document definition
        const docDefinition = {
            content: [
                { text: 'Invoice', style: 'header' },
                {
                    columns: [
                        [
                            { text: 'Customer Name:', style: 'subheader' },
                            { text: 'Order ID:', style: 'subheader' },
                            { text: 'Order Date:', style: 'subheader' }, 
                            { text: 'Bill Address:', style: 'subheader' }
                        ],
                        [
                            { text: orders.user.username, style: 'subheaderValue' },
                            { text: orders.orderId, style: 'subheaderValue' },
                            { text: moment(orders.orderTime).format('DD-MM-YYYY'), style: 'subheaderValue' },    
                            { text: orders.address, style: 'subheaderValue' }
                        ]
                    ]
                },
                
                { text: 'Order Details:', style: 'subheader' },
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', 'auto', 'auto', 'auto'],
                        body: [
                            [
                                { text: 'Product Name', bold: true },
                                { text: 'Quantity', bold: true },
                                { text: 'Price', bold: true },
                                { text: 'Discount', bold: true }
                            ],
                            ...tableBody
                        ]
                    }
                },
                { text: `Total Amount: ${orders.totalAmount}`, style: 'subheader' }
            ],
            styles: {
                header: {
                    fontSize: 14,
                    bold: true,
                    margin: [0, 0, 0, 10],
                    alignment: 'center'
                },
                subheader: {
                    fontSize: 11,
                    bold: true,
                    margin: [0, 10, 0, 5]
                },
                subheaderValue: {
                    fontSize: 10,
                    margin: [-160, 11, 200, 5]
                },
                body: {
                    fontSize: 11
                },
            },
            defaultStyle: {
                font: 'Roboto'
            }
        };

        // Create a PDF document
        const printer = new PdfPrinter({
            Roboto: {
                normal: Buffer.from(require('pdfmake/build/vfs_fonts').pdfMake.vfs['Roboto-Regular.ttf'], 'base64'),
                bold: Buffer.from(require('pdfmake/build/vfs_fonts').pdfMake.vfs['Roboto-Medium.ttf'], 'base64'),
                italics: Buffer.from(require('pdfmake/build/vfs_fonts').pdfMake.vfs['Roboto-Italic.ttf'], 'base64'),
                bolditalics: Buffer.from(require('pdfmake/build/vfs_fonts').pdfMake.vfs['Roboto-MediumItalic.ttf'], 'base64')
            }
        });
        const pdfDoc = printer.createPdfKitDocument(docDefinition);

        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice_${orderId}.pdf`);

        // Pipe the PDF content to the response
        pdfDoc.pipe(res);
        pdfDoc.end();

    } catch (err) {
        console.error("Error generating invoice:", err);
        res.status(500).send("Error generating invoice");
    }
};



// Sales Report

const salesReport = async (req, res) => {
    try {
  
      let timeRangeFilter = {};
  
      // Add time range filter based on the query parameter
      const timeRange = req.query.timeRange || 'all'; // Default to 'all'
      if (timeRange === 'daily') {
        timeRangeFilter = { orderTime: { $gte: moment().startOf('day'), $lt: moment().endOf('day') } };
      } else if (timeRange === 'weekly') {
        timeRangeFilter = { orderTime: { $gte: moment().startOf('week'), $lt: moment().endOf('week') } };
      } else if (timeRange === 'yearly') {
        timeRangeFilter = { orderTime: { $gte: moment().startOf('year'), $lt: moment().endOf('year') } };
      }
  
  
      const orders = await order
        .find({ status: "Complete", ...timeRangeFilter })
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
  
      // Calculate total revenue
      const totalRevenue = orders.reduce((acc, order) => acc + order.totalAmount, 0);
  
      const format = req.query.format || 'html'; // Default to HTML format
  
      if (format === 'excel') {
        // Generate Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');
  
       
  
        // Add headers
        worksheet.columns = [
          { header: 'Order ID', key: 'orderId', width: 15 },
          { header: 'User Name', key: 'userName', width: 20 },
          { header: 'Product Details', key: 'productDetails', width: 40 },
          { header: 'Address', key: 'address', width: 30 },
          { header: 'Amount', key: 'amount', width: 15 },
          { header: 'Status', key: 'status', width: 15 },
          { header: 'Time', key: 'time', width: 20 }, // New column for time
          { header: 'Total Amount', key: 'totalAmount', width: 20, },
        ];
  
        worksheet.addRow({ totalAmount: totalRevenue });
        // Add data
        orders.forEach(order => {
          worksheet.addRow({
            orderId: order._id,
            userName: order.user.username,
            productDetails: order.product.map(product => `${product.productId.bookName} - Qty: ${product.quantity}`).join('\n'),
            address: order.address,
            amount: order.totalAmount,
            status: order.status,
            time: moment(order.orderTime).format('DD-MM-YYYY'),
          });
        });
        
        
  
        // Set headers for Excel download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');
        await workbook.xlsx.write(res);
        return res.end();
  
      } else if (format === 'pdf') {
        
        // Define table data for the sales report
        const tableBody = orders.map(order => [
            order.orderId,
            order.user.username,
            order.product.map(product => `${product.productId.bookName} - Qty: ${product.quantity}`).join('\n'),
            order.address,
            order.totalAmount,
            order.status,
            moment(order.orderTime).format('DD-MM-YYYY'),
        ]);

        // Define the document definition
        const docDefinition = {
            content: [
                { text: 'Sales Report', style: 'header' },
                { text: `Total Revenue: $${totalRevenue.toFixed(2)}`, style: 'subheader' },
                {
                    table: {
                        headerRows: 1,
                        widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto'],
                        body: [
                            ['Order ID', 'User Name', 'Product Details', 'Address', 'Amount', 'Status', 'Time'],
                            ...tableBody
                        ]
                    }
                }
            ],
            styles: {
                header: {
                    fontSize: 18,
                    bold: true,
                    margin: [0, 0, 0, 10],
                    alignment: 'center'
                },
                subheader: {
                    fontSize: 14,
                    margin: [0, 0, 0, 10]
                }
            }
        };

        // Create a PDF document
        
        const printer = new PdfPrinter({
            Roboto: {
                normal: Buffer.from(require('pdfmake/build/vfs_fonts').pdfMake.vfs['Roboto-Regular.ttf'], 'base64'),
                bold: Buffer.from(require('pdfmake/build/vfs_fonts').pdfMake.vfs['Roboto-Medium.ttf'], 'base64'),
                italics: Buffer.from(require('pdfmake/build/vfs_fonts').pdfMake.vfs['Roboto-Italic.ttf'], 'base64'),
                bolditalics: Buffer.from(require('pdfmake/build/vfs_fonts').pdfMake.vfs['Roboto-MediumItalic.ttf'], 'base64')
            }
        });
        const pdfDoc = printer.createPdfKitDocument(docDefinition);

        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');

        // Pipe the PDF content to the response
        pdfDoc.pipe(res);
        pdfDoc.end();
  } else {
        // Render HTML
        res.render('admin/salesReport.ejs', {
          orders,
          totalRevenue,
          timeRange,
        });
      }
  
    } catch (err) {
      console.error(`Error generating sales report: ${err}`);
      res.redirect("/admin/admin_panel");
    }
  };
  


module.exports = {
    invoiceDownload,
    salesReport,
}