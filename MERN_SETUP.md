# MERN Dashboard Setup

This repo now includes a MERN-style dashboard scaffold around your C++ DPI engine.

## Folders

- `server/` contains the Express API and MongoDB models
- `client/` contains the React dashboard UI
- `dpi_engine.exe` remains the processing worker

## Server

```powershell
cd D:\Packet_analyzer\server
copy .env.example .env
npm install
npm run dev
```

Required services:

- MongoDB running locally on `mongodb://127.0.0.1:27017/dpi_dashboard`
- `dpi_engine.exe` available at the repo root

## Client

```powershell
cd D:\Packet_analyzer\client
npm install
npm run dev
```

## URLs

- Client: `http://localhost:5173`
- Server: `http://localhost:8000`

## Current Flow

1. Upload a `.pcap` file from the React UI
2. Express stores the upload and creates a MongoDB job record
3. Express launches `dpi_engine.exe`
4. Stdout is parsed into a lightweight JSON report
5. React polls for status and shows results

## Best Next Improvement

Add a JSON report flag to the C++ engine, for example `--report-json report.json`, so the MERN app can render richer and more reliable analytics.
