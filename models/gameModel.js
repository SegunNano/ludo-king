import mongoose from "mongoose";
const { Schema, model, models } = mongoose;
const required = true;
const seedDefaultPosition = {
  red_1: 0,
  red_2: 0,
  red_3: 0,
  red_4: 0,
  green_1: 0,
  green_2: 0,
  green_3: 0,
  green_4: 0,
  yellow_1: 0,
  yellow_2: 0,
  yellow_3: 0,
  yellow_4: 0,
  blue_1: 0,
  blue_2: 0,
  blue_3: 0,
  blue_4: 0,
};

const gameSchema = new Schema({
  completed: { type: Boolean, default: false },
  seedPositions: { type: Object, required, default: seedDefaultPosition },
  playersList: [
    {
      player: { type: Schema.Types.ObjectId, ref: "User", required },
      seedColor: { type: Array, required },
      socketId: { type: String },
    },
  ],
  playerNo: { type: Number, required },
  playWithAnonymous: { type: Boolean },
  currentPlayer: { type: Number },
  arrangeRandomly: { type: Boolean },
});

const Game = models?.Game || model("Game", gameSchema);

export default Game;
