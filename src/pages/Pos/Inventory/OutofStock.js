// src/pages/fnb/OutofStock.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import PosSidebar, { BackofficeSidebar } from "../../../components/sidebar/Possidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

const PAGE_SIZE = 10;

export default function OutofStock() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // dropdown refs
  const [items, setItems] = useState([]);
  const [outlets, setOutlets] = useState([]);

  // modals
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  // load items/outlets for selects
  useEffect(() => {
    (async () => {
      try {
        const [iRes, oRes] = await Promise.allSettled([
          apiFetch("/api/fnb/items?limit=500", { auth: true }),
          apiFetch("/api/fnb/outlets?limit=500", { auth: true }),
        ]);
        const iData = Array.isArray(iRes.value?.data) ? iRes.value.data : (Array.isArray(iRes.value) ? iRes.value : []);
        const oData = Array.isArray(oRes.value?.data) ? oRes.value.data : (Array.isArray(oRes.value) ? oRes.value : []);
        setItems(iData);
        setOutlets(oData);
      } catch {
        setItems([]); setOutlets([]);
      }
    })();
  }, []);

  // load list
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true); setErr("");
      try {
        const params = new URLSearchParams({ q, page, limit });
        const res = await apiFetch(`/api/fnb/out-of-stock?${params.toString()}`, { auth: true });
        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;
        if (!ignore) { setRows(Array.isArray(data) ? data : []); setTotal(Number(count) || 0); }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load Out-of-Stock list."); setRows([]); setTotal(0); }
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
    return rows.filter(r =>
      [r.itemName, r.itemCode, r.outletName, r.reason]
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
          <h2 style={{ margin: 0 }}>Out of Stock</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="res-select"
              placeholder="Search item / outlet / reason"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              style={{ minWidth: 300 }}
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
            <span>Out-of-Stock Items</span>
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
                    <th>Item</th>
                    <th>Outlet</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Indefinite</th>
                    <th>Reason</th>
                    <th>Active</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={9}>No records</td></tr>
                  )}

                  {dataToRender?.map(r => {
                    const id = r._id || r.id;
                    const itemLabel = r.itemName || joinCodeName(r.itemCode, r.itemDisplayName);
                    return (
                      <tr key={id}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="btn" style={btnSm} onClick={() => openEdit(r)}>✏️</button>
                          <button className="btn" style={btnSm} onClick={() => askDelete(r)}>🗑️</button>
                        </td>
                        <td>{itemLabel}</td>
                        <td>{r.outletName || "—"}</td>
                        <td>{fmtDateTime(r.startAt)}</td>
                        <td>{r.isIndefinite ? "—" : fmtDateTime(r.endAt)}</td>
                        <td><OnOff value={r.isIndefinite} yes="Yes" no="No" /></td>
                        <td title={r.reason || ""}>{r.reason || "—"}</td>
                        <td><OnOff value={r.isActive} /></td>
                        <td>{fmtDateTime(r.createdAt)}</td>
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
        <OutOfStockFormModal
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={afterSave}
          items={items}
          outlets={outlets}
        />
      )}

      {showDelete && (
        <ConfirmModal
          title="Delete record?"
          message={`Delete out-of-stock entry for "${toDelete?.itemName || toDelete?.itemDisplayName || toDelete?.itemCode}"? This cannot be undone.`}
          confirmText="Delete"
          onClose={() => { setShowDelete(false); setToDelete(null); }}
          onConfirm={async () => {
            const id = toDelete?._id || toDelete?.id;
            await apiFetch(`/api/fnb/out-of-stock/${id}`, { method: "DELETE", auth: true });
            afterDelete(id);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Form Modal ---------- */
function OutOfStockFormModal({ initial, onClose, onSaved, items, outlets }) {
  const isEdit = !!initial;
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [itemId, setItemId] = useState(initial?.itemId || "");
  const [outletId, setOutletId] = useState(initial?.outletId || "");
  const [startAt, setStartAt] = useState(toLocalDTInput(initial?.startAt || new Date()));
  const [isIndefinite, setIsIndefinite] = useState(initial?.isIndefinite ?? true);
  const [endAt, setEndAt] = useState(toLocalDTInput(initial?.endAt || new Date()));
  const [reason, setReason] = useState(initial?.reason || "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");

    if (!itemId) return setErr("Item is required.");
    if (!outletId) return setErr("Outlet is required.");
    if (!isIndefinite && !endAt) return setErr("End time is required when not indefinite.");

    const payload = {
      itemId,
      outletId,
      startAt: toISOFromLocal(startAt),
      endAt: isIndefinite ? null : toISOFromLocal(endAt),
      isIndefinite: !!isIndefinite,
      reason: reason.trim(),
      isActive: !!isActive,
    };

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const id = initial._id || initial.id;
        saved = await apiFetch(`/api/fnb/out-of-stock/${id}`, {
          method: "PATCH", auth: true, body: JSON.stringify(payload),
        });
      } else {
        saved = await apiFetch("/api/fnb/out-of-stock", {
          method: "POST", auth: true, body: JSON.stringify(payload),
        });
      }
      setOk("Saved.");
      onSaved(saved);
    } catch (e2) {
      setErr(e2?.message || "Failed to save record.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Out-of-Stock" : "Add Out-of-Stock"} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      {ok && <Banner type="ok">{ok}</Banner>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <Row>
          <Field label="Item" required>
            <select className="res-select" value={itemId} onChange={e => setItemId(e.target.value)}>
              <option value="">Select item…</option>
              {items.map(i => (
                <option key={i._id || i.id} value={i._id || i.id}>
                  {joinCodeName(i.code, i.name)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Outlet" required>
            <select className="res-select" value={outletId} onChange={e => setOutletId(e.target.value)}>
              <option value="">Select outlet…</option>
              {outlets.map(o => (
                <option key={o._id || o.id} value={o._id || o.id}>{o.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Active">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              <span>{isActive ? "Yes" : "No"}</span>
            </label>
          </Field>
        </Row>

        <Row>
          <Field label="Start Time">
            <input className="input" type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} />
          </Field>
          <Field label="Indefinite">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={isIndefinite} onChange={e => setIsIndefinite(e.target.checked)} />
              <span>{isIndefinite ? "Yes" : "No"}</span>
            </label>
          </Field>
          <Field label="End Time">
            <input
              className="input"
              type="datetime-local"
              value={endAt}
              onChange={e => setEndAt(e.target.value)}
              disabled={isIndefinite}
            />
          </Field>
        </Row>

        <Row>
          <Field label="Reason">
            <input className="input" value={reason} onChange={e => setReason(e.target.value)} placeholder="Wastage, vendor delay, etc." />
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

/* ---------- Tiny UI helpers ---------- */
function Row({ children }) { return <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(160px, 1fr))" }}>{children}</div>; }
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
        <button className="btn" type="button" disabled={busy} onClick={async () => { setBusy(true); try { await onConfirm?.(); onClose(); } finally { setBusy(false); } }}>
          {busy ? "Working…" : confirmText}
        </button>
      </div>
    </Modal>
  );
}
function OnOff({ value, yes = "Active", no = "Inactive" }) {
  const on = !!value;
  return (
    <span style={{
      display: "inline-block", padding: ".15rem .5rem",
      borderRadius: 999, background: on ? "#ecfdf5" : "#f3f4f6",
      border: `1px solid ${on ? "#a7f3d0" : "#e5e7eb"}`,
      color: on ? "#15803d" : "#334155", fontSize: ".75rem", fontWeight: 700
    }}>
      {on ? yes : no}
    </span>
  );
}

/* ---------- utils ---------- */
function joinCodeName(code, name) { return [code, name].filter(Boolean).join(" — "); }
function fmtDateTime(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(dt) ? "—" : dt.toLocaleString(); }
function toLocalDTInput(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt)) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}`;
}
function toISOFromLocal(localValue) {
  // local datetime string -> ISO string
  if (!localValue) return null;
  const dt = new Date(localValue);
  if (Number.isNaN(dt)) return null;
  return dt.toISOString();
}

/* ---------- styles ---------- */
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(900px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };
