import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchJobs } from "../api";

export default function HistoryPage() {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    fetchJobs().then((payload) => setJobs(payload.jobs)).catch(() => undefined);
  }, []);

  return (
    <div className="page">
      <div className="section-header"><div><p className="eyebrow">Analysis Archive</p><h2>Run History</h2></div></div>
      <section className="panel">
        {jobs.length === 0 ? <p className="muted">No history yet.</p> : (
          <table className="data-table">
            <thead><tr><th>Created</th><th>Input</th><th>Status</th><th>Packets</th><th></th></tr></thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job._id}>
                  <td>{new Date(job.createdAt).toLocaleString()}</td>
                  <td>{job.inputName}</td>
                  <td><span className={`status-pill ${job.status}`}>{job.status}</span></td>
                  <td>{job.summary?.totalPackets ?? "-"}</td>
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
