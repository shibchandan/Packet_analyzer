import { Router } from "express";

import { RuleSet } from "../models/RuleSet.js";

export const ruleSetsRouter = Router();

ruleSetsRouter.get("/", async (_req, res) => {
  const ruleSets = await RuleSet.find().sort({ createdAt: -1 }).lean();
  res.json({ ruleSets });
});

ruleSetsRouter.post("/", async (req, res) => {
  const payload = {
    name: req.body.name,
    description: req.body.description || "",
    blockApps: Array.isArray(req.body.blockApps) ? req.body.blockApps : [],
    blockDomains: Array.isArray(req.body.blockDomains) ? req.body.blockDomains : [],
    blockIps: Array.isArray(req.body.blockIps) ? req.body.blockIps : [],
    blockProtocols: Array.isArray(req.body.blockProtocols) ? req.body.blockProtocols : []
  };

  const ruleSet = await RuleSet.create(payload);
  res.status(201).json({ ruleSet });
});

ruleSetsRouter.delete("/:id", async (req, res) => {
  await RuleSet.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});
