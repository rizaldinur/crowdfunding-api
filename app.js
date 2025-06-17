import express from "express";
import bodyParser from "body-parser";
import authRoutes from "./routes/auth.js";
import buildRoutes from "./routes/build.js";
import accountRoutes from "./routes/account.js";
import feedRoutes from "./routes/feed.js";
import supportRoutes from "./routes/support.js";
import mongoose from "mongoose";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import nodeCron from "node-cron";
import Project from "./models/project.js";
import Support from "./models/support.js";
import Midtrans from "midtrans-client";

const __filename = fileURLToPath(import.meta.url);
export const __rootDir = path.dirname(__filename);

config();
export const snap = new Midtrans.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});
const app = express();

app.use(bodyParser.json());

app.use("/images", express.static("images"));
app.use("/data", express.static("data"));

app.use((req, res, next) => {
  const allowedOrigins = [
    process.env.CLIENT_ORIGIN_URL,
    process.env.PREVIEW_CLIENT_ORIGIN_URL,
  ];

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin); // ✅ Dynamically allow only matched origin
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(authRoutes);
app.use(buildRoutes);
app.use(feedRoutes);
app.use(accountRoutes);
app.use(supportRoutes);

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

let newTask = nodeCron.createTask(
  "0 * * * *",
  async () => {
    const now = new Date();
    console.log(`CRON running every minute at ${now.toISOString()}`);
    const resUpdateLaunching = await Project.updateMany(
      {
        status: "launching",
        "basic.launchDate": {
          $exists: true,
          $ne: null,
          $lte: now,
          $gt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        },
      },
      { $set: { status: "oncampaign" } }
    );
    console.log(resUpdateLaunching.matchedCount);
    const resUpdateFinished = await Project.updateMany(
      {
        status: "oncampaign",
        "basic.endDate": {
          $exists: true,
          $ne: null,
          $lte: now,
        },
      },
      {
        $set: { status: "finished" },
      }
    );
    console.log(resUpdateFinished.matchedCount);
  },
  {
    timezone: "UTC",
  }
);

try {
  mongoose.connection.on("connected", () => {
    console.log("Connected to Mongo Client!");
    console.log("On Database: ", mongoose.connection.name);
    console.log(newTask.getStatus());
    newTask.start();
    app.listen(8000, () => {
      console.log(newTask.getStatus());
      console.log(`Server is running on http://localhost:8000`);
    });
  });
  mongoose.connection.on("disconnected", () => {
    newTask.destroy();
    console.log(newTask.getStatus());
    console.log("disconnected");
  });
  await mongoose.connect(process.env.DATABASE_URL);
} catch (error) {
  newTask.destroy();
  console.log("Cron task destroyed:", newTask.getStatus());
  console.log(error);
}

process.on("SIGINT", () => {
  console.log("Gracefully shutting down from SIGINT (Ctrl+C)");

  console.log("Cron task status:", newTask.getStatus());
  newTask.destroy();
  console.log("Cron task destroyed:", newTask.getStatus());

  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Gracefully shutting down from SIGTERM");

  newTask.destroy();
  console.log("Cron task destroyed:", newTask.getStatus());

  process.exit(0);
});

process.on("SIGUSR2", () => {
  console.log("Nodemon restart detected. Cleaning up...");
  process.kill(process.pid, "SIGTERM");
  newTask.destroy();
  console.log("Cron task destroyed:", newTask.getStatus());
});
