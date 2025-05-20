import { Router } from "express";
import { isAuth } from "../middlewares/middlewares.js";
import * as feedController from "../controllers/feed.js";

const router = Router();

router.get(
  "/project/details/:profileId/:projectId/header",
  feedController.getProjectHeader
);

router.get(
  "/project/details/:profileId/:projectId{/:page}", //optional
  feedController.getProjectDetails
);

export default router;
