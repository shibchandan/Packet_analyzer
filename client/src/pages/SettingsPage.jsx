import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    defaultOutputName: "output.pcap",
    defaultLbThreads: 2,
    defaultFpThreads: 2,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loaded = localStorage.getItem("dpiSettings");
    if (loaded) {
      setSettings(JSON.parse(loaded));
    }
  }, []);

  function handleSave(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newSettings = {
      defaultOutputName: formData.get("defaultOutputName") || "output.pcap",
      defaultLbThreads: parseInt(formData.get("defaultLbThreads"), 10) || 2,
      defaultFpThreads: parseInt(formData.get("defaultFpThreads"), 10) || 2,
    };
    localStorage.setItem("dpiSettings", JSON.stringify(newSettings));
    setSettings(newSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="page">
      <div className="section-header">
        <div><p className="eyebrow">Preferences</p><h2>Global Settings</h2></div>
      </div>
      <section className="panel">
        <form className="form-panel" onSubmit={handleSave}>
          <div className="form-grid">
            <label className="field">
              <span>Default Output File Name</span>
              <input name="defaultOutputName" type="text" defaultValue={settings.defaultOutputName} required />
              <small className="field-help">Default output pcap file name (e.g. output.pcap)</small>
            </label>
            <label className="field">
              <span>Default Load Balancers</span>
              <input name="defaultLbThreads" type="number" min="1" max="16" defaultValue={settings.defaultLbThreads} required />
              <small className="field-help">Number of LB threads to start by default</small>
            </label>
            <label className="field">
              <span>Default Fast Path Threads</span>
              <input name="defaultFpThreads" type="number" min="1" max="32" defaultValue={settings.defaultFpThreads} required />
              <small className="field-help">Number of FP workers per LB</small>
            </label>
          </div>
          <div className="form-actions">
            <button className="primary-button" type="submit">Save Preferences</button>
            {saved && <span className="status-pill completed" style={{ marginLeft: "12px" }}>Saved successfully!</span>}
          </div>
        </form>
      </section>
    </div>
  );
}
