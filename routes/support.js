import { Router } from "express";
import { isAuth } from "../middlewares/middlewares.js";
import * as supportController from "../controllers/support.js";

const router = Router();

router.get(
  "/support/:profileId/:projectId/overview",
  isAuth,
  supportController.getSupportOverviewData
);

router.get("/support/status", isAuth, supportController.getSupportStatus);

router.post(
  "/support/:profileId/:projectId/checkout",
  isAuth,
  supportController.postSupportProject
);

router.post(
  "/support/update-status",
  // isAuth,
  supportController.updateSupportProjectStatus
);

router.delete("/support/delete", isAuth, supportController.deleteSupport);

export default router;
