const { response } = require("express");
const fs = require("fs");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const session = require("express-session");
dotenv.config();
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const moment = require('moment');


const user = require("../models/userModel");
const author = require("../models/authorModel");
const book = require("../models/bookModel");
const genre = require("../models/genreModel");
const order = require("../models/orderModel");
const coupon = require("../models/couponModel");
const WalletTransaction = require('../models/walletModel');


const renderLogin = (req, res) => {
  try {
    const session = req.session.adminemail;
    if (session) {
      res.redirect("/admin/admin_panel");
    } else {
      const warning = req.session.adminError;
      req.session.adminError = false
      res.render("adminLogin.ejs",{warning});
    }
  } catch (err) {
    console.error(`Error Get Adimn Login Page : ${err}`);
    res.redirect("/");
  }
};

const adminLogin = (req, res) => {
  try {
    const { email, password } = req.body;
    if (email === process.env.adminEmail  &&password == process.env.adminPassword) {
      req.session.adminemail = req.body.email;
      res.redirect("/admin/admin_panel");
    } else {
      req.session.adminError = "Email or Password Incorrect"
      res.redirect("/admin");
    }
  } catch (err) {
    console.error(`Error Admin Post Login : ${err}`);
    res.redirect("/admin");
  }
};


const adminPanel = async (req, res) => {
  try {
    const orders = await order.find();
    const totalOrder = await order.find().count();
    const completeOrder = await order.find({ status: "Complete" }).count();
    const pendingOrder = await order.find({ status: "Pending" }).count();
    const onTheWayOrder = await order.find({ status: "On The Way" }).count();

    let totalRevenue = 0;
    for (let i = 0; i < orders.length; i++) {
      totalRevenue += orders[i].totalAmount;
    }

    // Calculate monthly data
    const monthlyData = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < months.length; i++) {
      const monthCompleteOrders = await order
        .find({ status: "Complete", orderTime: { $gte: moment().startOf('month').month(i), $lt: moment().endOf('month').month(i) } })
        .count();

      const monthTotalOrders = await order
        .find({ orderTime: { $gte: moment().startOf('month').month(i), $lt: moment().endOf('month').month(i) } })
        .count();

      monthlyData.push({
        month: months[i],
        completeOrder: monthCompleteOrders,
        totalOrder: monthTotalOrders,
      });
    }

     // Find the top ten selling products
     const topSellingProducts = await book.aggregate([
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'product.productId',
          as: 'orders'
        }
      },
      {
        $addFields: {
          salesCount: { $size: "$orders" } // Calculate the sales count for each product
        }
      },
      {
        $sort: { salesCount: -1 } // Sort by sales count in descending order
      },
      {
        $limit: 10 // Limit to only the top ten selling products
      }
    ]);

   // Find the top selling category
   const topSellingCategory = await book.aggregate([
    {
      $lookup: {
        from: 'orders',
        localField: '_id',
        foreignField: 'product.productId',
        as: 'orders'
      }
    },
    {
      $addFields: {
        salesCount: { $size: '$orders' }
      }
    },
    {
      $lookup: {
        from: 'genres',
        localField: 'genre',
        foreignField: '_id',
        as: 'genreInfo'
      }
    },
    {
      $group: {
        _id: '$genreInfo.genreName',
        totalSales: { $sum: '$salesCount' }
      }
    },
    {
      $sort: { totalSales: -1 }
    },
    {
      $limit: 5
    }
  ]);


    res.render("admin.ejs", {
      totalOrder,
      completeOrder,
      pendingOrder,
      onTheWayOrder,
      totalRevenue,
      topSellingProducts,
      topSellingCategory,
      monthlyData,
      monthlyDataScript: JSON.stringify(monthlyData),
    });
  } catch (err) {
    console.error(`Error Get Admin Panel : ${err}`);
    res.redirect("/admin");
  }
};

const renderUserManagement = async (req, res) => {
  try {
    const users = await user.find();
    res.render("admin/userManagement.ejs", { users });
  } catch (err) {
    console.error(`Error Get User Management : ${err}`);
    res.redirect("/admin/admin_panel");
  }
};

const blockUser = async (req, res) => {
  try {
    await user.updateOne({ _id: req.params.id }, { $set: { block: false } });
    res.redirect("/admin/userManagement");
  } catch (err) {
    console.error(`Error Block User : ${err}`);
    res.redirect("/admin/userManagement");
  }
};

const unblockUser = async (req, res) => {
  try {
    await user.updateOne({ _id: req.params.id }, { $set: { block: true } });
    res.redirect("/admin/userManagement");
  } catch (err) {
    console.error(`Error Un Block User : ${err}`);
    res.redirect("/admin/userManagement");
  }
};








const renderRefundManagement = async (req, res) => {
  try {
    // Fetch refund requests with status "Pending" from the database
    
    const orders = await order
      .find({ status: "Complete", refundStatus: "Pending" })
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


    res.render('admin/refundRequest.ejs', { orders });
  } catch (err) {
    console.error(`Error getting refund requests: ${err}`);
    res.redirect('/admin/admin_panel'); // Redirect to admin panel on error
  }
};

const approveRefund = async (req, res) => {
  try {
    const orderId = req.params.id;
    const orders = await order.findById(orderId);
    if (!orders) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Update the order's refund status to 'Approved'
    orders.refundStatus = 'Approved';
    orders.status = 'Returned';
    await orders.save();

    const userDetails = await user.findOne({ _id: orders.user._id })

    userDetails.walletBalance += orders.totalAmount;
    await userDetails.save();

    // Record the refund transaction
    const transaction = new WalletTransaction({
      userId: userDetails._id,
      type: 'credit',
      amount: orders.totalAmount,
      description: 'Refund for Return order'
    });
    await transaction.save();
  

    if (!userDetails) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, message: 'Refund approved successfully' });
  } catch (error) {
    console.error('Error approving refund:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const rejectRefund = async (req, res) => {
  try {
    const orderId = req.params.id;
    const orders = await order.findById(orderId);
    if (!orders) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Update the order's refund status to 'Rejected'
    orders.refundStatus = 'Rejected';
    await orders.save();

    res.status(200).json({ success: true, message: 'Refund rejected successfully' });
  } catch (error) {
    console.error('Error rejecting refund:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const renderApprovedRefunds = async (req, res) => {
  try {
    // Fetch orders with status "Complete" and refundStatus "Approved"
    const orders = await order
      .find({ status: "Complete", refundStatus: "Approved" })
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

    res.render('admin/approvedRefunds.ejs', { orders });
  } catch (err) {
    console.error(`Error getting approved refunds: ${err}`);
    res.redirect('/admin/admin_panel'); // Redirect to admin panel on error
  }
};

const renderRejectedRefunds = async (req, res) => {
  try {
    // Fetch orders with status "Complete" and refundStatus "Rejected"
    const orders = await order
      .find({ status: "Complete", refundStatus: "Rejected" })
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

    res.render('admin/rejectedRefunds.ejs', { orders });
  } catch (err) {
    console.error(`Error getting rejected refunds: ${err}`);
    res.redirect('/admin/admin_panel'); // Redirect to admin panel on error
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
          time: order.orderTime,
        });
      });
      
      

      // Set headers for Excel download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');
      await workbook.xlsx.write(res);
      return res.end();

    } else if (format === 'pdf') {
      // Create a new PDF document
  const doc = new PDFDocument();

  // Set headers for PDF download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');

  // Pipe the PDF document directly to the response
  doc.pipe(res);

  // Add headers
  doc.text('Sales Report', { align: 'center', underline: true });
  doc.moveDown();

  // Add data
  doc.font('Helvetica-Bold');
  doc.text('Total Revenue: $' + totalRevenue.toFixed(2));
  doc.moveDown();

  doc.font('Helvetica');

  orders.forEach(order => {
    doc.text(`Order ID: ${order.orderId}`);
    doc.text(`User Name: ${order.user.username}`);
    doc.text(`Book Name: ${order.product.map(product => `${product.productId.bookName} - Qty: ${product.quantity}`).join('\n')}`);
    doc.text(`Address: ${order.address}`);
    doc.text(`Status: ${order.status}`);
    doc.text(`Time: ${order.orderTime}`);
    doc.text(`Amount: $${order.totalAmount.toFixed(2)}`);
    

    // Add a table for product details
    doc.moveDown();
    
    doc.lineWidth(1); 
    doc.lineCap('round'); 
    doc.moveTo(72, doc.y) 
       .lineTo(522, doc.y) 
       .stroke();

    doc.moveDown();
  });

  // Finalize the PDF and end the response
  doc.end();
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





// Logout

const logout = (req, res) => {
  req.session.adminemail = null;
  res.redirect("/admin");
};

module.exports = {
  renderLogin,
  adminLogin,
  adminPanel,
  renderUserManagement,
  blockUser,
  unblockUser,
  logout,
  

  renderRefundManagement,
  approveRefund,
  rejectRefund,
  renderApprovedRefunds,
  renderRejectedRefunds,

  salesReport,
};
