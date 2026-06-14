import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
  singletonKey: { type: String, default: "GLOBAL_SETTINGS", unique: true },
  maxLoadBalancers: { type: Number, default: 4 },
  maxFpsPerLb: { type: Number, default: 4 },
  offlineUploadLimitMb: { type: Number, default: 100 },
  syslogHost: { type: String, default: "" },
  syslogPort: { type: Number, default: 514 },
  slackWebhook: { type: String, default: "" },
  threatIntelUrl: { type: String, default: "https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/firehol_level1.netset" },
  threatIntelSyncIntervalMinutes: { type: Number, default: 60 }
});

export const Settings = mongoose.model("Settings", settingsSchema);
