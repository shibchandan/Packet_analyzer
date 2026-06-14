export const API_BASE = "http://localhost:8000/api";

async function authFetch(url, options = {}) {
  const token = localStorage.getItem("token");
  const headers = { ...options.headers };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401 || response.status === 403) {
    // If unauthorized, clear token to force re-login, but don't redirect here
    // as it's better handled by React Router or Context.
  }
  return response;
}

export async function checkSetupStatus() {
  const res = await fetch(`${API_BASE}/auth/status`);
  return res.json();
}

export async function setupAdmin(username, password) {
  const res = await fetch(`${API_BASE}/auth/setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error("Setup failed");
  return res.json();
}

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error("Invalid credentials");
  return res.json();
}

export async function fetchHealth() {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) throw new Error("Failed to load health");
  return response.json();
}

export async function fetchJobs() {
  const response = await authFetch(`${API_BASE}/jobs`);
  if (!response.ok) throw new Error("Failed to load jobs");
  return response.json();
}

export async function fetchJob(id) {
  const response = await authFetch(`${API_BASE}/jobs/${id}`);
  if (!response.ok) throw new Error("Failed to load job");
  const payload = await response.json();
  return payload.job;
}

export async function fetchResults(id) {
  const response = await authFetch(`${API_BASE}/jobs/${id}/results`);
  if (!response.ok) throw new Error("Failed to load results");
  return response.json();
}

export async function fetchAggregateAnalytics() {
  const response = await authFetch(`${API_BASE}/analytics/aggregate`);
  if (!response.ok) throw new Error("Failed to load aggregate analytics");
  return response.json();
}

export async function stopJob(id) {
  const response = await authFetch(`${API_BASE}/jobs/${id}/stop`, { method: "POST" });
  if (!response.ok) throw new Error("Failed to stop job");
  return response.json();
}

export async function createJob(formData) {
  const response = await authFetch(`${API_BASE}/jobs`, {
    method: "POST",
    body: formData
  });
  if (!response.ok) throw new Error("Failed to create job");
  const payload = await response.json();
  return payload.job;
}

export async function fetchRules() {
  const response = await authFetch(`${API_BASE}/rules`);
  if (!response.ok) throw new Error("Failed to load rules");
  const payload = await response.json();
  return payload.rules;
}

export async function createRule(rule) {
  const response = await authFetch(`${API_BASE}/rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rule)
  });
  if (!response.ok) throw new Error("Failed to create rule");
  const payload = await response.json();
  return payload.rule;
}

export async function deleteRule(id) {
  const response = await authFetch(`${API_BASE}/rules/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete rule");
}

export async function fetchRuleSets() {
  const response = await authFetch(`${API_BASE}/rule-sets`);
  if (!response.ok) throw new Error("Failed to load rule sets");
  const payload = await response.json();
  return payload.ruleSets;
}

export async function createRuleSet(ruleSet) {
  const response = await authFetch(`${API_BASE}/rule-sets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ruleSet)
  });
  if (!response.ok) throw new Error("Failed to create rule set");
  const payload = await response.json();
  return payload.ruleSet;
}

export async function deleteRuleSet(id) {
  const response = await authFetch(`${API_BASE}/rule-sets/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete rule set");
}

export async function fetchAuditLogs() {
  const response = await authFetch(`${API_BASE}/audit`);
  if (!response.ok) throw new Error("Failed to fetch audit logs");
  return response.json();
}

export function downloadUrl(id) {
  return `${API_BASE}/jobs/${id}/download`;
}
