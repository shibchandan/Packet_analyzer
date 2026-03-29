import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchHealth, fetchJobs } from "../api";

export default function DashboardPage() {
  const [overview, setOverview] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    Promise.all([fetchJobs(), fetchHealth()]).then(([jobsPayload, healthPayload]) => {
      setOverview(jobsPayload.overview);
      setJobs(jobsPayload.jobs.slice(0, 5));
      setHealth(healthPayload);
    }).catch(() => undefined);
  }, []);

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <p className="eyebrow">Security Operations</p>
          <h2>Traffic Overview</h2>
        </div>
        <Link to="/analyze" className="primary-button">Run Analysis</Link>
      </div>

      <section className="stats-grid">
        <article className="stat-card blue"><span>Total Jobs</span><strong>{overview?.totalJobs ?? "-"}</strong></article>
        <article className="stat-card mint"><span>Completed</span><strong>{overview?.completedJobs ?? "-"}</strong></article>
        <article className="stat-card amber"><span>Packets Processed</span><strong>{overview?.totalPackets ?? "-"}</strong></article>
        <article className="stat-card rose"><span>Dropped Traffic</span><strong>{overview?.totalDropped ?? "-"}</strong></article>
      </section>

      <section className="panel hero-panel">
        <div>
          <p className="eyebrow">Engine Status</p>
          <h3>{health?.engineExists ? "Engine detected" : "Engine missing"}</h3>
          <p>{health?.engineExists ? "Express can see dpi_engine.exe and launch jobs." : "Put dpi_engine.exe in the repo root before starting analysis."}</p>
        </div>
        <div className={`engine-orb ${health?.engineExists ? "online" : "offline"}`} />
      </section>

      <section className="panel">
        <div className="section-header"><div><p className="eyebrow">Latest Activity</p><h2>Recent Jobs</h2></div></div>
        {jobs.length === 0 ? <p className="muted">No analysis jobs yet.</p> : (
          <table className="data-table">
            <thead><tr><th>Input</th><th>Status</th><th>Packets</th><th>Dropped</th><th></th></tr></thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job._id}>
                  <td>{job.inputName}</td>
                  <td><span className={`status-pill ${job.status}`}>{job.status}</span></td>
                  <td>{job.summary?.totalPackets ?? "-"}</td>
                  <td>{job.summary?.droppedPackets ?? "-"}</td>
                  <td><Link to={`/results/${job._id}`} className="text-link">Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
