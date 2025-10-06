// src/pages/Backoffice/fnb/CouponMaster.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { BackofficeSidebar } from "../../../components/sidebar/backofficesidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

const PAGE_SIZE = 10;
const LS_PROP_KEY = "currentPropertyCode";

export default function CouponMaster() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // property scope (optional)
  const [propertyCode, setPropertyCode] = useState(
    localStorage.getItem(LS_PROP_KEY) || ""
  );

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
        const pc = propertyCode.trim().toUpperCase();
        if (pc) params.set("propertyCode", pc);

        const res = await apiFetch(`/api/coupons?${params.toString()}`, { auth: true });
        const data = res?.data || res || [];
        const count = res?.total ?? data.length ?? 0;
        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number(count) || 0);
        }
      } catch (e) {
        if (!ignore) {
          setErr(e?.message || "Failed to load coupons.");
          setRows([]); setTotal(0);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [q, page, limit, propertyCode]);

  // Client fallback search
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [r.code, r.name, r.description]
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
          <h2 style={{ margin: 0 }}>Coupon Master</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="res-select"
              placeholder="Search (code / name / description)"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              style={{ minWidth: 280 }}
            />
            <input
              className="res-select"
              placeholder="Property Code (optional)"
              value={propertyCode}
              onChange={(e) => {
                const up = e.target.value.toUpperCase();
                setPropertyCode(up);
                localStorage.setItem(LS_PROP_KEY, up);
                setPage(1);
              }}
              style={{ width: 180, textTransform: "uppercase" }}
              title="Scope coupons to a property (optional)"
            />
            <select
              className="res-select"
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            >
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
            <button className="btn" onClick={openCreate}>+ Add Coupon</button>
          </div>
        </div>

        {/* Table */}
        <div className="panel">
          <div className="panel-h">
            <span>Coupons</span>
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
                    <th>Type</th>
                    <th>Value</th>
                    <th>Min Order</th>
                    <th>Usage (user/total)</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Active</th>
                    <th>Property</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={12}>No coupons found</td></tr>
                  )}

                  {dataToRender?.map(r => {
                    const id = r._id || r.id;
                    const val = r.discountType === "PERCENT"
                      ? `${r.discountValue}%` +
                        (r.maxDiscountValue ? ` (max ${fmtAmt(r.maxDiscountValue)})` : "")
                      : fmtAmt(r.discountValue);
                    return (
                      <tr key={id}>
                        <td>
                          <button className="btn" style={btnSm} onClick={() => openEdit(r)}>✏️</button>
                          <button className="btn" style={btnSm} onClick={() => askDelete(r)}>🗑️</button>
                        </td>
                        <td>{r.code}</td>
                        <td>{r.name}</td>
                        <td>{r.discountType}</td>
                        <td>{val}</td>
                        <td>{r.minOrderAmount ? fmtAmt(r.minOrderAmount) : "—"}</td>
                        <td>{(r.usageLimitPerUser ?? "∞")}/{(r.totalUsageLimit ?? "∞")}</td>
                        <td>{fmtDate(r.startDate)}</td>
                        <td>{fmtDate(r.endDate)}</td>
                        <td><OnOff value={r.isActive} /></td>
                        <td>{r.propertyCode || "—"}</td>
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
        <CouponFormModal
          initial={editing}
          defaultPropertyCode={propertyCode}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={afterSave}
        />
      )}

      {showDelete && (
        <ConfirmModal
          title="Delete Coupon?"
          message={`Delete coupon "${toDelete?.name}" (${toDelete?.code})? This cannot be undone.`}
          confirmText="Delete"
          onClose={() => { setShowDelete(false); setToDelete(null); }}
          onConfirm={async () => {
            const id = toDelete?._id || toDelete?.id;
            await apiFetch(`/api/coupons/${id}`, { method: "DELETE", auth: true });
            afterDelete(id);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Form Modal ---------- */
function CouponFormModal({ initial, defaultPropertyCode, onClose, onSaved }) {
  const isEdit = !!initial;
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [propertyCode, setPropertyCode] = useState(initial?.propertyCode || defaultPropertyCode || "");
  const [code, setCode] = useState(initial?.code || "");
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");

  const [discountType, setDiscountType] = useState(initial?.discountType || "PERCENT"); // PERCENT / FIXED
  const [discountValue, setDiscountValue] = useState(initial?.discountValue ?? 10);
  const [maxDiscountValue, setMaxDiscountValue] = useState(initial?.maxDiscountValue ?? 0);
  const [minOrderAmount, setMinOrderAmount] = useState(initial?.minOrderAmount ?? 0);

  const [usageLimitPerUser, setUsageLimitPerUser] = useState(initial?.usageLimitPerUser ?? 1);
  const [totalUsageLimit, setTotalUsageLimit] = useState(initial?.totalUsageLimit ?? 0);

  const [startDate, setStartDate] = useState(dateOnly(initial?.startDate) || "");
  const [endDate, setEndDate] = useState(dateOnly(initial?.endDate) || "");

  const [channels, setChannels] = useState(initial?.channels?.length ? initial.channels : ["POS"]);
  const [outlets, setOutlets] = useState((initial?.outlets || []).join(", "));

  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");

    if (!code.trim()) return setErr("Coupon code is required.");
    if (!name.trim()) return setErr("Coupon name is required.");
    if (!discountValue || Number(discountValue) <= 0) return setErr("Discount value must be > 0.");
    if (discountType === "PERCENT" && Number(discountValue) > 100) return setErr("Percent cannot exceed 100.");
    if (startDate && endDate) {
      const s = new Date(startDate);
      const ed = new Date(endDate);
      if (s > ed) return setErr("Start date cannot be after end date.");
    }

    const payload = {
      propertyCode: String(propertyCode || "").toUpperCase(),
      code: String(code || "").trim().toUpperCase(),
      name: String(name || "").trim(),
      description: String(description || "").trim(),
      discountType,
      discountValue: Number(discountValue || 0),
      maxDiscountValue: Number(maxDiscountValue || 0) || undefined,
      minOrderAmount: Number(minOrderAmount || 0) || undefined,
      usageLimitPerUser: Number(usageLimitPerUser || 0) || undefined,
      totalUsageLimit: Number(totalUsageLimit || 0) || undefined,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      channels: channels || [],
      outlets: String(outlets || "")
        .split(/[,\n]/)
        .map(s => s.trim())
        .filter(Boolean),
      isActive: !!isActive,
    };

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const id = initial._id || initial.id;
        saved = await apiFetch(`/api/coupons/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(payload) });
      } else {
        saved = await apiFetch("/api/coupons", { method: "POST", auth: true, body: JSON.stringify(payload) });
      }
      setOk("Saved.");
      onSaved(saved);
    } catch (e2) {
      setErr(e2?.message || "Failed to save coupon.");
    } finally {
      setSaving(false);
    }
  };

  const toggleChannel = (key) => {
    setChannels(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  return (
    <Modal title={isEdit ? "Edit Coupon" : "Create Coupon"} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      {ok && <Banner type="ok">{ok}</Banner>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <Row>
          <Field label="Property Code">
            <input className="input" placeholder="Optional scope" value={propertyCode}
              onChange={e => setPropertyCode(e.target.value.toUpperCase())}
              style={{ textTransform: "uppercase" }} />
          </Field>
          <Field label="Coupon Code" required>
            <input className="input" value={code} onChange={e => setCode(e.target.value)} style={{ textTransform: "uppercase" }} />
          </Field>
          <Field label="Name" required>
            <input className="input" value={name} onChange={e => setName(e.target.value)} />
          </Field>
        </Row>

        <Row>
          <Field label="Discount Type">
            <select className="res-select" value={discountType} onChange={e => setDiscountType(e.target.value)}>
              <option value="PERCENT">PERCENT</option>
              <option value="FIXED">FIXED</option>
            </select>
          </Field>
          <Field label={discountType === "PERCENT" ? "Percent (%)" : "Amount"}>
            <input className="input" type="number" step="0.01" min="0" value={discountValue}
              onChange={e => setDiscountValue(e.target.value)} />
          </Field>
          {discountType === "PERCENT" ? (
            <Field label="Max Discount (cap)">
              <input className="input" type="number" step="0.01" min="0" value={maxDiscountValue}
                onChange={e => setMaxDiscountValue(e.target.value)} />
            </Field>
          ) : (
            <Field label="Min Order Amount">
              <input className="input" type="number" step="0.01" min="0" value={minOrderAmount}
                onChange={e => setMinOrderAmount(e.target.value)} />
            </Field>
          )}
        </Row>

        <Row>
          <Field label="Usage Per User">
            <input className="input" type="number" min="0" value={usageLimitPerUser} onChange={e => setUsageLimitPerUser(e.target.value)} />
          </Field>
          <Field label="Total Usage Limit">
            <input className="input" type="number" min="0" value={totalUsageLimit} onChange={e => setTotalUsageLimit(e.target.value)} />
          </Field>
          <Field label="Outlets (comma/newline)">
            <textarea className="input" rows={1} value={outlets} onChange={e => setOutlets(e.target.value)} />
          </Field>
        </Row>

        <Row>
          <Field label="Start Date">
            <input className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </Field>
          <Field label="End Date">
            <input className="input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </Field>
          <Field label="Active">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              <span>{isActive ? "Yes" : "No"}</span>
            </label>
          </Field>
        </Row>

        <div className="panel" style={{ marginTop: 6 }}>
          <div className="panel-h">Channels</div>
          <div className="panel-b">
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {["POS", "ONLINE", "APP", "WALKIN", "CORP"].map(k => (
                <label key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" checked={channels.includes(k)} onChange={() => toggleChannel(k)} />
                  {k}
                </label>
              ))}
            </div>
          </div>
        </div>

        <Row>
          <Field label="Description">
            <textarea className="input" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
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

/* ---------- Small UI helpers ---------- */
function Row({ children }) {
  return <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(180px, 1fr))" }}>{children}</div>;
}
function Field({ label, required, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span className="label" style={{ fontWeight: 700 }}>
        {label} {required && <span style={{ color: "#b91c1c" }}>*</span>}
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
        <button className="btn" type="button" disabled={busy}
          onClick={async () => { setBusy(true); try { await onConfirm?.(); onClose(); } finally { setBusy(false); } }}>
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
function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return Number.isNaN(dt) ? "—" : dt.toLocaleDateString();
}
function fmtAmt(n) {
  if (n == null) return "—";
  const val = Number(n);
  if (Number.isNaN(val)) return "—";
  return val.toLocaleString(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 2 });
}
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(900px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };
function dateOnly(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt)) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const da = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}
