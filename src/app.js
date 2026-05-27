import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { getConfig } from "./config/env.js";
import routes from "./routes/index.js";
import errorHandler from "./shared/middleware/errorHandler.js";
import { ApiError } from "./shared/errors/ApiError.js";
import { rateLimit } from "./shared/middleware/rateLimit.js";
import { securityHeaders } from "./shared/middleware/securityHeaders.js";

const app = express();

const config = getConfig();

// ===== Global middleware =====

if (config.trustProxy) app.set("trust proxy", config.trustProxy);

app.disable("x-powered-by");
app.use(securityHeaders);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(ApiError.forbidden("Origin not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    keyPrefix: "api"
  })
);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

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
