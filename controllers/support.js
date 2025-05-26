import mongoose from "mongoose";
import Project from "../models/project.js";

export const getSupportOverviewData = async (req, res, next) => {
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

    if (project.status !== "oncampaign") {
      const error = new Error("Cannot support this project.");
      error.statusCode = 422;
      throw error;
    }

    const overviewData = {
      title: project.basic.title,
      imageUrl: project.basic.imageUrl,
      fundingProgress: Math.floor(
        (project.funding / project.basic.fundTarget) * 100
      ),
      creatorName: project.creator.name,
      creatorEmail: project.creator.email,
    };

    res.status(200).json({
      error: false,
      status: 200,
      message: "Berhasil mengambil data.",
      data: {
        overviewData,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
