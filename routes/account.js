import { Router } from "express";
import { isAuth } from "../middlewares/middlewares.js";
import * as accountController from "../controllers/account.js";

const router = Router();

router.get("/profile/:profileId/about", accountController.getProfileAbout);
router.get("/:profileId/profile-header", accountController.getProfileHeader);

export default router;
