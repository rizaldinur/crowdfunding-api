import { config } from "dotenv";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
config();

export const getProfileHeader = async (req, res, next) => {
  try {
    if (!req.params?.profileId) {
      const error = new Error("URL paremeters invalid.");
      error.statusCode = 400;
      throw error;
    }

    const { profileId } = req.params;
    const profile = await User.findOne({
      slug: profileId,
    });

    if (!profile) {
      const error = new Error("Profile not found.");
      error.statusCode = 400;
      throw error;
    }

    //authorize jwt if exists
    let authorized = true;
    const error = new Error("Unauthorized.");
    error.statusCode = 401;
    error.data = { authorized: false };

    const authHeader = req.get("Authorization");
    if (!authHeader) {
      authorized = false;
    }
    const token = authHeader.split(" ")[1];
    let decodedToken;
    if (!token) {
      authorized = false;
    } else {
      decodedToken = jwt.verify(token, process.env.JWT_SECRETKEY);
    }

    if (decodedToken) {
      const { slug } = decodedToken;
      if (slug !== profileId) {
        authorized = false;
      }
    }

    let joinDate = profile.createdAt.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    res.status(200).json({
      error: false,
      message: "Success",
      data: {
        authorized: authorized,
        userName: profile.name,
        avatar: profile.avatarUrl,
        totalSupportedProjects: 0,
        joinDate: joinDate,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
