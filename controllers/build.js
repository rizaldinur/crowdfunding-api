import multer from "multer";
import fs from "node:fs/promises";
import path from "path";
import Project from "../models/project.js";
import { getBaseUrl } from "../utils/utils.js";
import mongoose from "mongoose";
import User from "../models/user.js";
import jwt from "jsonwebtoken";
import { __rootDir } from "../app.js";
import { countBuildFormFilled, isBuildCompleted } from "../helper/build.js";

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    (async () => {
      try {
        const project = new Project();
        await project.save();

        const userId = req.authData.userId;
        const projectId = project._id.toString();
        const dir = path.join("data", "users", userId, projectId, "proof");

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
        req.project = project;
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
    const project = req.project;
    const { userId, slug } = req.authData;
    const filepath = path.join(req.dir, req.filename);
    const normalizedPath = filepath.replace(/\\/g, "/");
    const studentProofUrl = `${getBaseUrl(req)}/${normalizedPath}`;
    console.log(req.refreshToken);

    console.log(project instanceof Project);

    // const project = new Project();
    project.basic.title = projectName;
    project.basic.location = location;
    project.basic.category = category;
    project.school = school;
    project.otherSchool = otherSchool === "true" ? true : false;
    project.creator = new mongoose.Types.ObjectId(userId);
    project.studentProofUrl = studentProofUrl;

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

export const getPreviewProjectData = async (req, res, next) => {
  try {
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

    const project =
      (await Project.findOne({
        slug: projectId,
        creator: new mongoose.Types.ObjectId(userId),
      }).populate("creator")) || (await Project.findById(projectId));

    if (!project) {
      const error = new Error("Project not found.");
      error.statusCode = 400;
      throw error;
    }

    const newObject = project.toObject();
    const headData = {
      title: newObject.basic.title,
      subtitle: newObject.basic.subTitle,
      imageUrl: newObject.basic.imageUrl,
      category: newObject.basic.category,
      location: newObject.basic.location,
      funding: newObject.funding,
      fundTarget: newObject.basic.fundTarget,
    };

    let story = newObject.story.detail;
    if (newObject.story.benefits.length > 0) {
      story = story + "\n\n# Keuntungan\n" + newObject.story.benefits;
    }
    if (newObject.story.challenges.length > 0) {
      story =
        story + "\n\n# Risiko dan Tantangan\n" + newObject.story.challenges;
    }
    const tabsData = {
      story,
      creator: {
        name: newObject.creator.name,
        avatarUrl: newObject.creator.avatarUrl,
        school: newObject.school,
        biography: newObject.creator.biography,
      },
      faqs: newObject.story.faqs,
    };

    res.status(200).json({
      error: false,
      message: "Berhasil mengambil data.",
      status: 200,
      data: {
        authorized: true,
        refreshToken: req.refreshToken,
        headData,
        tabsData,
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

    const project =
      (await Project.findOne({
        slug: projectId,
        creator: new mongoose.Types.ObjectId(userId),
      }).populate("creator")) || (await Project.findById(projectId));

    if (!project) {
      const error = new Error("Project not found.");
      error.statusCode = 400;
      throw error;
    }

    const { basicProgress, storyProgress, profileProgress, paymentProgress } =
      countBuildFormFilled(project, slug);

    if (project.status === "onreview" && !isBuildCompleted(project, slug)) {
      project.status = "draft";
      await project.save();
    }

    res.status(200).json({
      error: false,
      message: "Berhasil mengambil data.",
      status: 200,
      data: {
        authorized: true,
        refreshToken: req.refreshToken,
        projectName: project.basic.title,
        creatorName: project.creator.name,
        basicProgress,
        storyProgress,
        profileProgress,
        paymentProgress,
        projectStatus: project.status,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const getBuildPageData = async (req, res, next) => {
  try {
    console.log(req.authData, req.refreshToken, req.params);
    if (!req.params?.profileId || !req.params?.projectId || !req.params?.page) {
      const error = new Error("URL paremeters invalid.");
      error.statusCode = 400;
      throw error;
    }

    const pageMap = ["basic", "story", "profile", "payment"];
    if (!pageMap.includes(req.params.page)) {
      const error = new Error("Page not found.");
      error.statusCode = 404;
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

    const project =
      (await Project.findOne({
        slug: projectId,
        creator: new mongoose.Types.ObjectId(userId),
      }).populate("creator")) ||
      (await Project.findById(projectId).populate("creator"));

    if (!project) {
      const error = new Error("Project not found.");
      error.statusCode = 400;
      throw error;
    }

    const basic = req.params.page === "basic" ? project.basic : undefined;
    const story = req.params.page === "story" ? project.story : undefined;
    let profile;
    if (req.params.page === "profile") {
      const { _id, slug, avatarUrl, biography, name } = (await project).creator;
      profile = {
        _id,
        slug,
        name,
        biography,
        avatarUrl,
      };
    }

    let payment;
    if (req.params.page === "payment") {
      const data = project.payment;
      const { email } = project.creator.toObject();
      payment = {
        ...data,
        email,
      };
    }

    res.status(200).json({
      error: false,
      message: "Berhasil mengambil data.",
      data: {
        authorized: true,
        refreshToken: req.refreshToken,
        basic,
        story,
        profile,
        payment,
        projectStatus: project.status,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const putBuildForm = async (req, res, next) => {
  try {
    console.log(req.authData, req.refreshToken, req.params);
    if (!req.params?.profileId || !req.params?.projectId) {
      const error = new Error("URL paremeters invalid.");
      error.statusCode = 400;
      throw error;
    }

    const pageMap = ["basic", "story", "profile", "payment"];
    if (!pageMap.includes(req.params.page)) {
      const error = new Error("Page not found.");
      error.statusCode = 404;
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
      (await Project.findOne({
        slug: projectId,
        creator: new mongoose.Types.ObjectId(userId),
      })) || (await Project.findById(projectId));

    if (!project) {
      const error = new Error("Project not found.");
      error.statusCode = 400;
      throw error;
    }

    let basic;
    if (req.params.page === "basic") {
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
      basic = project.basic;
    }

    let story;
    if (req.params.page === "story") {
      project.story.detail = req.body.detail;
      project.story.benefits = req.body.benefits;
      project.story.challenges = req.body.challenges;

      const parsedFaqs = JSON.parse(req.body.faqs);
      if (parsedFaqs.length > 0) {
        let filledFaqs = parsedFaqs.filter((faq) => {
          return faq.question !== "" || faq.answer !== "";
        });
        project.story.faqs = filledFaqs;
      }

      await project.save();
      story = project.story;
    }

    let profile;
    let refreshToken = req.refreshToken;
    if (req.params.page === "profile") {
      const data = await User.findById(userId);
      data.slug = req.body.slug;
      await data.save();
      profile = {
        _id: data._id,
        slug: data.slug,
      };
      const userData = {
        email: data.email,
        userId: data._id.toString(),
        slug: data.slug,
        avatar: data.avatarUrl,
      };
      const token = jwt.sign(userData, process.env.JWT_SECRETKEY, {
        expiresIn: "15 minutes",
      });
      refreshToken = token;
    }

    let payment;
    if (req.params.page === "payment") {
      project.payment.businessType = req.body.businessType;
      project.payment.bankName = req.body.bankName;
      project.payment.bankAccountNumber = req.body.bankAccountNumber;
      await project.save();
      payment = project.payment;
    }

    res.status(201).json({
      error: false,
      message: "Berhasil menyimpan perubahan.",
      status: 201,
      data: {
        authorized: true,
        refreshToken: refreshToken,
        projectId: project._id,
        projectSlug: project.slug,
        basic,
        story,
        profile,
        payment,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const putReviewProject = async (req, res, next) => {
  try {
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

    const project =
      (await Project.findOne({
        slug: projectId,
        creator: new mongoose.Types.ObjectId(userId),
      }).populate("creator")) ||
      (await Project.findById(projectId).populate("creator"));

    if (!project) {
      const error = new Error("Project not found.");
      error.statusCode = 400;
      throw error;
    }

    if (!isBuildCompleted(project, slug)) {
      const error = new Error("Proyek belum selesai dibuat.");
      error.statusCode = 422;
      throw error;
    }

    project.status = "onreview";
    await project.save();

    res.status(201).json({
      error: false,
      message: "Berhasil mengirim proyek untuk ditinjau.",
      status: 201,
      data: {
        projectStatus: project.status,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const deleteProject = async (req, res, next) => {
  try {
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

    const project =
      (await Project.findOne({
        slug: projectId,
        creator: new mongoose.Types.ObjectId(userId),
      })) || (await Project.findById(projectId));

    if (!project) {
      const error = new Error("Project not found.");
      error.statusCode = 400;
      throw error;
    }
    const title = project.basic.title;
    const deletedProjectId = project._id;
    const data = await project.deleteOne();
    console.log(data);

    const filepath = new URL(project.studentProofUrl).pathname;
    const userDirPath = filepath.split(`/${deletedProjectId}`)[0];
    const projectDirPath = filepath.split("/proof")[0];
    const fullProjectPath = path.join(__rootDir, projectDirPath);
    const fullUserDirPath = path.join(__rootDir, userDirPath);

    await fs.rm(fullProjectPath, { recursive: true });
    const files = await fs.readdir(fullUserDirPath);
    if (files.length === 0) {
      await fs.rmdir(fullUserDirPath);
    }

    res.status(202).json({
      error: false,
      message: `Proyek '${title ? title : "tanpa nama"}' berhasil dihapus.`,
      status: 202,
      data: {
        authorized: true,
        title,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
