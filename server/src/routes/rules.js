import { Router } from "express";

import { Rule } from "../models/Rule.js";


export const rulesRouter = Router();

rulesRouter.get("/", async (_req, res) => {
  const rules = await Rule.find().sort({ createdAt: -1 }).lean();
  res.json({ rules });
});

rulesRouter.post("/", async (req, res) => {
  const rule = await Rule.create(req.body);
  res.status(201).json({ rule });
});

rulesRouter.delete("/:id", async (req, res) => {
  await Rule.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});
