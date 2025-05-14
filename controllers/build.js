import multer from "multer";
import fs from "node:fs/promises";
import path from "path";
import Project from "../models/project.js";
import { getBaseUrl } from "../utils/utils.js";
import mongoose from "mongoose";
import User from "../models/user.js";

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    (async () => {
      try {
        const slug = req.authData.slug;
        const dir = path.join("data", "users", slug, "proof");

        // Create directory if it doesn't exist
        await fs.mkdir(dir, { recursive: true });

        // Read existing files
        const files = await fs.readdir(dir);
        for (const filename of files) {
          const filepath = path.join(dir, filename);
          const stat = await fs.lstat(filepath);
          if (stat.isFile()) {
            await fs.unlink(filepath);
          }
        }

        // Finally call the callback with the directory path
        req.dir = dir;
        cb(null, dir);
      } catch (err) {
        cb(err);
      }
    })();
  },
  filename: (req, file, cb) => {
    const slug = req.authData.slug;
    const filename = slug + "-" + path.basename(file.originalname);
    req.filename = filename;
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "image/jpeg") {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

export const uploadProof = multer({
  storage: fileStorage,
  fileFilter: fileFilter,
});

export const postStartProject = async (req, res, next) => {
  try {
    const { projectName, location, category, school, otherSchool } = req.body;
    const { userId, slug } = req.authData;
    const filepath = path.join(req.dir, req.filename);
    const normalizedPath = filepath.replace(/\\/g, "/");
    const studentProofUrl = `${getBaseUrl(req)}/${normalizedPath}`;
    console.log(req.refreshToken);

    const project = new Project();

    project.basic.title = projectName;
    project.basic.location = location;
    project.basic.category = category;
    project.school = school;
    project.otherSchool = otherSchool === "true" ? true : false;
    project.studentProofUrl = studentProofUrl;
    project.creator = new mongoose.Types.ObjectId(userId);

    await project.save();

    res.status(201).json({
      error: false,
      message: "Berhasil membuat proyek.",
      status: 201,
      data: {
        projectId: project._id,
        projectSlug: project.slug,
        userId: userId,
        userSlug: slug,
        refreshToken: req.refreshToken,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const getOverviewBuild = async (req, res, next) => {
  try {
    console.log(req.params);
    console.log(req.authData);
    console.log(req.refreshToken);

    if (!req.params?.profileId || !req.params?.projectId) {
      const error = new Error("URL paremeters invalid.");
      error.statusCode = 400;
      throw error;
    }
    const { userId, slug } = req.authData;
    const { profileId, projectId } = req.params;
    if (slug !== profileId) {
      const error = new Error("Unauthorized.");
      error.statusCode = 401;
      error.data = { authorized: false };
      throw error;
    }

    const project = await Project.findOne({
      slug: projectId,
      creator: new mongoose.Types.ObjectId(userId),
    }).populate("creator");

    if (!project) {
      const error = new Error("Project not found.");
      error.statusCode = 400;
      throw error;
    }
    console.log(project._doc);

    const story = project.story.toObject();
    const oldBasic = project.basic.toObject();
    const payment = project.payment.toObject();
    const profile = { slug: slug, biography: project.creator.biography };

    const {
      title,
      subTitle,
      category,
      location,
      imageUrl,
      fundTarget,
      duration,
    } = oldBasic;

    const basic = {
      title,
      subTitle,
      category,
      location,
      imageUrl,
      fundTarget,
      duration,
    };

    let basicCountFilled = 0;
    let basicTotal = 0;
    for (const prop in basic) {
      basicTotal++;
      if (basic[prop]) {
        basicCountFilled++;
      }
    }
    console.log(basicTotal, basicCountFilled);

    let storyCountFilled = 0;
    let storyTotal = 0;
    for (const prop in story) {
      storyTotal++;
      if (story[prop] && story[prop].length > 0) {
        storyCountFilled++;
      }
    }
    console.log(storyTotal, storyCountFilled);

    let profileCountFilled = 0;
    let profileTotal = 0;
    for (const prop in profile) {
      profileTotal++;
      if (profile[prop]) {
        profileCountFilled++;
      }
    }
    console.log(profileTotal, profileCountFilled);

    let paymentCountFilled = 0;
    let paymentTotal = 0;
    for (const prop in payment) {
      paymentTotal++;
      if (payment[prop]) {
        paymentCountFilled++;
      }
    }
    console.log(paymentTotal, paymentCountFilled);

    res.status(200).json({
      error: false,
      message: "Berhasil mengambil data.",
      status: 200,
      data: {
        authorized: true,
        refreshToken: req.refreshToken,
        projectName: project.basic.title,
        creatorName: project.creator.name,
        basicProgress: (basicCountFilled / basicTotal) * 100,
        storyProgress: (storyCountFilled / storyTotal) * 100,
        profileProgress: (profileCountFilled / profileTotal) * 100,
        paymentProgress: (paymentCountFilled / paymentTotal) * 100,
        buildStatus: project.status,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const postBuildBasic = async (req, res, next) => {
  try {
    console.log(req.authData, req.refreshToken);
    if (!req.params?.profileId || !req.params?.projectId) {
      const error = new Error("URL paremeters invalid.");
      error.statusCode = 400;
      throw error;
    }

    const { profileId, projectId } = req.params;
    const { userId, slug } = req.authData;

    if (slug !== profileId && userId !== profileId) {
      const error = new Error("Unauthorized.");
      error.statusCode = 401;
      error.data = { authorized: false };
      throw error;
    }

    console.log(req.body);
    const project =
      (await Project.findOne({ slug: projectId })) ||
      (await Project.findById(projectId));

    if (!project) {
      const error = new Error("Project not found.");
      error.statusCode = 400;
      throw error;
    }

    project.basic.title = req.body.title;
    project.basic.subTitle = req.body.subtitle;
    project.basic.category = req.body.category;
    project.basic.location = req.body.location;
    project.basic.imageUrl = req.body.imageUrl;
    project.basic.fundTarget = Number(req.body.fundTarget);

    project.basic.launchDate = req.body.launchDate
      ? new Date(req.body.launchDate)
      : null;

    project.basic.duration = Number(req.body.duration);

    await project.save();

    res.status(201).json({
      error: false,
      message: "Berhasil menyimpan perubahan.",
      data: {
        authorized: true,
        projectId: project._id,
        projectSlug: project.slug,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
