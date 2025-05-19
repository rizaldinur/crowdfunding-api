import { config } from "dotenv";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import Project from "../models/project.js";
import mongoose from "mongoose";
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

export const getProfileAbout = async (req, res, next) => {
  try {
    const { profileId } = req.params;
    const profile =
      (await User.findOne({ slug: profileId })) ||
      (await User.findById(profileId));

    res.status(200).json({
      error: false,
      message: "Success",
      status: 200,
      data: {
        biography: profile.biography,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const getProfileCreatedProjects = async (req, res, next) => {
  try {
    const { userId, slug } = req.authData;
    const { profileId } = req.params;
    console.log(userId, slug, profileId);

    if (profileId !== slug && profileId !== userId) {
      const error = new Error("Unauthorized.");
      error.statusCode = 401;
      error.data = { authorized: false };
      throw error;
    }

    const profile =
      (await User.findOne({ slug: profileId })) ||
      (await User.findById(profileId));

    const projects = await Project.find({
      creator: new mongoose.Types.ObjectId(profile._id),
    })
      .sort({ createdAt: -1 })
      .populate("creator");

    let mappedProjects = projects.map((project, index) => {
      return {
        profileId: profile.slug || profile._id,
        projectId: project.slug || project._id,
        projectName: project.basic.title,
        projectImage: project.basic.imageUrl,
        creatorAvatar: project.creator.avatarUrl,
        creatorName: project.creator.name,
        launchDate: project.basic.launchDate,
        endDate: project.basic.endDate,
        school: project.school,
        status: project.status,
        createdAt: project.createdAt.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      };
    });
    let refreshToken = req.refreshToken;
    res.status(200).json({
      error: false,
      message: "Success",
      status: 200,
      data: {
        authorized: true,
        createdProjects: mappedProjects,
        refreshToken: refreshToken,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
