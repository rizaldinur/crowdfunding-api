import { Router } from "express";
import { isAuth } from "../middlewares/middlewares.js";
import * as accountController from "../controllers/account.js";

const router = Router();

router.get("/:profileId/profile-header", accountController.getProfileHeader);
router.get("/profile/:profileId/about", accountController.getProfileAbout);
router.get(
  "/profile/:profileId/projects",
  isAuth,
  accountController.getProfileCreatedProjects
);
router.get(
  "/profile/:profileId/backed",
  isAuth,
  accountController.getProfileBackedProjects
);

router.get(
  "/settings/:profileId{/:page}",
  isAuth,
  accountController.getSettingTabsData
);

export default router;
