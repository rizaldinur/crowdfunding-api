import { validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "dotenv";
import User from "../models/user.js";

config();

export const login = async (req, res, next) => {
  try {
    await new Promise((resolve, reject) => setTimeout(() => resolve(), 1500));
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

    const token = jwt.sign(
      { email: user.email, userId: user._id.toString() },
      process.env.JWT_SECRETKEY,
      { expiresIn: "15m" }
    );

    res.status(200).json({
      message: "Berhasil login",
      token: token,
      userId: user._id.toString(),
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
      throw error;
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({
      email: email,
      name: name,
      password: hashedPassword,
    });
    await user.save();
    res
      .status(201)
      .json({ message: "Berhasil mendaftarkan akun.", userId: user._id });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
