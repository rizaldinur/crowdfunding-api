import { config } from "dotenv";
import jwt from "jsonwebtoken";

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

    req.authData = decodedToken;
    next();
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
