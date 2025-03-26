import { Server } from "socket.io";
import session from "express-session";
import sessionConfig from "./sessionConfig.js";
import Game from "../models/gameModel.js";
// import User from "../models/userModel.js";
import { shuffleArray } from "../utils/utils.js";
const gameCache = new Map();

const sessionMiddleware = session(sessionConfig);

export default function setupSocket(server) {
  const io = new Server(server);

  io.use((socket, next) => sessionMiddleware(socket.request, {}, next));

  io.on("connection", (socket) => {
    socket.on("joinRoom", async (gameId) => {
      try {
        if (!socket.request.session?.passport?.user) {
          socket.emit("error", "User is not authenticated.");
          return;
        }

        const playerId = socket.request.session.passport.user;

        // Update player's socketId
        const game = await Game.findByIdAndUpdate(
          gameId,
          { $set: { "playersList.$[elem].socketId": socket.id } },
          {
            arrayFilters: [{ "elem.player": playerId }],
            new: true,
          }
        ).populate("playersList.player", "username image");

        if (!game) {
          socket.emit("error", "Game not found.");
          return;
        }

        const { playersList, playerNo, arrangeRandomly } = game;

        // If all players have joined, shuffle and start game
        if (playersList.length === playerNo && arrangeRandomly) {
          game.playersList = shuffleArray(playersList);
          game.arrangeRandomly = undefined;
          game.currentPlayer = 0;
          await game.save();
        }

        // Join the room and notify all players
        socket.join(gameId);
        io.to(gameId).emit("gameUpdate", game);
      } catch (error) {
        console.error("Error in joinRoom:", error);
        socket.emit("error", "An error occurred while joining the room.");
      }
    });

    socket.on("rollDie", (gameId) => {
      const dieOutcome = [
        Math.floor(Math.random() * 6 + 1),
        Math.floor(Math.random() * 6 + 1),
      ];
      gameCache.set(gameId, { dieOutcome });

      io.to(gameId).emit("dieOutcome", dieOutcome);
    });
    socket.on("nextPlayer", async (gameId) => {
      const game = await Game.findById(gameId).populate(
        "playersList.player",
        "username image"
      );

      if (!gameCache.get(gameId).dieOutcome.every((die) => die === 6)) {
        console.log(game.currentPlayer);
        game.currentPlayer = (game.currentPlayer + 1) % game.playerNo;
        await game.save();
      }

      io.to(gameId).emit("gameUpdate", game);
    });

    socket.on("disconnect", async () => {
      try {
        const game = await Game.findOneAndUpdate(
          { "playersList.socketId": socket.id },
          { $set: { "playersList.$.socketId": null } }, // Remove socket ID
          { new: true }
        ).populate("playersList.player", "username image");

        if (game) {
          io.to(game._id.toString()).emit("gameUpdate", game);
        }
      } catch (error) {
        console.error("Error handling disconnect:", error);
      }
    });
  });

  return io;
}
