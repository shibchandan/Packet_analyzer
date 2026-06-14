import { useEffect, useState } from "react";
import { createRule, createRuleSet, deleteRule, deleteRuleSet, fetchRules, fetchRuleSets } from "../api";
import { useAuth } from "../contexts/AuthContext";

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
  const [newRuleValue, setNewRuleValue] = useState("");
  const [newRuleAction, setNewRuleAction] = useState("block");
  const [newRuleType, setNewRuleType] = useState("domain");
  const { role } = useAuth();

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
    try {
      await createRule({
        action: newRuleAction,
        ruleType: newRuleType,
        value: newRuleValue,
        enabled: true
      });
      setNewRuleValue("");
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
        {role === "admin" ? (
          <form className="inline-form" onSubmit={handleRuleSubmit}>
            <select className="text-input" value={newRuleAction} onChange={(e) => setNewRuleAction(e.target.value)}>
              <option value="block">Block</option>
              <option value="allow">Allow</option>
            </select>
            <select className="text-input" value={newRuleType} onChange={(e) => setNewRuleType(e.target.value)}>
              <option value="domain">Domain</option>
              <option value="ip">IP</option>
              <option value="protocol">Protocol</option>
              <option value="app">Application (SNI)</option>
            </select>
            <input className="text-input" name="value" type="text" placeholder="Enter value" value={newRuleValue} onChange={(e) => setNewRuleValue(e.target.value)} required />
            <button className="primary-button" type="submit">Add Rule</button>
          </form>
        ) : (
          <p className="muted">Admin Required to Create Rules</p>
        )}
        <HelperText>Examples: `YouTube`, `time.nist.gov`, `192.168.88.61`. Single rules are stored individually for quick reference.</HelperText>
        {error ? <p className="error-text">{error}</p> : null}
      </section>

      <section className="panel">
        <div className="section-header"><div><p className="eyebrow">Reusable Policies</p><h2>Saved Rule Sets</h2></div></div>
        {role === "admin" && (
          <form className="form-panel" onSubmit={handleRuleSetSubmit}>
            <div className="form-grid">
              <label className="field">
                <span>Name</span>
                <input name="name" type="text" placeholder="ICS Strict Mode" required />
              </label>
              <label className="field">
                <span>Description</span>
                <input name="description" type="text" placeholder="Block DNS and key internal hosts" />
              </label>
              <label className="field">
                <span>Block Protocols</span>
                <input name="blockProtocols" type="text" placeholder="DNS,ICMP,MODBUS" />
              </label>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Block Apps</span>
                <input name="blockApps" type="text" placeholder="YouTube,TikTok" />
              </label>
              <label className="field">
                <span>Block Domains</span>
                <input name="blockDomains" type="text" placeholder="time.nist.gov,facebook.com" />
              </label>
              <label className="field">
                <span>Block IPs</span>
                <input name="blockIps" type="text" placeholder="192.168.88.61,8.8.8.8" />
              </label>
            </div>
            <div className="form-actions"><button className="primary-button" type="submit">Save Rule Set</button></div>
          </form>
        )}
      </section>

      <section className="panel">
        <div className="section-header"><div><p className="eyebrow">Reusable Policies</p><h2>Saved Profiles</h2></div></div>
        {ruleSets.length === 0 ? <p className="muted">No saved rule sets yet.</p> : (
          <table className="data-table">
            <thead><tr><th>Name</th><th>Description</th><th>Apps</th><th>Domains</th><th>IPs</th><th>Protocols</th>{role === "admin" && <th></th>}</tr></thead>
            <tbody>
              {ruleSets.map((ruleSet) => (
                <tr key={ruleSet._id}>
                  <td>{ruleSet.name}</td>
                  <td>{ruleSet.description || "-"}</td>
                  <td>{ruleSet.blockApps?.join(", ") || "-"}</td>
                  <td>{ruleSet.blockDomains?.join(", ") || "-"}</td>
                  <td>{ruleSet.blockIps?.join(", ") || "-"}</td>
                  <td>{ruleSet.blockProtocols?.join(", ") || "-"}</td>
                  {role === "admin" && (
                    <td><button type="button" className="text-button" onClick={() => handleDeleteRuleSet(ruleSet._id)}>Delete</button></td>
                  )}
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
            <thead>
              <tr>
                <th>Action</th>
                <th>Type</th>
                <th>Target</th>
                <th>Created</th>
                {role === "admin" && <th></th>}
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule._id}>
                  <td>{rule.action || "block"}</td>
                  <td>{rule.ruleType}</td>
                  <td>{rule.value}</td>
                  <td>{new Date(rule.createdAt).toLocaleString()}</td>
                  {role === "admin" && (
                    <td><button type="button" className="text-button" onClick={() => handleDeleteRule(rule._id)}>Delete</button></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
