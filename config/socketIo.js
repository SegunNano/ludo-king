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
      gameCache.set(gameId, { dieOutcome, count: 0 });

      io.to(gameId).emit("dieOutcome", dieOutcome);
    });
    socket.on(
      "nextPlayer",
      async ({ gameId, playerSeedsArray, opponentSeedsArray }) => {
        const game = await Game.findById(gameId).populate(
          "playersList.player",
          "username image"
        );

        if (!gameCache.get(gameId).dieOutcome.every((die) => die === 6)) {
          game.currentPlayer = (game.currentPlayer + 1) % game.playerNo;
        }
        function updateSeedPositions(game, seedsToUpdate, newValue) {
          let updated = false;
          seedsToUpdate.forEach((seed) => {
            if (game.seedPositions.hasOwnProperty(seed)) {
              // Ensure the seed exists
              game.seedPositions[seed] = newValue;
              updated = true;
            }
          });
          if (updated) {
            game.markModified("seedPositions");
          }
        }
        if (playerSeedsArray?.length) {
          updateSeedPositions(game, playerSeedsArray, 57);
        }
        if (opponentSeedsArray?.length) {
          updateSeedPositions(game, opponentSeedsArray, 0);
        }

        await game.save();

        io.to(gameId).emit("gameUpdate", game);
      }
    );

    socket.on("gameMoves", async (info) => {
      const { gameId, gameMoves, seed, die } = info;

      const gameData = gameCache.get(gameId);
      const game =
        gameMoves === "newSeedOut"
          ? await Game.findByIdAndUpdate(
              gameId,
              { $set: { [`seedPositions.${seed}`]: 1 } },
              { new: true }
            ).populate("playersList.player", "username image")
          : await Game.findByIdAndUpdate(
              gameId,
              { $inc: { [`seedPositions.${seed}`]: die } },
              { new: true }
            ).populate("playersList.player", "username image");
      gameData.count += 1;
      const { count, dieOutcome } = gameData;
      io.to(gameId).emit("gameUpdate", {
        ...game.toObject(),
        count,
        dieOutcome,
      });
      gameCache.set(gameId, gameData);
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
