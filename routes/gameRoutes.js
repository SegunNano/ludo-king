import express from "express";
import { catchAsync } from "../middlewares/asyncHandlers.js";
import {
  createGameRoom,
  gameRoom,
  gameRoomForm,
} from "../controllers/gameControllers.js";
import { isLoggedIn } from "../middlewares/middlewares.js";

const router = express.Router();

router.route("/create-room").get(gameRoomForm).post(catchAsync(createGameRoom));
router.route("/create-room-post").get(catchAsync(createGameRoom));
router.route("/:idx").get(isLoggedIn, gameRoom);

export default router;
