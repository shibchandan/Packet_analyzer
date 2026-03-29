import fs from "fs";
import path from "path";
import { Router } from "express";
import multer from "multer";

import { Job } from "../models/Job.js";
import { buildJobPaths, runJob } from "../services/engineService.js";


export const jobsRouter = Router();

const upload = multer({ storage: multer.memoryStorage() });

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildOverview(jobs) {
  return {
    totalJobs: jobs.length,
    completedJobs: jobs.filter((job) => job.status === "completed").length,
    totalPackets: jobs.reduce((sum, job) => sum + (job.summary?.totalPackets || 0), 0),
    totalDropped: jobs.reduce((sum, job) => sum + (job.summary?.droppedPackets || 0), 0)
  };
}

async function executeJob(jobId) {
  const job = await Job.findById(jobId);
  if (!job) {
    return;
  }

  job.status = "running";
  await job.save();

  const result = await runJob(job);
  job.status = result.exitCode === 0 ? "completed" : "failed";
  job.stdout = result.stdout;
  job.stderr = result.stderr;
  job.exitCode = result.exitCode;
  job.summary = result.report.summary;
  await job.save();
}

jobsRouter.get("/", async (_req, res) => {
  const jobs = await Job.find().sort({ createdAt: -1 }).lean();
  res.json({
    jobs,
    overview: buildOverview(jobs)
  });
});

jobsRouter.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "PCAP file is required" });
    return;
  }

  const outputName = req.body.outputName || "filtered_output.pcap";
  const paths = buildJobPaths(req.file.originalname, outputName);
  fs.writeFileSync(paths.uploadPath, req.file.buffer);

  const job = await Job.create({
    inputName: req.file.originalname,
    inputPath: paths.uploadPath,
    outputName,
    outputPath: paths.outputPath,
    reportPath: paths.reportPath,
    logPath: paths.logPath,
    status: "queued",
    blockApps: splitCsv(req.body.blockApps),
    blockDomains: splitCsv(req.body.blockDomains),
    blockIps: splitCsv(req.body.blockIps),
    blockProtocols: splitCsv(req.body.blockProtocols),
    loadBalancers: Number(req.body.loadBalancers || 2),
    fpsPerLb: Number(req.body.fpsPerLb || 2)
  });

  void executeJob(job._id.toString());
  res.status(201).json({ job });
});

jobsRouter.get("/:id", async (req, res) => {
  const job = await Job.findById(req.params.id).lean();
  if (!job) {
    res.status(404).json({ message: "Job not found" });
    return;
  }
  res.json({ job });
});

jobsRouter.get("/:id/results", async (req, res) => {
  const job = await Job.findById(req.params.id).lean();
  if (!job) {
    res.status(404).json({ message: "Job not found" });
    return;
  }

  if (fs.existsSync(job.reportPath)) {
    res.sendFile(path.resolve(job.reportPath));
    return;
  }

  res.json({
    summary: job.summary || {},
    domains: [],
    rawStdout: job.stdout || ""
  });
});

jobsRouter.get("/:id/download", async (req, res) => {
  const job = await Job.findById(req.params.id).lean();
  if (!job) {
    res.status(404).json({ message: "Job not found" });
    return;
  }
  if (!fs.existsSync(job.outputPath)) {
    res.status(404).json({ message: "Output file not found" });
    return;
  }
  res.download(job.outputPath, job.outputName);
});
