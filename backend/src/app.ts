import express from "express";
import cors from "cors";
import chatRouter from "./features/chats/chat.routes";
import dashboardRouter from "./features/dashboard/dashboard.routes";
import { errorHandler } from "./utils/error-handler";
import ApiError from "./utils/api-error";

// Import telemetry listener to register background event subscriber
import "./services/llm/telemetry-listener";

const app = express();

app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Mount routes
app.use("/api/chats", chatRouter);
app.use("/api/dashboard", dashboardRouter);

// Sample health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Backend server is running smoothly",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Backend server is running smoothly",
    timestamp: new Date().toISOString(),
  });
});

// Wildcard handler for undefined routes (404)
app.use((req, res, next) => {
  next(new ApiError(404, `Route ${req.originalUrl} not found`));
});

// Register global error handler middleware (must be registered last)
app.use(errorHandler);

export default app;
