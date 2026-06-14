import { Router } from "express";

import { Rule } from "../models/Rule.js";
import { AuditLog } from "../models/AuditLog.js";
import { requireAdmin } from "../middleware/auth.js";

export const rulesRouter = Router();

rulesRouter.get("/", async (_req, res) => {
  const rules = await Rule.find().sort({ createdAt: -1 }).lean();
  res.json({ rules });
});

rulesRouter.post("/", requireAdmin, async (req, res) => {
  try {
    const rule = await Rule.create(req.body);
    
    await AuditLog.create({
      user: req.user.id,
      username: req.user.username,
      action: "CREATE_RULE",
      target: rule.target,
      details: `Created rule: ${rule.action} on ${rule.type}`
    });

    res.status(201).json({ rule });
  } catch (error) {
    res.status(400).json({ error: "Failed to create rule" });
  }
});

rulesRouter.delete("/:id", requireAdmin, async (req, res) => {
  const rule = await Rule.findByIdAndDelete(req.params.id);
  
  if (rule) {
    await AuditLog.create({
      user: req.user.id,
      username: req.user.username,
      action: "DELETE_RULE",
      target: rule.target,
      details: `Deleted rule: ${rule.action} on ${rule.type}`
    });
  }
  
  res.json({ ok: true });
});
