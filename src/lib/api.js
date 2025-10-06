// src/lib/api.js
const API_BASE = (process.env.REACT_APP_API_URL?.replace(/\/+$/, "")) || "";

function getToken() {
  try { return localStorage.getItem("session:token") || ""; }
  catch { return ""; }
}

function needsBody(method) {
  const m = String(method || "GET").toUpperCase();
  return m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE";
}

export async function apiFetch(path, opts = {}) {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  // ---- headers
  const headers = new Headers(opts.headers || {});
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  // Always send token if present
  const token = getToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // ---- body: auto stringify plain objects
  let body = opts.body;
  if (body && !(body instanceof FormData) && typeof body === "object") {
    body = JSON.stringify(body);
  }
  // If there is no body, don’t force Content-Type for GETs
  if (!body && !needsBody(opts.method)) {
    headers.delete("Content-Type");
  }

  // Optional: small timeout to fail fast on dead servers
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000); // 20s

  let res;
  try {
    res = await fetch(url, { ...opts, headers, body, signal: ctrl.signal });
  } catch (netErr) {
    clearTimeout(t);
    console.error("[apiFetch] network error:", netErr, "→", url);
    // Make the error message explicit
    const err = new Error(`Network error contacting ${url}`);
    err.cause = netErr;
    err.status = 0;
    throw err;
  }
  clearTimeout(t);

  // Try JSON first; fall back to text
  const data = await res.json().catch(async () => {
    try { return { message: await res.text() }; }
    catch { return {}; }
  });

  if (!res.ok) {
    const msg = data?.message || `${res.status} ${res.statusText}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    err.url = url;
    console.error("[apiFetch] HTTP error:", err.status, msg, "→", url, data);
    throw err;
  }

  return data;
}
