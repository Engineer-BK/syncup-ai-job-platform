import express from "express";
import dotenv from "dotenv";
dotenv.config(); // Load environment variables from .env file into process.env

import cors from "cors";
import http from "http";

import { initDB } from "./config/db";
import { connectQueue } from "./services/queue";
import { initSockets } from "./sockets";
import { startWorker } from "./queues/worker";

import authRoutes from "./routes/authRoutes";
import jobRoutes from "./routes/jobRoutes";
import applicationRoutes from "./routes/applicationRoutes";

// 1. Create Express App & Node HTTP Server
const app = express();
const server = http.createServer(app);

/**
 * SERVICE INITIALIZATION SEQUENCE
 * Bootstraps all core infrastructure services in sequence:
 * 1. PostgreSQL Database schema setup
 * 2. RabbitMQ Message Queue connection
 * 3. Socket.io WebSockets real-time server
 * 4. RabbitMQ Background Worker processing loop
 */
const initializeServices = async () => {
  try {
    await initDB();
    await connectQueue();
    initSockets(server);
    startWorker();
    console.log("🚀 All SyncUp backend services initialized successfully!");
  } catch (error) {
    console.error("❌ Service initialization error:", error);
  }
};
initializeServices();

// 2. Global Middleware Setup
app.use(cors()); // Enables Cross-Origin Resource Sharing (allows frontend web app to make API calls)
app.use(express.json()); // Parses incoming JSON request body payloads (`req.body`)
app.use(express.urlencoded({ extended: true })); // Parses URL-encoded data from HTML forms

// 3. API Route Bindings
app.use("/api/auth", authRoutes);          // Authentication endpoints (/register, /login)
app.use("/api/jobs", jobRoutes);            // Job endpoints (/create, /list, /details)
app.use("/api/applications", applicationRoutes); // Application endpoints (/apply, /user, /job)

// 4. Global Error Handling Middleware
// Intercepts unhandled errors across all API routes and returns clean JSON error response
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("🔥 Unhandled Server Error:", err.stack);
  res.status(500).json({ message: err.message || "Internal Server Error" });
});

// 5. Start Server Listening
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🌐 SyncUp Backend Server running on http://localhost:${PORT}`);
});
