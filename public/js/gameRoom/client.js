const socket = io();
const gameId = window.location.pathname.split("/").pop();
let gameObj = null;
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

const buttonDiv = document.querySelector(".buttons");
const gameInfoPara = document.querySelector(".game-info");
const playersInfo = document.querySelectorAll(".player-info");
const redLastBox = document.querySelector(
  `.square_${ludoSections[1].finishing[6]}`
);
console.log({ playersInfo });

gameId && socket.emit("joinRoom", gameId);

socket.on("connect", () => {
  console.log(socket.id);
  console.log("Client connected");
});

socket.on("gameUpdate", (game) => {
  gameObj = game;
  const rollDieButton = document.querySelector(".roll-die-button");
  rollDieButton && rollDieButton.remove();

  updateGame();

  game.count ? decisionFilter(game.count, game.dieOutcome) : renderGame();
});
socket.on("dieOutcome", (dieOutcome) => {
  rollDice(dieOutcome);
});

function getSeedRealPosition(seed, relativePosition) {
  const color = seed.split("_")[0]; // Extract color (e.g., "red" from "red_1")
  const seedIndex = parseInt(seed.split("_")[1]) - 1; // Convert "red_1" → 0 index
  const section = ludoSections.find((sec) => sec.color === color);
  if (!section) return null;

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
  return runWay[relativePosition - 1] || section.startings[seedIndex];
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
}
function playGame() {
  const rollDieButton = document.querySelector(".roll-die-button");
  rollDieButton && rollDieButton.remove();
  socket.emit("rollDie", gameId);
}

function rollDice(dieOutcome) {
  const dice1 = document.getElementById("dice-1");
  const dice2 = document.getElementById("dice-2");
  let count = 0;
  dice1.classList.add("rolling");
  dice2.classList.add("rolling");
  let rolls = 10;
  let counter = 0;
  let interval = setInterval(() => {
    dice1.innerHTML = getDiceFace(Math.floor(Math.random() * 6 + 1));
    dice2.innerHTML = getDiceFace(Math.floor(Math.random() * 6 + 1));
    counter++;

    if (counter >= rolls) {
      clearInterval(interval);
      dice1.innerHTML = getDiceFace(dieOutcome[0]);
      dice2.innerHTML = getDiceFace(dieOutcome[1]);
      dice1.classList.remove("rolling");
      dice2.classList.remove("rolling");

      decisionFilter(count, dieOutcome);
    }
  }, 100);
}

function getDiceFace(value) {
  return dieFaceArr[value - 1];
}

function renderGame() {
  const { seedPositions, playersList, currentPlayer, playerNo } = gameObj;
  if (playerNo !== playersList.length) {
    gameInfoPara.textContent = "Players not completed";
    return;
  }
  if (!playersList.every((player) => player.socketId)) {
    const disconnectedPlayer = playersList.find((player) => !player.socketId);
    gameInfoPara.textContent = `${disconnectedPlayer?.player?.username} has disconnected`;
    return;
  }
  gameInfoPara.textContent = "";
  const isCurrentPlayer = playersList[currentPlayer]?.socketId === socket.id;
  if (isCurrentPlayer) {
    const playerButton = document.createElement("button");
    playerButton.textContent = "Click to roll-die";
    playerButton.classList.add("button", "roll-die-button");
    buttonDiv.append(playerButton);
    playerButton.addEventListener("click", playGame);
  }

  console.log({ gameIsPaused: false, msg: "Players complete in room" });
}

function decisionFilter(count, dieOutcome) {
  console.log({ count, dieOutcome });
  const lowNumDie = Math.min(...dieOutcome);
  const highNumDie = Math.max(...dieOutcome);
  const { playersList, seedPositions, currentPlayer } = gameObj;
  if (playersList[currentPlayer]?.socketId !== socket.id)
    return (gameInfoPara.textContent = `${playersList[currentPlayer].player.username} is playing.`);

  const player = playersList.find((player) => player.socketId === socket.id);
  if (count > 1) return nextPlayer();
  let die = count === 0 ? highNumDie : lowNumDie;
  console.log(die);
  // Flatten all seed positions into an array
  const seedValues = player.seedColor.flatMap(
    (color) => [1, 2, 3, 4].map((num) => `${color}_${num}`) // Default to 0 if undefined
  );

  // Separate `inSeedArray` and `outSeedArray`
  const inSeedsArray = seedValues.filter((pos) => seedPositions[pos] === 0);
  const movableSeedsArray = seedValues.filter(
    (pos) => seedPositions[pos] !== 0 && seedPositions[pos] + die <= 57
  );
  const outSeedsArray = seedValues.filter(
    (pos) => seedPositions[pos] !== 0 && seedPositions[pos] === 57
  );

  const sCategories = { inSeedsArray, outSeedsArray, movableSeedsArray };

  console.log({ sCategories, die, dieOutcome });

  if (die === 6) {
    inSeedsArray.length && movableSeedsArray.length
      ? makeChoices(inSeedsArray, movableSeedsArray)
      : inSeedsArray.length
      ? newSeedOut(inSeedsArray)
      : movableSeedsArray.length
      ? moveSeeds(movableSeedsArray, die)
      : count < 1
      ? checkNextSeed(die)
      : nextPlayer();
  } else {
    movableSeedsArray.length
      ? moveSeeds(movableSeedsArray, die)
      : count < 1
      ? checkNextSeed(die)
      : nextPlayer();
  }
}

function checkNextSeed(die) {
  socket.emit("gameMoves", {
    gameId,
    gameMoves: "checkNextSeed",
    seed: null,
    die,
  });
}

function nextPlayer() {
  const ludoBoxes = document.querySelectorAll(".ludo-box");
  const currentPlayerSeedColors =
    gameObj.playersList[gameObj.currentPlayer].seedColor;

  let playerSeedsArray = [];
  let opponentSeedsArray = [];

  Array.from(ludoBoxes) // Convert NodeList to array
    .filter((box) => box.children.length > 1) // Keep boxes with multiple children
    .map((box) => {
      const seeds = Array.from(box.children).map((child) => child.classList[1]); // Extract seed class names

      // Separate player and opponent seeds
      const playerSeeds = seeds.filter((seed) =>
        currentPlayerSeedColors.some((color) => seed.startsWith(color))
      );
      const opponentSeeds = seeds.filter(
        (seed) =>
          !currentPlayerSeedColors.some((color) => seed.startsWith(color))
      );

      // If the box contains both player and opponent seeds, return the separated lists
      if (playerSeeds.length > 0 && opponentSeeds.length > 0) {
        playerSeedsArray.push(playerSeeds[0]); // Take first player seed
        opponentSeedsArray.push(opponentSeeds[0]); // Take first opponent seed
        return seeds;
      }
      return null;
    })
    .filter((box) => box !== null); // Remove `null` values

  socket.emit("nextPlayer", { gameId, playerSeedsArray, opponentSeedsArray });
}

function newSeedOut(inSeedsArray) {
  if (new Set(inSeedsArray.map((seed) => seed.split("_")[0])) === 1) {
    socket.emit("gameMoves", {
      gameId,
      gameMoves: "newSeedOut",
      seed: inSeedsArray[0],
      die: 6,
    });
    return;
  }
  gameInfoPara.textContent = "Click on the seed you want out.";

  inSeedsArray.forEach((seed) => {
    const seedElement = document.querySelector(`.${seed}`); // Select the seed element

    if (seedElement) {
      seedElement.addEventListener("click", () => {
        const color = seed.split("_")[0]; // Extracts color (e.g., "red" from "red_1")
        console.log(`You selected ${seed} from ${color} house`);
        socket.emit("gameMoves", {
          gameId,
          gameMoves: "newSeedOut",
          seed,
          die: 6,
        });
      });
    }
  });
}
function moveSeeds(movableSeedsArray, die) {
  if (movableSeedsArray.length === 1) {
    socket.emit("gameMoves", {
      gameId,
      gameMoves: "moveSeeds",
      seed: movableSeedsArray[0],
      die,
    });
    return;
  }
  gameInfoPara.textContent = "Click on the seed you want to move.";
  movableSeedsArray.forEach((seed) => {
    const seedElement = document.querySelector(`.${seed}`); // Select the seed element

    if (seedElement) {
      seedElement.addEventListener("click", () => {
        const color = seed.split("_")[0]; // Extracts color (e.g., "red" from "red_1")
        console.log(`You selected ${seed} from ${color} house`);
        socket.emit("gameMoves", {
          gameId,
          gameMoves: "moveSeeds",
          seed,
          die,
        });
      });
    }
  });
}
function makeChoices(inSeedsArray, movableSeedsArray) {
  gameInfoPara.textContent = "Click on the seed.";
  inSeedsArray.forEach((seed) => {
    const seedElement = document.querySelector(`.${seed}`); // Select the seed element
    if (seedElement) {
      seedElement.addEventListener("click", () => {
        const color = seed.split("_")[0]; // Extracts color (e.g., "red" from "red_1")
        console.log(`You selected ${seed} from ${color} house`);
        socket.emit("gameMoves", {
          gameId,
          gameMoves: "newSeedOut",
          seed,
          die: 6,
        });
      });
    }
  });
  movableSeedsArray.forEach((seed) => {
    const seedElement = document.querySelector(`.${seed}`); // Select the seed element

    if (seedElement) {
      seedElement.addEventListener("click", () => {
        const color = seed.split("_")[0]; // Extracts color (e.g., "red" from "red_1")
        console.log(`You selected ${seed} from ${color} house`);
        socket.emit("gameMoves", {
          gameId,
          gameMoves: "moveSeeds",
          seed,
          die: 6,
        });
      });
    }
  });
}

function updateGame() {
  playersInfo.forEach((div) => (div.innerHTML = ""));
  const { seedPositions, playersList } = gameObj;
  playersList.forEach((player, index) => {
    const assignedDiv = playersInfo[index % playersInfo.length]; // Distribute evenly
    assignedDiv.innerHTML += `
    <div class="player-block group">
        <div class="flex items-center">
            <img class="avatar" src="${player.player.image}" alt="${
      player.player.username
    }" referrerpolicy="no-referrer">
            <div class="ms-3">
                <h3 class="username">${player.player.username}</h3>
                <div class="flex items-center justify-between border-black border-solid-4 w-full">
                    ${player.seedColor
                      .map(
                        (color) => `
                            <div class="flex ${color}-out">
                                ${[1, 2, 3, 4]
                                  .map(
                                    () => `
                                      <div class="out-seed"></div>
                                    `
                                  )
                                  .join("")}
                            </div>
                        `
                      )
                      .join("")}
                </div>
            </div>
        </div>
    </div>
  `;
  });
  updateSeedPositions(seedPositions);
  const lastBoxes = {};
  const lastBoxChildren = {};

  // Get last finishing boxes and their children
  ludoSections.forEach(({ color, finishing }) => {
    const lastBoxNumber = finishing.at(-1); // Get last finishing box
    const lastBoxElement = document.querySelector(`.square_${lastBoxNumber}`);

    if (lastBoxElement) {
      lastBoxes[color] = lastBoxElement;
      lastBoxChildren[color] = Array.from(lastBoxElement.children).map(
        (child) => child.classList[1].split("-")[0]
      );
    }
  });

  // Process and update out-seed containers
  Object.entries(lastBoxChildren).forEach(([color, seeds]) => {
    const lastBox = lastBoxes[color];

    if (!lastBox) return;

    // Clear all children from last box
    lastBox.innerHTML = "";

    // Get the corresponding out-seed container
    const outSeedContainer = document.querySelector(`.flex.${color}-out`);
    if (!outSeedContainer) return;

    const outSeedDivs = outSeedContainer.querySelectorAll(".out-seed");

    // Remove any existing color classes
    outSeedDivs.forEach((seedDiv) => {
      seedDiv.classList.remove("red", "blue", "green", "yellow"); // Ensure all possible colors are removed
    });

    // Add the correct color class to the necessary number of divs
    seeds.forEach((_, index) => {
      if (outSeedDivs[index]) {
        outSeedDivs[index].classList.add(color);
      }
    });
  });
}
