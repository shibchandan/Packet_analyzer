import fs from "fs";
import { Router } from "express";
import { Job } from "../models/Job.js";

export const analyticsRouter = Router();

analyticsRouter.get("/aggregate", async (_req, res) => {
  const jobs = await Job.find({ status: { $in: ["completed", "running"] } }).lean();
  
  const aggregate = {
    totalPackets: 0,
    totalDropped: 0,
    totalForwarded: 0,
    domains: {},
    blockedReasons: {},
    dnsQueries: {},
    topApps: {}
  };

  for (const job of jobs) {
    if (job.summary) {
      aggregate.totalPackets += job.summary.totalPackets || 0;
      aggregate.totalDropped += job.summary.droppedPackets || 0;
      aggregate.totalForwarded += job.summary.forwardedPackets || 0;
    }

    if (job.reportPath && fs.existsSync(job.reportPath)) {
      try {
        const report = JSON.parse(fs.readFileSync(job.reportPath, "utf8"));
        
        // Aggregate Domains
        if (report.domains) {
          report.domains.forEach(d => {
            aggregate.domains[d.domain] = (aggregate.domains[d.domain] || 0) + (d.count || 1);
            if (d.app) {
              aggregate.topApps[d.app] = (aggregate.topApps[d.app] || 0) + (d.count || 1);
            }
          });
        }

        // Aggregate Blocked Reasons
        if (report.blockedReasons) {
          report.blockedReasons.forEach(r => {
            aggregate.blockedReasons[r.reason] = (aggregate.blockedReasons[r.reason] || 0) + r.count;
          });
        }

        // Aggregate DNS
        if (report.traffic && report.traffic.dnsQueries) {
          report.traffic.dnsQueries.forEach(q => {
            aggregate.dnsQueries[q.domain] = (aggregate.dnsQueries[q.domain] || 0) + q.count;
          });
        }
      } catch (err) {
        // Ignore JSON parse errors for incomplete files
      }
    }
  }

  // Format objects to sorted arrays
  const formatTop = (obj, limit = 10) => Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));

  res.json({
    summary: {
      totalPackets: aggregate.totalPackets,
      totalDropped: aggregate.totalDropped,
      totalForwarded: aggregate.totalForwarded
    },
    topDomains: formatTop(aggregate.domains, 10),
    topBlockedReasons: formatTop(aggregate.blockedReasons, 10),
    topDnsQueries: formatTop(aggregate.dnsQueries, 10),
    topApps: formatTop(aggregate.topApps, 10)
  });
});
