import "dotenv/config";
import express from "express";
import cors from "cors";

import { config } from "./config.js";
import { connectDb } from "./db.js";
import { ensureDirs } from "./utils/ensureDirs.js";
import { healthRouter } from "./routes/health.js";
import { jobsRouter } from "./routes/jobs.js";
import { rulesRouter } from "./routes/rules.js";
import { ruleSetsRouter } from "./routes/ruleSets.js";
import { analyticsRouter } from "./routes/analytics.js";

async function start() {
  ensureDirs();
  await connectDb();

  const app = express();
  app.use(
    cors({
      origin: config.clientUrl,
      credentials: true
    })
  );
  app.use(express.json());

  app.use("/api/health", healthRouter);
  app.use("/api/jobs", jobsRouter);
  app.use("/api/rules", rulesRouter);
  app.use("/api/rule-sets", ruleSetsRouter);
  app.use("/api/analytics", analyticsRouter);

  app.listen(config.port, () => {
    console.log(`DPI dashboard server listening on http://localhost:${config.port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
