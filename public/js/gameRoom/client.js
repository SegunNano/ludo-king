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
const gameInfo = document.querySelector(".game-info");
gameId && socket.emit("joinRoom", gameId);

socket.on("connect", () => {
  console.log(socket.id);
  console.log("Client connected");
});

socket.on("gameUpdate", (game) => {
  gameObj = game;
  const rollDieButton = document.querySelector(".roll-die-button");
  rollDieButton && rollDieButton.remove();

  updateGame(game);
  console.log(game);
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
  const lowNumDie = Math.min(...dieOutcome);
  const highNumDie = Math.max(...dieOutcome);
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

      decisionFilter(count, lowNumDie, highNumDie);
    }
  }, 100);
}

function getDiceFace(value) {
  return dieFaceArr[value - 1];
}

function updateGame(game) {
  const { seedPositions, playersList, currentPlayer, playerNo } = game;
  updateSeedPositions(seedPositions);
  const gameInfoPara = document.querySelector(".game-info");
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

  // console.log({ gameIsPaused: false, msg: "Players complete in room" });
}

function decisionFilter(count, lowNumDie, highNumDie) {
  const { playersList, seedPositions, currentPlayer } = gameObj;

  if (playersList[currentPlayer]?.socketId !== socket.id) {
    const gameInfoPara = document.querySelector(".game-info");
    gameInfoPara.textContent = `${playersList[currentPlayer].player.username} is playing.`;
    return;
  }
  const player = playersList.find((player) => player.socketId === socket.id);
  console.log({ count });
  if (count > 1) return socket.emit("nextPlayer", gameId);
  let die = count === 0 ? highNumDie : lowNumDie;

  // Flatten all seed positions into an array
  const seedValues = player.seedColor.flatMap(
    (color) => [1, 2, 3, 4].map((num) => `${color}_${num}`) // Default to 0 if undefined
  );

  // Separate `inSeedArray` and `outSeedArray`
  const inSeedsArray = seedValues.filter((pos) => seedPositions[pos] === 0);
  const movableSeedsArray = seedValues.filter(
    (pos) => seedPositions[pos] !== 0 && seedPositions[pos] < 57
  );
  const outSeedsArray = seedValues.filter(
    (pos) => seedPositions[pos] !== 0 && seedPositions[pos] === 58
  );

  const sCategories = { inSeedsArray, outSeedsArray, movableSeedsArray };

  console.log(sCategories);

  if (die === 6) {
    inSeedsArray.length && outSeedsArray.length
      ? makeChoices(player, count, lowNumDie, highNumDie, die)
      : inSeedsArray.length
      ? newSeedOut(player, count, lowNumDie, highNumDie)
      : outSeedsArray.length
      ? moveSeeds(player, count, lowNumDie, highNumDie, die)
      : socket.emit("nextPlayer", gameId);
  } else {
    outSeedsArray.length
      ? moveSeeds(player, count, lowNumDie, highNumDie, die)
      : socket.emit("nextPlayer", gameId);
  }
}

function newSeedOut(count, lowNumDie, highNumDie) {
  if (player.colorInfo.length > 1) {
    if (
      player.colorInfo[0].seedRelativePosition.some((p) => p === 0) &&
      player.colorInfo[1].seedRelativePosition.some((p) => p === 0)
    ) {
      inputDiv = document.createElement("div");
      inputDiv.classList.add("input_div", "select", "is-rounded", "is-normal");
      selectOption = `<select name="" id=""><option>Select an Option</option>`;
      for (c of player.colorInfo) {
        selectOption += `<option value="${c.color}">${c.color}</option>`;
      }
      selectOption += ` </select >`;
      inputDiv.innerHTML = selectOption;
      selectDiv.append(inputDiv);
      inputDiv.addEventListener(
        "input",
        function () {
          inputDiv.remove();
          for (c of player.colorInfo) {
            if (c.color === this.children[0].value) {
              seedIdx = c.seedRelativePosition.indexOf(0);
              document.querySelector(`.${c.color}_${seedIdx + 1}`).remove();
              c.seedRelativePosition[seedIdx] = 1;
              newLudoSeed = document.createElement("div");
              newLudoSeed.classList.add(
                `${c.color}`,
                `${c.color}_${seedIdx + 1}`,
                `${player.player}`
              );
              document
                .querySelector(
                  `.square_${c.runPathWay().seedsRealPosition[seedIdx]}`
                )
                .append(newLudoSeed);
            }
          }
          count += 1;
          decisionFilter(player, count, lowNumDie, highNumDie);
        },
        { once: true }
      );
    } else {
      if (player.colorInfo[0].seedRelativePosition.some((p) => p === 0)) {
        c = player.colorInfo[0];
      } else {
        c = player.colorInfo[1];
      }
      seedIdx = c.seedRelativePosition.indexOf(0);
      document.querySelector(`.${c.color}_${seedIdx + 1}`).remove();
      c.seedRelativePosition[seedIdx] = 1;
      newLudoSeed = document.createElement("div");
      newLudoSeed.classList.add(
        `${c.color}`,
        `${c.color}_${seedIdx + 1}`,
        `${player.player}`
      );
      document
        .querySelector(`.square_${c.runPathWay().seedsRealPosition[seedIdx]}`)
        .append(newLudoSeed);
      count += 1;
      decisionFilter(player, count, lowNumDie, highNumDie);
    }
  } else {
    c = player.colorInfo[0];
    seedIdx = c.seedRelativePosition.indexOf(0);
    document.querySelector(`.${c.color}_${seedIdx + 1}`).remove();
    c.seedRelativePosition[seedIdx] = 1;
    newLudoSeed = document.createElement("div");
    newLudoSeed.classList.add(
      `${c.color}`,
      `${c.color}_${seedIdx + 1}`,
      `${player.player}`
    );
    document
      .querySelector(`.square_${c.runPathWay().seedsRealPosition[seedIdx]}`)
      .append(newLudoSeed);
    count += 1;
    decisionFilter(player, count, lowNumDie, highNumDie);
  }
}
function moveSeeds(player, count, lowNumDie, highNumDie, die) {
  if (count > 1) return decisionFilter(player, count, lowNumDie, highNumDie);
  playerOutSeedArray = document.querySelectorAll(`.${player.player}`);
  seedRelativePositionArray = [];
  for (let i = 0; i < playerOutSeedArray.length; i++) {
    seedRelativePositionArray = [
      ...seedRelativePositionArray,
      [
        playerOutSeedArray[i].classList[0],
        parseInt(playerOutSeedArray[i].classList[1].slice(-1)),
        playerOutSeedArray[i].parentElement,
        ludoBoxes[playerOutSeedArray[i].classList[0]].seedRelativePosition[
          parseInt(playerOutSeedArray[i].classList[1].slice(-1)) - 1
        ],
      ],
    ];
  }
  movebleSeedArray = seedRelativePositionArray.filter((p) => p[3] + die < 58);
  if (movebleSeedArray.length) {
    for (let i = 0; i < movebleSeedArray.length; i++) {
      document
        .querySelector(`.${movebleSeedArray[i][0]}_${movebleSeedArray[i][1]}`)
        .addEventListener(
          "click",
          () => {
            p = movebleSeedArray[i];
            ludoBoxes[p[0]].seedRelativePosition[p[1] - 1] += die;
            for (let j = 0; j < movebleSeedArray.length; j++) {
              document
                .querySelector(
                  `.${movebleSeedArray[j][0]}_${movebleSeedArray[j][1]}`
                )
                .remove();
              newLudoSeed = document.createElement("div");
              newLudoSeed.classList.add(
                `${movebleSeedArray[j][0]}`,
                `${movebleSeedArray[j][0]}_${movebleSeedArray[j][1]}`,
                `${player.player}`
              );
              if (
                p[0] === movebleSeedArray[j][0] &&
                p[1] === movebleSeedArray[j][1]
              ) {
                document
                  .querySelector(
                    `.square_${
                      ludoBoxes[p[0]].runPathWay().seedsRealPosition[p[1] - 1]
                    }`
                  )
                  .append(newLudoSeed);
              } else {
                movebleSeedArray[j][2].append(newLudoSeed);
              }
            }
            count += 1;
            decisionFilter(player, count, lowNumDie, highNumDie);
          },
          { once: true }
        );
    }
  } else {
    count += 1;
    decisionFilter(player, count, lowNumDie, highNumDie);
  }
}
function makeChoices(player, count, lowNumDie, highNumDie, die) {
  if (count > 1) return decisionFilter(player, count, lowNumDie, highNumDie);

  inputDiv = document.createElement("div");
  inputDiv.classList.add("input_div", "select", "is-rounded", "is-normal");
  inputDiv.innerHTML = `<select name="" id="">
                            <option>Select an Option</option>
                            <option value="newSeedOut">Bring Out A Seed</option>
                            <option value="moveSeeds">Continue Moving Existing Seed</option>
                          </select>`;
  selectDiv.append(inputDiv);
  inputDiv.addEventListener("input", () => {
    if (this.children[0].value === "newSeedOut") {
      inputDiv.remove();
      newSeedOut(player, count, lowNumDie, highNumDie);
    } else {
      inputDiv.remove();
      moveSeeds(player, count, lowNumDie, highNumDie, die);
    }
  });
}
