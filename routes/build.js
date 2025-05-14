import { Router } from "express";
import * as buildController from "../controllers/build.js";
import { isAuth } from "../middlewares/middlewares.js";

const router = Router();

router.get(
  "/:profileId/:projectId/build-overview",
  isAuth,
  buildController.getOverviewBuild
);

router.post(
  "/start-project",
  isAuth,
  buildController.uploadProof.single("file"),
  buildController.postStartProject
);
router.post(
  "/:profileId/:projectId/build/basic",
  isAuth,
  buildController.postBuildBasic
);

export default router;
