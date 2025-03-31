import { Server } from "socket.io";
import session from "express-session";
import mongoose from "mongoose";
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
        console.log(gameId, socket.id);
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
        console.error("1. Error in joinRoom:", error);
        socket.emit("error", "An error occurred while joining the room.");
      }
    });

    socket.on("rollDie", (gameId) => {
      const dieOutcome = [
        // Math.floor(Math.random() * 6 + 1),
        // Math.floor(Math.random() * 6 + 1),
        6, 5,
      ];
      gameCache.set(gameId, { dieOutcome, count: 0 });

      io.to(gameId).emit("dieOutcome", dieOutcome);
    });
    socket.on("nextPlayer", async (info) => {
      try {
        const { gameId, playerSeedsArray, opponentSeedsArray } = info;
        const game = await Game.findById(gameId).populate(
          "playersList.player",
          "username image"
        );

        const { playersList, playerNo, currentPlayer, seedPositions } = game;
        const gameData = gameCache.get(gameId);
        if (!gameData?.dieOutcome.every((die) => die === 6)) {
          game.currentPlayer = (currentPlayer + 1) % playerNo;
        }

        let nextPlayer = playersList[game.currentPlayer];
        let seedValues = nextPlayer.seedColor.flatMap(
          (color) => [1, 2, 3, 4].map((num) => `${color}_${num}`) // Default to 0 if undefined
        );
        let outSeedsArray = seedValues.filter(
          (pos) => seedPositions[pos] === 57
        );
        while (outSeedsArray.length === 16 / playerNo) {
          game.currentPlayer = (game.currentPlayer + 1) % playerNo;
          nextPlayer = playersList[game.currentPlayer];
          seedValues = nextPlayer.seedColor.flatMap(
            (color) => [1, 2, 3, 4].map((num) => `${color}_${num}`) // Default to 0 if undefined
          );
          outSeedsArray = seedValues.filter((pos) => seedPositions[pos] === 57);
          if (++loopCount >= playerNo) {
            console.warn("All players completed their seeds. Ending loop.");
            break;
          }
        }

        if (playerSeedsArray?.length)
          updateSeedPositions(game, playerSeedsArray, 57);

        if (opponentSeedsArray?.length)
          updateSeedPositions(game, opponentSeedsArray, 0);

        await game.save();

        io.to(gameId).emit("gameUpdate", game);
      } catch (error) {
        console.log("4", error);
      }
    });

    socket.on("gameMoves", async (info) => {
      try {
        const { gameId, gameMoves, seed, die } = info;

        const gameData = gameCache.get(gameId);
        if (!gameData) {
          console.error("Game data not found in cache for gameId:", gameId);
          return;
        }
        const updateFields =
          gameMoves === "newSeedOut"
            ? { [`seedPositions.${seed}`]: 1 }
            : gameMoves === "checkNextSeed"
            ? {}
            : { [`seedPositions.${seed}`]: seedPositions[seed] + die };

        const game = await Game.findByIdAndUpdate(
          gameId,
          { $set: updateFields },
          { new: true }
        );

        gameData.count += 1;
        gameCache.set(gameId, gameData);

        io.to(gameId).emit("gameUpdate", {
          ...game.toObject(),
          count: gameData.count,
          dieOutcome: gameData.dieOutcome,
        });
      } catch (error) {
        console.error("Error in gameMoves:", error);
      }
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
        console.error("6, Error handling disconnect:", error);
      }
    });
  });

  return io;
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
