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
  console.log(newGame);
  res.redirect("/");
};

export { gameRoomForm, createGameRoom };
