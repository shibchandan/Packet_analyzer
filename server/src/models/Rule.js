import mongoose from "mongoose";


const ruleSchema = new mongoose.Schema(
  {
    ruleType: {
      type: String,
      enum: ["ip", "app", "domain"],
      required: true
    },
    value: { type: String, required: true },
    enabled: { type: Boolean, default: true }
  },
  { timestamps: true }
);


export const Rule = mongoose.model("Rule", ruleSchema);
