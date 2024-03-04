const mongoose = require('mongoose');
const Scheme = mongoose.Schema
const orderScheme = new Scheme({
    orderId: {
        type: String,
        unique: true
    },
    user : {
        type : mongoose.SchemaTypes.ObjectId,
        ref : 'user'
    },
    product : [{
       productId : {
                    type : mongoose.SchemaTypes.ObjectId,
                    ref : 'book'
                   },
        quantity: Number
    }],
    address: String,
    status: {
        type : String,
        default : "Pending"
    },
    totalAmount : Number,
    discountAmount: {
        type: Number,
        default: 0
    },
    paymentMethod : String,
    orderTime: {
        type: Date,
        default: Date.now
    },
    refundReason: String,
    refundStatus: {
        type: String,
        enum: ['nostatus','Pending', 'Approved', 'Rejected'],
        default: 'nostatus'
    },
});

const order = mongoose.model('order', orderScheme);

module.exports = order;