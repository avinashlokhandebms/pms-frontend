// src/pages/Backoffice/fnb/AddItemToOutlet.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { BackofficeSidebar } from "../../../components/sidebar/backofficesidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

const PAGE_SIZE = 10;
const LS_PROP_KEY = "currentPropertyCode";

export default function AddItemToOutletPage() {
  const [rows, setRows] = useState([]);

  const [outlets, setOutlets] = useState([]);
  const [outletMap, setOutletMap] = useState({});
  const [items, setItems] = useState([]);
  const [itemMap, setItemMap] = useState({});

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [propertyCode, setPropertyCode] = useState(
    localStorage.getItem(LS_PROP_KEY) || ""
  );

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  // Load outlets
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const params = new URLSearchParams({ limit: 500 });
        const pc = propertyCode.trim().toUpperCase();
        if (pc) params.set("propertyCode", pc);
        const res = await apiFetch(`/api/fnb/outlets?${params.toString()}`, { auth: true });
        const list = res?.data || res || [];
        if (!ignore) {
          setOutlets(Array.isArray(list) ? list : []);
          const m = {};
          list.forEach(o => { m[o._id || o.id] = o; });
          setOutletMap(m);
        }
      } catch { if (!ignore) { setOutlets([]); setOutletMap({}); } }
    })();
    return () => { ignore = true; };
  }, [propertyCode]);

  // Load items
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const params = new URLSearchParams({ limit: 500 });
        const pc = propertyCode.trim().toUpperCase();
        if (pc) params.set("propertyCode", pc);
        const res = await apiFetch(`/api/fnb/items?${params.toString()}`, { auth: true });
        const list = res?.data || res || [];
        if (!ignore) {
          setItems(Array.isArray(list) ? list : []);
          const m = {};
          list.forEach(i => { m[i._id || i.id] = i; });
          setItemMap(m);
        }
      } catch { if (!ignore) { setItems([]); setItemMap({}); } }
    })();
    return () => { ignore = true; };
  }, [propertyCode]);

  // Load mappings: outlet-items
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true); setErr("");
      try {
        const params = new URLSearchParams({ q, page, limit });
        const pc = propertyCode.trim().toUpperCase();
        if (pc) params.set("propertyCode", pc);
        const res = await apiFetch(`/api/fnb/outlet-items?${params.toString()}`, { auth: true });
        const data = res?.data || res || [];
        const count = res?.total ?? data.length ?? 0;
        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number(count) || 0);
        }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load mappings."); setRows([]); setTotal(0); }
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
    return rows.filter(r => {
      const outlet = outletMap[r.outletId] || r.outlet;
      const item = itemMap[r.itemId] || r.item;
      return [
        r.propertyCode,
        outlet?.name, outlet?.code,
        item?.name, item?.code,
      ]
      .filter(Boolean)
      .some(v => String(v).toLowerCase().includes(term));
    });
  }, [rows, q, outletMap, itemMap]);

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
          <h2 style={{ margin: 0 }}>FNB — Add Item To Outlet</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="res-select"
              placeholder="Search outlet / item / property"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              style={{ minWidth: 320 }}
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
              title="Scope to a property (optional)"
            />
            <select
              className="res-select"
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            >
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
            <button className="btn" onClick={openCreate}>+ Map Item</button>
          </div>
        </div>

        {/* Table */}
        <div className="panel">
          <div className="panel-h">
            <span>Outlet ↔ Item Mappings</span>
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
                    <th>Outlet</th>
                    <th>Item</th>
                    <th>Base Price</th>
                    <th>Outlet Price</th>
                    <th>Available</th>
                    <th>Sort</th>
                    <th>Property</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={9}>No mappings found</td></tr>
                  )}

                  {dataToRender?.map(r => {
                    const id = r._id || r.id;
                    const outlet = outletMap[r.outletId] || r.outlet;
                    const item = itemMap[r.itemId] || r.item;
                    const basePrice = Number(item?.basePrice ?? r.basePrice ?? 0);
                    return (
                      <tr key={id}>
                        <td>
                          <button className="btn" style={btnSm} onClick={() => openEdit(r)}>✏️</button>
                          <button className="btn" style={btnSm} onClick={() => askDelete(r)}>🗑️</button>
                        </td>
                        <td>{outlet ? `${outlet.name} (${outlet.code || outlet._id || outlet.id})` : "—"}</td>
                        <td>{item ? `${item.name} (${item.code || item._id || item.id})` : "—"}</td>
                        <td>{formatMoney(basePrice)}</td>
                        <td>{formatMoney(r.priceOverride ?? basePrice)}</td>
                        <td><OnOff value={r.isAvailable} /></td>
                        <td>{r.sortOrder ?? 0}</td>
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
        <MapFormModal
          initial={editing}
          defaultPropertyCode={propertyCode}
          outlets={outlets}
          items={items}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={afterSave}
        />
      )}

      {showDelete && (
        <ConfirmModal
          title="Delete Mapping?"
          message={`Remove item "${toDelete?.itemName || toDelete?.itemId}" from outlet "${toDelete?.outletName || toDelete?.outletId}"?`}
          confirmText="Delete"
          onClose={() => { setShowDelete(false); setToDelete(null); }}
          onConfirm={async () => {
            const id = toDelete?._id || toDelete?.id;
            await apiFetch(`/api/fnb/outlet-items/${id}`, { method: "DELETE", auth: true });
            afterDelete(id);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Form Modal ---------- */
function MapFormModal({ initial, defaultPropertyCode, outlets, items, onClose, onSaved }) {
  const isEdit = !!initial;
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [propertyCode, setPropertyCode] = useState(initial?.propertyCode || defaultPropertyCode || "");
  const [outletId, setOutletId] = useState(initial?.outletId || initial?.outlet?._id || initial?.outlet?.id || "");
  const [itemId, setItemId] = useState(initial?.itemId || initial?.item?._id || initial?.item?.id || "");
  const [priceOverride, setPriceOverride] = useState(
    initial?.priceOverride ?? (initial?.item?.basePrice ?? 0)
  );
  const [isAvailable, setIsAvailable] = useState(initial?.isAvailable ?? true);
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");

    if (!outletId) return setErr("Outlet is required.");
    if (!itemId) return setErr("Item is required.");

    const payload = {
      propertyCode: String(propertyCode || "").toUpperCase(),
      outletId,
      itemId,
      priceOverride: priceOverride === "" ? null : Number(priceOverride || 0),
      isAvailable: !!isAvailable,
      sortOrder: Number(sortOrder || 0),
    };

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const id = initial._id || initial.id;
        saved = await apiFetch(`/api/fnb/outlet-items/${id}`, {
          method: "PATCH", auth: true, body: JSON.stringify(payload),
        });
      } else {
        saved = await apiFetch("/api/fnb/outlet-items", {
          method: "POST", auth: true, body: JSON.stringify(payload),
        });
      }
      setOk("Saved.");
      onSaved(saved);
    } catch (e2) {
      setErr(e2?.message || "Failed to save mapping.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Outlet Item Mapping" : "Add Item To Outlet"} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      {ok && <Banner type="ok">{ok}</Banner>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <Row>
          <Field label="Property Code">
            <input
              className="input"
              placeholder="Optional"
              value={propertyCode}
              onChange={e => setPropertyCode(e.target.value.toUpperCase())}
              style={{ textTransform: "uppercase" }}
            />
          </Field>
          <Field label="Outlet" required>
            <select className="res-select" value={outletId} onChange={e => setOutletId(e.target.value)}>
              <option value="">— Select —</option>
              {outlets.map(o => (
                <option key={o._id || o.id} value={o._id || o.id}>
                  {o.name} ({o.code})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Item" required>
            <select className="res-select" value={itemId} onChange={e => setItemId(e.target.value)}>
              <option value="">— Select —</option>
              {items.map(i => (
                <option key={i._id || i.id} value={i._id || i.id}>
                  {i.name} ({i.code})
                </option>
              ))}
            </select>
          </Field>
        </Row>

        <Row>
          <Field label="Outlet Price (override)">
            <input className="input" type="number" step="0.01" min="0"
              placeholder="Leave blank to use base price"
              value={priceOverride}
              onChange={e => setPriceOverride(e.target.value)}
            />
          </Field>
          <Field label="Sort Order">
            <input className="input" type="number" step="1" value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
          </Field>
          <Field label="Available">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={isAvailable} onChange={e => setIsAvailable(e.target.checked)} />
              <span>{isAvailable ? "Yes" : "No"}</span>
            </label>
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
      {on ? "Yes" : "No"}
    </span>
  );
}
function fmtDate(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(dt) ? "—" : dt.toLocaleDateString(); }
function formatMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(900px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };
