import { Server } from "socket.io";
import session from "express-session";
import sessionConfig from "./sessionConfig.js";
import Game from "../models/gameModel.js";
// import User from "../models/userModel.js";
import { shuffleArray, updateSeedPositions } from "../utils/utils.js";
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

        game.playersList.forEach((player) => {
          if (!io.sockets.sockets.has(player.socketId)) player.socketId = null;

          if (player.player._id.toString() === playerId)
            player.socketId = socket.id;
        });

        const { playersList, playerNo, arrangeRandomly } = game;

        if (playersList.length === playerNo && arrangeRandomly) {
          game.playersList = shuffleArray(playersList);
          game.arrangeRandomly = undefined;
          game.currentPlayer = 0;
          await game.save();
        }
        const gameData = gameCache.get(gameId);
        socket.join(gameId);
        if (gameData && gameData.count === 1) {
          io.to(gameId).emit("gameUpdate", {
            ...game.toObject(),
            count: gameData.count,
            dieOutcome: gameData.dieOutcome,
          });
          return;
        }
        io.to(gameId).emit("gameUpdate", game);
      } catch (error) {
        console.error("1. Error in joinRoom:", error);
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
    socket.on("nextPlayer", async (info) => {
      try {
        const { gameId, playerSeedsArray, opponentSeedsArray } = info;
        const game = await Game.findById(gameId).populate(
          "playersList.player",
          "username image"
        );

        const { playersList, playerNo, currentPlayer, seedPositions } = game;
        const gameData = gameCache.get(gameId);
        let seedValues = playersList[game.currentPlayer].seedColor.flatMap(
          (color) => [1, 2, 3, 4].map((num) => `${color}_${num}`) // Default to 0 if undefined
        );
        let outSeedsArray = seedValues.filter(
          (pos) => seedPositions[pos] === 57
        );
        if (
          outSeedsArray.length === 16 / playerNo &&
          !game.rankings.includes(playerId)
        )
          game.rankings.push(playerId);

        const remainingPlayers = game.playersList.filter(
          (p) => !game.rankings.includes(p.player._id.toString())
        );

        if (remainingPlayers.length === 1) {
          game.rankings.push(remainingPlayers[0].player._id);
          game.completed = true;
          await game.save();

          io.to(gameId).emit("gameEnd", {
            message: "Game Over!",
            rankings: game.rankings,
          });

          return;
        }

        if (!gameData?.dieOutcome.every((die) => die === 6)) {
          game.currentPlayer = (currentPlayer + 1) % playerNo;
        }
        do {
          game.currentPlayer =
            (game.currentPlayer + 1) % game.playersList.length;
        } while (
          game.rankings.includes(
            game.playersList[game.currentPlayer].player._id.toString()
          )
        );

        if (playerSeedsArray?.length)
          updateSeedPositions(game, playerSeedsArray, 57);

        if (opponentSeedsArray?.length)
          updateSeedPositions(game, opponentSeedsArray, 0);

        await game.save();

        io.to(gameId).emit("gameUpdate", game);
      } catch (error) {
        console.log(error);
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

        const game = await Game.findById(gameId).populate(
          "playersList.player",
          "username image"
        );

        if (!game) {
          console.error("❌ Game not found for gameId:", gameId);
          return;
        }

        const { seedPositions } = game;

        // Modify game data directly
        if (gameMoves === "newSeedOut") {
          game.seedPositions[seed] = 1;
        } else if (gameMoves !== "checkNextSeed") {
          game.seedPositions[seed] = (seedPositions[seed] || 0) + die;
        }

        // Mark seedPositions as modified before saving
        game.markModified("seedPositions");

        await game.save(); // ✅ Save only once after modification

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
