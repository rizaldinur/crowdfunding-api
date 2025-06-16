import mongoose from "mongoose";
import Project from "../models/project.js";
import User from "../models/user.js";
import Support from "../models/support.js";
import { config } from "dotenv";
import { snap } from "../app.js";
import { getBaseUrl, getClientBaseUrl } from "../utils/utils.js";

config();

export const getSupportOverviewData = async (req, res, next) => {
  try {
    if (!req.params?.profileId || !req.params?.projectId) {
      const error = new Error("URL paremeters invalid.");
      error.statusCode = 400;
      throw error;
    }
    const { profileId, projectId } = req.params;

    const creator = await User.findOne({ slug: profileId });
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

    if (project.status !== "oncampaign") {
      const error = new Error("Cannot support this project.");
      error.statusCode = 422;
      throw error;
    }

    const { userId } = req.authData;
    const supporter = await User.findById(userId);

    const overviewData = {
      title: project.basic.title,
      imageUrl: project.basic.imageUrl,
      fundingProgress: Math.floor(
        (project.funding / project.basic.fundTarget) * 100
      ),
      creatorName: project.creator.name,
      supporterEmail: supporter.email,
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

export const getSupportStatus = async (req, res, next) => {
  try {
    if (!req.query?.order_id) {
      const error = new Error("Search parameter required.");
      error.statusCode = 400;
      throw error;
    }

    const { order_id } = req.query;
    const support = await Support.findById(order_id).populate(
      "supporter supportedProject"
    );

    if (!support) {
      const error = new Error("Data not found.");
      error.statusCode = 404;
      throw error;
    }

    const project = await Project.findById(support.supportedProject)
      .select("creator")
      .populate("creator");

    const { userId, slug } = req.authData;

    if (!support.supporter._id.equals(userId)) {
      const error = new Error("Unauthorized.");
      error.data = { authorized: false };
      error.statusCode = 401;
      throw error;
    }
    const { supporter } = support.toObject();
    const { supportedProject } = support.toObject();
    const { creator } = project.toObject();

    res.status(200).json({
      error: false,
      message: "OK",
      status: 200,
      data: {
        authorized: true,
        refreshToken: req.refreshToken,
        supportId: support._id,
        supporterSlug: supporter.slug,
        supporterAvatar: supporter.avatar,
        projectSlug: supportedProject.slug,
        imageUrl: supportedProject.basic.imageUrl,
        creatorSlug: creator.slug,
        creatorName: creator.name,
        supportAmount: support.supportAmount,
        transactionStatus: support.transaction.status,
        transactionToken: support.transaction.token,
        expiryTime: support.transaction.expiryTime,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const postSupportProject = async (req, res, next) => {
  try {
    if (!req.params?.profileId || !req.params?.projectId) {
      const error = new Error("URL paremeters invalid.");
      error.statusCode = 400;
      throw error;
    }

    const { profileId, projectId } = req.params;
    const creator = await User.findOne({ slug: profileId });
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

    if (project.status !== "oncampaign") {
      const error = new Error("Cannot support this project.");
      error.statusCode = 422;
      throw error;
    }

    const { userId: supporterId } = req.authData;
    //supporter
    const supporter = await User.findById(supporterId);

    //create Support
    const support = new Support({
      supportedProject: project,
      supporter: supporter,
      supportAmount: req.body.supportAmount,
    });

    await support.save();

    let parameter = {
      transaction_details: {
        order_id: support._id,
        gross_amount: support.supportAmount,
      },
      credit_card: {
        secure: true,
      },
      item_details: {
        id: project._id,
        price: support.supportAmount,
        quantity: 1,
        name: project.basic.title,
        category: project.basic.category,
        merchant_name: project.creator.name,
      },
      customer_details: {
        first_name: supporter.name.split(" ")[0],
        last_name: supporter.name.split(" ")[1],
        email: supporter.email,
        billing_address: {
          first_name: supporter.name.split(" ")[0],
          last_name: supporter.name.split(" ")[1],
          email: supporter.email,
          country_code: "IDN",
        },
      },
      expiry: {
        unit: "minutes",
        duration: 15,
      },
      page_expiry: {
        unit: "minutes",
        duration: 15,
      },
      callbacks: {
        finish: `${getClientBaseUrl(req)}/support/status`,
        error: `${getClientBaseUrl(req)}/support/status`,
      },
    };

    const transaction = await snap.createTransaction(parameter);
    support.transaction.token = transaction.token;
    await support.save();
    res.status(201).json({
      error: false,
      status: 201,
      message: "skibidi",
      data: {
        supportId: support._id,
        transaction,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const updateSupportProjectStatus = async (req, res, next) => {
  try {
    if (!req.body?.id || !req.body?.order_id) {
      const error = new Error("No support id provided.");
      error.statusCode = 400;
      throw error;
    }

    const { id } = req.body;
    const support = await Support.findById(id || req.body.order_id).populate(
      "supportedProject"
    );

    if (!support) {
      const error = new Error("Support record not found.");
      error.statusCode = 400;
      throw error;
    }

    const { userId } = req.authData;
    if (!support.supporter.equals(userId)) {
      const error = new Error("Unauthorized.");
      error.statusCode = 401;
      throw error;
    }

    const transaction = await snap.transaction.status(support._id);
    if (!transaction) {
      const error = new Error("Transaction not found.");
      error.statusCode = 404;
      throw error;
    }

    if (
      transaction.transaction_status === "capture" ||
      transaction.transaction_status === "settlement"
    ) {
      const project = await Project.findById(support.supportedProject._id);
      project.funding = project.funding + support.supportAmount;
      await project.save();
    }
    support.transaction.id = transaction.transaction_id;
    support.transaction.statusCode = transaction.status_code;
    support.transaction.status = transaction.transaction_status;
    support.transaction.expiryTime = new Date(transaction.expiry_time);
    await support.save();

    res.status(201).json({
      error: false,
      status: 201,
      message: "skibidi",
      data: {
        supportId: support._id,
        transactionStatus: support.transaction.status,
        transactionExpiryTime: support.transaction.expiryTime,
      },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const deleteSupport = async (req, res, next) => {
  try {
    console.log(req.body);

    if (!req.body?.id) {
      const error = new Error("No support id provided.");
      error.statusCode = 400;
      throw error;
    }

    const { id } = req.body;
    const support = await Support.findById(id);

    if (!support) {
      const error = new Error("Support record not found.");
      error.statusCode = 400;
      throw error;
    }

    const { userId } = req.authData;
    if (!support.supporter.equals(userId)) {
      const error = new Error("Unauthorized.");
      error.statusCode = 401;
      throw error;
    }

    const data = await support.deleteOne();
    res
      .status(202)
      .json({ error: false, status: 202, message: "ok", data: { ...data } });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
