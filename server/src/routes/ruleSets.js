import { Router } from "express";

import { RuleSet } from "../models/RuleSet.js";
import { AuditLog } from "../models/AuditLog.js";
import { requireAdmin } from "../middleware/auth.js";

export const ruleSetsRouter = Router();

ruleSetsRouter.get("/", async (_req, res) => {
  const ruleSets = await RuleSet.find().sort({ createdAt: -1 }).lean();
  res.json({ ruleSets });
});

ruleSetsRouter.post("/", requireAdmin, async (req, res) => {
  const ruleSet = await RuleSet.create(req.body);
  
  await AuditLog.create({
    user: req.user.id,
    username: req.user.username,
    action: "CREATE_RULESET",
    target: ruleSet.name,
    details: `Created rule set: ${ruleSet.name}`
  });

  res.status(201).json({ ruleSet });
});

ruleSetsRouter.delete("/:id", requireAdmin, async (req, res) => {
  const ruleSet = await RuleSet.findByIdAndDelete(req.params.id);
  
  if (ruleSet) {
    await AuditLog.create({
      user: req.user.id,
      username: req.user.username,
      action: "DELETE_RULESET",
      target: ruleSet.name,
      details: `Deleted rule set: ${ruleSet.name}`
    });
  }
  
  res.json({ ok: true });
});
