import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
  singletonKey: { type: String, default: "GLOBAL_SETTINGS", unique: true },
  maxLoadBalancers: { type: Number, default: 4 },
  maxFpsPerLb: { type: Number, default: 4 },
  offlineUploadLimitMb: { type: Number, default: 100 }
});

export const Settings = mongoose.model("Settings", settingsSchema);
