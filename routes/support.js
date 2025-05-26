import { Router } from "express";
import { isAuth } from "../middlewares/middlewares.js";
import * as supportController from "../controllers/support.js";

const router = Router();

router.get(
  "/support/:profileId/:projectId/overview", //optional
  isAuth,
  supportController.getSupportOverviewData
);

export default router;
