import { validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "dotenv";
import User from "../models/user.js";

config();

export const login = async (req, res, next) => {
  try {
    // await new Promise((resolve, reject) => setTimeout(() => resolve(), 1500));
    if (!req.body) {
      const error = new Error("Email atau password salah.");
      error.statusCode = 401;
      throw error;
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email: email });
    if (!user) {
      const error = new Error("Email atau password salah.");
      error.statusCode = 401;
      throw error;
    }

    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      const error = new Error("Email atau password salah.");
      error.statusCode = 401;
      throw error;
    }

    let userData = {
      email: user.email,
      userId: user._id.toString(),
      slug: user.slug,
      avatar: user.avatarUrl,
    };
    const token = jwt.sign(userData, process.env.JWT_SECRETKEY, {
      expiresIn: "15 minutes",
    });

    res.status(200).json({
      error: false,
      message: "Berhasil login",
      status: 201,
      data: { token: token, ...userData },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const signup = async (req, res, next) => {
  try {
    console.log(req.body);
    const { email, name, password } = req.body;
    console.log(email, name, password);

    const userExists = await User.findOne({ email: email });
    if (userExists) {
      const error = new Error("Email sudah terdaftar.");
      error.statusCode = 422;
      error.data = [{ body: "email" }];
      throw error;
    }

    // let slug =
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({
      email: email,
      name: name,
      password: hashedPassword,
    });
    await user.save();
    res.status(201).json({
      error: false,
      message: "Berhasil mendaftarkan akun.",
      status: 201,
      data: { userId: user._id, slug: user.slug },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const authJWT = async (req, res, next) => {
  try {
    // await new Promise((resolve, reject) => setTimeout(() => resolve(), 15000));
    const authHeader = req.get("Authorization");
    console.log(authHeader);
    const error = new Error("Belum terautentikasi.");
    error.data = { authenticated: false };
    error.statusCode = 401;

    if (!authHeader) {
      throw error;
    }

    const token = authHeader.split(" ")[1];
    console.log(token);

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
    res.status(200).json({
      error: false,
      message: "Berhasil mengautentikasi.",
      status: 201,
      data: {
        authenticated: true,
        refreshToken: refreshToken,
        ...userData,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
