const API_BASE = '/api';

export async function getSystemStatus() {
  try {
    const res = await fetch(`${API_BASE}/status`);
    if (!res.ok) throw new Error(`Status check failed: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.warn("Backend not yet reachable on /api/status", err);
    return { status: "offline", api_key_configured: false, model: "unknown", agent_count: 8 };
  }
}

export async function updateSettings(apiKey, model) {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, model: model }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to update settings");
  }
  return await res.json();
}

export async function fetchAvailableModels() {
  try {
    const res = await fetch(`${API_BASE}/models`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.available_models || [];
  } catch (err) {
    console.warn("Could not fetch models:", err);
    return [];
  }
}

export async function fetchAgents() {
  const res = await fetch(`${API_BASE}/agents`);
  if (!res.ok) throw new Error("Failed to fetch agents");
  return await res.json();
}

export async function gatherOpinions(topic) {
  const res = await fetch(`${API_BASE}/opinions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to evaluate opinions");
  }
  return await res.json();
}

export async function matchDebaters(topic, opinions) {
  const res = await fetch(`${API_BASE}/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, opinions }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to match debaters");
  }
  return await res.json();
}

export async function executeDebateTurn(turnPayload) {
  const res = await fetch(`${API_BASE}/debate/turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(turnPayload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to generate debate turn");
  }
  return await res.json();
}

export async function judgeDebate(judgePayload) {
  const res = await fetch(`${API_BASE}/judge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(judgePayload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to judge debate");
  }
  return await res.json();
}
