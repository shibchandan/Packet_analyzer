import fs from "fs";
import path from "path";
import { spawn } from "child_process";

import { config } from "../config.js";


function parseMetric(stdout, label) {
  const match = stdout.match(new RegExp(`${label}:\\s+(\\d+)`));
  return match ? Number(match[1]) : null;
}

export function parseEngineOutput(stdout) {
  const domains = [];
  let captureDomains = false;

  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "[Detected Domains/SNIs]") {
      captureDomains = true;
      continue;
    }
    if (captureDomains) {
      if (!line) {
        continue;
      }
      if (line.startsWith("- ")) {
        const body = line.slice(2);
        const [domain, app] = body.split("->").map((part) => part?.trim());
        if (domain && app) {
          domains.push({ domain, app });
        }
      } else if (line.startsWith("[")) {
        break;
      }
    }
  }

  return {
    summary: {
      totalPackets: parseMetric(stdout, "Total Packets"),
      forwardedPackets: parseMetric(stdout, "Forwarded"),
      droppedPackets: parseMetric(stdout, "Dropped"),
      tcpPackets: parseMetric(stdout, "TCP Packets"),
      udpPackets: parseMetric(stdout, "UDP Packets")
    },
    domains,
    rawStdout: stdout
  };
}

export function buildEngineCommand(job) {
  const command = [
    config.enginePath,
    job.inputPath,
    job.outputPath,
    "--report-json",
    job.reportPath,
    "--lbs",
    String(job.loadBalancers),
    "--fps",
    String(job.fpsPerLb)
  ];

  job.blockApps.forEach((value) => command.push("--block-app", value));
  job.blockDomains.forEach((value) => command.push("--block-domain", value));
  job.blockIps.forEach((value) => command.push("--block-ip", value));
  (job.blockProtocols || []).forEach((value) => command.push("--block-protocol", value));

  return command;
}

export async function runJob(job) {
  if (!fs.existsSync(config.enginePath)) {
    const stderr = `Engine executable not found at ${config.enginePath}`;
    return {
      exitCode: 127,
      stdout: "",
      stderr,
      report: { summary: {}, domains: [], rawStdout: "" }
    };
  }

  const command = buildEngineCommand(job);
  const [commandPath, ...args] = command;

  return new Promise((resolve) => {
    const child = spawn(commandPath, args, {
      cwd: config.rootDir,
      shell: false
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      const report = fs.existsSync(job.reportPath)
        ? JSON.parse(fs.readFileSync(job.reportPath, "utf8"))
        : parseEngineOutput(stdout);
      fs.writeFileSync(
        job.logPath,
        ["COMMAND:", command.join(" "), "", "STDOUT:", stdout, "", "STDERR:", stderr].join("\n"),
        "utf8"
      );
      if (!fs.existsSync(job.reportPath)) {
        fs.writeFileSync(job.reportPath, JSON.stringify(report, null, 2), "utf8");
      }
      resolve({
        exitCode: code ?? 1,
        stdout,
        stderr,
        report
      });
    });
  });
}

export function buildJobPaths(fileName, outputName) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    uploadPath: path.join(config.uploadsDir, `${id}-${path.basename(fileName)}`),
    outputPath: path.join(config.outputsDir, `${id}-${path.basename(outputName)}`),
    reportPath: path.join(config.reportsDir, `${id}.json`),
    logPath: path.join(config.logsDir, `${id}.log`)
  };
}
