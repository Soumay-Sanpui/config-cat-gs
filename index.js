import {configDotenv} from "dotenv";

import express from "express";
import cors from "cors";

import httpLogger from "./src/middleware/rLogger.js"
import logger from "./src/utils/logger.js";

configDotenv()

const PORT = process.env.PORT;

const app = express();

app.use(cors({origin: "*",}));
app.use(express.json());
app.use(httpLogger);

app.get("/health", async (req, res) => {
  req.log.info("Health Enpoint Called.");
  res.status(200).json({
    ok: true,
  });
});

app.listen(PORT, () => {
  logger.info(`Server Live: http://localhost:${PORT}`);
});