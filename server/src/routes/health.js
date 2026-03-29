import { Router } from "express";
import fs from "fs";

import { config } from "../config.js";


export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    status: "ok",
    enginePath: config.enginePath,
    engineExists: fs.existsSync(config.enginePath)
  });
});
