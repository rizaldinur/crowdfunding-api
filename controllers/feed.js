import mongoose from "mongoose";
import Project from "../models/project.js";
import User from "../models/user.js";

export const getFeaturedProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({ status: "oncampaign" })
      .sort({
        "basic.launchDate": "desc",
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
        "basic.launchDate": "desc",
      })
      .limit(6)
      .populate("creator");

    const recommendedProjects = projects.map((project) => {
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

    // const title = project.basic.title;
    // const subtitle = project.basic.subtitle;
    // const imageUrl = project.basic.imageUrl;
    // const creator = project.creator.name;
    // const creatorSlug = project.creator.slug;
    // const projectSlug = project.slug;
    // const avatar = project.creator.avatarUrl;
    // const fundingProgress = Math.floor(
    //   (project.funding / project.basic.fundTarget) * 100
    // );
    // const location = project.basic.location;
    // const category = project.basic.category;

    // const now = new Date();
    // const end = project.basic.endDate;
    // const msInDay = 1000 * 60 * 60 * 24;
    // const msInHours = 1000 * 60 * 60;

    // let timeFormat;
    // let timeLeft;
    // const daysLeft = Math.floor((end - now) / msInDay);
    // if (daysLeft >= 1) {
    //   timeLeft = daysLeft;
    //   timeFormat = "hari";
    // } else {
    //   timeLeft = Math.floor((end - now) / msInHours);
    //   timeFormat = "jam";
    // }

    // const featuredProject = {
    //   creatorSlug,
    //   projectSlug,
    //   title,
    //   subtitle,
    //   imageUrl,
    //   creator,
    //   avatar,
    //   fundingProgress,
    //   location,
    //   category,
    //   timeLeft,
    //   timeFormat,
    // };

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
