import {configDotenv} from "dotenv";

import express from "express";
import cors from "cors";

import httpLogger from "./src/middleware/rLogger.js"
import logger from "./src/utils/logger.js";
import analyticsRouter from "./src/routes/analytics.route.js";

configDotenv()

const PORT = process.env.PORT || 8080;

const app = express();

app.use(cors({origin: "*",}));
app.use(express.json());
app.use(httpLogger);

app.use("/api/analytics", analyticsRouter);

app.get("/", (req, res) => {
  res.json({
    message: "TechCorp Analytics API",
    testUsers: {
      alice: "?user=alice -> Enterprise, whitelisted for everything",
      bob: "?user=bob -> Premium, gets export_to_pdf",
      carol: "?user=carol -> Free, gets rate limited",
      badguy: "?user=badguy -> Blacklisted from v2 + pdf export",
    },
    endpoints: [
      "GET /api/analytics/query?user=alice",
      "GET /api/analytics/export/pdf?user=bob",
      "GET /api/analytics/flags?user=alice",
    ]
  })
})

app.get("/health", async (req, res) => {
  req.log.info("Health Enpoint Called.");
  res.status(200).json({
    ok: true,
  });
});

app.listen(PORT, () => {
  logger.info(`Server Live: http://localhost:${PORT}`);
});