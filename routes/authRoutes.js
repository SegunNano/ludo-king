import express from "express";
import passport from "passport";

import { logout } from "../controllers/authControllers.js";
import { catchAsync } from "../../url_shortener/utils/asyncHandlers.js";

const router = express.Router();

router.route("/google").get(
  passport.authenticate("google", {
    scope: ["profile", "email"],
    keepSessionInfo: true,
  })
);

router.route("/google/callback").get(
  passport.authenticate("google", {
    failureRedirect: "/",
    keepSessionInfo: true,
  }),
  (req, res) => {
    console.log(req.session.returnTo);
    const redirectUrl = req.session.returnTo || "/";
    res.redirect(redirectUrl);
  }
);
router.get("/logout", logout);

export default router;
