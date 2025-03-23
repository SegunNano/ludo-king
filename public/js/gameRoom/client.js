const socket = io();
const gameId = window.location.pathname.split("/").pop();

gameId && socket.emit("joinRoom", gameId);

socket.on("connect", () => {
  console.log(socket.id);
  console.log("Client connected");
});

socket.on("gameUpdate", (game) => {
  const { seedPositions, playersList, currentPlayer } = game;
  if (playersList.some(() => playersList[currentPlayer].socketId === socket.id))
    console.log("I am the current player, where is my button so I can play");
  console.log({ seedPositions, playersList, currentPlayer });
});
