import { Server as SocketServer } from "socket.io";
import { Server as HttpServer } from "http";

/**
 * Global Socket.io Server instance variable (Singleton pattern)
 */
let io: SocketServer | null = null;

/**
 * INITIALIZE SOCKET.IO REAL-TIME SERVER
 * 
 * WHY USE WEBSOCKETS?
 * Standard HTTP requests are one-way (Client asks -> Server responds).
 * WebSockets create a 2-way, persistent connection between browser and server.
 * This allows our backend worker to instantly push notification messages to the browser
 * as soon as AI resume matching finishes!
 */
export const initSockets = (server: HttpServer) => {
  io = new SocketServer(server, {
    cors: {
      origin: "*", // Allow web client connections from any domain
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`🔌 New client connected to Socket.io: ${socket.id}`);

    // Allow logged-in candidate to join their own private real-time notification room
    socket.on("join-user-room", (userId: string) => {
      socket.join(`user_${userId}`);
      console.log(`👤 User ${userId} joined private Socket room: user_${userId}`);
    });

    socket.on("disconnect", () => {
      console.log(`❌ Client disconnected from Socket.io: ${socket.id}`);
    });
  });

  return io;
};

/**
 * HELPER: Retrieve the active Socket.io server instance
 * Used by background worker process to broadcast real-time events.
 */
export const getIo = (): SocketServer => {
  if (!io) {
    throw new Error("Socket.io has not been initialized yet!");
  }
  return io;
};
