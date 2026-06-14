import mongoose from "mongoose";

import { sendSyslog } from "../services/integrationService.js";

const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true },
    action: { type: String, required: true },
    target: { type: String, required: true },
    details: { type: String, default: "" }
  },
  { timestamps: true }
);

auditLogSchema.post("save", function(doc) {
  const msg = `AUDIT: [${doc.username}] performed ${doc.action} on ${doc.target} - ${doc.details}`;
  sendSyslog(msg, 6); // 6 = info
});

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
