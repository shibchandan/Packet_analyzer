const API_BASE = "http://localhost:8000/api";

export async function fetchHealth() {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) throw new Error("Failed to load health");
  return response.json();
}

export async function fetchJobs() {
  const response = await fetch(`${API_BASE}/jobs`);
  if (!response.ok) throw new Error("Failed to load jobs");
  return response.json();
}

export async function fetchJob(id) {
  const response = await fetch(`${API_BASE}/jobs/${id}`);
  if (!response.ok) throw new Error("Failed to load job");
  const payload = await response.json();
  return payload.job;
}

export async function fetchResults(id) {
  const response = await fetch(`${API_BASE}/jobs/${id}/results`);
  if (!response.ok) throw new Error("Failed to load results");
  return response.json();
}

export async function fetchAggregateAnalytics() {
  const response = await fetch(`${API_BASE}/analytics/aggregate`);
  if (!response.ok) throw new Error("Failed to load aggregate analytics");
  return response.json();
}

export async function stopJob(id) {
  const response = await fetch(`${API_BASE}/jobs/${id}/stop`, { method: "POST" });
  if (!response.ok) throw new Error("Failed to stop job");
  return response.json();
}

export async function createJob(formData) {
  const response = await fetch(`${API_BASE}/jobs`, {
    method: "POST",
    body: formData
  });
  if (!response.ok) throw new Error("Failed to create job");
  const payload = await response.json();
  return payload.job;
}

export async function fetchRules() {
  const response = await fetch(`${API_BASE}/rules`);
  if (!response.ok) throw new Error("Failed to load rules");
  const payload = await response.json();
  return payload.rules;
}

export async function createRule(rule) {
  const response = await fetch(`${API_BASE}/rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rule)
  });
  if (!response.ok) throw new Error("Failed to create rule");
  const payload = await response.json();
  return payload.rule;
}

export async function deleteRule(id) {
  const response = await fetch(`${API_BASE}/rules/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete rule");
}

export async function fetchRuleSets() {
  const response = await fetch(`${API_BASE}/rule-sets`);
  if (!response.ok) throw new Error("Failed to load rule sets");
  const payload = await response.json();
  return payload.ruleSets;
}

export async function createRuleSet(ruleSet) {
  const response = await fetch(`${API_BASE}/rule-sets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ruleSet)
  });
  if (!response.ok) throw new Error("Failed to create rule set");
  const payload = await response.json();
  return payload.ruleSet;
}

export async function deleteRuleSet(id) {
  const response = await fetch(`${API_BASE}/rule-sets/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete rule set");
}

export function downloadUrl(id) {
  return `${API_BASE}/jobs/${id}/download`;
}
