import { Router } from "express";
import { authRecursive, isAuth } from "../middlewares/middlewares.js";
import * as feedController from "../controllers/feed.js";
import { body, query } from "express-validator";

const router = Router();

router.get("/index/featured-project", feedController.getFeaturedProject);
router.get(
  "/index/recommended-projects",
  feedController.getRecommendedProjects
);
router.get(
  "/project/details/:profileId/:projectId/header",
  authRecursive,
  feedController.getProjectHeader
);
router.get(
  "/project/details/:profileId/:projectId{/:page}", //optional
  feedController.getProjectDetails
);
router.get(
  "/discover",
  query("page")
    .optional({ values: "falsy" })
    .isNumeric({ no_symbols: true })
    .withMessage("No symbols allowed."),
  query("search")
    .optional({ values: "falsy" })
    .trim()
    .customSanitizer((value) => {
      return value.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    }),
  query("location")
    .optional({ values: "falsy" })
    .trim()
    .customSanitizer((value) => {
      return value.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    }),
  query("category")
    .optional({ values: "falsy" })
    .trim()
    .customSanitizer((value) => {
      return value.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    }),
  feedController.getDiscoverProjects
);
router.get(
  "/comments/:projectId",
  authRecursive,
  query("offset")
    .optional({ values: "falsy" })
    .isNumeric({ no_symbols: true })
    .withMessage("No symbols allowed."),
  feedController.getComments
);

router.post(
  "/project/details/:profileId/:projectId/update",
  isAuth,
  body("title").notEmpty().withMessage("Harus diisi").trim(),
  body("content").notEmpty().withMessage("Harus diisi").trim(),
  feedController.postUpdateProject
);

router.post(
  "/comment/:projectId",
  isAuth,
  body("content")
    .isLength({ min: 2 })
    .withMessage("Harus diisi, minimal 2.")
    .trim(),
  feedController.postComment
);

export default router;
