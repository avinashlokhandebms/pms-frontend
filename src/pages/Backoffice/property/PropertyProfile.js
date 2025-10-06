// src/pages/Backoffice/PropertyProfile.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";

// Sidebar + styles
import {BackofficeSidebar } from "../../../components/sidebar/backofficesidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css"; // panels / tables / buttons CSS

const PAGE_SIZE = 10;

export default function PropertyProfile() {
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

  // load list
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const params = new URLSearchParams({ q, page, limit });
        const res = await apiFetch(`/api/properties?${params.toString()}`);
        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;
        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number(count) || 0);
        }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load properties."); setRows([]); setTotal(0); }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [q, page, limit]);

  // client search fallback
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [r.code, r.name, r.keyPersonName, r.email, r.mobileNo].filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  const dataToRender = rows?.length && total > rows.length ? rows : filtered;

  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit = (row) => { setEditing(row); setShowForm(true); };
  const askDelete = (row) => { setToDelete(row); setShowDelete(true); };

  const afterSave = (saved) => {
    setShowForm(false); setEditing(null);
    setRows((prev) => {
      const id = saved._id || saved.id;
      const idx = prev.findIndex((p) => (p._id || p.id) === id);
      if (idx === -1) return [saved, ...prev];
      const next = prev.slice(); next[idx] = saved; return next;
    });
  };
  const afterDelete = (id) => {
    setShowDelete(false); setToDelete(null);
    setRows((prev) => prev.filter((r) => (r._id || r.id) !== id));
    setTotal((t) => Math.max(0, t - 1));
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <BackofficeSidebar />

      <div className="res-wrap">
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Property Profile</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="res-select"
              placeholder="Search code / name / email / mobile"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              style={{ minWidth: 280 }}
            />
            <select
              className="res-select"
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              title="Rows per page"
            >
              {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}/page</option>)}
            </select>
            <button className="btn" onClick={openCreate}>+ Add Property</button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-h">
            <span>View / Edit Property List</span>
            <span className="small" style={{ color: "var(--muted)" }}>
              {loading ? "Loading…" : `Total Records: ${total || dataToRender.length}`}
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
                    <th>Key Person</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>Modes</th>
                    <th>Gateways</th>
                    <th>Bank A/C</th>
                    <th>UPI</th>
                    <th>Created</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && (
                    <tr className="no-rows"><td colSpan={12}>No properties found</td></tr>
                  )}

                  {dataToRender?.map((r) => {
                    const id = r._id || r.id;
                    const modes = (r.payment?.modes || []).filter((m) => m.enabled).map((m) => m.mode).join(", ") || "—";
                    const gw = r.payment?.gateways?.length || 0;
                    const banks = r.payment?.bankAccounts?.length || 0;
                    const upi = r.payment?.upi?.length || 0;
                    return (
                      <tr key={id}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="btn" style={btnSm} onClick={() => openEdit(r)}>✏️</button>
                          <button className="btn" style={btnSm} onClick={() => askDelete(r)}>🗑️</button>
                        </td>
                        <td>{r.code}</td>
                        <td>{r.name}</td>
                        <td>{r.keyPersonName || "—"}</td>
                        <td>{r.email || "—"}</td>
                        <td>{r.mobileNo || "—"}</td>
                        <td>{modes}</td>
                        <td>{gw}</td>
                        <td>{banks}</td>
                        <td>{upi}</td>
                        <td>{fmtDate(r.createdAt)}</td>
                        <td>{fmtDate(r.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
              <button className="btn" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹ Prev</button>
              <span className="small" style={{ alignSelf: "center", color: "var(--muted)" }}>Page {page}</span>
              <button
                className="btn"
                disabled={loading || (!total ? dataToRender.length < limit : page * limit >= total)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <PropertyFormModal
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={afterSave}
        />
      )}

      {showDelete && (
        <ConfirmModal
          title="Delete Property?"
          message={`Delete "${toDelete?.name}" (${toDelete?.code})? This cannot be undone.`}
          confirmText="Delete"
          onClose={() => { setShowDelete(false); setToDelete(null); }}
          onConfirm={async () => {
            const id = toDelete?._id || toDelete?.id;
            await apiFetch(`/api/properties/${id}`, { method: "DELETE" });
            afterDelete(id);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Create/Edit Modal (includes Payments) ---------- */
function PropertyFormModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // Basic fields
  const [code, setCode] = useState(initial?.code || "");
  const [name, setName] = useState(initial?.name || "");
  const [keyPersonName, setKeyPersonName] = useState(initial?.keyPersonName || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [mobileNo, setMobileNo] = useState(initial?.mobileNo || "");
  const [currency, setCurrency] = useState(initial?.currency || "INR");
  const [timezone, setTimezone] = useState(initial?.timezone || "Asia/Kolkata");

  // Payments
  const [modes, setModes] = useState(
    initial?.payment?.modes?.length
      ? initial.payment.modes
      : [
          { mode: "CASH", enabled: true, surchargePct: 0 },
          { mode: "CARD", enabled: true, surchargePct: 0 },
          { mode: "UPI",  enabled: true, surchargePct: 0 },
          { mode: "BANK", enabled: true, surchargePct: 0 },
        ]
  );
  const [gateways, setGateways] = useState(initial?.payment?.gateways || []);
  const [bankAccounts, setBankAccounts] = useState(initial?.payment?.bankAccounts || []);
  const [upi, setUpi] = useState(initial?.payment?.upi || []);
  const [allowPartial, setAllowPartial] = useState(
    initial?.payment?.allowPartial ?? true
  );
  const [minAdvancePct, setMinAdvancePct] = useState(
    initial?.payment?.minAdvancePct ?? 0
  );

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!code.trim()) return setErr("Property code is required.");
    if (!name.trim()) return setErr("Property name is required.");

    const payload = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      keyPersonName,
      email,
      mobileNo,
      currency,
      timezone,
      payment: {
        modes,
        gateways,
        bankAccounts,
        upi,
        allowPartial,
        minAdvancePct: Number(minAdvancePct || 0),
      },
    };

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const id = initial._id || initial.id;
        saved = await apiFetch(`/api/properties/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        saved = await apiFetch("/api/properties", { method: "POST", body: JSON.stringify(payload) });
      }
      onSaved(saved);
    } catch (e2) {
      setErr(e2?.message || "Failed to save property.");
    } finally { setSaving(false); }
  };

  return (
    <Modal title={isEdit ? "Edit Property" : "Add Property"} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}

      {/* Basic */}
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <Row>
          <Field label="Property Code" required>
            <input className="input" value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          <Field label="Property Name" required>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Key Person Name">
            <input className="input" value={keyPersonName} onChange={(e) => setKeyPersonName(e.target.value)} />
          </Field>
        </Row>

        <Row>
          <Field label="Email">
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Mobile No">
            <input className="input" value={mobileNo} onChange={(e) => setMobileNo(e.target.value)} />
          </Field>
          <Field label="Currency">
            <input className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </Field>
        </Row>

        <Row>
          <Field label="Timezone">
            <input className="input" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
          </Field>
        </Row>

        {/* Payments block */}
        <div className="panel" style={{ marginTop: 8 }}>
          <div className="panel-h">Payments</div>
          <div className="panel-b" style={{ display: "grid", gap: 12 }}>
            {/* Modes */}
            <div>
              <div className="small" style={{ fontWeight: 800, marginBottom: 6 }}>Payment Modes</div>
              <div style={{ display: "grid", gap: 8 }}>
                {modes.map((m, idx) => (
                  <div key={idx} style={{ display: "grid", gap: 8, gridTemplateColumns: "120px 100px 140px auto" }}>
                    <select
                      className="res-select"
                      value={m.mode}
                      onChange={(e) => setModes(editIdx(modes, idx, { ...m, mode: e.target.value }))}
                    >
                      {["CASH", "CARD", "UPI", "BANK", "WALLET"].map((k) => <option key={k}>{k}</option>)}
                    </select>
                    <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="checkbox"
                        checked={!!m.enabled}
                        onChange={(e) => setModes(editIdx(modes, idx, { ...m, enabled: e.target.checked }))}
                      />
                      Enabled
                    </label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Surcharge %"
                      value={m.surchargePct ?? 0}
                      onChange={(e) => setModes(editIdx(modes, idx, { ...m, surchargePct: Number(e.target.value || 0) }))}
                    />
                    <div style={{ textAlign: "right" }}>
                      <button type="button" className="btn" style={btnSm} onClick={() => setModes(removeIdx(modes, idx))}>Remove</button>
                    </div>
                  </div>
                ))}
                <div>
                  <button type="button" className="btn" onClick={() => setModes([...modes, { mode: "CASH", enabled: true, surchargePct: 0 }])}>
                    + Add Mode
                  </button>
                </div>
              </div>
            </div>

            {/* Gateways */}
            <div>
              <div className="small" style={{ fontWeight: 800, marginBottom: 6 }}>Gateways</div>
              <div style={{ display: "grid", gap: 8 }}>
                {gateways.map((g, idx) => (
                  <div key={idx} style={{ display: "grid", gap: 8, gridTemplateColumns: "150px 120px 1fr 1fr auto" }}>
                    <select
                      className="res-select"
                      value={g.type}
                      onChange={(e) => setGateways(editIdx(gateways, idx, { ...g, type: e.target.value }))}
                    >
                      {["RAZORPAY", "STRIPE", "CASHFREE", "PAYU", "PAYPAL", "CUSTOM"].map((k) => <option key={k}>{k}</option>)}
                    </select>
                    <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="checkbox"
                        checked={!!g.enabled}
                        onChange={(e) => setGateways(editIdx(gateways, idx, { ...g, enabled: e.target.checked }))}
                      />
                      Enabled
                    </label>
                    <input className="input" placeholder="Name" value={g.name || ""} onChange={(e) => setGateways(editIdx(gateways, idx, { ...g, name: e.target.value }))} />
                    <input className="input" placeholder="Key ID / Merchant ID" value={g.keyId || g.merchantId || ""} onChange={(e) => setGateways(editIdx(gateways, idx, { ...g, keyId: e.target.value }))} />
                    <div style={{ textAlign: "right" }}>
                      <button type="button" className="btn" style={btnSm} onClick={() => setGateways(removeIdx(gateways, idx))}>Remove</button>
                    </div>
                  </div>
                ))}
                <div>
                  <button type="button" className="btn" onClick={() => setGateways([...gateways, { type: "RAZORPAY", enabled: false, name: "", supports: [] }])}>
                    + Add Gateway
                  </button>
                </div>
              </div>
            </div>

            {/* Bank accounts */}
            <div>
              <div className="small" style={{ fontWeight: 800, marginBottom: 6 }}>Bank Accounts</div>
              <div style={{ display: "grid", gap: 8 }}>
                {bankAccounts.map((b, idx) => (
                  <div key={idx} style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr 1fr 120px 1fr auto" }}>
                    <input className="input" placeholder="Label" value={b.label || ""} onChange={(e) => setBankAccounts(editIdx(bankAccounts, idx, { ...b, label: e.target.value }))} />
                    <input className="input" placeholder="Account Name" value={b.accountName || ""} onChange={(e) => setBankAccounts(editIdx(bankAccounts, idx, { ...b, accountName: e.target.value }))} />
                    <input className="input" placeholder="Account Number" value={b.accountNumber || ""} onChange={(e) => setBankAccounts(editIdx(bankAccounts, idx, { ...b, accountNumber: e.target.value }))} />
                    <input className="input" placeholder="IFSC" value={b.ifsc || ""} onChange={(e) => setBankAccounts(editIdx(bankAccounts, idx, { ...b, ifsc: e.target.value }))} />
                    <input className="input" placeholder="Bank / Branch" value={b.bankName || ""} onChange={(e) => setBankAccounts(editIdx(bankAccounts, idx, { ...b, bankName: e.target.value }))} />
                    <div style={{ textAlign: "right" }}>
                      <button type="button" className="btn" style={btnSm} onClick={() => setBankAccounts(removeIdx(bankAccounts, idx))}>Remove</button>
                    </div>
                  </div>
                ))}
                <div>
                  <button type="button" className="btn" onClick={() => setBankAccounts([...bankAccounts, { label: "", accountName: "", accountNumber: "", ifsc: "", bankName: "" }])}>
                    + Add Bank A/C
                  </button>
                </div>
              </div>
            </div>

            {/* UPI */}
            <div>
              <div className="small" style={{ fontWeight: 800, marginBottom: 6 }}>UPI Handles</div>
              <div style={{ display: "grid", gap: 8 }}>
                {upi.map((u, idx) => (
                  <div key={idx} style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr auto" }}>
                    <input className="input" placeholder="VPA e.g. hotel@icici" value={u.vpa || ""} onChange={(e) => setUpi(editIdx(upi, idx, { ...u, vpa: e.target.value }))} />
                    <input className="input" placeholder="Display Name" value={u.displayName || ""} onChange={(e) => setUpi(editIdx(upi, idx, { ...u, displayName: e.target.value }))} />
                    <div style={{ textAlign: "right" }}>
                      <button type="button" className="btn" style={btnSm} onClick={() => setUpi(removeIdx(upi, idx))}>Remove</button>
                    </div>
                  </div>
                ))}
                <div>
                  <button type="button" className="btn" onClick={() => setUpi([...upi, { vpa: "", displayName: "" }])}>
                    + Add UPI
                  </button>
                </div>
              </div>
            </div>

            {/* Rules */}
            <Row>
              <Field label="Allow Partial Payments">
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={allowPartial} onChange={(e) => setAllowPartial(e.target.checked)} />
                  <span>{allowPartial ? "Yes" : "No"}</span>
                </label>
              </Field>
              <Field label="Minimum Advance %">
                <input className="input" type="number" min="0" max="100" step="1" value={minAdvancePct} onChange={(e) => setMinAdvancePct(e.target.value)} />
              </Field>
            </Row>
          </div>
        </div>

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

/* ---------- Confirm Delete ---------- */
function ConfirmModal({ title, message, confirmText = "OK", onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={onClose}>
      <p style={{ marginTop: 0 }}>{message}</p>
      <div className="cp-actions">
        <button className="btn" type="button" onClick={onClose}>Cancel</button>
        <button
          className="btn"
          type="button"
          disabled={busy}
          onClick={async () => { setBusy(true); try { await onConfirm?.(); onClose(); } finally { setBusy(false); } }}
        >
          {busy ? "Working…" : confirmText}
        </button>
      </div>
    </Modal>
  );
}

/* ---------- small UI atoms ---------- */
function Row({ children }) { return <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(160px, 1fr))" }}>{children}</div>; }
function Field({ label, children, required }) {
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

/* ---------- helpers ---------- */
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(900px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };

function fmtDate(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(dt) ? "—" : dt.toLocaleDateString(); }
function editIdx(arr, idx, val) { const next = arr.slice(); next[idx] = val; return next; }
function removeIdx(arr, idx) { return arr.filter((_, i) => i !== idx); }
