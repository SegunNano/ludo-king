import express from "express";
import passport from "passport";

import { logout } from "../controllers/authControllers.js";

const router = express.Router();

router
  .route("/google")
  .get(passport.authenticate("google", { scope: ["profile", "email"] }));

router
  .route("/google/callback")
  .get(
    passport.authenticate("google", { failureRedirect: "/" }),
    (req, res) => {
      res.redirect("/");
    }
  );
router.get("/logout", logout);

export default router;
