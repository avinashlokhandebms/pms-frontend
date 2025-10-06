// src/pages/Housekeeping/MaterialsUsage.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { BackofficeSidebar, HousekeepingSidebar } from "../../../components/sidebar/HousekeepingSidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

/**
 * Materials Usage
 *
 * Suggested backend endpoints:
 *  GET    /api/material-usage?q=&material=&room=&usedBy=&dept=&from=&to=&propertyCode=&page=&limit=
 *  POST   /api/material-usage
 *  PATCH  /api/material-usage/:id
 *  DELETE /api/material-usage/:id
 *
 * Example record:
 * {
 *   _id,
 *   materialName,    // "Floor Cleaner"
 *   quantity,        // 2.5
 *   unit,            // "L", "pcs"
 *   department,      // "Housekeeping" | "Maintenance" | "Other"
 *   usedForType,     // "ROOM" | "TASK" | "OTHER"
 *   roomNo,          // if usedForType === "ROOM"
 *   taskName,        // if usedForType === "TASK"
 *   usedById,
 *   usedByName,
 *   usageDate,       // ISO date
 *   note,
 *   propertyCode,    // "TST"
 *   createdAt, updatedAt
 * }
 */

const PAGE_SIZE = 10;
const DEPTS = ["Housekeeping", "Maintenance", "Other"];
const USED_FOR_TYPES = ["ROOM", "TASK", "OTHER"];

export default function MaterialsUsage() {
  // data / filters
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [material, setMaterial] = useState("");
  const [dept, setDept] = useState("");
  const [room, setRoom] = useState("");
  const [usedBy, setUsedBy] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [propertyCode, setPropertyCode] = useState("");

  // paging
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);

  // modals
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
        const params = new URLSearchParams({ page, limit });
        if (q.trim()) params.set("q", q.trim());
        if (material.trim()) params.set("material", material.trim());
        if (dept) params.set("dept", dept);
        if (room.trim()) params.set("room", room.trim());
        if (usedBy.trim()) params.set("usedBy", usedBy.trim());
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        if (propertyCode.trim()) params.set("propertyCode", propertyCode.trim().toUpperCase());

        const res = await apiFetch(`/api/material-usage?${params.toString()}`, { auth: true });
        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;

        if (!ignore) { setRows(Array.isArray(data) ? data : []); setTotal(Number(count) || 0); }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load materials usage."); setRows([]); setTotal(0); }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [q, material, dept, room, usedBy, from, to, propertyCode, page, limit]);

  // client search fallback
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [r.materialName, r.department, r.roomNo, r.taskName, r.usedByName, r.note, r.propertyCode]
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
      <HousekeepingSidebar />

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Materials Usage</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input className="res-select" placeholder="Search…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} style={{ minWidth: 200 }} />
            <input className="res-select" placeholder="Material" value={material} onChange={(e) => { setMaterial(e.target.value); setPage(1); }} style={{ width: 160 }} />
            <select className="res-select" value={dept} onChange={(e) => { setDept(e.target.value); setPage(1); }} style={{ width: 170 }}>
              <option value="">All Departments</option>
              {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <input className="res-select" placeholder="Room No" value={room} onChange={(e) => { setRoom(e.target.value); setPage(1); }} style={{ width: 120 }} />
            <input className="res-select" placeholder="Used By" value={usedBy} onChange={(e) => { setUsedBy(e.target.value); setPage(1); }} style={{ width: 160 }} />
            <input className="res-select" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
            <input className="res-select" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
            <input className="res-select" placeholder="Property Code" value={propertyCode} onChange={(e) => { setPropertyCode(e.target.value); setPage(1); }} style={{ textTransform: "uppercase", width: 150 }} />
            <select className="res-select" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
            <button className="btn" onClick={openCreate}>+ Add</button>
          </div>
        </div>

        {/* Table */}
        <div className="panel">
          <div className="panel-h">
            <span>Usage Log</span>
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
                    <th style={{ width: 120 }}>Action</th>
                    <th>Date</th>
                    <th>Material</th>
                    <th>Qty</th>
                    <th>Dept</th>
                    <th>Used For</th>
                    <th>Used By</th>
                    <th>Note</th>
                    <th>Property</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={10}>No usage entries</td></tr>
                  )}

                  {dataToRender?.map(r => {
                    const id = r._id || r.id;
                    const usedFor =
                      r.usedForType === "ROOM" ? `Room ${r.roomNo || "—"}` :
                      r.usedForType === "TASK" ? `Task: ${r.taskName || "—"}` :
                      "Other";
                    return (
                      <tr key={id}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="btn" style={btnSm} onClick={() => openEdit(r)}>✏️</button>
                          <button className="btn" style={btnSm} onClick={() => askDelete(r)}>🗑️</button>
                        </td>
                        <td>{fmtDateTime(r.usageDate)}</td>
                        <td>{r.materialName}</td>
                        <td>{fmtQty(r.quantity, r.unit)}</td>
                        <td>{r.department || "—"}</td>
                        <td>{usedFor}</td>
                        <td title={r.usedById || ""}>{r.usedByName || "—"}</td>
                        <td title={r.note || ""}>{r.note || "—"}</td>
                        <td>{r.propertyCode || "—"}</td>
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
        <UsageFormModal
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={afterSave}
        />
      )}

      {showDelete && (
        <ConfirmModal
          title="Delete Entry?"
          message={`Delete usage entry for "${toDelete?.materialName}"? This cannot be undone.`}
          confirmText="Delete"
          onClose={() => { setShowDelete(false); setToDelete(null); }}
          onConfirm={async () => {
            const id = toDelete?._id || toDelete?.id;
            await apiFetch(`/api/material-usage/${id}`, { method: "DELETE", auth: true });
            afterDelete(id);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Create/Edit Modal ---------- */
function UsageFormModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial;

  const [materialName, setMaterialName] = useState(initial?.materialName || "");
  const [quantity, setQuantity] = useState(initial?.quantity ?? 1);
  const [unit, setUnit] = useState(initial?.unit || "pcs");
  const [department, setDepartment] = useState(initial?.department || "Housekeeping");

  const [usedForType, setUsedForType] = useState(initial?.usedForType || "ROOM");
  const [roomNo, setRoomNo] = useState(initial?.roomNo || "");
  const [taskName, setTaskName] = useState(initial?.taskName || "");

  const [usedByName, setUsedByName] = useState(initial?.usedByName || "");
  const [usedById, setUsedById] = useState(initial?.usedById || "");

  const [usageDate, setUsageDate] = useState(toDateTimeValue(initial?.usageDate || new Date()));
  const [note, setNote] = useState(initial?.note || "");
  const [propertyCode, setPropertyCode] = useState(initial?.propertyCode || "");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");

    if (!materialName.trim()) return setErr("Material name is required.");
    const qtyNum = Number(quantity);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) return setErr("Quantity must be a positive number.");

    const payload = {
      materialName: materialName.trim(),
      quantity: qtyNum,
      unit: unit?.trim() || undefined,
      department,
      usedForType,
      roomNo: usedForType === "ROOM" ? (roomNo?.trim() || undefined) : undefined,
      taskName: usedForType === "TASK" ? (taskName?.trim() || undefined) : undefined,
      usedByName: usedByName?.trim() || undefined,
      usedById: usedById?.trim() || undefined,
      usageDate: new Date(usageDate).toISOString(),
      note: note?.trim() || undefined,
      propertyCode: propertyCode?.trim().toUpperCase() || undefined,
    };

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const id = initial._id || initial.id;
        saved = await apiFetch(`/api/material-usage/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(payload) });
      } else {
        saved = await apiFetch(`/api/material-usage`, { method: "POST", auth: true, body: JSON.stringify(payload) });
      }
      setOk("Saved.");
      onSaved(saved);
    } catch (e2) {
      setErr(e2?.message || "Failed to save usage entry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Materials Usage" : "Add Materials Usage"} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      {ok && <Banner type="ok">{ok}</Banner>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <Row>
          <Field label="Material" required>
            <input className="input" value={materialName} onChange={e => setMaterialName(e.target.value)} />
          </Field>
          <Field label="Quantity" required>
            <input className="input" type="number" min="0" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} />
          </Field>
          <Field label="Unit">
            <input className="input" value={unit} onChange={e => setUnit(e.target.value)} placeholder="pcs / L / kg" />
          </Field>
        </Row>

        <Row>
          <Field label="Department">
            <select className="res-select" value={department} onChange={e => setDepartment(e.target.value)}>
              {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Used For">
            <select className="res-select" value={usedForType} onChange={e => setUsedForType(e.target.value)}>
              {USED_FOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          {usedForType === "ROOM" ? (
            <Field label="Room No">
              <input className="input" value={roomNo} onChange={e => setRoomNo(e.target.value)} />
            </Field>
          ) : usedForType === "TASK" ? (
            <Field label="Task Name">
              <input className="input" value={taskName} onChange={e => setTaskName(e.target.value)} />
            </Field>
          ) : (
            <Field label="Note">
              <input className="input" placeholder="Reason / context" value={note} onChange={e => setNote(e.target.value)} />
            </Field>
          )}
        </Row>

        <Row>
          <Field label="Used By (Name)">
            <input className="input" value={usedByName} onChange={e => setUsedByName(e.target.value)} />
          </Field>
          <Field label="Used By (ID)">
            <input className="input" value={usedById} onChange={e => setUsedById(e.target.value)} />
          </Field>
          <Field label="Usage Date/Time">
            <input className="input" type="datetime-local" value={usageDate} onChange={e => setUsageDate(e.target.value)} />
          </Field>
        </Row>

        <Row>
          <Field label="Property Code">
            <input className="input" style={{ textTransform: "uppercase" }} value={propertyCode} onChange={e => setPropertyCode(e.target.value)} />
          </Field>
          {usedForType !== "OTHER" && (
            <Field label="Note">
              <input className="input" value={note} onChange={e => setNote(e.target.value)} />
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
function Row({ children }) {
  return <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(160px, 1fr))" }}>{children}</div>;
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
        <button className="btn" type="button" disabled={busy} onClick={async () => { setBusy(true); try { await onConfirm?.(); onClose(); } finally { setBusy(false); } }}>
          {busy ? "Working…" : confirmText}
        </button>
      </div>
    </Modal>
  );
}

/* ---------- utils ---------- */
function fmtQty(q, unit) {
  if (q === null || q === undefined || q === "") return "—";
  const n = Number(q);
  const qStr = Number.isFinite(n) ? (Math.round(n * 100) / 100).toString() : String(q);
  return unit ? `${qStr} ${unit}` : qStr;
}
function fmtDateTime(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(+dt) ? "—" : dt.toLocaleString(); }
function toDateTimeValue(d) {
  const dt = new Date(d);
  if (!d || Number.isNaN(+dt)) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth()+1).padStart(2,"0");
  const da = String(dt.getDate()).padStart(2,"0");
  const h = String(dt.getHours()).padStart(2,"0");
  const mi = String(dt.getMinutes()).padStart(2,"0");
  return `${y}-${m}-${da}T${h}:${mi}`;
}

/* ---------- inline styles ---------- */
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(980px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };
