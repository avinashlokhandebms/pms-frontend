// src/pages/inventory/StockInOut.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import PosSidebar, { BackofficeSidebar } from "../../../components/sidebar/Possidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

const PAGE_SIZE = 10;

export default function StockInOut() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // refs for selects
  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  // modals
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  // load dropdown refs (items + warehouses)
  useEffect(() => {
    (async () => {
      try {
        const [iRes, wRes] = await Promise.allSettled([
          apiFetch("/api/fnb/items?limit=500", { auth: true }),
          apiFetch("/api/inventory/warehouses?limit=500", { auth: true }),
        ]);
        const iData = Array.isArray(iRes.value?.data) ? iRes.value.data : Array.isArray(iRes.value) ? iRes.value : [];
        const wData = Array.isArray(wRes.value?.data) ? wRes.value.data : Array.isArray(wRes.value) ? wRes.value : [];
        setItems(iData);
        setWarehouses(wData);
      } catch {
        // fallbacks
        setItems([{ _id: "i1", code: "TEA", name: "Tea", unit: "cup" }, { _id: "i2", code: "RICE", name: "Rice", unit: "kg" }]);
        setWarehouses([{ _id: "w1", name: "Main Store" }, { _id: "w2", name: "Kitchen Store" }]);
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
        const res = await apiFetch(`/api/inventory/stock-movements?${params.toString()}`, { auth: true });
        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;
        if (!ignore) { setRows(Array.isArray(data) ? data : []); setTotal(Number(count) || 0); }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load stock movements."); setRows([]); setTotal(0); }
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
      [
        r.type, r.reason, r.reference, r.warehouseName,
        r.itemName, r.itemCode
      ].filter(Boolean).some(v => String(v).toLowerCase().includes(term))
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
          <h2 style={{ margin: 0 }}>Stock In / Out</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="res-select"
              placeholder="Search (item / type / reason / reference)"
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
            <button className="btn" onClick={openCreate}>+ Add Movement</button>
          </div>
        </div>

        {/* Table */}
        <div className="panel">
          <div className="panel-h">
            <span>Stock Movements</span>
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
                    <th>Date</th>
                    <th>Type</th>
                    <th>Item</th>
                    <th style={{ textAlign: "right" }}>Qty</th>
                    <th>Unit</th>
                    <th>Warehouse</th>
                    <th style={{ textAlign: "right" }}>Cost/Unit</th>
                    <th style={{ textAlign: "right" }}>Value</th>
                    <th>Reason</th>
                    <th>Reference</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={12}>No stock movements found</td></tr>
                  )}

                  {dataToRender?.map(r => {
                    const id = r._id || r.id;
                    const itemName = r.itemName || joinCodeName(r.itemCode, r.itemDisplayName);
                    const whName = r.warehouseName || lookupName(warehouses, r.warehouseId) || "—";
                    const value = Number(r.quantity || 0) * Number(r.costPerUnit || 0);
                    return (
                      <tr key={id}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="btn" style={btnSm} onClick={() => openEdit(r)}>✏️</button>
                          <button className="btn" style={btnSm} onClick={() => askDelete(r)}>🗑️</button>
                        </td>
                        <td>{fmtDate(r.txnDate || r.date)}</td>
                        <td><TypePill type={r.type} /></td>
                        <td>{itemName}</td>
                        <td style={{ textAlign: "right" }}>{fmtQty(r.quantity)}</td>
                        <td>{r.unit || r.itemUnit || "—"}</td>
                        <td>{whName}</td>
                        <td style={{ textAlign: "right" }}>{fmtAmt(r.costPerUnit)}</td>
                        <td style={{ textAlign: "right" }}>{fmtAmt(value)}</td>
                        <td title={r.reason || ""}>{r.reason || "—"}</td>
                        <td title={r.reference || ""}>{r.reference || "—"}</td>
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
              <button className="btn"
                disabled={loading || (!total ? dataToRender.length < limit : page * limit >= total)}
                onClick={() => setPage(p => p + 1)}>Next ›</button>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <MovementFormModal
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={afterSave}
          items={items}
          warehouses={warehouses}
        />
      )}

      {showDelete && (
        <ConfirmModal
          title="Delete Movement?"
          message={`Delete entry for "${toDelete?.itemName || toDelete?.itemDisplayName || toDelete?.itemCode}" on ${fmtDate(toDelete?.txnDate || toDelete?.date)}? This cannot be undone.`}
          confirmText="Delete"
          onClose={() => { setShowDelete(false); setToDelete(null); }}
          onConfirm={async () => {
            const id = toDelete?._id || toDelete?.id;
            await apiFetch(`/api/inventory/stock-movements/${id}`, { method: "DELETE", auth: true });
            afterDelete(id);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Create/Edit Modal ---------- */
function MovementFormModal({ initial, onClose, onSaved, items, warehouses }) {
  const isEdit = !!initial;
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [type, setType] = useState(initial?.type || "IN"); // IN / OUT
  const [txnDate, setTxnDate] = useState(toDateInput(initial?.txnDate || initial?.date || new Date()));
  const [itemId, setItemId] = useState(initial?.itemId || "");
  const [quantity, setQuantity] = useState(initial?.quantity ?? 0);
  const [unit, setUnit] = useState(initial?.unit || initial?.itemUnit || "");
  const [warehouseId, setWarehouseId] = useState(initial?.warehouseId || "");
  const [costPerUnit, setCostPerUnit] = useState(initial?.costPerUnit ?? 0);
  const [reason, setReason] = useState(initial?.reason || "");
  const [reference, setReference] = useState(initial?.reference || "");

  // auto-set unit from item
  useEffect(() => {
    const found = items.find(i => (i._id || i.id) === itemId);
    if (found && !unit) setUnit(found.unit || "");
  }, [itemId]); // eslint-disable-line

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");

    if (!itemId) return setErr("Item is required.");
    if (!quantity || Number(quantity) <= 0) return setErr("Quantity must be > 0.");

    const payload = {
      type: type === "OUT" ? "OUT" : "IN",
      txnDate: new Date(txnDate).toISOString(),
      itemId,
      quantity: Number(quantity),
      unit: unit || null,
      warehouseId: warehouseId || null,
      costPerUnit: Number(costPerUnit || 0),
      reason: reason.trim(),
      reference: reference.trim(),
    };

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const id = initial._id || initial.id;
        saved = await apiFetch(`/api/inventory/stock-movements/${id}`, {
          method: "PATCH", auth: true, body: JSON.stringify(payload),
        });
      } else {
        saved = await apiFetch("/api/inventory/stock-movements", {
          method: "POST", auth: true, body: JSON.stringify(payload),
        });
      }
      setOk("Saved.");
      onSaved(saved);
    } catch (e2) {
      setErr(e2?.message || "Failed to save movement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Stock Movement" : "Add Stock Movement"} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      {ok && <Banner type="ok">{ok}</Banner>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <Row>
          <Field label="Type">
            <select className="res-select" value={type} onChange={e => setType(e.target.value)}>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </select>
          </Field>
          <Field label="Date">
            <input className="input" type="date" value={txnDate} onChange={e => setTxnDate(e.target.value)} />
          </Field>
          <Field label="Warehouse">
            <select className="res-select" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
              <option value="">—</option>
              {warehouses.map(w => <option key={w._id || w.id} value={w._id || w.id}>{w.name}</option>)}
            </select>
          </Field>
        </Row>

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
          <Field label="Qty" required>
            <input className="input" type="number" min="0" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} />
          </Field>
          <Field label="Unit">
            <input className="input" value={unit} onChange={e => setUnit(e.target.value)} placeholder="e.g. kg, ltr, pcs" />
          </Field>
        </Row>

        <Row>
          <Field label="Cost / Unit">
            <input className="input" type="number" min="0" step="0.01" value={costPerUnit} onChange={e => setCostPerUnit(e.target.value)} />
          </Field>
          <Field label="Reason">
            <input className="input" value={reason} onChange={e => setReason(e.target.value)} placeholder="Purchase / Wastage / Transfer…" />
          </Field>
          <Field label="Reference">
            <input className="input" value={reference} onChange={e => setReference(e.target.value)} placeholder="PO-101 / INV-22 / KOT-12…" />
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
        <button className="btn" type="button" disabled={busy}
          onClick={async () => { setBusy(true); try { await onConfirm?.(); onClose(); } finally { setBusy(false); } }}>
          {busy ? "Working…" : confirmText}
        </button>
      </div>
    </Modal>
  );
}
function TypePill({ type }) {
  const isIn = String(type).toUpperCase() !== "OUT";
  return (
    <span style={{
      display: "inline-block", padding: ".15rem .5rem", borderRadius: 999,
      background: isIn ? "#ecfdf5" : "#fef2f2",
      border: `1px solid ${isIn ? "#a7f3d0" : "#fecaca"}`,
      color: isIn ? "#15803d" : "#991b1b", fontSize: ".75rem", fontWeight: 700
    }}>
      {isIn ? "IN" : "OUT"}
    </span>
  );
}

/* ---------- utils ---------- */
function lookupName(list, id) { const x = list.find(i => (i._id || i.id) === id); return x?.name || ""; }
function joinCodeName(code, name) { return [code, name].filter(Boolean).join(" — "); }
function fmtQty(n) { const v = Number(n) || 0; return v.toLocaleString(undefined, { maximumFractionDigits: 3 }); }
function fmtAmt(n) { return (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtDate(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(dt) ? "—" : dt.toLocaleDateString(); }
function fmtDateTime(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(dt) ? "—" : dt.toLocaleString(); }
function toDateInput(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt)) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* ---------- styles ---------- */
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(900px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };
