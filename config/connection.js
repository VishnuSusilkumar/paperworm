const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const connectdb = async () => {
    try{
        const con = await mongoose.connect(process.env.MONGO_CONNECTION_URI, {
            useNewUrlParser : true,
            useUnifiedTopology : true,
        })
        console.log(`MongoDB connected : ${con.connection.host}`);
    }catch(err){
        console.log(err);
        process.exit(1);
    }
}
module.exports = connectdb