// src/pages/Backoffice/qr/QRMenuSetting.js
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { BackofficeSidebar } from "../../../components/sidebar/backofficesidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

/**
 * Optional (recommended) dependency for preview/download:
 *   npm i qrcode
 */
let QR;
(async () => {
  try {
    const mod = await import("qrcode");
    QR = mod.default || mod;
  } catch (_) {
    // library not installed; preview/download will be disabled
  }
})();

const PAGE_SIZE = 10;
const TYPES = ["MENU", "OUTLET", "TABLE", "CUSTOM"];

export default function QRMenuSettingPage() {
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

  // Load list
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true); setErr("");
      try {
        const params = new URLSearchParams({ q, page, limit });
        const res = await apiFetch(`/api/qr-menu-settings?${params.toString()}`, { auth: true });
        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;
        if (!ignore) { setRows(Array.isArray(data) ? data : []); setTotal(Number(count) || 0); }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load QR menu settings."); setRows([]); setTotal(0); }
      } finally { if (!ignore) setLoading(false); }
    })();
    return () => { ignore = true; };
  }, [q, page, limit]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [r.code, r.label, r.type, r.targetUrl].filter(Boolean)
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
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>QR Menu Setting</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="res-select"
              placeholder="Search (code / label / type / url)"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              style={{ minWidth: 320 }}
            />
            <select
              className="res-select"
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            >
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
            <button className="btn" onClick={openCreate}>+ Add QR</button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-h">
            <span>QR Items</span>
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
                    <th style={{ width: 110 }}>Action</th>
                    <th>Code</th>
                    <th>Label</th>
                    <th>Type</th>
                    <th>Target URL</th>
                    <th>Params</th>
                    <th>Size</th>
                    <th>Active</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={9}>No QR items found</td></tr>
                  )}

                  {dataToRender?.map(r => {
                    const id = r._id || r.id;
                    const params = (r.params || []).map(p => `${p.key}=${p.value}`).join("&");
                    return (
                      <tr key={id}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="btn" style={btnSm} onClick={() => openEdit(r)}>✏️</button>
                          <button className="btn" style={btnSm} onClick={() => askDelete(r)}>🗑️</button>
                          <QRDownloadButton item={r} />
                        </td>
                        <td>{r.code}</td>
                        <td>{r.label}</td>
                        <td>{r.type}</td>
                        <td title={buildUrl(r.targetUrl, r.params)} style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {buildUrl(r.targetUrl, r.params)}
                        </td>
                        <td title={params} style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {params || "—"}
                        </td>
                        <td>{(r.size || 256) + "px"}</td>
                        <td><OnOff value={r.isActive} /></td>
                        <td>{fmtDate(r.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

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
        <QRFormModal
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={afterSave}
        />
      )}

      {showDelete && (
        <ConfirmModal
          title="Delete QR?"
          message={`Delete "${toDelete?.label}" (${toDelete?.code})? This cannot be undone.`}
          confirmText="Delete"
          onClose={() => { setShowDelete(false); setToDelete(null); }}
          onConfirm={async () => {
            const id = toDelete?._id || toDelete?.id;
            await apiFetch(`/api/qr-menu-settings/${id}`, { method: "DELETE", auth: true });
            afterDelete(id);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Form Modal ---------- */
function QRFormModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial;

  const [code, setCode] = useState(initial?.code || "");
  const [label, setLabel] = useState(initial?.label || "");
  const [type, setType] = useState(initial?.type || "MENU");
  const [targetUrl, setTargetUrl] = useState(initial?.targetUrl || "");
  const [params, setParams] = useState(initial?.params || []); // [{key,value}]
  const [size, setSize] = useState(initial?.size || 256);
  const [margin, setMargin] = useState(initial?.margin ?? 2);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const canvasRef = useRef(null);
  const url = buildUrl(targetUrl, params);

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!QR || !canvasRef.current) return;
      try {
        await QR.toCanvas(canvasRef.current, url || " ", { width: Number(size || 256), margin: Number(margin || 2) });
      } catch (_) {}
    })();
    return () => { ignore = true; };
  }, [url, size, margin]);

  const addParam = () => setParams([...params, { key: "", value: "" }]);
  const editParam = (idx, next) => setParams(params.map((p, i) => i === idx ? next : p));
  const removeParam = (idx) => setParams(params.filter((_, i) => i !== idx));

  const copyUrl = async () => {
    try { await navigator.clipboard.writeText(url); setOk("Link copied."); setTimeout(() => setOk(""), 1000); } catch {}
  };

  const downloadPng = async () => {
    if (!QR) return setErr("Install 'qrcode' to enable download: npm i qrcode");
    const dataUrl = await QR.toDataURL(url || " ", { width: Number(size || 256), margin: Number(margin || 2) });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${(code || "qr").toLowerCase()}.png`;
    a.click();
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");

    if (!code.trim()) return setErr("Code is required");
    if (!label.trim()) return setErr("Label is required");
    if (!targetUrl.trim()) return setErr("Target URL is required");

    const cleanParams = (params || [])
      .filter(p => String(p.key || "").trim() !== "")
      .map(p => ({ key: String(p.key).trim(), value: String(p.value ?? "").trim() }));

    const payload = {
      code: code.trim().toUpperCase(),
      label: label.trim(),
      type,
      targetUrl: targetUrl.trim(),
      params: cleanParams,
      size: Number(size || 256),
      margin: Number(margin || 2),
      isActive: !!isActive,
    };

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const id = initial._id || initial.id;
        saved = await apiFetch(`/api/qr-menu-settings/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(payload) });
      } else {
        saved = await apiFetch("/api/qr-menu-settings", { method: "POST", auth: true, body: JSON.stringify(payload) });
      }
      setOk("Saved.");
      onSaved(saved);
    } catch (e2) {
      setErr(e2?.message || "Failed to save QR.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit QR" : "Add QR"} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      {ok && <Banner type="ok">{ok}</Banner>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <Row>
          <Field label="Code" required>
            <input className="input" value={code} onChange={e => setCode(e.target.value)} placeholder="Unique code (e.g. MENU-A1)" />
          </Field>
          <Field label="Label" required>
            <input className="input" value={label} onChange={e => setLabel(e.target.value)} placeholder="Display name" />
          </Field>
          <Field label="Type">
            <select className="res-select" value={type} onChange={e => setType(e.target.value)}>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
        </Row>

        <Row>
          <Field label="Target URL" required>
            <input className="input" value={targetUrl} onChange={e => setTargetUrl(e.target.value)} placeholder="https://yourdomain.com/menu" />
          </Field>
          <Field label="Size (px)">
            <input className="input" type="number" min="64" max="1024" value={size} onChange={e => setSize(e.target.value)} />
          </Field>
          <Field label="Margin">
            <input className="input" type="number" min="0" max="8" value={margin} onChange={e => setMargin(e.target.value)} />
          </Field>
        </Row>

        <div className="panel" style={{ marginTop: 8 }}>
          <div className="panel-h">Query Params</div>
          <div className="panel-b" style={{ display: "grid", gap: 8 }}>
            {params.map((p, idx) => (
              <div key={idx} style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr auto" }}>
                <input className="input" placeholder="key (e.g. outlet)" value={p.key} onChange={e => editParam(idx, { ...p, key: e.target.value })} />
                <input className="input" placeholder="value (e.g. cafe1)" value={p.value} onChange={e => editParam(idx, { ...p, value: e.target.value })} />
                <div style={{ textAlign: "right" }}>
                  <button type="button" className="btn" style={btnSm} onClick={() => removeParam(idx)}>Remove</button>
                </div>
              </div>
            ))}
            <div>
              <button type="button" className="btn" onClick={addParam}>+ Add Param</button>
            </div>
          </div>
        </div>

        <Row>
          <Field label="Active">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              <span>{isActive ? "Yes" : "No"}</span>
            </label>
          </Field>
          <Field label="Final Link">
            <div style={{ display: "flex", gap: 8 }}>
              <input className="input" value={url} onChange={() => {}} readOnly />
              <button className="btn" type="button" onClick={copyUrl}>Copy</button>
            </div>
          </Field>
          <Field label="Preview">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <canvas ref={canvasRef} style={{ border: "1px solid #e5e7eb", borderRadius: 8 }} />
              <button className="btn" type="button" onClick={downloadPng} title={QR ? "" : "Install 'qrcode' to enable"} disabled={!QR}>
                Download PNG
              </button>
            </div>
          </Field>
        </Row>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? "Saving…" : (isEdit ? "Update" : "Create")}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Small bits ---------- */
function QRDownloadButton({ item }) {
  const downloading = useRef(false);
  const onClick = async () => {
    if (!QR || downloading.current) return;
    downloading.current = true;
    try {
      const url = buildUrl(item.targetUrl, item.params);
      const dataUrl = await QR.toDataURL(url || " ", { width: Number(item.size || 256), margin: Number(item.margin ?? 2) });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${(item.code || "qr").toLowerCase()}.png`;
      a.click();
    } catch (_) {}
    downloading.current = false;
  };
  return (
    <button className="btn" style={btnSm} onClick={onClick} title={QR ? "" : "Install 'qrcode' to enable"} disabled={!QR}>
      ⬇️
    </button>
  );
}

function buildUrl(base, params = []) {
  const b = String(base || "").trim();
  if (!b) return "";
  const usp = new URLSearchParams();
  (params || []).forEach(p => {
    const k = String(p?.key || "").trim();
    if (!k) return;
    usp.append(k, String(p?.value ?? "").trim());
  });
  const hasQuery = b.includes("?");
  const qs = usp.toString();
  return qs ? `${b}${hasQuery ? "&" : "?"}${qs}` : b;
}

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
      {on ? "Active" : "Inactive"}
    </span>
  );
}
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(900px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };
function fmtDate(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(dt) ? "—" : dt.toLocaleDateString(); }
