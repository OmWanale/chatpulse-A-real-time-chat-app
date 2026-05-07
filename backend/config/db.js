import mongoose from "mongoose";

export const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is not defined in environment variables");
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000
    });
  } catch (error) {
    throw new Error(
      `MongoDB connection failed. Verify URI, credentials, network/IP allowlist, and cluster status. Original error: ${error.message}`,
      { cause: error }
    );
  }
};

