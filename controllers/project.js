import multer from "multer";
import fs from "node:fs/promises";
import path from "path";
import Project from "../models/project.js";
import { getBaseUrl } from "../utils/utils.js";
import mongoose from "mongoose";

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    (async () => {
      try {
        const slug = req.authData.slug;
        const dir = path.join("images", "users", slug, "proof");

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
    const { userId } = req.authData;
    const filepath = path.join(req.dir, req.filename);
    const normalizedPath = filepath.replace(/\\/g, "/");
    const studentProofUrl = `${getBaseUrl(req)}/${normalizedPath}`;
    console.log(req.body);

    const project = new Project();

    if (projectName) {
      project.basic.title = projectName;
    }
    if (location) {
      project.basic.location = location;
    }
    if (category) {
      project.basic.category = category;
    }
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
        userSlug: req.authData.slug,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
