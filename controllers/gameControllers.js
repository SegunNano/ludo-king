import Game from "../models/gameModel.js";
import User from "../models/userModel.js";
import { demoBody, getSeedColor } from "../utils/utils.js";

const gameRoomForm = (req, res) => {
  // res.render('gameRoomForm')
  res.redirect("/game/create-room-post");
};

const createGameRoom = async (req, res) => {
  // const { playerNo, playWithAnonymous, playArrangement } = req.body;
  const { playerNo, playWithAnonymous, playArrangement } = demoBody;
  const arrangeRandomly = playArrangement === "random";
  let playersList = [];

  const seedColor = getSeedColor(playersList, playerNo, arrangeRandomly);
  playersList = [{ player: req.user._id, seedColor }];

  const newGame = new Game({
    playerNo,
    playersList,
    arrangeRandomly,
    playWithAnonymous,
  });
  await newGame.save();
  res.redirect(`/game/${newGame._id}`);
};

const gameRoom = async (req, res) => {
  try {
    const { idx } = req.params;
    const gameRoom = await Game.findById(idx);
    if (!gameRoom) return res.redirect("/game/create-room");
    const { playerNo, playersList, arrangeRandomly } = gameRoom;
    const isPlayer = playersList.some(
      (pl) => pl.player.toString() === req.user._id.toString()
    );
    if (isPlayer) return res.render("game/gameRoom");
    if (playerNo === playersList.length) return res.redirect("/");
    const seedColor = getSeedColor(playersList, playerNo, arrangeRandomly);

    playersList.push({ player: req.user._id, seedColor });

    gameRoom.playersList = playersList;
    await gameRoom.save();

    res.render("game/gameRoom");
  } catch (error) {
    console.log(error);
  }
};
export { gameRoomForm, createGameRoom, gameRoom };
