import mongoose from "mongoose";

const ruleSetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    blockApps: { type: [String], default: [] },
    blockDomains: { type: [String], default: [] },
    blockIps: { type: [String], default: [] },
    blockProtocols: { type: [String], default: [] }
  },
  { timestamps: true }
);

export const RuleSet = mongoose.model("RuleSet", ruleSetSchema);
