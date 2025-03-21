import express from "express";
import { catchAsync } from "../../url_shortener/utils/asyncHandlers.js";
import {
  createGameRoom,
  gameRoomForm,
} from "../controllers/gameControllers.js";

const router = express.Router();

router.route("/create-room").get(gameRoomForm).post(catchAsync(createGameRoom));

router.route("/create-room-post").get(catchAsync(createGameRoom));

export default router;
