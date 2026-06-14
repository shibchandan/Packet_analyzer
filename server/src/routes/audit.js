import { Router } from "express";
import { AuditLog } from "../models/AuditLog.js";
import { requireAdmin } from "../middleware/auth.js";

export const auditRouter = Router();

auditRouter.get("/", requireAdmin, async (req, res) => {
  const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100).lean();
  res.json({ logs });
});
