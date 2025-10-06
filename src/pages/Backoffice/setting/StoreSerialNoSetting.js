// src/pages/Backoffice/setting/StoreSerialNoSetting.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { BackofficeSidebar } from "../../../components/sidebar/backofficesidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

const PAGE_SIZE = 10;

export default function StoreSerialNoSetting() {
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
      setLoading(true);
      setErr("");
      try {
        const params = new URLSearchParams({ q, page, limit });
        const res = await apiFetch(`/api/serial-settings?${params.toString()}`, { auth: true });
        const data = res?.data || res || [];
        const count = res?.total ?? data.length ?? 0;
        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number(count) || 0);
        }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load settings."); setRows([]); setTotal(0); }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [q, page, limit]);

  // Client search
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [r.propertyCode, r.docType, r.storeCode, r.prefix, r.datePattern, r.suffix]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  const dataToRender = rows?.length && total > rows.length ? rows : filtered;

  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit = (row) => { setEditing(row); setShowForm(true); };
  const askDelete = (row) => { setToDelete(row); setShowDelete(true); };

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
          <h2 style={{ margin: 0 }}>Store Serial No. Setting</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="res-select"
              placeholder="Search (property / doc / store / prefix / suffix)"
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
            <button className="btn" onClick={openCreate}>+ Add</button>
          </div>
        </div>

        {/* Table */}
        <div className="panel">
          <div className="panel-h">
            <span>Serial No. Formats</span>
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
                    <th style={{ width: 88 }}>Action</th>
                    <th>Property</th>
                    <th>Doc Type</th>
                    <th>Store</th>
                    <th>Prefix</th>
                    <th>Date</th>
                    <th>Suffix</th>
                    <th>Pad</th>
                    <th>Next</th>
                    <th>Reset</th>
                    <th>Active</th>
                    <th>Sample</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={13}>No settings found</td></tr>
                  )}

                  {dataToRender?.map(r => {
                    const id = r._id || r.id;
                    return (
                      <tr key={id}>
                        <td>
                          <button className="btn" style={btnSm} onClick={() => openEdit(r)}>✏️</button>
                          <button className="btn" style={btnSm} onClick={() => askDelete(r)}>🗑️</button>
                        </td>
                        <td>{r.propertyCode}</td>
                        <td>{r.docType}</td>
                        <td>{r.storeCode || "—"}</td>
                        <td>{r.prefix || "—"}</td>
                        <td>{r.datePattern || "—"}</td>
                        <td>{r.suffix || "—"}</td>
                        <td>{r.padLength}</td>
                        <td>{r.nextNumber}</td>
                        <td>{r.resetFrequency}</td>
                        <td><OnOff value={r.isActive} /></td>
                        <td><code>{sampleSerial(r)}</code></td>
                        <td>{fmtDate(r.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
              <button className="btn" disabled={page <= 1 || loading}
                onClick={() => setPage(p => Math.max(1, p - 1))}>‹ Prev</button>
              <span className="small" style={{ alignSelf: "center", color: "var(--muted)" }}>Page {page}</span>
              <button className="btn"
                disabled={loading || (!total ? dataToRender.length < limit : page * limit >= total)}
                onClick={() => setPage(p => p + 1)}>Next ›</button>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <SerialFormModal
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={afterSave}
        />
      )}

      {showDelete && (
        <ConfirmModal
          title="Delete Setting?"
          message={`Delete serial setting for ${toDelete?.docType} (${toDelete?.propertyCode}${toDelete?.storeCode ? " / " + toDelete.storeCode : ""})? This cannot be undone.`}
          confirmText="Delete"
          onClose={() => { setShowDelete(false); setToDelete(null); }}
          onConfirm={async () => {
            const id = toDelete?._id || toDelete?.id;
            await apiFetch(`/api/serial-settings/${id}`, { method: "DELETE", auth: true });
            afterDelete(id);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Form Modal ---------- */
function SerialFormModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [propertyCode, setPropertyCode] = useState(initial?.propertyCode || "");
  const [docType, setDocType] = useState(initial?.docType || "INVOICE");
  const [storeCode, setStoreCode] = useState(initial?.storeCode || "");
  const [prefix, setPrefix] = useState(initial?.prefix || "");
  const [datePattern, setDatePattern] = useState(initial?.datePattern || "YYYYMM");
  const [suffix, setSuffix] = useState(initial?.suffix || "");
  const [padLength, setPadLength] = useState(initial?.padLength ?? 4);
  const [nextNumber, setNextNumber] = useState(initial?.nextNumber ?? 1);
  const [resetFrequency, setResetFrequency] = useState(initial?.resetFrequency || "YEARLY");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");

    if (!propertyCode.trim()) return setErr("Property code is required");
    if (!docType.trim()) return setErr("Doc type is required");

    const payload = {
      propertyCode: propertyCode.trim().toUpperCase(),
      docType: docType.trim().toUpperCase(),
      storeCode: storeCode.trim().toUpperCase(),
      prefix: prefix.trim(),
      datePattern: datePattern || "NONE",
      suffix: suffix.trim(),
      padLength: Math.max(1, Math.min(12, Number(padLength || 4))),
      nextNumber: Math.max(1, Number(nextNumber || 1)),
      resetFrequency,
      isActive: !!isActive,
    };

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const id = initial._id || initial.id;
        saved = await apiFetch(`/api/serial-settings/${id}`, {
          method: "PATCH", auth: true, body: JSON.stringify(payload),
        });
      } else {
        saved = await apiFetch("/api/serial-settings", {
          method: "POST", auth: true, body: JSON.stringify(payload),
        });
      }
      setOk("Saved.");
      onSaved(saved);
    } catch (e2) {
      setErr(e2?.message || "Failed to save.");
    } finally { setSaving(false); }
  };

  const preview = sampleSerial({
    prefix, datePattern, suffix, padLength, nextNumber,
  });

  return (
    <Modal title={isEdit ? "Edit Serial Setting" : "Create Serial Setting"} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      {ok && <Banner type="ok">{ok}</Banner>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <Row>
          <Field label="Property Code" required>
            <input className="input" value={propertyCode} onChange={(e) => setPropertyCode(e.target.value)} />
          </Field>
          <Field label="Doc Type" required>
            <select className="res-select" value={docType} onChange={(e) => setDocType(e.target.value)}>
              {["INVOICE","RESERVATION","KOT","GRN","ISSUE","TRANSFER","ADJUSTMENT","RECEIPT","PAYMENT","VOUCHER"]
                .map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Store Code (optional)">
            <input className="input" value={storeCode} onChange={(e) => setStoreCode(e.target.value)} />
          </Field>
        </Row>

        <Row>
          <Field label="Prefix"><input className="input" value={prefix} onChange={(e) => setPrefix(e.target.value)} /></Field>
          <Field label="Date Pattern">
            <select className="res-select" value={datePattern} onChange={(e) => setDatePattern(e.target.value)}>
              {["NONE","YYYY","YY","YYYYMM","YYYYMMDD","MMYY","FY"].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Suffix"><input className="input" value={suffix} onChange={(e) => setSuffix(e.target.value)} /></Field>
        </Row>

        <Row>
          <Field label="Pad Length">
            <input className="input" type="number" min="1" max="12" value={padLength} onChange={(e) => setPadLength(e.target.value)} />
          </Field>
          <Field label="Next Number">
            <input className="input" type="number" min="1" value={nextNumber} onChange={(e) => setNextNumber(e.target.value)} />
          </Field>
          <Field label="Reset">
            <select className="res-select" value={resetFrequency} onChange={(e) => setResetFrequency(e.target.value)}>
              {["NEVER","DAILY","MONTHLY","YEARLY"].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
        </Row>

        <Row>
          <Field label="Active">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <span>{isActive ? "Yes" : "No"}</span>
            </label>
          </Field>
          <Field label="Sample (preview)">
            <code style={{ display: "inline-block", padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: 8 }}>
              {preview}
            </code>
          </Field>
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

/* ---------- Helpers, atoms ---------- */
function sampleSerial(r) {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const yy = yyyy.slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const fy = (() => { // FY in India: Apr–Mar
    const y = now.getMonth() + 1 <= 3 ? now.getFullYear() - 1 : now.getFullYear();
    return `${String(y).slice(-2)}-${String(y + 1).slice(-2)}`;
  })();

  let datePart = "";
  switch ((r.datePattern || "NONE").toUpperCase()) {
    case "YYYY": datePart = yyyy; break;
    case "YY": datePart = yy; break;
    case "YYYYMM": datePart = `${yyyy}${mm}`; break;
    case "YYYYMMDD": datePart = `${yyyy}${mm}${dd}`; break;
    case "MMYY": datePart = `${mm}${yy}`; break;
    case "FY": datePart = fy; break;
    default: datePart = "";
  }

  const num = String(Math.max(1, Number(r.nextNumber || 1))).padStart(Math.max(1, Number(r.padLength || 4)), "0");
  const parts = [r.prefix, datePart, num, r.suffix].filter(Boolean);
  return parts.join("/");
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
