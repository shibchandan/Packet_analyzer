# Enterprise DPI Firewall - System Documentation

This document serves as the formal engineering documentation for the Enterprise Deep Packet Inspection (DPI) Firewall project. It contains the Product Requirements, Technical Specifications, Database Schema, and System Architecture.

---

## 1. Product Requirements Document (PRD)

### 1.1 Product Vision
To provide a high-performance, locally hosted Deep Packet Inspection firewall capable of intercepting live traffic at the OS kernel level and analyzing offline PCAP files. The system must provide an accessible web-based dashboard for security analysts to configure blocking policies, visualize network threats, and enforce Zero-Trust access control.

### 1.2 Target Audience
- Security Operations Center (SOC) Analysts
- Network Engineers
- Cybersecurity Students & Researchers

### 1.3 Core Features (Epics)
- **Epic 1: Packet Inspection Engine**
  - Parse PCAP and Live Network streams.
  - Track five-tuple TCP/UDP connections (Flow Tracking).
  - Extract Application-layer metadata (TLS SNI, HTTP Host, DNS Domains).
  - Apply allow/deny rules dropping malicious packets.
- **Epic 2: Command Dashboard**
  - MERN-stack web interface for uploading offline PCAPs or starting Live Capture.
  - Form-based rule builder (App, Domain, IP, Protocol).
  - Data visualization for DNS queries, Top IPs, and Traffic drops.
- **Epic 3: Enterprise Security**
  - Role-Based Access Control (RBAC) with JWT (Admin/Viewer).
  - Immutable Audit Logs of all user actions.
  - Automated Threat Intelligence ingestion from external blocklists.
  - SIEM Integration via Syslog and Slack webhooks for real-time alerting.

---

## 2. Technical Requirements Document (TRD)

### 2.1 Technology Stack
- **Core Engine:** C++17
- **Network Driver:** WinDivert 1.4 (Windows Kernel packet interception)
- **Backend API:** Node.js, Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Frontend UI:** React 18, Vite, CSS (Custom styling)

### 2.2 System Performance Requirements
- **Multithreading:** The C++ engine must utilize a Load Balancer thread to distribute incoming packets to multiple Fast-Path worker threads.
- **Memory Safety:** The C++ binary must be compiled with ASLR, DEP, and Stack Smash Protectors.
- **Sandboxing:** The Node.js backend must spawn the C++ engine as an isolated child process without shell access.

### 2.3 API Integration Requirements
- **Syslog:** Backend must fire RFC5424 formatted UDP packets to designated SIEM IP/Port.
- **Slack:** Backend must utilize HTTP POST requests to configured Slack Webhooks containing JSON-formatted security alerts.
- **Threat Intel:** Backend must use `node-cron` or `setInterval` to periodically fetch `.netset` IP lists from GitHub (e.g., Firehol Level 1).

---

## 3. Database Schema

The system relies on MongoDB (NoSQL) to store configurations, job analytics, and security logs.

### 3.1 Job Schema (`jobs` collection)
Stores the metadata and final statistics of an analysis run.
```json
{
  "_id": "ObjectId",
  "inputName": "String (e.g., live_capture or test.pcap)",
  "liveMode": "Boolean",
  "status": "String (queued, running, completed, failed)",
  "blockApps": ["String"],
  "blockDomains": ["String"],
  "blockIps": ["String"],
  "blockProtocols": ["String"],
  "summary": {
    "totalPackets": "Number",
    "droppedPackets": "Number",
    "forwardedPackets": "Number",
    "tcpPackets": "Number",
    "udpPackets": "Number"
  },
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### 3.2 AuditLog Schema (`auditlogs` collection)
Provides an immutable trail for Zero-Trust auditing.
```json
{
  "_id": "ObjectId",
  "user": "String (User ID)",
  "username": "String",
  "action": "String (e.g., RUN_JOB, LOGIN, SETTINGS_UPDATE)",
  "target": "String",
  "details": "String",
  "createdAt": "Date"
}
```

### 3.3 ThreatIntel Schema (`threatintels` collection)
Stores globally synced malicious IPs.
```json
{
  "_id": "ObjectId",
  "ip": "String (e.g., 192.168.1.50)",
  "source": "String (e.g., firehol_level1)",
  "lastSeen": "Date"
}
```

### 3.4 Settings Schema (`settings` collection)
Singleton configuration for Enterprise settings.
```json
{
  "_id": "ObjectId",
  "singletonKey": "GLOBAL_SETTINGS",
  "offlineUploadLimitMb": "Number",
  "maxLoadBalancers": "Number",
  "maxFpsPerLb": "Number",
  "syslogIp": "String",
  "syslogPort": "Number",
  "slackWebhookUrl": "String",
  "threatIntelFeedUrl": "String",
  "threatIntelSyncIntervalMinutes": "Number"
}
```

---

## 4. System Architecture

The DPI firewall employs a multi-tiered, decoupled architecture.

### 4.1 Execution Flow
1. **Presentation Layer (React):** Translates user inputs into REST API calls. Uses a polling mechanism (`setInterval`) to request job updates dynamically.
2. **Orchestration Layer (Node.js):** Validates RBAC using JWT middleware. If authorized, records the job in MongoDB and calls `child_process.spawn()` to initiate the execution environment.
3. **Engine Layer (C++ / WinDivert):** 
   - Interfaces directly with the Windows Kernel via `WinDivert64.sys` to intercept packets before they reach the OS network stack.
   - Parses physical byte streams (Ethernet -> IPv4 -> TCP/UDP -> Payload).
   - Applies deep packet inspection (SNI string matching, DNS parsing).
   - Outputs a `.pcap` of allowed traffic and a `report.json` containing analytics.
4. **Data Layer (MongoDB):** Node.js ingests the generated `report.json`, maps it to the respective `Job` document, and stores it for UI visualization.

### 4.2 Security Architecture (Defense in Depth)
- **Ring 0 (Kernel):** WinDivert isolates physical network interception.
- **Ring 3 (Userspace - C++):** Engine isolated from direct internet access; consumes local rules and executes parsing logic. Hardened via compiler flags.
- **API Boundary (Node.js):** Blocks direct shell execution (sandboxing) and enforces JWT authentication. Prevents directory traversal during PCAP uploads.
- **Client (React):** Escapes all output to prevent XSS. Maintains strict SPA state management.
