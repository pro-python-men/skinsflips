import express from "express";
import cors from "cors";

import { getConfig } from "./config/env.js";
import routes from "./routes/index.js";
import errorHandler from "./shared/middleware/errorHandler.js";

const app = express();

const config = getConfig();

// ===== Global middleware =====

app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));

app.use(express.json());

// ===== Routes =====

app.use("/api", routes);

// ===== 404 =====

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found"
  });
});

// ===== Error handler =====

app.use(errorHandler);

export default app;
