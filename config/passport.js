import passport from "passport";
import { Strategy } from "passport-google-oauth2";
import dotenv from "dotenv";

import User from "../models/userModel.js    ";

process.env.NODE !== "production" && dotenv.config();

const strategy = new Strategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback",
    passReqToCallback: true,
  },
  async (request, accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        user = await User.create({
          googleId: profile.id,
          username: profile.displayName,
          email: profile.emails[0].value,
          image: profile.photos[0].value,
        });
      }

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
);

passport.use(strategy);
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

export default passport;
