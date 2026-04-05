# DPI Dashboard Architecture

This project already has the hardest part: the packet-processing engine. The best product design is to keep the C++ DPI engine as the core worker and build a thin backend plus a modern dashboard around it.

## 1. Product Shape

Think of the system as 3 layers:

1. `C++ DPI engine`
   Processes PCAP files, applies rules, generates output/report data.
2. `Backend service`
   Starts jobs, stores results, manages rules, exposes APIs to the UI.
3. `Frontend dashboard`
   Lets users upload captures, run analysis, manage block rules, and view reports.

Recommended first goal:

- Build an `offline DPI dashboard` for PCAP upload and analysis.
- Do not start with live packet capture in the browser UI.
- Keep rule editing and report viewing simple first.

That gives you a solid MVP without changing your engine architecture too much.

## 2. Best Stack For This Project

### Frontend

- `React + Vite + TypeScript`
- `Tailwind CSS` for fast UI building
- `Recharts` or `Chart.js` for traffic graphs
- `React Router` for page navigation

Why:

- Easy to build a polished dashboard quickly
- Good ecosystem for tables, charts, filters, and file upload
- TypeScript helps when consuming backend JSON

### Backend

Two good options:

1. `FastAPI` (recommended)
2. `Node.js + Express`

For this repo, `FastAPI` is the cleanest choice because:

- Easy file upload support
- Easy background job endpoints
- Easy JSON APIs
- Simple to call your compiled `.exe`

### Data Storage

- `SQLite` for MVP
- Later upgrade to `PostgreSQL` if needed

Store:

- analysis jobs
- uploaded file metadata
- block rules
- summary stats
- detected apps/domains

## 3. How It Should Connect To Your Existing Engine

Do not rewrite the DPI logic in Python or JavaScript.

Use this flow:

```text
Frontend -> Backend API -> run dpi_engine.exe -> save JSON/report -> return results
```

There are two clean integration styles:

### Option A: Run the existing executable

Backend runs something like:

```text
dpi_engine.exe input.pcap output.pcap --block-app YouTube --block-domain facebook
```

Then backend:

- captures stdout
- parses report text
- stores results in database
- returns structured JSON to frontend

This is the fastest path.

### Option B: Add JSON output to the engine

Add a new engine flag like:

```text
--report-json report.json
```

Then the backend can directly read structured output instead of parsing console text.

This is the better long-term design.

Recommended order:

1. Start with executable wrapping
2. Add JSON report output next
3. Only later consider exposing the C++ engine as a shared library

## 4. Main UI Pages

### 1. Dashboard

Show:

- total analysis jobs
- total packets processed
- forwarded vs dropped packets
- top detected apps
- recent runs

Cards:

- `Total Packets`
- `Dropped Traffic`
- `Top Application`
- `Active Rules`
- `Recent Analyses`

### 2. Analyze PCAP

Main user workflow:

- upload `.pcap`
- choose output filename
- add blocking rules
- set LB and FP thread counts
- click `Run Analysis`

Show during processing:

- upload progress
- job status: `queued`, `running`, `completed`, `failed`
- live log output from engine

### 3. Results / Report Page

After a run, show:

- total packets
- TCP vs UDP breakdown
- forwarded vs dropped
- application breakdown chart
- detected SNI/domain table
- blocked flows
- downloadable filtered PCAP

Useful widgets:

- pie chart for app distribution
- bar chart for top domains
- searchable table for detected flows

### 4. Rule Management

Manage:

- blocked IPs
- blocked apps
- blocked domains

Features:

- add rule
- remove rule
- enable/disable rule
- save named rule sets

### 5. Run History

Show previous jobs with:

- input file
- created time
- status
- packets processed
- output file
- quick link to results

## 5. Frontend Layout Suggestion

Use a security/network-operations style dashboard.

Suggested layout:

- left sidebar
- top status header
- content area with cards, charts, and tables

Sidebar items:

- `Dashboard`
- `Analyze`
- `Results`
- `Rules`
- `History`
- `Settings`

Suggested visual style:

- deep navy or graphite background
- cyan/green highlights for allowed traffic
- amber/red highlights for dropped traffic
- monospace accents for packet metrics and rule values

## 6. Backend API Design

Recommended REST API:

### Jobs

`POST /api/jobs`

- upload a PCAP
- submit rule options and thread config

Request idea:

```json
{
  "outputName": "filtered_output.pcap",
  "blockApps": ["YouTube", "TikTok"],
  "blockDomains": ["facebook", "instagram"],
  "blockIps": ["192.168.1.50"],
  "loadBalancers": 2,
  "fpsPerLb": 2
}
```

`GET /api/jobs`

- list all analysis jobs

`GET /api/jobs/:id`

- get job details, stats, logs, output file path

`GET /api/jobs/:id/results`

- get parsed analysis result JSON

`GET /api/jobs/:id/download`

- download filtered output PCAP

### Rules

`GET /api/rules`

- list saved rules

`POST /api/rules`

- create a rule

`DELETE /api/rules/:id`

- remove a rule

`PUT /api/rules/:id`

- update a rule

### Health

`GET /api/health`

- backend status
- engine executable status

## 7. Backend Folder Structure

One clean layout:

```text
backend/
  app/
    main.py
    api/
      jobs.py
      rules.py
      health.py
    core/
      config.py
      engine_runner.py
      parser.py
    db/
      models.py
      session.py
    schemas/
      job.py
      rule.py
    services/
      job_service.py
      rule_service.py
  uploads/
  outputs/
  reports/
```

What each piece does:

- `engine_runner.py`: builds the CLI command and runs the C++ engine
- `parser.py`: converts engine report text or JSON into API-friendly structure
- `job_service.py`: manages job lifecycle

## 8. Frontend Folder Structure

```text
frontend/
  engine/src/
    api/
      client.ts
      jobs.ts
      rules.ts
    components/
      StatCard.tsx
      TrafficChart.tsx
      RuleTable.tsx
      JobStatusBadge.tsx
    pages/
      Dashboard.tsx
      Analyze.tsx
      Results.tsx
      Rules.tsx
      History.tsx
    layouts/
      AppShell.tsx
    types/
      job.ts
      rule.ts
      report.ts
```

## 9. Best MVP Flow

If you want this project to feel complete quickly, build in this order:

1. Backend wrapper around `dpi_engine.exe`
2. Upload PCAP and run a job
3. Save run result in SQLite
4. Show report in dashboard
5. Add rule management
6. Add charts and history

This avoids spending too much time on real-time infrastructure too early.

## 10. Suggested Engine Improvements For UI Integration

Your current engine is already usable, but the UI/backend will be much easier if you add these features:

### A. Structured JSON report output

Add a flag:

```text
--report-json <file>
```

Suggested JSON shape:

```json
{
  "summary": {
    "totalPackets": 77,
    "totalBytes": 5738,
    "forwarded": 69,
    "dropped": 8,
    "tcpPackets": 73,
    "udpPackets": 4
  },
  "apps": [
    { "name": "HTTPS", "count": 39, "percent": 50.6 },
    { "name": "YouTube", "count": 4, "percent": 5.2, "blocked": true }
  ],
  "domains": [
    { "domain": "www.youtube.com", "app": "YouTube" },
    { "domain": "github.com", "app": "GitHub" }
  ],
  "threadStats": [
    { "name": "LB0", "dispatched": 53 },
    { "name": "FP0", "processed": 53 }
  ]
}
```

### B. Job progress updates

Print machine-friendly progress logs like:

```text
[PROGRESS] stage=reading packets=45
[PROGRESS] stage=processing forwarded=40 dropped=5
```

### C. Save detected flows

Expose:

- source IP
- destination IP
- source port
- destination port
- protocol
- app
- domain
- action

That makes the Results page much stronger.

## 11. Real-Time Features You Can Add Later

After MVP works, add:

- WebSocket live logs while engine runs
- live packet counters
- rule templates
- user authentication
- role-based access for admin/operator/viewer
- side-by-side comparison of two PCAP runs

## 12. What I Would Build First For Your Repo

For this exact project, I would choose:

- `Frontend`: React + Vite + TypeScript + Tailwind
- `Backend`: FastAPI + SQLite
- `Engine integration`: call `dpi_engine.exe` as a subprocess
- `Near-term engine change`: add JSON report export

That gives you:

- fast development
- minimal changes to C++ core
- clean separation of responsibilities
- a strong college/project-demo presentation

## 13. Final Architecture

```text
React Dashboard
    |
    v
FastAPI Backend
    |
    +--> SQLite (jobs, rules, reports)
    |
    +--> uploads/
    |
    +--> outputs/
    |
    +--> run dpi_engine.exe
            |
            +--> input.pcap
            +--> output.pcap
            +--> report.json
```

## 14. If You Want To Make It Look Impressive

For the UI demo, focus on these 4 things:

- a polished upload-and-run experience
- a strong results dashboard with charts
- a clean rules management screen
- a visible blocked vs forwarded traffic story

That will make the project feel like a real security product, not just a CLI tool with a wrapper.

