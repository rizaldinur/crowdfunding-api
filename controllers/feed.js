import mongoose from "mongoose";
import Project from "../models/project.js";
import User from "../models/user.js";
import Support from "../models/support.js";
import { matchedData, validationResult } from "express-validator";

export const getFeaturedProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({ status: "oncampaign" })
      .sort({
        funding: -1,
      })
      .populate("creator");

    const title = project.basic.title;
    const subtitle = project.basic.subtitle;
    const imageUrl = project.basic.imageUrl;
    const creator = project.creator.name;
    const creatorSlug = project.creator.slug;
    const projectSlug = project.slug;
    const avatar = project.creator.avatarUrl;
    const fundingProgress = Math.floor(
      (project.funding / project.basic.fundTarget) * 100
    );
    const location = project.basic.location;
    const category = project.basic.category;

    const now = new Date();
    const end = project.basic.endDate;
    const msInDay = 1000 * 60 * 60 * 24;
    const msInHours = 1000 * 60 * 60;

    let timeFormat;
    let timeLeft;
    const daysLeft = Math.floor((end - now) / msInDay);
    if (daysLeft >= 1) {
      timeLeft = daysLeft;
      timeFormat = "hari";
    } else {
      timeLeft = Math.floor((end - now) / msInHours);
      timeFormat = "jam";
    }

    const featuredProject = {
      creatorSlug,
      projectSlug,
      title,
      subtitle,
      imageUrl,
      creator,
      avatar,
      fundingProgress,
      location,
      category,
      timeLeft,
      timeFormat,
    };

    res.status(200).json({
      error: false,
      status: 200,
      message: "Berhasil mengambil data.",
      data: {
        featuredProject,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
export const getRecommendedProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({ status: "oncampaign" })
      .sort({
        "basic.launchDate": "asc",
        funding: "desc",
      })
      .limit(6)
      .populate("creator");

    const recommendedProjects = projects.map((project) => {
      const title = project.basic.title;
      const subtitle = project.basic.subTitle;
      const imageUrl = project.basic.imageUrl;
      const creator = project.creator.name;
      const creatorSlug = project.creator.slug;
      const projectSlug = project.slug;
      const avatar = project.creator.avatarUrl;
      const fundingProgress = Math.floor(
        (project.funding / project.basic.fundTarget) * 100
      );
      const location = project.basic.location;
      const category = project.basic.category;

      const now = new Date();
      const end = project.basic.endDate;
      const msInDay = 1000 * 60 * 60 * 24;
      const msInHours = 1000 * 60 * 60;

      let timeFormat;
      let timeLeft;
      const daysLeft = Math.floor((end - now) / msInDay);
      if (daysLeft >= 1) {
        timeLeft = daysLeft;
        timeFormat = "hari";
      } else {
        timeLeft = Math.floor((end - now) / msInHours);
        timeFormat = "jam";
      }

      const recommendedProject = {
        creatorSlug,
        projectSlug,
        title,
        subtitle,
        imageUrl,
        creator,
        avatar,
        fundingProgress,
        location,
        category,
        timeLeft,
        timeFormat,
      };

      return recommendedProject;
    });

    res.status(200).json({
      error: false,
      status: 200,
      message: "Berhasil mengambil data.",
      data: {
        recommendedProjects,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const getProjectHeader = async (req, res, next) => {
  try {
    if (!req.params?.profileId || !req.params?.projectId) {
      const error = new Error("URL paremeters invalid.");
      error.statusCode = 400;
      throw error;
    }

    const page = req.params?.page || "story";

    const pageMap = ["story", "updates", "faqs", "comments"];
    if (!pageMap.includes(page)) {
      const error = new Error("Page not found.");
      error.statusCode = 404;
      throw error;
    }

    const { profileId, projectId } = req.params;
    const creator =
      (await User.findOne({ slug: profileId })) ||
      (await User.findById(profileId));

    const project =
      (await Project.findOne({
        slug: projectId,
        creator: creator,
      }).populate("creator")) || (await Project.findById(projectId));

    if (!project) {
      const error = new Error("Project not found.");
      error.statusCode = 400;
      throw error;
    }

    if (project.status !== "oncampaign" && project.status !== "finished") {
      const error = new Error("Project has not been made.");
      error.statusCode = 401;
      throw error;
    }

    const newObject = project.toObject();
    const now = new Date();
    const end = newObject.basic.endDate;

    const msInDay = 1000 * 60 * 60 * 24;
    const msInHours = 1000 * 60 * 60;

    let timeFormat;
    let timeLeft;
    const daysLeft = Math.floor((end - now) / msInDay);
    if (daysLeft >= 1) {
      timeLeft = daysLeft;
      timeFormat = "hari";
    } else {
      timeLeft = Math.floor((end - now) / msInHours);
      timeFormat = "jam";
    }

    const uniqueSupporters = await Support.distinct("supporter", {
      supportedProject: project,
    });
    const countSupporters = uniqueSupporters.length;
    const fundingProgress = Math.round(
      (newObject.funding / newObject.basic.fundTarget) * 100
    );
    res.status(200).json({
      error: false,
      message: "Berhasil mengambil data.",
      status: 200,
      data: {
        authorized: true,
        refreshToken: req.refreshToken,
        title: newObject.basic.title,
        subtitle: newObject.basic.subTitle,
        imageUrl: newObject.basic.imageUrl,
        category: newObject.basic.category,
        location: newObject.basic.location,
        funding: newObject.funding,
        fundTarget: newObject.basic.fundTarget,
        projectStatus: newObject.status,
        timeLeft,
        timeFormat,
        fundingProgress,
        countSupporters,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const getProjectDetails = async (req, res, next) => {
  try {
    if (!req.params?.profileId || !req.params?.projectId) {
      const error = new Error("URL paremeters invalid.");
      error.statusCode = 400;
      throw error;
    }

    const page = req.params?.page || "story";

    const pageMap = ["story", "updates", "faqs", "comments"];
    if (!pageMap.includes(page)) {
      const error = new Error("Page not found.");
      error.statusCode = 404;
      throw error;
    }

    const { profileId, projectId } = req.params;
    const creator =
      (await User.findOne({ slug: profileId })) ||
      (await User.findById(profileId));

    const project =
      (await Project.findOne({
        slug: projectId,
        creator: creator,
      }).populate("creator")) || (await Project.findById(projectId));

    if (!project) {
      const error = new Error("Project not found.");
      error.statusCode = 400;
      throw error;
    }

    const newObject = project.toObject();
    let tabData;
    if (page === "story") {
      let story = newObject.story.detail;
      if (newObject.story.benefits.length > 0) {
        story = story + "\n\n# Keuntungan\n" + newObject.story.benefits;
      }
      if (newObject.story.challenges.length > 0) {
        story =
          story + "\n\n# Risiko dan Tantangan\n" + newObject.story.challenges;
      }
      tabData = {
        story,
        creator: {
          name: newObject.creator.name,
          avatarUrl: newObject.creator.avatarUrl,
          school: newObject.school,
          biography: newObject.creator.biography,
        },
      };
    }

    if (page === "faqs") {
      tabData = { faqs: newObject.story.faqs };
    }

    res.status(200).json({
      error: false,
      message: "Berhasil mengambil data.",
      status: 200,
      data: {
        authorized: true,
        refreshToken: req.refreshToken,
        ...tabData,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const getDiscoverProjects = async (req, res, next) => {
  try {
    let page = 1;
    let perPage = 6;
    let totalPages = 0;

    const result = validationResult(req);
    if (!result.isEmpty()) {
      const error = new Error("Query parameters invalid.");
      error.data = {
        errors: result.array({ onlyFirstError: true }),
      };
      error.statusCode = 422;
      throw error;
    }

    let filters = Project.find({
      status: { $in: ["oncampaign", "finished"] },
    }).populate("creator");

    const query = matchedData(req);
    page = query.page ? parseInt(query.page) : 1;

    if (query.search) {
      console.log(query.search);

      const keyword = new RegExp(query.search, "i");
      console.log(keyword);

      const creator = await User.findOne({ name: { $regex: keyword } });

      filters.or([
        { "basic.title": { $regex: keyword } },
        { creator: creator },
        { "basic.category": { $regex: keyword } },
      ]);
    }

    // filters.or([{ status: "oncampaign" }, { status: "finished" }]);
    if (query.category) {
      const category = new RegExp(query.category, "i");
      filters.where({ "basic.category": { $regex: category } });
    }

    if (req.query.location) {
      const location = new RegExp(query.location, "i");
      filters.where({ "basic.location": { $regex: location } });
    }

    const discover = await filters
      .skip((page - 1) * 6)
      .limit(perPage)
      .select(
        "slug basic.imageUrl basic.title basic.subTitle basic.location basic.category funding status basic.fundTarget basic.endDate creator"
      )
      .sort({ "basic.launchDate": "desc", status: "desc" })
      .exec();

    const projects = discover.map((project) => {
      const doc = project._doc;
      const mappedDoc = {
        imageUrl: doc.basic.imageUrl,
        title: doc.basic.title,
        subtitle: doc.basic.subTitle,
        projectSlug: doc.slug,
        projectStatus: doc.status,
        fundingProgress: Math.floor((doc.funding / doc.basic.fundTarget) * 100),
        location: doc.basic.location,
        category: doc.basic.category,
      };

      const now = new Date();
      const end = doc.basic.endDate;
      const msInDay = 1000 * 60 * 60 * 24;
      const msInHours = 1000 * 60 * 60;

      let timeFormat;
      let timeLeft;
      const daysLeft = Math.floor((end - now) / msInDay);
      if (daysLeft >= 1) {
        timeLeft = daysLeft;
        timeFormat = "hari";
      } else {
        timeLeft = (end - now) / msInHours;
        timeLeft = timeLeft < 0 ? 0 : timeLeft;
        timeFormat = "jam";
      }
      const creator = {
        _id: doc.creator._id,
        creator: doc.creator.name,
        creatorSlug: doc.creator.slug,
        avatar: doc.creator.avatarUrl,
      };

      return { ...mappedDoc, timeLeft, timeFormat, ...creator };
    });

    const totalItems = projects.length;
    totalPages = Math.ceil(totalItems / perPage);

    res.status(200).json({
      error: false,
      status: 200,
      message: "Berhasil mengambil data.",
      data: { page, totalPages, perPage, totalItems, projects },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
