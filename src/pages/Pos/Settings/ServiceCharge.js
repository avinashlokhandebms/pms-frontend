// src/pages/Backoffice/common/ServiceCharge.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import PosSidebar, { BackofficeSidebar } from "../../../components/sidebar/Possidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

const PAGE_SIZE = 10;
const LS_PROP_KEY = "currentPropertyCode";

const MODES = ["PERCENT", "FIXED"]; // percent of bill vs fixed amount
const SCOPES = ["ALL", "DINE_IN", "TAKEAWAY", "DELIVERY", "ROOM"];
const APPLY_ON = ["TOTAL", "FOOD_ONLY", "BEV_ONLY", "NON_DISCOUNTED"];

export default function ServiceCharge() {
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

  const propertyCode = getPropertyCode();

  // Load list
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const params = new URLSearchParams({ q, page, limit });
        if (propertyCode) params.set("propertyCode", propertyCode);
        const res = await apiFetch(`/api/service-charges?${params.toString()}`, { auth: true });
        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;
        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number(count) || 0);
        }
      } catch (e) {
        if (!ignore) {
          setErr(e?.message || "Failed to load service charges.");
          setRows([]); setTotal(0);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [q, page, limit, propertyCode]);

  // Client search fallback
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [r.code, r.name, r.mode, r.scope, r.applyOn, r.taxGroup, r.description]
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
      <PosSidebar />

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Service Charge</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              className="res-select"
              placeholder="Search (code / name / mode / scope / tax group)"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              style={{ minWidth: 360 }}
            />
            <select
              className="res-select"
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              title="Rows per page"
            >
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
            <button className="btn" onClick={openCreate}>+ Add Service Charge</button>
          </div>
        </div>

        {/* Table */}
        <div className="panel">
          <div className="panel-h">
            <span>Configured Service Charges {propertyCode ? `— ${propertyCode}` : ""}</span>
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
                    <th>Code</th>
                    <th>Name</th>
                    <th>Mode</th>
                    <th style={{ textAlign: "right" }}>Rate / Amount</th>
                    <th>Apply On</th>
                    <th>Scope</th>
                    <th>Min Bill</th>
                    <th>Max Bill</th>
                    <th>Taxable</th>
                    <th>Tax Group</th>
                    <th>Default</th>
                    <th>Active</th>
                    <th>Created</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={15}>No service charges found</td></tr>
                  )}

                  {dataToRender?.map(r => {
                    const id = r._id || r.id;
                    const rateCell = r.mode === "PERCENT" ? fmtPct(r.ratePct) : fmtMoney(r.amount);
                    return (
                      <tr key={id}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="btn" style={btnSm} onClick={() => openEdit(r)}>✏️</button>
                          <button className="btn" style={btnSm} onClick={() => askDelete(r)}>🗑️</button>
                        </td>
                        <td>{r.code}</td>
                        <td title={r.description}>{r.name}</td>
                        <td>{r.mode}</td>
                        <td style={{ textAlign: "right" }}>{rateCell}</td>
                        <td>{r.applyOn || "—"}</td>
                        <td>{r.scope || "ALL"}</td>
                        <td style={{ textAlign: "right" }}>{fmtMoney(r.minBill) || "—"}</td>
                        <td style={{ textAlign: "right" }}>{fmtMoney(r.maxBill) || "—"}</td>
                        <td><OnOff value={r.isTaxable} /></td>
                        <td>{r.taxGroup || "—"}</td>
                        <td><OnOff value={r.isDefault} /></td>
                        <td><OnOff value={r.isActive} /></td>
                        <td>{fmtDate(r.createdAt)}</td>
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
                onClick={() => setPage(p => Math.max(1, p - 1))}>
                ‹ Prev
              </button>
              <span className="small" style={{ alignSelf: "center", color: "var(--muted)" }}>Page {page}</span>
              <button className="btn"
                disabled={loading || (!total ? dataToRender.length < limit : page * limit >= total)}
                onClick={() => setPage(p => p + 1)}>
                Next ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <ServiceChargeFormModal
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={afterSave}
        />
      )}

      {showDelete && (
        <ConfirmModal
          title="Delete Service Charge?"
          message={`Delete "${toDelete?.name}" (${toDelete?.code})? This cannot be undone.`}
          confirmText="Delete"
          onClose={() => { setShowDelete(false); setToDelete(null); }}
          onConfirm={async () => {
            const id = toDelete?._id || toDelete?.id;
            await apiFetch(`/api/service-charges/${id}`, { method: "DELETE", auth: true });
            afterDelete(id);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Form Modal ---------- */
function ServiceChargeFormModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const propertyCode = getPropertyCode();

  const [code, setCode] = useState(initial?.code || "");
  const [name, setName] = useState(initial?.name || "");
  const [mode, setMode] = useState(initial?.mode || "PERCENT");
  const [ratePct, setRatePct] = useState(initial?.ratePct ?? 10);
  const [amount, setAmount] = useState(initial?.amount ?? 0);
  const [applyOn, setApplyOn] = useState(initial?.applyOn || "TOTAL");
  const [scope, setScope] = useState(initial?.scope || "ALL");
  const [minBill, setMinBill] = useState(initial?.minBill ?? 0);
  const [maxBill, setMaxBill] = useState(initial?.maxBill ?? 0);
  const [isTaxable, setIsTaxable] = useState(initial?.isTaxable ?? true);
  const [taxGroup, setTaxGroup] = useState(initial?.taxGroup || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");

    if (!code.trim()) return setErr("Code is required");
    if (!name.trim()) return setErr("Name is required");
    if (!MODES.includes(mode)) return setErr("Invalid mode");
    if (!APPLY_ON.includes(applyOn)) return setErr("Invalid 'Apply On'");
    if (!SCOPES.includes(scope)) return setErr("Invalid scope");

    const payload = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      mode,
      ratePct: mode === "PERCENT" ? Number(ratePct || 0) : undefined,
      amount: mode === "FIXED" ? Number(amount || 0) : undefined,
      applyOn,
      scope,
      minBill: Number(minBill || 0) || 0,
      maxBill: Number(maxBill || 0) || 0,
      isTaxable: !!isTaxable,
      taxGroup: taxGroup.trim(),
      description,
      isDefault: !!isDefault,
      isActive: !!isActive,
      // optional scope
      propertyCode: propertyCode || undefined,
    };

    // simple validations
    if (mode === "PERCENT" && (payload.ratePct < 0 || payload.ratePct > 100)) {
      return setErr("Percent must be between 0 and 100");
    }
    if (mode === "FIXED" && payload.amount < 0) {
      return setErr("Amount cannot be negative");
    }
    if (payload.maxBill && payload.minBill && payload.maxBill < payload.minBill) {
      return setErr("Max Bill should be >= Min Bill");
    }

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const id = initial._id || initial.id;
        saved = await apiFetch(`/api/service-charges/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(payload) });
      } else {
        saved = await apiFetch("/api/service-charges", { method: "POST", auth: true, body: JSON.stringify(payload) });
      }
      setOk("Saved.");
      onSaved(saved);
    } catch (e2) {
      setErr(e2?.message || "Failed to save service charge.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Service Charge" : "Create Service Charge"} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      {ok && <Banner type="ok">{ok}</Banner>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <Row>
          <Field label="Code" required>
            <input className="input" value={code} onChange={e => setCode(e.target.value)} />
          </Field>
          <Field label="Name" required>
            <input className="input" value={name} onChange={e => setName(e.target.value)} />
          </Field>
          <Field label="Mode">
            <select className="res-select" value={mode} onChange={e => setMode(e.target.value)}>
              {MODES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
        </Row>

        <Row>
          {mode === "PERCENT" ? (
            <Field label="Rate %">
              <input className="input" type="number" min="0" max="100" step="0.01" value={ratePct} onChange={e => setRatePct(e.target.value)} />
            </Field>
          ) : (
            <Field label="Amount">
              <input className="input" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
            </Field>
          )}
          <Field label="Apply On">
            <select className="res-select" value={applyOn} onChange={e => setApplyOn(e.target.value)}>
              {APPLY_ON.map(a => <option key={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Scope">
            <select className="res-select" value={scope} onChange={e => setScope(e.target.value)}>
              {SCOPES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </Row>

        <Row>
          <Field label="Min Bill">
            <input className="input" type="number" min="0" step="0.01" value={minBill} onChange={e => setMinBill(e.target.value)} />
          </Field>
          <Field label="Max Bill">
            <input className="input" type="number" min="0" step="0.01" value={maxBill} onChange={e => setMaxBill(e.target.value)} />
          </Field>
          <Field label="Tax Group">
            <input className="input" placeholder="e.g. GST-18" value={taxGroup} onChange={e => setTaxGroup(e.target.value)} />
          </Field>
        </Row>

        <Row>
          <Field label="Description">
            <input className="input" value={description} onChange={e => setDescription(e.target.value)} />
          </Field>
          <Field label="Taxable">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={isTaxable} onChange={e => setIsTaxable(e.target.checked)} />
              <span>{isTaxable ? "Yes" : "No"}</span>
            </label>
          </Field>
          <div />
        </Row>

        {!!propertyCode && (
          <Row>
            <Field label="Property (scope)">
              <input className="input" value={propertyCode} disabled />
            </Field>
            <div />
            <div />
          </Row>
        )}

        <Row>
          <Field label="Default">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} />
              <span>{isDefault ? "Yes" : "No"}</span>
            </label>
          </Field>
          <Field label="Active">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              <span>{isActive ? "Yes" : "No"}</span>
            </label>
          </Field>
          <div />
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

/* ---------- Small UI atoms ---------- */
function Row({ children }) { return <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(160px, 1fr))" }}>{children}</div>; }
function Field({ label, required, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span className="label" style={{ fontWeight: 700 }}>
        {label}{required && <span style={{ color: "#b91c1c" }}>*</span>}
      </span>
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
        <button className="btn" type="button" disabled={busy} onClick={async () => {
          setBusy(true); try { await onConfirm?.(); onClose(); } finally { setBusy(false); }
        }}>
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
function fmtPct(n) { if (n === null || n === undefined || n === "") return "—"; const v = Number(n); if (Number.isNaN(v)) return "—"; return `${v.toFixed(Math.abs(v) < 1 && v !== 0 ? 2 : 0)}%`; }
function fmtMoney(n) { if (n === null || n === undefined || n === "") return "—"; const v = Number(n); if (Number.isNaN(v)) return "—"; try { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(v); } catch { return v.toFixed(2); } }
function getPropertyCode() { return (localStorage.getItem(LS_PROP_KEY) || "").toUpperCase(); }
