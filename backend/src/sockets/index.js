import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { registerMessageHandlers } from "./messageHandlers.js";

export function initSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN || "*" },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = payload;
      next();
    } catch (err) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.user.id}`);
    // Personal room for direct, user-targeted notifications (contact
    // request accepted, etc.) — separate from conversation rooms, which
    // only exist once two people are already contacts.
    socket.join(`user:${socket.user.id}`);
    registerMessageHandlers(io, socket);

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.user.id}`);
    });
  });

  return io;
}
