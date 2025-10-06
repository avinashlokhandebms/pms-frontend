// src/pages/Backoffice/setting/TableColumnListCRM.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { BackofficeSidebar } from "../../../components/sidebar/backofficesidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

const PAGE_SIZE = 10;

export default function TableColumnListCRM() {
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
        const res = await apiFetch(`/api/table-column-lists?${params.toString()}`, { auth: true });
        const data = res?.data || res || [];
        const count = res?.total ?? data.length ?? 0;
        if (!ignore) { setRows(Array.isArray(data) ? data : []); setTotal(Number(count) || 0); }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load table column lists."); setRows([]); setTotal(0); }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [q, page, limit]);

  // Client search fallback
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [r.propertyCode, r.module, r.listKey, r.columnKey, r.header, r.align]
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
          <h2 style={{ margin: 0 }}>Table Column List (CRM)</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="res-select"
              placeholder="Search (property / module / list / column / header)"
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
            <span>Configured Columns</span>
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
                    <th>Module</th>
                    <th>List</th>
                    <th>Column Key</th>
                    <th>Header</th>
                    <th>Align</th>
                    <th>Width</th>
                    <th>Order</th>
                    <th>Visible</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={11}>No records found</td></tr>
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
                        <td>{r.module}</td>
                        <td>{r.listKey}</td>
                        <td>{r.columnKey}</td>
                        <td>{r.header}</td>
                        <td>{r.align}</td>
                        <td>{r.width || "—"}</td>
                        <td>{r.order || 0}</td>
                        <td><OnOff value={r.visible} /></td>
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
        <ColumnFormModal
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={afterSave}
        />
      )}

      {showDelete && (
        <ConfirmModal
          title="Delete Column config?"
          message={`Delete column "${toDelete?.columnKey}" for ${toDelete?.module} / ${toDelete?.listKey}? This cannot be undone.`}
          confirmText="Delete"
          onClose={() => { setShowDelete(false); setToDelete(null); }}
          onConfirm={async () => {
            const id = toDelete?._id || toDelete?.id;
            await apiFetch(`/api/table-column-lists/${id}`, { method: "DELETE", auth: true });
            afterDelete(id);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Form Modal ---------- */
function ColumnFormModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [propertyCode, setPropertyCode] = useState(initial?.propertyCode || "");
  const [module, setModule] = useState(initial?.module || "CRM");
  const [listKey, setListKey] = useState(initial?.listKey || "LEAD_LIST"); // e.g. LEAD_LIST / CONTACT_LIST
  const [columnKey, setColumnKey] = useState(initial?.columnKey || "");
  const [header, setHeader] = useState(initial?.header || "");
  const [align, setAlign] = useState(initial?.align || "left");
  const [width, setWidth] = useState(initial?.width ?? 0);
  const [order, setOrder] = useState(initial?.order ?? 0);
  const [visible, setVisible] = useState(initial?.visible ?? true);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");

    if (!propertyCode.trim()) return setErr("Property code is required");
    if (!module.trim()) return setErr("Module is required");
    if (!listKey.trim()) return setErr("List key is required");
    if (!columnKey.trim()) return setErr("Column key is required");
    if (!header.trim()) return setErr("Header is required");

    const payload = {
      propertyCode: propertyCode.trim().toUpperCase(),
      module: module.trim().toUpperCase(),
      listKey: listKey.trim().toUpperCase(),
      columnKey: columnKey.trim(),
      header: header.trim(),
      align,
      width: Number(width || 0),
      order: Number(order || 0),
      visible: !!visible,
    };

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const id = initial._id || initial.id;
        saved = await apiFetch(`/api/table-column-lists/${id}`, {
          method: "PATCH", auth: true, body: JSON.stringify(payload),
        });
      } else {
        saved = await apiFetch("/api/table-column-lists", {
          method: "POST", auth: true, body: JSON.stringify(payload),
        });
      }
      setOk("Saved.");
      onSaved(saved);
    } catch (e2) {
      setErr(e2?.message || "Failed to save.");
    } finally { setSaving(false); }
  };

  return (
    <Modal title={isEdit ? "Edit Column Config" : "Add Column Config"} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      {ok && <Banner type="ok">{ok}</Banner>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <Row>
          <Field label="Property Code" required>
            <input className="input" value={propertyCode} onChange={(e) => setPropertyCode(e.target.value)} />
          </Field>
          <Field label="Module" required>
            <input className="input" value={module} onChange={(e) => setModule(e.target.value)} placeholder="CRM" />
          </Field>
          <Field label="List Key" required>
            <input className="input" value={listKey} onChange={(e) => setListKey(e.target.value)} placeholder="LEAD_LIST" />
          </Field>
        </Row>

        <Row>
          <Field label="Column Key" required>
            <input className="input" value={columnKey} onChange={(e) => setColumnKey(e.target.value)} placeholder="companyName" />
          </Field>
          <Field label="Header" required>
            <input className="input" value={header} onChange={(e) => setHeader(e.target.value)} placeholder="Company" />
          </Field>
          <Field label="Align">
            <select className="res-select" value={align} onChange={(e) => setAlign(e.target.value)}>
              <option>left</option>
              <option>center</option>
              <option>right</option>
            </select>
          </Field>
        </Row>

        <Row>
          <Field label="Width (px)">
            <input className="input" type="number" min="0" value={width} onChange={(e) => setWidth(e.target.value)} />
          </Field>
          <Field label="Order">
            <input className="input" type="number" value={order} onChange={(e) => setOrder(e.target.value)} />
          </Field>
          <Field label="Visible">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
              <span>{visible ? "Yes" : "No"}</span>
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
