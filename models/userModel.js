import mongoose from "mongoose";
// import cron from "node-cron";
// import passportLocalMongoose from "passport-local-mongoose";

const { Schema, model, models } = mongoose;
const required = true;
const unique = true;
const gameDetails = { type: Number, required, default: 0 };

const userSchema = new Schema(
  {
    username: { type: String, required },
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required, unique },
    image: { type: String, unique },
    gamesPlayed: gameDetails,
    points: gameDetails,
    wins: gameDetails,
  },
  { timestamps: true }
);

const User = models?.User || model("User", userSchema);

export default User;
