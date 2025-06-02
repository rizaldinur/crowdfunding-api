import { config } from "dotenv";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import Project from "../models/project.js";
import mongoose from "mongoose";
import Support from "../models/support.js";
import { body, matchedData, validationResult } from "express-validator";
import bcrypt from "bcryptjs";

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

    const uniqueSupportedProjects = await Support.distinct("supportedProject", {
      supporter: profile,
      $or: [
        { "transaction.status": "capture" },
        { "transaction.status": "settlement" },
      ],
    });
    const countSupportedProjects = uniqueSupportedProjects.length;

    res.status(200).json({
      error: false,
      message: "Success",
      data: {
        authorized: authorized,
        userName: profile.name,
        avatar: profile.avatarUrl,
        joinDate: joinDate,
        countSupportedProjects,
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

export const getProfileBackedProjects = async (req, res, next) => {
  try {
    const { userId, slug } = req.authData;
    const { profileId } = req.params;

    if (profileId !== slug && profileId !== userId) {
      const error = new Error("Unauthorized.");
      error.statusCode = 401;
      error.data = { authorized: false };
      throw error;
    }

    //get support where profile matches, descending
    const profile =
      (await User.findOne({ slug: profileId })) ||
      (await User.findById(profileId));

    if (!profile) {
      const error = new Error("Profile not found.");
      error.statusCode = 400;
      throw error;
    }

    const supports = await Support.find({
      supporter: profile,
    })
      .sort({ createdAt: -1 })
      .populate("supportedProject");

    let mappedBackedResults = await Promise.allSettled(
      supports.map(async (support, index) => {
        let creator = await User.findById(
          support.supportedProject.creator._id
        ).select("name avatarUrl slug");

        return {
          supportId: support._id,
          profileId: profile.slug || profile._id,
          projectId: support.supportedProject.slug,
          projectName: support.supportedProject.basic.title,
          projectImage: support.supportedProject.basic.imageUrl,
          creatorSlug: creator.slug,
          creatorAvatar: creator.avatarUrl,
          creatorName: creator.name,
          school: support.supportedProject.school,
          status: support.supportedProject.status,
          supportAmount: support.supportAmount,
          transactionStatus: support.transaction.status,
          transactionStatusCode: support.transaction.statusCode,
          createdAt: support.createdAt.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
      })
    );

    let mappedBacked = mappedBackedResults
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);

    let refreshToken = req.refreshToken;
    res.status(200).json({
      error: false,
      message: "Success",
      status: 200,
      data: {
        authorized: true,
        mappedBacked,
        refreshToken,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const getSettingTabsData = async (req, res, next) => {
  try {
    const page = req.params?.page || "profile";

    if (!["profile", "account"].includes(page)) {
      const error = new Error("Page not found.");
      error.statusCode = 404;
      throw error;
    }

    if (!req.params?.profileId) {
      const error = new Error("URL paremeters invalid.");
      error.statusCode = 400;
      throw error;
    }

    const { profileId } = req.params;
    const { userId, slug: userSlug } = req.authData;

    if (profileId !== userId && profileId !== userSlug) {
      const error = new Error("Unauthorized.");
      error.statusCode = 401;
      error.data = { authorized: false };
      throw error;
    }

    const profile =
      (await User.findOne({
        slug: profileId,
      })) || (await User.findById(profileId));

    if (!profile) {
      const error = new Error("Profile not found.");
      error.statusCode = 404;
      throw error;
    }

    let profileTab;
    if (page === "profile") {
      profileTab = {
        name: profile.name,
        biography: profile.biography,
      };
    }

    let accountTab;
    if (page === "account") {
      accountTab = {
        email: profile.email,
      };
    }

    res.status(200).json({
      error: false,
      message: "ok",
      status: 200,
      data: { profileTab, accountTab },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const putUpdateProfile = async (req, res, next) => {
  try {
    const result = validationResult(req);
    if (!req.params.profileId) {
      const error = new Error("URL parameters invalid.");
      error.statusCode = 400;
      throw error;
    }

    const { userId, slug } = req.authData;
    const { profileId } = req.params;
    if (profileId !== userId && profileId !== slug) {
      const error = new Error("Unauthorized.");
      error.statusCode = 401;
      error.data = { authorized: false };
      throw error;
    }

    const profile =
      (await User.findOne({ slug: slug })) || (await User.findById(userId));

    if (!profile) {
      const error = new Error("Profile not found.");
      error.statusCode = 404;
      throw error;
    }

    if (!result.isEmpty()) {
      const error = new Error("Gagal memproses input.");
      error.statusCode = 422;

      error.data = { errors: result.array() };
      throw error;
    }

    const { name, biography, uniqueUrl } = matchedData(req, {
      includeOptionals: true,
    });

    profile.name = name;
    profile.biography = biography;
    if (uniqueUrl) {
      profile.slug = uniqueUrl;
    }

    const updatedProfile = await profile.save();
    const userData = {
      email: updatedProfile.email,
      userId: updatedProfile._id.toString(),
      slug: updatedProfile.slug,
      avatar: updatedProfile.avatarUrl,
    };
    const token = jwt.sign(userData, process.env.JWT_SECRETKEY, {
      expiresIn: "15 minutes",
    });
    const refreshToken = token;

    res.status(201).json({
      error: false,
      status: 201,
      message: "Berhasil menyimpan perubahan",
      data: {
        authorized: true,
        refreshToken,
        userId: updatedProfile._id,
        userName: updatedProfile.name,
        userSlug: updatedProfile.slug,
        biography: updatedProfile.biography,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const putUpdateAccount = async (req, res, next) => {
  try {
    if (!req.params.profileId) {
      const error = new Error("URL parameters invalid.");
      error.statusCode = 400;
      throw error;
    }

    const { userId, slug } = req.authData;
    const { profileId } = req.params;
    if (profileId !== userId && profileId !== slug) {
      const error = new Error("Unauthorized.");
      error.statusCode = 401;
      error.data = { authorized: false };
      throw error;
    }

    const profile =
      (await User.findOne({ slug: slug })) || (await User.findById(userId));

    if (!profile) {
      const error = new Error("Profile not found.");
      error.statusCode = 404;
      throw error;
    }

    const { email, password, newPassword, confirmPassword } = matchedData(req, {
      includeOptionals: true,
    });
    const otherUserWithEmail = await User.findOne({
      email: email,
      _id: { $ne: new mongoose.Types.ObjectId(userId) },
    });

    if (otherUserWithEmail) {
      await body("email")
        .custom((value) => {
          throw new Error("Email sudah terpakai.");
        })
        .run(req);
    }

    if (password) {
      const isEqual = await bcrypt.compare(password, profile.password);
      if (!isEqual) {
        await body("password")
          .custom((value) => {
            throw new Error("Password tidak sesuai.");
          })
          .run(req);
      }
    }

    if (newPassword) {
      const isEqual = await bcrypt.compare(newPassword, profile.password);
      if (isEqual) {
        await body("newPassword")
          .custom((value) => {
            throw new Error(
              "Password baru tidak boleh sama dengan password lama."
            );
          })
          .run(req);
      }
    }

    const result = validationResult(req);
    if (!result.isEmpty()) {
      const error = new Error("Gagal memproses input.");
      error.statusCode = 422;
      console.log(result.array({ onlyFirstError: true }));
      error.data = { errors: result.array({ onlyFirstError: true }) };
      throw error;
    }

    profile.email = email;
    if (newPassword && newPassword === confirmPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      profile.password = hashedPassword;
    }

    const updatedAccount = await profile.save();

    const userData = {
      email: updatedAccount.email,
      userId: updatedAccount._id.toString(),
      slug: updatedAccount.slug,
      avatar: updatedAccount.avatarUrl,
    };
    const token = jwt.sign(userData, process.env.JWT_SECRETKEY, {
      expiresIn: "15 minutes",
    });
    const refreshToken = token;

    res.status(201).json({
      error: false,
      status: 201,
      message: "Berhasil menyimpan perubahan",
      data: {
        refreshToken,
        email: updatedAccount.email,
        userSlug: updatedAccount.slug,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
