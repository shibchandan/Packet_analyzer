import { Router } from "express";
import { Settings } from "../models/Settings.js";
import { AuditLog } from "../models/AuditLog.js";
import { requireAdmin } from "../middleware/auth.js";

export const settingsRouter = Router();

// Retrieve global settings
settingsRouter.get("/", async (req, res) => {
  let config = await Settings.findOne({ singletonKey: "GLOBAL_SETTINGS" });
  if (!config) {
    config = await Settings.create({});
  }
  res.json({ settings: config });
});

// Update global settings
settingsRouter.put("/", requireAdmin, async (req, res) => {
  let config = await Settings.findOne({ singletonKey: "GLOBAL_SETTINGS" });
  if (!config) {
    config = new Settings({});
  }
  
  if (req.body.maxLoadBalancers !== undefined) config.maxLoadBalancers = req.body.maxLoadBalancers;
  if (req.body.maxFpsPerLb !== undefined) config.maxFpsPerLb = req.body.maxFpsPerLb;
  if (req.body.offlineUploadLimitMb !== undefined) config.offlineUploadLimitMb = req.body.offlineUploadLimitMb;
  
  if (req.body.syslogHost !== undefined) config.syslogHost = req.body.syslogHost;
  if (req.body.syslogPort !== undefined) config.syslogPort = req.body.syslogPort;
  if (req.body.slackWebhook !== undefined) config.slackWebhook = req.body.slackWebhook;
  if (req.body.threatIntelUrl !== undefined) config.threatIntelUrl = req.body.threatIntelUrl;
  if (req.body.threatIntelSyncIntervalMinutes !== undefined) config.threatIntelSyncIntervalMinutes = req.body.threatIntelSyncIntervalMinutes;
  
  await config.save();
  
  await AuditLog.create({
    user: req.user.id,
    username: req.user.username,
    action: "UPDATE_SETTINGS",
    target: "GLOBAL_SETTINGS",
    details: "Updated global engine parameters"
  });

  res.json({ settings: config });
});
