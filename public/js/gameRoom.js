const socket = io();

socket.on("connect", () => console.log("Client connected"));
