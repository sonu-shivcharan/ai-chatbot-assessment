import mongoose from "mongoose";

export default async function dbConnect() {
  const MONGODB_URL = process.env.MONGODB_URL;
  const DB_NAME = process.env.DB_NAME;
  try {
    if (!MONGODB_URL) {
      throw new Error("Add MONGODB_URL variable to .env");
    }
    if (!DB_NAME) {
      throw new Error("Add DB_NAME variable to .env");
    }
    const connection = await mongoose.connect(`${MONGODB_URL}/${DB_NAME}`);
    console.log(
      "MongoDB connection success",
      connection.connection.db?.databaseName,
    );
    return connection;
  } catch (error) {
    console.error("Mongo db connection error: ", error);
    process.exit(1);
  }
}
