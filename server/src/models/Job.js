import mongoose from "mongoose";


const summarySchema = new mongoose.Schema(
  {
    totalPackets: Number,
    forwardedPackets: Number,
    droppedPackets: Number,
    tcpPackets: Number,
    udpPackets: Number
  },
  { _id: false }
);

const jobSchema = new mongoose.Schema(
  {
    inputName: { type: String, required: true },
    inputPath: { type: String, required: true },
    outputName: { type: String, required: true },
    outputPath: { type: String, required: true },
    reportPath: { type: String, required: true },
    logPath: { type: String, required: true },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed"],
      default: "queued"
    },
    liveMode: { type: Boolean, default: false },
    blockApps: { type: [String], default: [] },
    blockDomains: { type: [String], default: [] },
    blockIps: { type: [String], default: [] },
    blockProtocols: { type: [String], default: [] },
    loadBalancers: { type: Number, default: 2 },
    fpsPerLb: { type: Number, default: 2 },
    stdout: { type: String, default: "" },
    stderr: { type: String, default: "" },
    exitCode: Number,
    summary: {
      type: summarySchema,
      default: () => ({})
    }
  },
  { timestamps: true }
);


export const Job = mongoose.model("Job", jobSchema);
