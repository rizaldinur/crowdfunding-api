import mongoose from "mongoose";
import Project from "../models/project.js";
import User from "../models/user.js";
import Support from "../models/support.js";
import { matchedData, validationResult } from "express-validator";
import Update from "../models/update.js";
import Comment from "../models/comment.js";
import Reply from "../models/reply.js";

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

    const { profileId, projectId } = req.params;

    const { userId, slug } = req.authData || {};

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

    if (
      req.role !== "admin" &&
      creator._id.equals(new mongoose.Types.ObjectId(userId))
    ) {
      req.role = "creator";
    } else {
      const backedProject = await Support.findOne({
        supportedProject: project,
        supporter: new mongoose.Types.ObjectId(userId),
      });

      if (req.role !== "admin" && backedProject) {
        req.role = "backer";
      }
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
      timeLeft = timeLeft < 0 ? 0 : timeLeft;
      timeFormat = "jam";
    }

    const uniqueSupporters = await Support.distinct("supporter", {
      supportedProject: project,
    });
    const countSupporters = uniqueSupporters.length;
    const fundingProgress = Math.round(
      (newObject.funding / newObject.basic.fundTarget) * 100
    );

    let user;
    if (req.isAuth) {
      user = await User.findOne({
        slug: req.authData?.slug,
      }).select("name avatarUrl");
    }
    res.status(200).json({
      error: false,
      message: "Berhasil mengambil data.",
      status: 200,
      data: {
        role: req.role,
        isAuth: req.isAuth,
        user,
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

    const pageMap = ["story", "updates", "faqs"];
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

    if (page === "updates") {
      const updates = await Update.find({
        project,
        author: creator,
      }).sort({ createdAt: "desc" });

      tabData = {
        updates,
        creatorName: creator.name,
        avatar: creator.avatarUrl,
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

    if (query.category) {
      const category = new RegExp(query.category, "i");
      filters.where({ "basic.category": { $regex: category } });
    }

    if (query.location) {
      const location = new RegExp(query.location, "i");
      filters.where({ "basic.location": { $regex: location } });
    }

    let count = filters.clone();
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

    const totalItems = await count.countDocuments();
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

export const getComments = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const result = validationResult(req);
    if (!result.isEmpty()) {
      const error = new Error("Query parameters invalid.");
      error.data = {
        errors: result.array({ onlyFirstError: true }),
      };
      error.statusCode = 422;
      throw error;
    }
    let { offset = 0 } = matchedData(req);

    if (!req.params?.projectId) {
      const error = new Error("URL paremeters invalid.");
      error.statusCode = 400;
      throw error;
    }

    const project =
      (await Project.findOne({
        slug: projectId,
      }).populate("creator")) ||
      (await Project.findById(projectId).populate("creator"));

    if (!project) {
      const error = new Error("Project not found.");
      error.statusCode = 400;
      throw error;
    }

    const countComments = await Comment.countDocuments({ project });

    const comments = await Comment.find({
      project,
    })
      .select("author content")
      .sort({ createdAt: "desc" })
      .skip(offset)
      .limit(3)
      .populate("author");

    const mappedComments = await Promise.allSettled(
      comments.map(async (value) => {
        const comment = value._doc;
        let role = "backer";
        if (project.creator._id.equals(comment.author._id)) {
          role = "creator";
        }
        const replies = await Reply.find({
          comment,
        })
          .limit(3)
          .select("content author")
          .sort({ createdAt: -1 })
          .populate("author");

        const mappedReplies = replies.map((value) => {
          const reply = value._doc;
          let role = "backer";
          if (project.creator._id.equals(reply.author._id)) {
            role = "creator";
          }
          const author = {
            name: reply.author.name,
            avatar: reply.author.avatarUrl,
            role,
          };

          return { ...reply, author };
        });

        const author = {
          name: comment.author.name,
          avatar: comment.author.avatarUrl,
          role,
        };

        const totalReplies = await Reply.countDocuments({
          comment,
        });

        return { ...comment, author, totalReplies, replies: mappedReplies };
      })
    );

    const commentWithReplies = mappedComments
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);

    res.status(200).json({
      error: false,
      message: "Berhasil mengambil data.",
      status: 200,
      data: {
        refreshToken: req.refreshToken,
        totalComments: countComments,
        commentWithReplies,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const getReplies = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    const result = validationResult(req);
    if (!result.isEmpty()) {
      const error = new Error("Query parameters invalid.");
      error.data = {
        errors: result.array({ onlyFirstError: true }),
      };
      error.statusCode = 422;
      throw error;
    }
    let { offset = 0 } = matchedData(req);

    if (!req.params?.commentId) {
      const error = new Error("URL paremeters invalid.");
      error.statusCode = 400;
      throw error;
    }

    const comment = await Comment.findById(commentId)
      .select("author content project")
      .populate("project");

    if (!comment) {
      const error = new Error("Comment not found.");
      error.statusCode = 400;
      throw error;
    }

    const replies = await Reply.find({
      comment,
    })
      .select("author content comment")
      .sort({ createdAt: -1 })
      .limit(3)
      .skip(offset)
      .populate("author");

    const mappedReplies = replies.map((value) => {
      const reply = value._doc;
      let role = "backer";
      if (comment.project.creator._id.equals(reply.author._id)) {
        role = "creator";
      }

      const author = {
        name: reply.author.name,
        avatar: reply.author.avatarUrl,
        role,
      };

      return { ...reply, author };
    });

    res.status(200).json({
      error: false,
      message: "Berhasil mengambil data.",
      status: 200,
      data: {
        refreshToken: req.refreshToken,
        replies: mappedReplies,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const postUpdateProject = async (req, res, next) => {
  try {
    if (!req.params?.profileId || !req.params?.projectId) {
      const error = new Error("URL paremeters invalid.");
      error.statusCode = 400;
      throw error;
    }

    const result = validationResult(req);
    if (!result.isEmpty) {
      const error = new Error("Gagal memproses input.");
      error.statusCode = 422;
      error.data = { errors: result.array({ onlyFirstError: true }) };
      throw error;
    }

    const { profileId, projectId } = req.params;

    const creator =
      (await User.findOne({ slug: profileId }).select("_id")) ||
      (await User.findById(profileId).select("_id"));

    const { userId } = req.authData;

    if (!creator._id.equals(userId)) {
      const error = new Error("Unauthorized.");
      error.statusCode = 401;
      error.data = { authorized: false };
      throw error;
    }

    const project =
      (await Project.findOne({
        slug: projectId,
        creator: creator,
      }).select("_id")) || (await Project.findById(projectId).select("_id"));

    if (!project) {
      const error = new Error("Project not found.");
      error.statusCode = 400;
      throw error;
    }

    const { title, content } = matchedData(req);

    const projectUpdate = new Update({
      title,
      content,
      author: creator,
      project,
    });

    await projectUpdate.save();

    res.status(201).json({
      error: false,
      status: 201,
      message: "Berhasil menyimpan perubahan",
      data: {
        authorized: true,
        refreshToken: req.refreshToken,
        projectUpdate,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const postComment = async (req, res, next) => {
  try {
    if (!req.params?.projectId) {
      const error = new Error("URL paremeters invalid.");
      error.statusCode = 400;
      throw error;
    }

    const result = validationResult(req);
    if (!result.isEmpty()) {
      const error = new Error("Gagal memproses input.");
      error.statusCode = 422;
      error.data = { errors: result.array({ onlyFirstError: true }) };
      throw error;
    }

    const { projectId } = req.params;
    const { userId, slug } = req.authData;
    const author = await User.findById(userId).select("name avatarUrl");

    const project = await Project.findOne({
      slug: projectId,
    })
      .select("_id")
      .populate("creator");

    if (!project) {
      const error = new Error("Project not found.");
      error.statusCode = 400;
      throw error;
    }

    let role = "creator";
    if (!project.creator._id.equals(userId)) {
      const support = await Support.findOne({
        supportedProject: project,
        supporter: author,
      }).select("_id");

      if (!support) {
        const error = new Error("Bukan pendukung/kreator.");
        error.statusCode = 401;
        throw error;
      }
      role = "backer";
    }

    const { content } = matchedData(req);
    const comment = new Comment();
    comment.project = project;
    comment.content = content;
    comment.author = author;
    await comment.save();

    res.status(201).json({
      error: false,
      message: "Berhasil mengirim komentar.",
      data: {
        refreshToken: req.refreshToken,
        newComment: {
          _id: comment._id,
          content: comment.content,
          author: {
            role,
            name: author.name,
            avatar: author.avatarUrl,
          },
          totalReplies: 0,
          replies: [],
        },
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const postReply = async (req, res, next) => {
  try {
    if (!req.params?.commentId) {
      const error = new Error("URL paremeters invalid.");
      error.statusCode = 400;
      throw error;
    }

    const result = validationResult(req);
    if (!result.isEmpty()) {
      const error = new Error("Gagal memproses input.");
      error.statusCode = 422;
      error.data = { errors: result.array({ onlyFirstError: true }) };
      throw error;
    }

    const { commentId } = req.params;
    const { userId, slug } = req.authData;
    const author = await User.findById(userId).select("name avatarUrl");

    const comment = await Comment.findById(commentId);

    if (!comment) {
      const error = new Error("Comment not found.");
      error.statusCode = 400;
      throw error;
    }

    let role;
    const project = await Project.findById(comment.project._id);
    if (project.creator._id.equals(userId)) {
      role = "creator";
    }

    if (!project.creator._id.equals(userId)) {
      const support = await Support.findOne({
        supportedProject: project,
        supporter: author,
      }).select("_id");

      if (!support) {
        const error = new Error("Bukan pendukung/kreator.");
        error.statusCode = 401;
        throw error;
      }
      role = "backer";
    }

    const { reply } = matchedData(req);
    const newReply = new Reply();
    newReply.content = reply;
    newReply.comment = comment;
    newReply.author = author;
    await newReply.save();

    res.status(201).json({
      error: false,
      message: "Berhasil mengirim balasan.",
      data: {
        refreshToken: req.refreshToken,
        newReply: {
          _id: newReply._id,
          author: {
            role,
            name: author.name,
            avatar: author.avatarUrl,
          },
          content: newReply.content,
        },
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
