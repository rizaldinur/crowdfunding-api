import express from "express";
import bodyParser from "body-parser";
import authRoutes from "./routes/auth.js";
import buildRoutes from "./routes/build.js";
import accountRoutes from "./routes/account.js";
import mongoose from "mongoose";
import { config } from "dotenv";

config();
const app = express();

app.use(bodyParser.json());

app.use("/images", express.static("images"));
app.use("/data", express.static("data"));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(authRoutes);
app.use(buildRoutes);
app.use(accountRoutes);

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message =
    error.statusCode === 500 && !error.message
      ? "Something went wrong. (Error 500)"
      : error.message;
  const data = error.data;
  res
    .status(status)
    .json({ error: true, message: message, status: status, data: data });
});

try {
  mongoose.connection.on("connected", () => {
    console.log("Connected to Mongo Client!");
    console.log("On Database: ", mongoose.connection.name);
    app.listen(8000, () => {
      console.log(`Server is running on http://localhost:8000`);
    });
  });
  mongoose.connection.on("disconnected", () => {
    console.log("disconnected");
  });
  await mongoose.connect(process.env.DATABASE_URL);
} catch (error) {
  console.log(error);
}
