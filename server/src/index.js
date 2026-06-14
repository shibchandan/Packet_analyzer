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
import { authRouter } from "./routes/auth.js";
import { auditRouter } from "./routes/audit.js";
import { authenticate } from "./middleware/auth.js";

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
  app.use("/api/auth", authRouter);
  
  // Protected Routes
  app.use("/api/jobs", authenticate, jobsRouter);
  app.use("/api/rules", authenticate, rulesRouter);
  app.use("/api/rule-sets", authenticate, ruleSetsRouter);
  app.use("/api/analytics", authenticate, analyticsRouter);
  app.use("/api/audit", authenticate, auditRouter);

  app.listen(config.port, () => {
    console.log(`DPI dashboard server listening on http://localhost:${config.port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
