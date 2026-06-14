import dgram from "dgram";
import { Settings } from "../models/Settings.js";
import { RuleSet } from "../models/RuleSet.js";

const client = dgram.createSocket("udp4");

export async function sendSyslog(message, severity = 6) {
  // severity 6 = Informational
  try {
    const config = await Settings.findOne({ singletonKey: "GLOBAL_SETTINGS" });
    if (!config || !config.syslogHost) return;

    // Standard RFC 5424 simplified syslog format
    const facility = 16; // local0
    const pri = (facility * 8) + severity;
    const timestamp = new Date().toISOString();
    const hostname = "dpi-dashboard";
    const appName = "dpi-engine";

    const syslogMsg = `<${pri}>1 ${timestamp} ${hostname} ${appName} - - - ${message}`;
    const buffer = Buffer.from(syslogMsg);

    client.send(buffer, config.syslogPort || 514, config.syslogHost, (err) => {
      if (err) console.error("Syslog send error:", err);
    });
  } catch (err) {
    console.error("Failed to send syslog:", err);
  }
}

export async function sendSlackAlert(message) {
  try {
    const config = await Settings.findOne({ singletonKey: "GLOBAL_SETTINGS" });
    if (!config || !config.slackWebhook) return;

    await fetch(config.slackWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `🚨 *DPI Security Alert*\n${message}` })
    });
  } catch (err) {
    console.error("Failed to send Slack alert:", err);
  }
}

let syncTimeout = null;

export async function syncThreatIntel() {
  try {
    const config = await Settings.findOne({ singletonKey: "GLOBAL_SETTINGS" });
    if (!config || !config.threatIntelUrl) return;

    console.log(`Syncing Threat Intel from ${config.threatIntelUrl}...`);
    const res = await fetch(config.threatIntelUrl);
    if (!res.ok) throw new Error("Failed to fetch threat intel");
    
    const text = await res.text();
    // Parse Firehol style: ignore # comments, extract IPs
    const ips = text.split("\n")
      .map(line => line.trim())
      .filter(line => line && !line.startsWith("#"));

    // Find or create the Threat Intel ruleset
    let rs = await RuleSet.findOne({ name: "Automated Threat Intel" });
    if (!rs) {
      rs = new RuleSet({
        name: "Automated Threat Intel",
        description: "Automatically synced malicious IPs",
        blockIps: []
      });
    }

    // Update the IPs (limit to max 5000 to prevent engine overload if massive feed)
    rs.blockIps = ips.slice(0, 5000);
    await rs.save();
    
    console.log(`Synced ${rs.blockIps.length} malicious IPs into automated rule set.`);
    await sendSyslog(`Threat Intel sync complete. Loaded ${rs.blockIps.length} IPs.`, 5);
    
  } catch (err) {
    console.error("Threat intel sync error:", err);
    await sendSyslog(`Threat Intel sync failed: ${err.message}`, 3);
  }
}

export function startIntegrationWorkers() {
  // Run once immediately, then interval
  void syncThreatIntel();
  
  // Set interval (poll every hour by default)
  const pollIntervalMs = 60 * 60 * 1000;
  setInterval(() => {
    void syncThreatIntel();
  }, pollIntervalMs);
}
