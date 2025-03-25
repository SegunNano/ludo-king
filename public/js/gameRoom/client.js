const socket = io();
const gameId = window.location.pathname.split("/").pop();
const dieFaceArr = [
  '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M12 12h.01"/>',
  '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M15 9h.01"/><path d="M9 15h.01"/>',
  '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M16 8h.01"/><path d="M12 12h.01"/><path d="M8 16h.01"/>',
  '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M16 8h.01"/><path d="M8 8h.01"/><path d="M8 16h.01"/><path d="M16 16h.01"/>',
  '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M16 8h.01"/><path d="M8 8h.01"/><path d="M8 16h.01"/><path d="M16 16h.01"/><path d="M12 12h.01"/>',
  '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M16 8h.01"/><path d="M16 12h.01"/><path d="M16 16h.01"/><path d="M8 8h.01"/><path d="M8 12h.01"/><path d="M8 16h.01"/>',
];
const colorList = ["red", "green", "yellow", "blue"];
const ludoSections = [
  {
    color: "red",
    normal: [126, 125, 124, 123, 122, 121, 106, 91, 92, 93, 94, 95, 96],
    finishing: [107, 108, 109, 110, 111, 112],
    startings: [49, 33, 48, 34],
  },
  {
    color: "green",
    normal: [82, 67, 52, 37, 22, 7, 8, 9, 24, 39, 54, 69, 84],
    finishing: [23, 38, 53, 68, 83, 98],
    startings: [57, 43, 42, 58],
  },
  {
    color: "yellow",
    normal: [100, 101, 102, 103, 104, 105, 120, 135, 134, 133, 132, 131, 130],
    finishing: [119, 118, 117, 116, 115, 114],
    startings: [177, 193, 178, 192],
  },
  {
    color: "blue",
    normal: [144, 159, 174, 189, 204, 219, 218, 217, 202, 187, 172, 157, 142],
    finishing: [203, 188, 173, 158, 143, 128],
    startings: [169, 183, 184, 168],
  },
];

function getSeedRealPosition(seed, relativePosition) {
  const color = seed.split("_")[0]; // Extract color (e.g., "red" from "red_1")
  const seedIndex = parseInt(seed.split("_")[1]) - 1; // Convert "red_1" → 0 index

  const section = ludoSections.find((sec) => sec.color === color);
  if (!section) {
    console.warn(`Invalid color: ${color}`);
    return null;
  }

  let runWay = [...section.normal.slice(8)]; // Start from 8th index

  // Add paths from the next three colors (circular order)
  for (
    let i = colorList.indexOf(color) + 1;
    i <= colorList.indexOf(color) + 3;
    i++
  ) {
    let nextColor = colorList[i % 4];
    let nextSection = ludoSections.find((sec) => sec.color === nextColor);
    runWay.push(...nextSection.normal);
  }

  // Add last part of the original color's path and finishing path
  runWay.push(...section.normal.slice(0, 7), ...section.finishing);

  // Get the real board position
  console.log(runWay[relativePosition], section.startings[seedIndex]);
  return runWay[relativePosition - 1] || section.startings[seedIndex];
}

function getRealSeedPositions(seedPositions) {
  let realPositions = {};

  for (const [seed, relativePosition] of Object.entries(seedPositions)) {
    const color = seed.split("_")[0]; // Extract color ("red", "green", etc.)
    const seedIndex = parseInt(seed.split("_")[1]) - 1; // Extract number (1 → 0 index)

    if (!ludoSections[color]) continue; // Skip if color is invalid

    let runWay = [...ludoSections[color].normal.slice(8)]; // Take normal path from index 8

    // Merge pathways from other colors (circular order)
    for (
      let i = colorList.indexOf(color) + 1;
      i <= colorList.indexOf(color) + 3;
      i++
    ) {
      let nextColor = colorList[i % 4]; // Cycle through colors
      runWay = [...runWay, ...ludoSections[nextColor].normal];
    }

    // Append start and finishing paths
    runWay = [
      ...runWay,
      ...ludoSections[color].normal.slice(0, 7),
      ...ludoSections[color].finishing,
    ];

    // Assign correct board position
    realPositions[seed] =
      runWay[relativePosition] || ludoSections[color].startings[seedIndex];
  }

  return realPositions;
}

function updateSeedPositions(seedPositions) {
  const realPositions = Object.fromEntries(
    Object.entries(seedPositions).map(([seed, pos]) => [
      seed,
      getSeedRealPosition(seed, pos),
    ])
  );
  // Remove existing seed elements
  document.querySelectorAll(".ludo-seed").forEach((seed) => seed.remove());

  for (const [seedName, position] of Object.entries(realPositions)) {
    const targetBox = document.querySelector(`.square_${position}`);

    if (targetBox) {
      const seedElement = document.createElement("div");
      seedElement.classList.add("ludo-seed", seedName); // Example: "ludo-seed red_1"
      targetBox.appendChild(seedElement);
    }
  }

  console.log("Seed positions updated:", realPositions);
}

gameId && socket.emit("joinRoom", gameId);

socket.on("connect", () => {
  console.log(socket.id);
  console.log("Client connected");
});

socket.on("gameUpdate", (game) => {
  const { seedPositions, playersList, currentPlayer } = game;
  updateSeedPositions(seedPositions);
  if (playersList.some(() => playersList[currentPlayer].socketId === socket.id))
    console.log("I am the current player, where is my button so I can play");
  console.log({ seedPositions, playersList, currentPlayer });
});
