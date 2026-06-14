import { useEffect, useState } from "react";
import { fetchAuditLogs } from "../api";
import { useAuth } from "../contexts/AuthContext";

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { role } = useAuth();

  useEffect(() => {
    if (role !== "admin") {
      setLoading(false);
      return;
    }
    fetchAuditLogs()
      .then((payload) => {
        setLogs(payload.logs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [role]);

  if (role !== "admin") {
    return (
      <div className="page">
        <div className="panel">
          <h2>Access Denied</h2>
          <p className="muted">You must be an administrator to view audit logs.</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="page"><p>Loading audit logs...</p></div>;

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <p className="eyebrow">Security</p>
          <h2>Audit Logs</h2>
        </div>
      </div>

      <section className="panel">
        {logs.length === 0 ? (
          <p className="muted">No audit logs available yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <td style={{ whiteSpace: "nowrap" }}>{new Date(log.createdAt).toLocaleString()}</td>
                  <td><strong>{log.username}</strong></td>
                  <td><span className="badge amber">{log.action}</span></td>
                  <td>{log.target}</td>
                  <td className="muted">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
