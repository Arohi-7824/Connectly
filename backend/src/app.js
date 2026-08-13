import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { initSockets } from "./sockets/index.js";
import { setIO } from "./services/socketBus.js";
import { startScheduledMessageWorker } from "./services/scheduledMessageService.js";
import authRoutes from "./routes/auth.routes.js";
import messageRoutes from "./routes/messages.routes.js";
import parentRoutes from "./routes/parent.routes.js";
import contactRoutes from "./routes/contacts.routes.js";
import guardianRoutes from "./routes/guardian.routes.js";
import userRoutes from "./routes/users.routes.js";
import groupRoutes from "./routes/groups.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/parent", parentRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/guardian", guardianRoutes);
app.use("/api/users", userRoutes);
app.use("/api/groups", groupRoutes);

const httpServer = http.createServer(app);
const io = initSockets(httpServer);
setIO(io);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
  startScheduledMessageWorker();
});
