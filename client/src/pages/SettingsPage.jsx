import { useEffect, useState } from "react";
import { fetchSettings, updateSettings } from "../api";
import { useAuth } from "../contexts/AuthContext";

export default function SettingsPage() {
  const { role } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchSettings()
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setMessage({ type: "error", text: "Failed to load settings." });
        setLoading(false);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: Number(value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (role !== "admin") return;
    
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const updated = await updateSettings(settings);
      setSettings(updated);
      setMessage({ type: "success", text: "Settings saved successfully." });
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page"><p>Loading settings...</p></div>;

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <p className="eyebrow">System</p>
          <h2>Global Configurations</h2>
        </div>
      </div>

      <section className="panel" style={{ maxWidth: '600px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label className="field-label">Max Load Balancer Threads</label>
            <input 
              type="number" 
              className="text-input" 
              name="maxLoadBalancers"
              value={settings?.maxLoadBalancers || 4} 
              onChange={handleChange}
              disabled={role !== "admin"}
              min="1"
              max="16"
            />
            <p className="muted" style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>
              Maximum number of packet distributor threads allowed per analysis job.
            </p>
          </div>

          <div>
            <label className="field-label">Max Fast Path Threads per LB</label>
            <input 
              type="number" 
              className="text-input" 
              name="maxFpsPerLb"
              value={settings?.maxFpsPerLb || 4} 
              onChange={handleChange}
              disabled={role !== "admin"}
              min="1"
              max="32"
            />
            <p className="muted" style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>
              Maximum number of DPI worker threads allowed per load balancer thread.
            </p>
          </div>

          <div>
            <label className="field-label">Offline PCAP Upload Limit (MB)</label>
            <input 
              type="number" 
              className="text-input" 
              name="offlineUploadLimitMb"
              value={settings?.offlineUploadLimitMb || 100} 
              onChange={handleChange}
              disabled={role !== "admin"}
              min="10"
              max="1024"
            />
            <p className="muted" style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>
              Maximum file size in Megabytes allowed for untrusted offline PCAP uploads.
            </p>
          </div>

          {message.text && (
            <p style={{ color: message.type === 'error' ? 'var(--color-rose-500)' : 'var(--color-emerald-500)' }}>
              {message.text}
            </p>
          )}

          <div style={{ marginTop: '1rem' }}>
            {role === "admin" ? (
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Settings"}
              </button>
            ) : (
              <p className="muted">Admin Required to Save Changes</p>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
