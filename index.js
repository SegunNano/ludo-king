import express from "express";
import flash from "connect-flash";
import dotenv from "dotenv";
import path from "path";
import methodOverride from "method-override";
import { fileURLToPath } from "url";
import ejsMate from "ejs-mate";
import { Server } from "socket.io";
import http from "http";

import connectDB from "./config/db.js";

process.env.NODE !== "production" && dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

connectDB();
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.engine("ejs", ejsMate);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));
app.use(flash());

// app.use((req, res, next) => {
// res.locals.urlPath = urlSuffixer(req);
// res.locals.currentUser = req.user;
// res.locals.success = req.flash("success");
// res.locals.error = req.flash("error");
// res.locals.info = req.flash("info");
// res.locals.warning = req.flash("warning");
//   res.locals.isAuthenticated = req.isAuthenticated();
// next();
// });

app.get("/", (req, res) => {
  res.render("home");
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Server running on port: ${port}`));
