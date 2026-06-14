import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createJob, fetchRuleSets } from "../api";
import { useAuth } from "../contexts/AuthContext";

function csvFrom(items) {
  return Array.isArray(items) ? items.join(",") : "";
}

function HelperText({ children }) {
  return <small className="field-help">{children}</small>;
}

export default function AnalyzePage() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ruleSets, setRuleSets] = useState([]);
  const [selectedRuleSetId, setSelectedRuleSetId] = useState("");
  const [formState, setFormState] = useState({
    outputName: "filtered_output.pcap",
    loadBalancers: "2",
    fpsPerLb: "2",
    blockApps: "",
    blockDomains: "",
    blockIps: "",
    blockProtocols: "",
    liveMode: false
  });

  useEffect(() => {
    fetchRuleSets()
      .then(setRuleSets)
      .catch(() => undefined);
  }, []);

  function handleFieldChange(event) {
    const { name, value, type, checked } = event.target;
    setFormState((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  function handleRuleSetChange(event) {
    const ruleSetId = event.target.value;
    setSelectedRuleSetId(ruleSetId);

    if (!ruleSetId) {
      return;
    }

    const selected = ruleSets.find((item) => item._id === ruleSetId);
    if (!selected) {
      return;
    }

    setFormState((current) => ({
      ...current,
      blockApps: csvFrom(selected.blockApps),
      blockDomains: csvFrom(selected.blockDomains),
      blockIps: csvFrom(selected.blockIps),
      blockProtocols: csvFrom(selected.blockProtocols)
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    try {
      const job = await createJob(formData);
      navigate(`/results/${job._id}`);
    } catch (err) {
      setError(err.message || "Failed to create job");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="section-header"><div><p className="eyebrow">Job Launcher</p><h2>Analyze PCAP</h2></div></div>
      <form className="panel form-panel" onSubmit={handleSubmit}>
        
        <div className="field checkbox-field" style={{ marginBottom: "1rem", padding: "1rem", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", fontSize: "1.1rem", fontWeight: "600", color: "#64ffda" }}>
            <input type="checkbox" name="liveMode" value="true" checked={formState.liveMode} onChange={handleFieldChange} style={{ width: "20px", height: "20px" }} />
            Enable Live Interception (WinDivert)
          </label>
          <div style={{ marginTop: "8px", paddingLeft: "32px" }}>
            <HelperText>If enabled, inspects real-time traffic directly from your network adapter instead of uploading a PCAP file.</HelperText>
          </div>
        </div>

        {!formState.liveMode && (
          <label className="field">
            <span>PCAP File</span>
            <input type="file" name="file" accept=".pcap" required={!formState.liveMode} />
            <HelperText>Upload a capture file to analyze offline. Example: a lab capture, browser session, or ICS sample.</HelperText>
          </label>
        )}

        <div className="form-grid">
          <label className="field">
            <span>Saved Rule Set</span>
            <select name="ruleSetId" value={selectedRuleSetId} onChange={handleRuleSetChange}>
              <option value="">No preset</option>
              {ruleSets.map((ruleSet) => (
                <option key={ruleSet._id} value={ruleSet._id}>{ruleSet.name}</option>
              ))}
            </select>
            <HelperText>Use a saved profile to prefill blocking fields, then adjust anything you want before running.</HelperText>
          </label>
          <label className="field">
            <span>Load Balancers</span>
            <input type="number" name="loadBalancers" min="1" value={formState.loadBalancers} onChange={handleFieldChange} required />
            <HelperText>Dispatcher thread count. `2` is a good default for smaller PCAP files.</HelperText>
          </label>
          <label className="field">
            <span>FP Threads / LB</span>
            <input type="number" name="fpsPerLb" min="1" value={formState.fpsPerLb} onChange={handleFieldChange} required />
            <HelperText>Processing threads per load balancer. Total FP threads = load balancers × FP threads/LB.</HelperText>
          </label>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Output Name</span>
            <input type="text" name="outputName" value={formState.outputName} onChange={handleFieldChange} required />
            <HelperText>Name of the filtered output PCAP file that will be available to download after the run.</HelperText>
          </label>
          <label className="field">
            <span>Block Apps</span>
            <input type="text" name="blockApps" value={formState.blockApps} onChange={handleFieldChange} placeholder="Enter comma-separated app labels" />
            <HelperText>Examples: `YouTube,Google,Facebook`. This only works when the engine can classify those apps from SNI or host data.</HelperText>
          </label>
          <label className="field">
            <span>Block Domains</span>
            <input type="text" name="blockDomains" value={formState.blockDomains} onChange={handleFieldChange} placeholder="Enter comma-separated domains" />
            <HelperText>Examples: `time.nist.gov,facebook.com`. Leave blank if you are not testing domain-based blocking.</HelperText>
          </label>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Block IPs</span>
            <input type="text" name="blockIps" value={formState.blockIps} onChange={handleFieldChange} placeholder="Enter comma-separated IP addresses" />
            <HelperText>Examples: `192.168.88.61,8.8.8.8`. This is the most reliable blocking option for many ICS captures.</HelperText>
          </label>
          <label className="field">
            <span>Block Protocols</span>
            <input type="text" name="blockProtocols" value={formState.blockProtocols} onChange={handleFieldChange} placeholder="Enter comma-separated protocol names" />
            <HelperText>Supported values: `DNS,ICMP,HTTP,HTTPS,MODBUS,S7,TCP,UDP`.</HelperText>
          </label>
          <div className="field field-hint-card">
            <span>How Empty Fields Work</span>
            <p className="muted">Helper text and placeholders are only examples. If a field is blank, no rule from that category is applied to the job.</p>
          </div>
        </div>

        {error ? <p className="error-text">{error}</p> : null}
        <div className="form-actions">
          {role === "admin" ? (
            <button className="primary-button" type="submit" disabled={submitting}>
              {submitting ? "Launching..." : "Run Analysis"}
            </button>
          ) : (
            <button className="primary-button" type="button" disabled>
              Admin Required to Run
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
