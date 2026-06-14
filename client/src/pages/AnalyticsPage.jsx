import { useEffect, useState } from "react";
import { fetchAggregateAnalytics } from "../api";

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

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAggregateAnalytics()
      .then((payload) => {
        setData(payload);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !data) return <div className="page"><p>Loading analytics...</p></div>;

  const totalPackets = data.summary?.totalPackets || 0;
  const totalDropped = data.summary?.totalDropped || 0;
  const totalForwarded = data.summary?.totalForwarded || 0;
  const dropPercent = totalPackets > 0 ? ((totalDropped / totalPackets) * 100).toFixed(1) : 0;

  return (
    <div className="page">
      <div className="section-header">
        <div><p className="eyebrow">Aggregate Insights</p><h2>Global Analytics</h2></div>
      </div>

      <section className="stats-grid">
        <article className="stat-card blue"><span>Total Processed</span><strong>{totalPackets.toLocaleString()}</strong></article>
        <article className="stat-card mint"><span>Total Forwarded</span><strong>{totalForwarded.toLocaleString()}</strong></article>
        <article className="stat-card rose"><span>Total Dropped</span><strong>{totalDropped.toLocaleString()}</strong></article>
        <article className="stat-card amber"><span>Avg Drop Rate</span><strong>{dropPercent}%</strong></article>
      </section>

      <div className="comparison-grid">
        <section className="comparison-card">
          <p className="comparison-label">Forwarded vs Dropped</p>
          <div className="traffic-split" style={{ marginTop: 'auto', marginBottom: 'auto' }}>
             <div className="traffic-split-bar">
               <div className="traffic-split-forwarded" style={{ width: `${100 - dropPercent}%` }} />
               <div className="traffic-split-dropped" style={{ width: `${dropPercent}%` }} />
             </div>
             <div className="traffic-split-legend">
               <span><span className="legend-swatch forwarded" /> Forwarded ({100 - dropPercent}%)</span>
               <span><span className="legend-swatch dropped" /> Dropped ({dropPercent}%)</span>
             </div>
          </div>
        </section>
      </div>

      <AnalyticsTable
        title="Top Applications (SNI)"
        subtitle="Layer 7 Visibility"
        columns={[{ key: "name", label: "Application" }, { key: "count", label: "Connections" }]}
        rows={data.topApps}
        emptyText="No application data available yet."
      />

      <section className="stats-grid two-up">
        <AnalyticsTable
          title="Top Blocked Domains"
          subtitle="Security Metrics"
          columns={[{ key: "name", label: "Domain" }, { key: "count", label: "Blocks" }]}
          rows={data.topDomains}
          emptyText="No blocked domains recorded."
        />

        <AnalyticsTable
          title="Top Blocked Reasons"
          subtitle="Security Metrics"
          columns={[{ key: "name", label: "Reason" }, { key: "count", label: "Occurrences" }]}
          rows={data.topBlockedReasons}
          emptyText="No blocked reasons recorded."
        />
      </section>

      <AnalyticsTable
        title="Top DNS Queries"
        subtitle="Network Infrastructure"
        columns={[{ key: "name", label: "Domain" }, { key: "count", label: "Query Count" }]}
        rows={data.topDnsQueries}
        emptyText="No DNS query data available."
      />

    </div>
  );
}
