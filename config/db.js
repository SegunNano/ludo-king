import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Succesfully Connected to mongoDB :)");
  } catch (err) {
    console.error(`Error Message: ${err.message}`);
    process.exit(1);
  }
};

export default connectDB;
