const demoBody = {
  playerNo: 2,
  playWithAnonymous: false,
  playArrangement: "random",
};

const colors = ["red", "green", "yellow", "blue"];

const getSeedColor = (playersList, playersNo, arrangeRandomly) => {
  const usedColors = new Set(playersList.flatMap((player) => player.seedColor));
  const availableColors = colors.filter((color) => !usedColors.has(color));
  const seedAmt = 4 / playersNo;
  let seedColor = [];

  for (let i = 0; i < seedAmt; i++) {
    const remainingColors = availableColors.filter(
      (color) => !seedColor.includes(color)
    );
    if (remainingColors.length === 0) break;
    seedColor.push(
      arrangeRandomly
        ? remainingColors[Math.floor(Math.random() * remainingColors.length)]
        : remainingColors[0]
    );
  }

  return seedColor;
};

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); // Get a random index
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
  return array;
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

export { demoBody, getSeedColor, shuffleArray, updateSeedPositions };
