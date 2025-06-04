import { config } from "dotenv";
import jwt from "jsonwebtoken";
import User from "../models/user.js";

config();

export const isAuth = async (req, res, next) => {
  try {
    // await new Promise((resolve, reject) => setTimeout(() => resolve(), 15000));
    const authHeader = req.get("Authorization");
    const error = new Error("Belum terautentikasi.");
    error.data = { authenticated: false };
    error.statusCode = 401;

    if (!authHeader) {
      throw error;
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      throw error;
    }
    let decodedToken = jwt.verify(token, process.env.JWT_SECRETKEY);

    if (!decodedToken) {
      throw error;
    }

    const { email, userId, exp, slug, avatar } = decodedToken;

    let userData = {
      email: email,
      userId: userId,
      slug: slug,
      avatar: avatar,
    };
    let now = Math.floor(Date.now() / 1000);

    let diffSeconds = exp - now;
    let diffInMinutes = Math.floor(diffSeconds / 60);
    console.log(diffInMinutes);

    let refreshToken;
    if (diffInMinutes > 0 && diffInMinutes < 5) {
      refreshToken = jwt.sign(userData, process.env.JWT_SECRETKEY, {
        expiresIn: "15 minutes",
      });
    }

    req.refreshToken = refreshToken;
    req.authData = decodedToken;
    next();
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const authRecursive = async (req, res, next) => {
  try {
    // let role = "guest";
    req.role = "guest";
    // await new Promise((resolve, reject) => setTimeout(() => resolve(), 15000));
    const authHeader = req.get("Authorization");
    // const error = new Error("Belum terautentikasi.");
    // error.data = { authenticated: false };
    // error.statusCode = 401;

    if (!authHeader) {
      // throw error;
      // req.role = "guest";
      return next();
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      // throw error;
      // req.role = "guest";
      return next();
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRETKEY);
    } catch (error) {
      return next();
    }

    if (!decodedToken) {
      // throw error;
      // req.role = "guest";
      return next();
    }

    const { email, userId, exp, slug, avatar } = decodedToken;

    let userData = {
      email: email,
      userId: userId,
      slug: slug,
      avatar: avatar,
    };

    const user = await User.findById(userId).select("isAdmin");

    if (!user) {
      return next();
    }

    if (user.isAdmin) {
      req.role = "admin";
      return next();
    } else {
      req.role = "user";
    }

    let now = Math.floor(Date.now() / 1000);

    let diffSeconds = exp - now;
    let diffInMinutes = Math.floor(diffSeconds / 60);
    console.log(diffInMinutes);

    let refreshToken;
    if (diffInMinutes > 0 && diffInMinutes < 5) {
      refreshToken = jwt.sign(userData, process.env.JWT_SECRETKEY, {
        expiresIn: "15 minutes",
      });
    }

    req.refreshToken = refreshToken;
    req.authData = decodedToken;
    next();
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
