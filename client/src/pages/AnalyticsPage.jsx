import { useEffect, useState } from "react";
import { fetchJobs } from "../api";

export default function AnalyticsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs()
      .then((payload) => {
        setJobs(payload.jobs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><p>Loading analytics...</p></div>;

  const totalPackets = jobs.reduce((acc, job) => acc + (job.summary?.totalPackets || 0), 0);
  const totalDropped = jobs.reduce((acc, job) => acc + (job.summary?.droppedPackets || 0), 0);
  const totalForwarded = totalPackets - totalDropped;
  const dropPercent = totalPackets > 0 ? ((totalDropped / totalPackets) * 100).toFixed(1) : 0;
  
  // Aggregate apps
  const appCounts = {};
  jobs.forEach(job => {
    (job.apps || []).forEach(app => {
      appCounts[app.name] = (appCounts[app.name] || 0) + (app.count || 0);
    });
  });
  const topApps = Object.entries(appCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

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

        <section className="panel" style={{ gridColumn: 'span 2' }}>
          <div className="section-header"><div><p className="eyebrow">Traffic Distribution</p><h2>Top Applications</h2></div></div>
          {topApps.length === 0 ? <p className="muted">No application data available yet.</p> : (
            <table className="data-table">
              <thead><tr><th>Application</th><th>Aggregated Count</th></tr></thead>
              <tbody>
                {topApps.map((app) => (
                  <tr key={app.name}>
                    <td>{app.name}</td>
                    <td>{app.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
