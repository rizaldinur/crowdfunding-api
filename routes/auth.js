import { Router } from "express";
import * as authController from "../controllers/auth.js";

const router = Router();

router.post("/login", authController.login);
router.post("/signup", authController.signup);
router.post("/authenticate", authController.authJWT);

export default router;
