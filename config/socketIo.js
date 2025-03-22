import { Server } from "socket.io";

export function setupSocket(server) {
  const io = new Server(server);

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
  });

  return io;
}
