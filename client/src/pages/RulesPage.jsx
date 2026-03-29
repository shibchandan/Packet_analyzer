import { useEffect, useState } from "react";
import { createRule, createRuleSet, deleteRule, deleteRuleSet, fetchRules, fetchRuleSets } from "../api";

function splitCsv(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function HelperText({ children }) {
  return <small className="field-help">{children}</small>;
}

export default function RulesPage() {
  const [rules, setRules] = useState([]);
  const [ruleSets, setRuleSets] = useState([]);
  const [error, setError] = useState("");

  async function loadData() {
    const [ruleItems, ruleSetItems] = await Promise.all([fetchRules(), fetchRuleSets()]);
    setRules(ruleItems);
    setRuleSets(ruleSetItems);
  }

  useEffect(() => {
    loadData().catch(() => undefined);
  }, []);

  async function handleRuleSubmit(event) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    try {
      await createRule({
        ruleType: formData.get("ruleType"),
        value: formData.get("value"),
        enabled: true
      });
      event.currentTarget.reset();
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to add rule");
    }
  }

  async function handleRuleSetSubmit(event) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    try {
      await createRuleSet({
        name: formData.get("name"),
        description: formData.get("description"),
        blockApps: splitCsv(formData.get("blockApps") || ""),
        blockDomains: splitCsv(formData.get("blockDomains") || ""),
        blockIps: splitCsv(formData.get("blockIps") || ""),
        blockProtocols: splitCsv(formData.get("blockProtocols") || "")
      });
      event.currentTarget.reset();
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to save rule set");
    }
  }

  async function handleDeleteRule(id) {
    await deleteRule(id);
    await loadData();
  }

  async function handleDeleteRuleSet(id) {
    await deleteRuleSet(id);
    await loadData();
  }

  return (
    <div className="page">
      <div className="section-header"><div><p className="eyebrow">Policy Controls</p><h2>Rule Management</h2></div></div>

      <section className="panel">
        <div className="section-header"><div><p className="eyebrow">Single Rule</p><h2>Add One-Off Rule</h2></div></div>
        <form className="inline-form" onSubmit={handleRuleSubmit}>
          <select name="ruleType" defaultValue="app">
            <option value="app">Application</option>
            <option value="domain">Domain</option>
            <option value="ip">IP</option>
          </select>
          <input name="value" type="text" placeholder="Enter one app, domain, or IP value" required />
          <button className="primary-button" type="submit">Add Rule</button>
        </form>
        <HelperText>Examples: `YouTube`, `time.nist.gov`, `192.168.88.61`. Single rules are stored individually for quick reference.</HelperText>
        {error ? <p className="error-text">{error}</p> : null}
      </section>

      <section className="panel">
        <div className="section-header"><div><p className="eyebrow">Reusable Policies</p><h2>Saved Rule Sets</h2></div></div>
        <form className="form-panel" onSubmit={handleRuleSetSubmit}>
          <div className="form-grid">
            <label className="field">
              <span>Name</span>
              <input name="name" type="text" placeholder="ICS Strict Mode" required />
              <HelperText>Short profile name shown in the Analyze page preset dropdown.</HelperText>
            </label>
            <label className="field">
              <span>Description</span>
              <input name="description" type="text" placeholder="Block DNS and key internal hosts" />
              <HelperText>Optional note to explain what the rule set is meant to do.</HelperText>
            </label>
            <label className="field">
              <span>Block Protocols</span>
              <input name="blockProtocols" type="text" placeholder="DNS,ICMP,MODBUS" />
              <HelperText>Supported values: `DNS,ICMP,HTTP,HTTPS,MODBUS,S7,TCP,UDP`.</HelperText>
            </label>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>Block Apps</span>
              <input name="blockApps" type="text" placeholder="YouTube,TikTok" />
              <HelperText>Use comma-separated app labels that your engine can classify.</HelperText>
            </label>
            <label className="field">
              <span>Block Domains</span>
              <input name="blockDomains" type="text" placeholder="time.nist.gov,facebook.com" />
              <HelperText>Use comma-separated host or domain patterns for domain-based filtering.</HelperText>
            </label>
            <label className="field">
              <span>Block IPs</span>
              <input name="blockIps" type="text" placeholder="192.168.88.61,8.8.8.8" />
              <HelperText>Use comma-separated IPs. This is often the clearest demo choice for ICS captures.</HelperText>
            </label>
          </div>
          <div className="form-actions"><button className="primary-button" type="submit">Save Rule Set</button></div>
        </form>
      </section>

      <section className="panel">
        <div className="section-header"><div><p className="eyebrow">Reusable Policies</p><h2>Saved Profiles</h2></div></div>
        {ruleSets.length === 0 ? <p className="muted">No saved rule sets yet.</p> : (
          <table className="data-table">
            <thead><tr><th>Name</th><th>Description</th><th>Apps</th><th>Domains</th><th>IPs</th><th>Protocols</th><th></th></tr></thead>
            <tbody>
              {ruleSets.map((ruleSet) => (
                <tr key={ruleSet._id}>
                  <td>{ruleSet.name}</td>
                  <td>{ruleSet.description || "-"}</td>
                  <td>{ruleSet.blockApps?.join(", ") || "-"}</td>
                  <td>{ruleSet.blockDomains?.join(", ") || "-"}</td>
                  <td>{ruleSet.blockIps?.join(", ") || "-"}</td>
                  <td>{ruleSet.blockProtocols?.join(", ") || "-"}</td>
                  <td><button type="button" className="text-button" onClick={() => handleDeleteRuleSet(ruleSet._id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <div className="section-header"><div><p className="eyebrow">Stored Rules</p><h2>Single Rules</h2></div></div>
        {rules.length === 0 ? <p className="muted">No saved rules yet.</p> : (
          <table className="data-table">
            <thead><tr><th>Type</th><th>Value</th><th>Created</th><th></th></tr></thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule._id}>
                  <td>{rule.ruleType}</td>
                  <td>{rule.value}</td>
                  <td>{new Date(rule.createdAt).toLocaleString()}</td>
                  <td><button type="button" className="text-button" onClick={() => handleDeleteRule(rule._id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
