import MongoStore from "connect-mongo";
import dotenv from "dotenv";

process.env.NODE_ENV !== "production" && dotenv.config();

const dbUrl = process.env.MONGO_URI;
const secret = process.env.SECRET;

const store = MongoStore.create({
  mongoUrl: dbUrl,
  collectionName: "session",
  // touchAfter: 24 * 60 * 60
});

store.on("error", (e) => console.log("SESSION STORE ERROR", e));

const sessionConfig = {
  store,
  name: "session",
  secret,
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    // secure: true,
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
};

export default sessionConfig;
