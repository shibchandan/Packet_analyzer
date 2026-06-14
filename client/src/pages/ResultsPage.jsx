import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { downloadUrl, fetchJob, fetchResults, stopJob } from "../api";
import { useAuth } from "../contexts/AuthContext";

function AnalyticsTable({ title, subtitle, columns, rows, emptyText }) {
  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">{subtitle}</p>
          <h2>{title}</h2>
        </div>
      </div>
      {rows?.length ? (
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => <th key={column.key}>{column.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${title}-${index}`}>
                {columns.map((column) => <td key={column.key}>{row[column.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p className="muted">{emptyText}</p>}
    </section>
  );
}

function formatPercent(value) {
  return `${value.toFixed(1)}%`;
}

export default function ResultsPage() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [report, setReport] = useState(null);
  const { role } = useAuth();

  useEffect(() => {
    let timer;

    async function load() {
      const [jobPayload, reportPayload] = await Promise.all([fetchJob(jobId), fetchResults(jobId)]);
      setJob(jobPayload);
      setReport(reportPayload);
      if (["queued", "running"].includes(jobPayload.status)) {
        timer = window.setTimeout(load, 2000);
      }
    }

    load().catch(() => undefined);
    return () => timer && window.clearTimeout(timer);
  }, [jobId]);

  if (!job) {
    return <div className="page"><section className="panel"><p className="muted">Loading results...</p></section></div>;
  }

  async function handleStop() {
    if (window.confirm("Are you sure you want to stop the live interception?")) {
      try {
        await stopJob(jobId);
        // Status will be updated on next poll
      } catch (err) {
        alert("Failed to stop: " + err.message);
      }
    }
  }

  const summary = report?.summary || job.summary || {};
  const totalPackets = Number(summary.totalPackets || 0);
  const forwardedPackets = Number(summary.forwardedPackets || 0);
  const droppedPackets = Number(summary.droppedPackets || 0);
  const blockedPercent = totalPackets ? (droppedPackets / totalPackets) * 100 : 0;
  const forwardedPercent = totalPackets ? (forwardedPackets / totalPackets) * 100 : 0;

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <p className="eyebrow">{job.inputName} {job.liveMode && "(Live Mode)"}</p>
          <h2>Analysis Results</h2>
        </div>
        <div className="actions-row">
          <span className={`status-pill ${job.status}`}>{job.status}</span>
          {job.liveMode && job.status === "running" && role === "admin" && (
             <button className="primary-button rose" onClick={handleStop}>Stop Interception</button>
          )}
          {!job.liveMode && (
             <a className="ghost-button" href={downloadUrl(job._id)}>Download Output</a>
          )}
        </div>
      </div>

      {job.status === "failed" && job.stderr && (
        <section className="panel" style={{ borderColor: 'var(--rose-500)', marginBottom: '1rem' }}>
          <h3 style={{ color: 'var(--rose-400)' }}>⚠️ Job Failed</h3>
          <p className="muted" style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>The engine encountered a fatal error and could not complete the analysis:</p>
          <pre className="log-block" style={{ color: 'var(--rose-200)', background: 'rgba(244, 63, 94, 0.05)', border: '1px solid var(--rose-500)' }}>
            {job.stderr}
          </pre>
        </section>
      )}

      <section className="stats-grid">
        <article className="stat-card blue"><span>Total Packets</span><strong>{job.summary?.totalPackets ?? "-"}</strong></article>
        <article className="stat-card mint"><span>Forwarded</span><strong>{job.summary?.forwardedPackets ?? "-"}</strong></article>
        <article className="stat-card rose"><span>Dropped</span><strong>{job.summary?.droppedPackets ?? "-"}</strong></article>
        <article className="stat-card amber"><span>TCP / UDP</span><strong>{`${job.summary?.tcpPackets ?? "-"} / ${job.summary?.udpPackets ?? "-"}`}</strong></article>
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <p className="eyebrow">Before / After</p>
            <h2>Traffic Comparison</h2>
          </div>
        </div>
        <div className="comparison-grid">
          <div className="comparison-card">
            <span className="comparison-label">Original Capture</span>
            <strong>{totalPackets || "-"}</strong>
            <p className="muted">Packets seen in the uploaded PCAP before filtering.</p>
          </div>
          <div className="comparison-card">
            <span className="comparison-label">Filtered Output</span>
            <strong>{forwardedPackets || "-"}</strong>
            <p className="muted">Packets written to the output capture after policy checks.</p>
          </div>
          <div className="comparison-card highlight-rose">
            <span className="comparison-label">Blocked Traffic</span>
            <strong>{droppedPackets || "-"}</strong>
            <p className="muted">{formatPercent(blockedPercent)} of the capture was dropped by current rules.</p>
          </div>
        </div>

        <div className="traffic-split">
          <div className="traffic-split-bar">
            <div className="traffic-split-forwarded" style={{ width: `${forwardedPercent}%` }} />
            <div className="traffic-split-dropped" style={{ width: `${blockedPercent}%` }} />
          </div>
          <div className="traffic-split-legend">
            <span><i className="legend-swatch forwarded" /> Forwarded {formatPercent(forwardedPercent)}</span>
            <span><i className="legend-swatch dropped" /> Dropped {formatPercent(blockedPercent)}</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-header"><div><p className="eyebrow">Filtering Analytics</p><h2>Blocked Reasons</h2></div></div>
        {report?.blockedReasons?.length ? (
          <table className="data-table">
            <thead><tr><th>Reason</th><th>Count</th></tr></thead>
            <tbody>
              {report.blockedReasons.map((item, index) => (
                <tr key={`reason-${index}`}><td>{item.reason}</td><td>{item.count}</td></tr>
              ))}
            </tbody>
          </table>
        ) : <p className="muted">No blocked reasons recorded for this run.</p>}
      </section>

      <section className="panel">
        <div className="section-header"><div><p className="eyebrow">DNS Analytics</p><h2>DNS Queries</h2></div></div>
        {report?.traffic?.dnsQueries?.length ? (
          <table className="data-table">
            <thead><tr><th>Domain</th><th>Source IP</th><th>DNS Server</th><th>Count</th><th>Blocked</th></tr></thead>
            <tbody>
              {report.traffic.dnsQueries.map((item, index) => (
                <tr key={`dns-${index}`}>
                  <td>{item.domain}</td>
                  <td>{item.sourceIp}</td>
                  <td>{item.dnsServer}</td>
                  <td>{item.count}</td>
                  <td>{item.blockedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="muted">No DNS query analytics available yet.</p>}
      </section>

      <section className="panel">
        <div className="section-header"><div><p className="eyebrow">SNI / Host Extraction</p><h2>Detected Domains</h2></div></div>
        {report?.domains?.length ? (
          <table className="data-table">
            <thead><tr><th>Domain</th><th>Count / Label</th></tr></thead>
            <tbody>
              {report.domains.map((item, index) => (
                <tr key={`${item.domain}-${index}`}><td>{item.domain}</td><td>{item.count ?? item.app ?? "-"}</td></tr>
              ))}
            </tbody>
          </table>
        ) : <p className="muted">No parsed domains found for this run yet.</p>}
      </section>

      <section className="stats-grid two-up">
        <article className="panel">
          <div className="section-header"><div><p className="eyebrow">Traffic Analytics</p><h2>Top Protocols</h2></div></div>
          {report?.traffic?.topProtocols?.length ? (
            <table className="data-table compact-table">
              <thead><tr><th>Protocol</th><th>Number</th><th>Count</th></tr></thead>
              <tbody>
                {report.traffic.topProtocols.map((item, index) => (
                  <tr key={`proto-${index}`}><td>{item.protocol}</td><td>{item.number}</td><td>{item.count}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <p className="muted">No protocol analytics available yet.</p>}
        </article>

        <article className="panel">
          <div className="section-header"><div><p className="eyebrow">Traffic Analytics</p><h2>Top Destination Ports</h2></div></div>
          {report?.traffic?.topDestinationPorts?.length ? (
            <table className="data-table compact-table">
              <thead><tr><th>Port</th><th>Count</th></tr></thead>
              <tbody>
                {report.traffic.topDestinationPorts.map((item, index) => (
                  <tr key={`dport-${index}`}><td>{item.port}</td><td>{item.count}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <p className="muted">No port analytics available yet.</p>}
        </article>
      </section>

      <AnalyticsTable
        title="Top Source IPs"
        subtitle="Traffic Analytics"
        columns={[{ key: "ip", label: "IP" }, { key: "count", label: "Count" }]}
        rows={report?.traffic?.topSourceIps}
        emptyText="No source IP analytics available yet."
      />

      <AnalyticsTable
        title="Top Destination IPs"
        subtitle="Traffic Analytics"
        columns={[{ key: "ip", label: "IP" }, { key: "count", label: "Count" }]}
        rows={report?.traffic?.topDestinationIps}
        emptyText="No destination IP analytics available yet."
      />

      <section className="panel">
        <div className="section-header"><div><p className="eyebrow">Logs</p><h2>Engine Console Output</h2></div></div>
        <pre className="log-block">
          {job.stdout && `--- STDOUT ---\n${job.stdout}\n`}
          {job.stderr && `--- STDERR ---\n${job.stderr}\n`}
          {(!job.stdout && !job.stderr) && "Job is still running or the engine produced no text output."}
        </pre>
      </section>
    </div>
  );
}
