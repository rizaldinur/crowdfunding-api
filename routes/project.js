import { Router } from "express";
import * as projectController from "../controllers/project.js";
import { isAuth } from "../middlewares/middlewares.js";

const router = Router();

router.post(
  "/start-project",
  isAuth,
  projectController.uploadProof.single("file"),
  projectController.postStartProject
);

export default router;
