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

export { demoBody, getSeedColor };
