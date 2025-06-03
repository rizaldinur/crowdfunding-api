import { Router } from "express";
import { isAuth } from "../middlewares/middlewares.js";
import * as accountController from "../controllers/account.js";
import { body } from "express-validator";

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

router.put(
  "/settings/:profileId/profile",
  isAuth,
  body("name")
    .trim()
    .escape()
    .isLength({ min: 2 })
    .withMessage("Minimal 2 karakter."),
  body("avatarUrl")
    .optional({ values: "falsy" })
    .trim()
    .isURL()
    .withMessage("Invalid URL."),
  body("biography")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 300 })
    .withMessage("Maksimal 300 karakter."),
  body("uniqueUrl")
    .optional({ values: "falsy" })
    .trim()
    .escape()
    .isLength({ max: 20 })
    .withMessage("Maksimal 20 karakter."),
  accountController.putUpdateProfile
);

router.put(
  "/settings/:profileId/account",
  isAuth,
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Harus diisi.")
    .isEmail()
    .withMessage("Masukkan format email yang benar.")
    .normalizeEmail(),
  body("newPassword")
    .optional({ values: "falsy" })
    .trim()
    .escape()
    .isStrongPassword(),
  body("confirmPassword")
    .optional({ values: "falsy" })
    .trim()
    .escape()
    .custom((input, { req }) => {
      if (input !== req.body.newPassword) {
        throw new Error("Password tidak sama.");
      }
      return true;
    }),
  body("password").notEmpty().withMessage("Harus diisi.").trim().escape(),
  accountController.putUpdateAccount
);

export default router;
