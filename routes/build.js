import { Router } from "express";
import * as buildController from "../controllers/build.js";
import { isAuth } from "../middlewares/middlewares.js";

const router = Router();

router.post(
  "/start-project",
  isAuth,
  buildController.uploadProof.single("file"),
  buildController.postStartProject
);

export default router;
