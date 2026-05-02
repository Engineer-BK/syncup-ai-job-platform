import express from "express";
import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import http from "http";

import { initDB } from "./config/db";
import { connectQueue } from "./services/queue";
import { initSockets } from "./sockets";
import { startWorker } from "./queues/worker";

import authRoutes from "./routes/authRoutes";
import jobRoutes from "./routes/jobRoutes";
import applicationRoutes from "./routes/applicationRoutes";

const app = express();
const server = http.createServer(app);

// Initialize DB, Queue, Sockets, Worker
const initializeServices = async () => {
 // Initialize PostgreSQL
initDB();
  await connectQueue();
  initSockets(server);
  startWorker();
};
initializeServices();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);

// Error Handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
