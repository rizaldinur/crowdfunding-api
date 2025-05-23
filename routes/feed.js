import { Router } from "express";
import { isAuth } from "../middlewares/middlewares.js";
import * as feedController from "../controllers/feed.js";

const router = Router();

router.get("/index/featured-project", feedController.getFeaturedProject);
// router.get(
//   "/index/recommended-projects",
//   feedController.getRecommendedProjects
// );
router.get(
  "/project/details/:profileId/:projectId/header",
  feedController.getProjectHeader
);
router.get(
  "/project/details/:profileId/:projectId{/:page}", //optional
  feedController.getProjectDetails
);

export default router;
