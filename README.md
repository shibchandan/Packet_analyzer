# DPI Engine - Deep Packet Inspection System

A multithreaded C++ DPI engine with a MERN dashboard for offline PCAP analysis, rule-based blocking, and traffic visualization.

## What This Project Does

- Parses packets from `.pcap` captures
- Tracks connections using five-tuple flow state
- Extracts TLS SNI / HTTP host information when available
- Supports blocking by app, domain, IP, and protocol
- Exports JSON reports for dashboard analytics
- Visualizes dropped traffic, DNS activity, top IPs, ports, and protocols
- Lets you save reusable rule-set profiles from the web UI

## Architecture Diagram

```mermaid
flowchart LR
    A[PCAP Upload in React Client] --> B[Express API Server]
    B --> C[MongoDB\nJobs, Rules, Rule Sets]
    B --> D[dpi_engine.exe\nMultithreaded C++ Core]
    D --> E[Filtered Output PCAP]
    D --> F[JSON Report]
    B --> G[Results API]
    G --> H[Dashboard Views\nComparison, DNS, Top IPs, Blocked Reasons]
```

## System Layout

```text
Packet_analyzer/
|-- engine/include/       C++ headers
|-- engine/src/           C++ engine sources
|-- dpi_engine.exe        Built analyzer executable
|-- client/               React + Vite dashboard
|-- server/               Express + Mongo API
|-- docs/screenshots/     README image assets
|-- test_dpi.pcap         Sample capture
|-- CMakeLists.txt        Native build config
`-- README.md             Project overview
```

## Main Workflow

1. Upload a `.pcap` from the React dashboard.
2. The Express server stores the job and launches `dpi_engine.exe`.
3. The C++ engine parses packets, applies rules, and writes:
   - a filtered `.pcap`
   - a JSON report
   - standard log output
4. The dashboard loads the report and renders:
   - packet totals
   - blocked traffic percentage
   - blocked reasons
   - DNS query analytics
   - top IPs, ports, and protocols

## Current Feature Set

### Engine
- Offline PCAP analysis and **Live Interception (WinDivert)**
- Multithreaded load balancer + fast-path processing
- Process sandboxing and compiler-level memory hardening (ASLR, DEP, SSP)
- Flow tracking and classification
- SNI / host extraction
- DNS query analytics
- Blocking by IP, app, domain, and protocol
- JSON report export with traffic analytics

### Dashboard
- Upload and run analysis jobs
- Zero-Trust Authentication and Role-Based Access Control (RBAC)
- Full Audit Logging
- Enterprise Integrations (Threat Intel, SIEM Syslog, Slack Alerts)
- Results comparison view
- Blocked reason breakdown
- DNS query table
- Top source/destination IP analytics
- Top destination ports and protocols
- Saved rule sets
- Clear helper text for rule fields

## Run The Project

### C++ Engine Only

```powershell
cd D:\Packet_analyzer
.\dpi_engine.exe test_dpi.pcap output.pcap --report-json report.json
```

### MERN Dashboard

Server:

```powershell
cd D:\Packet_analyzer\server
npm run dev
```

Client:

```powershell
cd D:\Packet_analyzer\client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Good Demo Scenarios

### ICS Capture Demo
Use the Netresec 4SICS capture and block a known active host such as `192.168.88.61`.

Expected result:
- dropped packets increase
- blocked reason shows `IP: 192.168.88.61`
- comparison view shows blocked percentage

### Protocol Blocking Demo
Use `Block Protocols = DNS` or `ICMP` on an ICS-oriented capture.

Expected result:
- dropped packets increase
- blocked reasons show `PROTOCOL: DNS` or `PROTOCOL: ICMP`
- DNS table reflects blocked query counts

### Consumer App Demo
Use `test_dpi.pcap` and block `YouTube` or `Google`.

Expected result:
- app blocking works when SNI/host extraction identifies the traffic
- blocked reasons show `APP: YouTube` or similar

## Screenshot Gallery

Drop your UI captures into `docs/screenshots/` using the file names below and the README will render them automatically.

### Dashboard Home

![Dashboard Home](docs/screenshots/dashboard-home.png)

### Analyze Job Launcher

![Analyze Job Launcher](docs/screenshots/analyze-job-launcher.png)

### Results Comparison

![Results Comparison](docs/screenshots/results-comparison.png)

### Results DNS Analytics

![Results DNS Analytics](docs/screenshots/results-dns-analytics.png)

### Rules Saved Profiles

![Rules Saved Profiles](docs/screenshots/rules-saved-profiles.png)

## Screenshot Capture Checklist

Recommended screenshots:
1. Dashboard home with service status and recent jobs
2. Analyze page with a saved rule set selected
3. Results page showing traffic comparison and blocked reasons
4. Results page showing DNS analytics and top IPs
5. Rules page showing saved rule sets

Expected file names under `docs/screenshots/`:
- `dashboard-home.png`
- `analyze-job-launcher.png`
- `results-comparison.png`
- `results-dns-analytics.png`
- `rules-saved-profiles.png`

## Security Scope and Limitations

This project demonstrates core DPI and traffic-control concepts well, but it is currently an offline PCAP analysis platform, not a hardened production security appliance.

### What Is Covered

- Packet parsing and flow tracking
- Rule-based filtering by IP, app, domain, and protocol
- TLS SNI / HTTP host visibility when available
- DNS query analytics
- Basic protocol-aware filtering for traffic such as `DNS`, `ICMP`, `MODBUS`, and `S7`
- JSON reporting and dashboard visualization

### Enterprise Security Features Implemented

The following production-grade security features have been successfully implemented:

- **Live Inline Packet Interception**: Real-time traffic monitoring and blocking using WinDivert.
- **Zero-Trust Authentication**: JWT-based session management and Role-Based Access Control (Admin vs Viewer).
- **Process Sandboxing**: The C++ DPI engine execution environment is hardened (ASLR, DEP, Stack Smash Protectors) and strictly isolated from the Node.js process.
- **Malware-Safe Uploads**: Robust file validation, sanitization, and size limits to prevent malicious PCAP execution.
- **Comprehensive Audit Logging**: Immutable logs of all user actions (logins, rule changes, job executions).
- **Automated Threat Intelligence**: Background workers continuously sync and apply thousands of malicious IPs from external blocklists (e.g., Firehol Level 1).
- **SIEM & Real-Time Alerting**: Immediate job status and security event forwarding to Syslog servers and Slack Webhooks.

## Resume-Ready Summary

Built a multithreaded Deep Packet Inspection firewall in C++ capable of offline PCAP analysis and **live kernel-level traffic interception** (WinDivert). Engineered a secure MERN dashboard with Zero-Trust authentication (JWT/RBAC), process sandboxing, automated Threat Intelligence ingestion, and real-time SIEM/Slack alerting to command the engine and visualize traffic analytics.

## Deep Technical Walkthrough

The original long-form explanation for packet flow, SNI extraction, multithreading, and code structure is preserved in [PROJECT_DEEP_DIVE.md](./PROJECT_DEEP_DIVE.md).

