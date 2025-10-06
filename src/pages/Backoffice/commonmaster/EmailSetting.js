// src/pages/Backoffice/common-master/EmailSetting.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { BackofficeSidebar } from "../../../components/sidebar/backofficesidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

const PAGE_SIZE = 10;
const PROVIDERS = ["SMTP", "SENDGRID", "MAILGUN", "AWS_SES", "POSTMARK", "CUSTOM"];

export default function EmailSettingPage() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true); setErr("");
      try {
        const params = new URLSearchParams({ q, page, limit });
        const res = await apiFetch(`/api/email-settings?${params.toString()}`, { auth: true });
        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;
        if (!ignore) { setRows(Array.isArray(data) ? data : []); setTotal(Number(count) || 0); }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load email settings."); setRows([]); setTotal(0); }
      } finally { if (!ignore) setLoading(false); }
    })();
    return () => { ignore = true; };
  }, [q, page, limit]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [r.propertyCode, r.provider, r.host, r.username, r.fromEmail, r.fromName]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  const dataToRender = rows?.length && total > rows.length ? rows : filtered;

  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit   = (row) => { setEditing(row); setShowForm(true); };
  const askDelete  = (row) => { setToDelete(row); setShowDelete(true); };

  const afterSave = (saved) => {
    setShowForm(false); setEditing(null);
    setRows(prev => {
      const id = saved._id || saved.id;
      const idx = prev.findIndex(p => (p._id || p.id) === id);
      if (idx === -1) return [saved, ...prev];
      const next = prev.slice(); next[idx] = saved; return next;
    });
  };
  const afterDelete = (id) => {
    setShowDelete(false); setToDelete(null);
    setRows(prev => prev.filter(r => (r._id || r.id) !== id));
    setTotal(t => Math.max(0, t - 1));
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <BackofficeSidebar />

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Email Settings</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="res-select"
              placeholder="Search property / provider / host / user / from"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              style={{ minWidth: 340 }}
            />
            <select
              className="res-select"
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            >
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
            <button className="btn" onClick={openCreate}>+ Add</button>
          </div>
        </div>

        {/* Table */}
        <div className="panel">
          <div className="panel-h">
            <span>Email Settings</span>
            <span className="small" style={{ color: "var(--muted)" }}>
              {loading ? "Loading…" : `Total: ${total || dataToRender.length}`}
            </span>
          </div>

          <div className="panel-b">
            {err && <Banner type="err">{err}</Banner>}
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 90 }}>Action</th>
                    <th>Property</th>
                    <th>Provider</th>
                    <th>Host</th>
                    <th>Port</th>
                    <th>Username</th>
                    <th>From</th>
                    <th>TLS</th>
                    <th>Active</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={10}>No email settings found</td></tr>
                  )}

                  {dataToRender?.map(r => {
                    const id = r._id || r.id;
                    return (
                      <tr key={id}>
                        <td>
                          <button className="btn" style={btnSm} onClick={() => openEdit(r)}>✏️</button>
                          <button className="btn" style={btnSm} onClick={() => askDelete(r)}>🗑️</button>
                        </td>
                        <td>{r.propertyCode || "—"}</td>
                        <td>{r.provider}</td>
                        <td>{r.host || "—"}</td>
                        <td>{r.port || "—"}</td>
                        <td>{r.username || "—"}</td>
                        <td>{r.fromName ? `${r.fromName} <${r.fromEmail || ""}>` : (r.fromEmail || "—")}</td>
                        <td><OnOff value={r.tls || r.secure} /></td>
                        <td><OnOff value={r.isActive} /></td>
                        <td>{fmtDate(r.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
              <button className="btn" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>‹ Prev</button>
              <span className="small" style={{ alignSelf: "center", color: "var(--muted)" }}>Page {page}</span>
              <button
                className="btn"
                disabled={loading || (!total ? dataToRender.length < limit : page * limit >= total)}
                onClick={() => setPage(p => p + 1)}
              >
                Next ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <EmailSettingFormModal
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={afterSave}
        />
      )}

      {showDelete && (
        <ConfirmModal
          title="Delete Email Setting?"
          message={`Delete provider "${toDelete?.provider}" for ${toDelete?.propertyCode || "GLOBAL"}? This cannot be undone.`}
          confirmText="Delete"
          onClose={() => { setShowDelete(false); setToDelete(null); }}
          onConfirm={async () => {
            const id = toDelete?._id || toDelete?.id;
            await apiFetch(`/api/email-settings/${id}`, { method: "DELETE", auth: true });
            afterDelete(id);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Form Modal ---------- */
function EmailSettingFormModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial;

  const [propertyCode, setPropertyCode] = useState(initial?.propertyCode || "");
  const [provider, setProvider] = useState(initial?.provider || "SMTP");

  // SMTP-like fields
  const [host, setHost] = useState(initial?.host || "");
  const [port, setPort] = useState(initial?.port || 587);
  const [username, setUsername] = useState(initial?.username || "");
  const [password, setPassword] = useState("");
  const [hasPassword] = useState(!!initial?.hasPassword);
  const [setNewPassword, setSetNewPassword] = useState(false);
  const [secure, setSecure] = useState(initial?.secure ?? false);
  const [tls, setTls] = useState(initial?.tls ?? true);

  // API providers
  const [apiKey, setApiKey] = useState("");
  const [hasApiKey] = useState(!!initial?.hasApiKey);
  const [setNewApiKey, setSetNewApiKey] = useState(false);
  const [domain, setDomain] = useState(initial?.domain || "");
  const [region, setRegion] = useState(initial?.region || "");

  // Common
  const [fromName, setFromName] = useState(initial?.fromName || "");
  const [fromEmail, setFromEmail] = useState(initial?.fromEmail || "");
  const [replyTo, setReplyTo] = useState(initial?.replyTo || "");
  const [rateLimitPerMin, setRateLimitPerMin] = useState(initial?.rateLimitPerMin ?? 60);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [defaultForProperty, setDefaultForProperty] = useState(initial?.defaultForProperty ?? false);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [testTo, setTestTo] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");

    if (!fromEmail.trim()) return setErr("From Email is required");

    const payload = {
      propertyCode: (propertyCode || "").trim().toUpperCase(),
      provider,
      host: host.trim(),
      port: Number(port || 0),
      username: username.trim(),
      secure: !!secure,
      tls: !!tls,
      fromName: fromName.trim(),
      fromEmail: fromEmail.trim(),
      replyTo: replyTo.trim(),
      domain: domain.trim(),
      region: region.trim(),
      rateLimitPerMin: Number(rateLimitPerMin || 0),
      isActive: !!isActive,
      defaultForProperty: !!defaultForProperty,
    };

    if (setNewPassword && password) payload.password = password;
    if (setNewApiKey && apiKey) payload.apiKey = apiKey;

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const id = initial._id || initial.id;
        saved = await apiFetch(`/api/email-settings/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(payload) });
      } else {
        saved = await apiFetch("/api/email-settings", { method: "POST", auth: true, body: JSON.stringify(payload) });
      }
      setOk("Saved.");
      onSaved(saved);
    } catch (e2) {
      setErr(e2?.message || "Failed to save email setting.");
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setErr(""); setOk("");
    if (!isEdit) return setErr("Save the setting first, then test.");
    if (!testTo.trim()) return setErr("Enter a test recipient email.");
    try {
      const id = initial._id || initial.id;
      const res = await apiFetch(`/api/email-settings/${id}/test`, {
        method: "POST", auth: true, body: JSON.stringify({ to: testTo })
      });
      if (res?.ok) setOk("Test email queued/sent.");
      else setErr(res?.message || "Failed to send test.");
    } catch (e) { setErr(e?.message || "Failed to send test."); }
  };

  const showSmtp = provider === "SMTP" || provider === "CUSTOM";
  const showApi  = ["SENDGRID", "MAILGUN", "AWS_SES", "POSTMARK"].includes(provider);

  return (
    <Modal title={isEdit ? "Edit Email Setting" : "Add Email Setting"} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      {ok && <Banner type="ok">{ok}</Banner>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <Row>
          <Field label="Property Code">
            <input className="input" value={propertyCode} onChange={e => setPropertyCode(e.target.value)} placeholder="(optional) e.g. TRUSTJAIPUR" />
          </Field>
          <Field label="Provider">
            <select className="res-select" value={provider} onChange={e => setProvider(e.target.value)}>
              {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Default for Property">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={defaultForProperty} onChange={e => setDefaultForProperty(e.target.checked)} />
              <span>{defaultForProperty ? "Yes" : "No"}</span>
            </label>
          </Field>
        </Row>

        {showSmtp && (
          <>
            <Row>
              <Field label="SMTP Host"><input className="input" value={host} onChange={e => setHost(e.target.value)} placeholder="smtp.mail.com" /></Field>
              <Field label="SMTP Port"><input className="input" type="number" value={port} onChange={e => setPort(e.target.value)} placeholder="587" /></Field>
              <Field label="Username"><input className="input" value={username} onChange={e => setUsername(e.target.value)} /></Field>
            </Row>
            <Row>
              <Field label="Password">
                {!isEdit || setNewPassword ? (
                  <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={isEdit ? "Set new password" : ""} />
                ) : (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className="small" style={{ color: "var(--muted)" }}>{hasPassword ? "•••••• (saved)" : "Not set"}</span>
                    <button className="btn" type="button" style={btnSm} onClick={() => setSetNewPassword(true)}>Set new</button>
                  </div>
                )}
              </Field>
              <Field label="Use SSL (secure)">
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={secure} onChange={e => setSecure(e.target.checked)} />
                  <span>{secure ? "Yes" : "No"}</span>
                </label>
              </Field>
              <Field label="Enable TLS (STARTTLS)">
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={tls} onChange={e => setTls(e.target.checked)} />
                  <span>{tls ? "Yes" : "No"}</span>
                </label>
              </Field>
            </Row>
          </>
        )}

        {showApi && (
          <>
            <Row>
              <Field label="API Key">
                {!isEdit || setNewApiKey ? (
                  <input className="input" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={isEdit ? "Set new API key" : ""} />
                ) : (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className="small" style={{ color: "var(--muted)" }}>{hasApiKey ? "•••••• (saved)" : "Not set"}</span>
                    <button className="btn" type="button" style={btnSm} onClick={() => setSetNewApiKey(true)}>Set new</button>
                  </div>
                )}
              </Field>
              <Field label="Domain (Mailgun/Postmark)">
                <input className="input" value={domain} onChange={e => setDomain(e.target.value)} placeholder="mg.example.com / server.postmarkapp.com" />
              </Field>
              <Field label="Region (AWS SES)">
                <input className="input" value={region} onChange={e => setRegion(e.target.value)} placeholder="ap-south-1" />
              </Field>
            </Row>
          </>
        )}

        <Row>
          <Field label="From Name"><input className="input" value={fromName} onChange={e => setFromName(e.target.value)} placeholder="Hotel Name" /></Field>
          <Field label="From Email" required><input className="input" value={fromEmail} onChange={e => setFromEmail(e.target.value)} placeholder="noreply@hotel.com" /></Field>
          <Field label="Reply-To"><input className="input" value={replyTo} onChange={e => setReplyTo(e.target.value)} placeholder="support@hotel.com" /></Field>
        </Row>

        <Row>
          <Field label="Rate Limit/min">
            <input className="input" type="number" min="0" value={rateLimitPerMin} onChange={e => setRateLimitPerMin(e.target.value)} />
          </Field>
          <Field label="Active">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              <span>{isActive ? "Yes" : "No"}</span>
            </label>
          </Field>
          {isEdit && (
            <Field label="Send Test">
              <div style={{ display: "flex", gap: 8 }}>
                <input className="input" placeholder="recipient@example.com" value={testTo} onChange={e => setTestTo(e.target.value)} />
                <button className="btn" type="button" onClick={sendTest}>Send</button>
              </div>
            </Field>
          )}
        </Row>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? "Saving…" : (isEdit ? "Update" : "Create")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Tiny UI helpers ---------- */
function Row({ children }) { return <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(160px, 1fr))" }}>{children}</div>; }
function Field({ label, required, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span className="label" style={{ fontWeight: 700 }}>{label} {required && <span style={{ color: "#b91c1c" }}>*</span>}</span>
      {children}
    </label>
  );
}
function Banner({ type = "ok", children }) {
  const style = type === "err"
    ? { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }
    : { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
  return <div style={{ ...style, padding: "8px 10px", borderRadius: 10, fontWeight: 700, marginBottom: 10 }}>{children}</div>;
}
function Modal({ title, onClose, children }) {
  return (
    <div style={backdropStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} aria-label="Close" style={xStyle}>×</button>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>
  );
}
function ConfirmModal({ title, message, confirmText = "OK", onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={onClose}>
      <p style={{ marginTop: 0 }}>{message}</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn" type="button" onClick={onClose}>Cancel</button>
        <button className="btn" type="button" disabled={busy} onClick={async () => { setBusy(true); try { await onConfirm?.(); onClose(); } finally { setBusy(false); } }}>
          {busy ? "Working…" : confirmText}
        </button>
      </div>
    </Modal>
  );
}
function OnOff({ value }) {
  const on = !!value;
  return (
    <span style={{
      display: "inline-block", padding: ".15rem .5rem",
      borderRadius: 999, background: on ? "#ecfdf5" : "#f3f4f6",
      border: `1px solid ${on ? "#a7f3d0" : "#e5e7eb"}`,
      color: on ? "#15803d" : "#334155", fontSize: ".75rem", fontWeight: 700
    }}>
      {on ? "Yes" : "No"}
    </span>
  );
}
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(900px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };
function fmtDate(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(dt) ? "—" : dt.toLocaleDateString(); }
