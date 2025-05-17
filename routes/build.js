import { Router } from "express";
import * as buildController from "../controllers/build.js";
import { isAuth } from "../middlewares/middlewares.js";

const router = Router();

router.get(
  "/:profileId/:projectId/build-overview",
  isAuth,
  buildController.getOverviewBuild
);
router.get(
  "/:profileId/:projectId/build/:page",
  isAuth,
  buildController.getBuildPageData
);

router.post(
  "/start-project",
  isAuth,
  buildController.uploadProof.single("file"),
  buildController.postStartProject
);

router.put(
  "/:profileId/:projectId/build/:page",
  isAuth,
  buildController.putBuildForm
);

router.delete(
  "/:profileId/:projectId/delete",
  isAuth,
  buildController.deleteProject
);

export default router;
