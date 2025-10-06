// src/pages/Housekeeping/CleaningSchedule.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { BackofficeSidebar, HousekeepingSidebar } from "../../components/sidebar/HousekeepingSidebar";
import "../../components/sidebar/Sidebar.css";
import "../../assets/css/commanPage.css";

/**
 * Cleaning Schedule (Housekeeping)
 *
 * Suggested API (adjust to your backend):
 *  GET    /api/cleaning-schedules?q=&status=&shift=&date=&page=&limit=&propertyCode=
 *         -> { data: [...], total }
 *  POST   /api/cleaning-schedules
 *  PATCH  /api/cleaning-schedules/:id
 *  DELETE /api/cleaning-schedules/:id
 *
 * Optional helpers:
 *  GET    /api/employees?role=HOUSEKEEPING&limit=500 -> { data: [{_id,name,email}] }
 *  GET    /api/rooms?limit=500 -> { data: [{_id,number,name}] }
 */

const PAGE_SIZE = 10;

export default function CleaningSchedule() {
  // list state
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [shift, setShift] = useState("");
  const [date, setDate] = useState(""); // YYYY-MM-DD
  const [propertyCode, setPropertyCode] = useState("");

  // paging
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);

  // modals
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  // dropdown data (optional)
  const [housekeepers, setHousekeepers] = useState([]);
  const [rooms, setRooms] = useState([]);

  // load dropdowns (optional)
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const [empRes, roomRes] = await Promise.allSettled([
          apiFetch(`/api/employees?role=HOUSEKEEPING&limit=500`, { auth: true }),
          apiFetch(`/api/rooms?limit=500`, { auth: true }),
        ]);

        if (!ignore) {
          if (empRes.status === "fulfilled") {
            const list = Array.isArray(empRes.value?.data) ? empRes.value.data : Array.isArray(empRes.value) ? empRes.value : [];
            setHousekeepers(list);
          }
          if (roomRes.status === "fulfilled") {
            const list = Array.isArray(roomRes.value?.data) ? roomRes.value.data : Array.isArray(roomRes.value) ? roomRes.value : [];
            setRooms(list);
          }
        }
      } catch {
        // ignore
      }
    })();
    return () => { ignore = true; };
  }, []);

  // load schedules
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const params = new URLSearchParams({ page, limit });
        if (q.trim()) params.set("q", q.trim());
        if (status) params.set("status", status);
        if (shift) params.set("shift", shift);
        if (date) params.set("date", date);
        if (propertyCode.trim()) params.set("propertyCode", propertyCode.trim().toUpperCase());

        const res = await apiFetch(`/api/cleaning-schedules?${params.toString()}`, { auth: true });
        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;
        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number(count) || 0);
        }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load cleaning schedules."); setRows([]); setTotal(0); }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [q, status, shift, date, propertyCode, page, limit]);

  // client search fallback
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [r.roomNumber, r.type, r.assigneeName, r.status, r.notes]
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

  const quickUpdateStatus = async (row, next) => {
    const id = row._id || row.id;
    try {
      const res = await apiFetch(`/api/cleaning-schedules/${id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ status: next }),
      });
      afterSave(res || { ...row, status: next });
    } catch (e) {
      alert(e?.message || "Failed to update status");
    }
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <HousekeepingSidebar />

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Cleaning Schedule</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="res-select"
              placeholder="Search (room / staff / notes)"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              style={{ minWidth: 240 }}
            />
            <select
              className="res-select"
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              title="Status"
            >
              <option value="">All Status</option>
              <option value="PLANNED">Planned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="PAUSED">Paused</option>
              <option value="DONE">Done</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select
              className="res-select"
              value={shift}
              onChange={(e) => { setShift(e.target.value); setPage(1); }}
              title="Shift"
            >
              <option value="">All Shifts</option>
              <option value="MORNING">Morning</option>
              <option value="EVENING">Evening</option>
              <option value="NIGHT">Night</option>
            </select>
            <input
              className="res-select"
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); setPage(1); }}
              title="Date"
            />
            <input
              className="res-select"
              placeholder="Property Code"
              value={propertyCode}
              onChange={(e) => { setPropertyCode(e.target.value); setPage(1); }}
              style={{ textTransform: "uppercase", width: 140 }}
              title="Filter by property"
            />
            <select
              className="res-select"
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              title="Rows per page"
            >
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
            <button className="btn" onClick={openCreate}>+ Schedule</button>
          </div>
        </div>

        {/* Table */}
        <div className="panel">
          <div className="panel-h">
            <span>Cleaning Schedule</span>
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
                    <th>Room</th>
                    <th>Date</th>
                    <th>Shift</th>
                    <th>Type</th>
                    <th>Assignee</th>
                    <th>Status</th>
                    <th>Property</th>
                    <th>Notes</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={10}>No schedules found</td></tr>
                  )}

                  {dataToRender?.map(r => {
                    const id = r._id || r.id;
                    return (
                      <tr key={id}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="btn" style={btnSm} onClick={() => openEdit(r)}>✏️</button>
                          <button className="btn" style={btnSm} onClick={() => askDelete(r)}>🗑️</button>
                        </td>
                        <td>{r.roomNumber || r.roomName || "—"}</td>
                        <td>{fmtDate(r.cleaningDate)}</td>
                        <td><Chip value={r.shift || "MORNING"} palette="shift" /></td>
                        <td><Chip value={r.type || "STAYOVER"} palette="type" /></td>
                        <td>{r.assigneeName || "—"}</td>
                        <td>
                          <Chip value={r.status || "PLANNED"} palette="status" />
                          <div style={{ marginTop: 4 }}>
                            <select
                              className="res-select"
                              value={(r.status || "PLANNED")}
                              onChange={(e) => quickUpdateStatus(r, e.target.value)}
                            >
                              {["PLANNED", "IN_PROGRESS", "PAUSED", "DONE", "CANCELLED"].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        </td>
                        <td>{r.propertyCode || "—"}</td>
                        <td title={r.notes || ""}>{truncate(r.notes, 24)}</td>
                        <td>{fmtDateTime(r.createdAt)}</td>
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
              <button
                className="btn"
                disabled={loading || (!total ? dataToRender.length < limit : page * limit >= total)}
                onClick={() => setPage(p => p + 1)}>
                Next ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <ScheduleFormModal
          initial={editing}
          housekeepers={housekeepers}
          rooms={rooms}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={afterSave}
        />
      )}

      {showDelete && (
        <ConfirmModal
          title="Delete Schedule?"
          message={`Delete cleaning schedule for room "${toDelete?.roomNumber || toDelete?.roomName}"? This cannot be undone.`}
          confirmText="Delete"
          onClose={() => { setShowDelete(false); setToDelete(null); }}
          onConfirm={async () => {
            const id = toDelete?._id || toDelete?.id;
            await apiFetch(`/api/cleaning-schedules/${id}`, { method: "DELETE", auth: true });
            afterDelete(id);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Form Modal ---------- */
function ScheduleFormModal({ initial, onClose, onSaved, housekeepers = [], rooms = [] }) {
  const isEdit = !!initial;

  const [roomId, setRoomId] = useState(initial?.roomId || "");
  const [roomNumber, setRoomNumber] = useState(initial?.roomNumber || "");
  const [cleaningDate, setCleaningDate] = useState(initial?.cleaningDate ? toISO(initial.cleaningDate) : "");
  const [shift, setShift] = useState(initial?.shift || "MORNING");
  const [type, setType] = useState(initial?.type || "STAYOVER");
  const [status, setStatus] = useState(initial?.status || "PLANNED");
  const [assigneeId, setAssigneeId] = useState(initial?.assigneeId || "");
  const [assigneeName, setAssigneeName] = useState(initial?.assigneeName || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [propertyCode, setPropertyCode] = useState(initial?.propertyCode || "");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");

    if (!roomId && !roomNumber.trim()) return setErr("Room is required");
    if (!cleaningDate) return setErr("Date is required");

    const chosenEmp = housekeepers.find(e => (e._id || e.id) === assigneeId);
    const chosenRoom = rooms.find(r => (r._id || r.id) === roomId);

    const payload = {
      roomId: roomId || undefined,
      roomNumber: (chosenRoom?.number || roomNumber || "").trim(),
      cleaningDate,
      shift,
      type,
      status,
      assigneeId: assigneeId || undefined,
      assigneeName: chosenEmp?.name || assigneeName || undefined,
      notes: notes.trim(),
      propertyCode: propertyCode ? propertyCode.trim().toUpperCase() : undefined,
    };

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const id = initial._id || initial.id;
        saved = await apiFetch(`/api/cleaning-schedules/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(payload) });
      } else {
        saved = await apiFetch(`/api/cleaning-schedules`, { method: "POST", auth: true, body: JSON.stringify(payload) });
      }
      setOk("Saved.");
      onSaved(saved);
    } catch (e2) {
      setErr(e2?.message || "Failed to save schedule.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Cleaning Schedule" : "Create Cleaning Schedule"} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      {ok && <Banner type="ok">{ok}</Banner>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        {/* Row 1: Room + Date + Shift */}
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(160px, 1fr))" }}>
          <Field label="Room (select list)">
            <select
              className="res-select"
              value={roomId}
              onChange={(e) => {
                setRoomId(e.target.value);
                const rm = rooms.find(x => (x._id || x.id) === e.target.value);
                if (rm?.number) setRoomNumber(rm.number);
              }}
            >
              <option value="">— Select —</option>
              {rooms.map(r => (
                <option key={r._id || r.id} value={r._id || r.id}>
                  {r.number || r.name || (r._id || r.id)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Or enter room no. manually">
            <input className="input" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
          </Field>
          <Field label="Date" required>
            <input className="input" type="date" value={cleaningDate} onChange={(e) => setCleaningDate(e.target.value)} />
          </Field>
        </div>

        {/* Row 2: Shift + Type + Status */}
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(160px, 1fr))" }}>
          <Field label="Shift">
            <select className="res-select" value={shift} onChange={(e) => setShift(e.target.value)}>
              {["MORNING", "EVENING", "NIGHT"].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Clean Type">
            <select className="res-select" value={type} onChange={(e) => setType(e.target.value)}>
              {["STAYOVER", "CHECKOUT", "DEEP_CLEAN"].map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className="res-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              {["PLANNED", "IN_PROGRESS", "PAUSED", "DONE", "CANCELLED"].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        {/* Row 3: Assignee + Property */}
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(160px, 1fr))" }}>
          <Field label="Assign To (Housekeeper)">
            <select
              className="res-select"
              value={assigneeId}
              onChange={(e) => {
                setAssigneeId(e.target.value);
                const emp = housekeepers.find(x => (x._id || x.id) === e.target.value);
                if (emp?.name) setAssigneeName(emp.name);
              }}
            >
              <option value="">— Select —</option>
              {housekeepers.map(emp => (
                <option key={emp._id || emp.id} value={emp._id || emp.id}>
                  {emp.name || emp.email || (emp._id || emp.id)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Property Code">
            <input className="input" style={{ textTransform: "uppercase" }} value={propertyCode} onChange={(e) => setPropertyCode(e.target.value)} />
          </Field>
        </div>

        <Field label="Notes">
          <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

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

/* ---------- Tiny UI atoms ---------- */
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

/* ---------- Chips ---------- */
function Chip({ value, palette }) {
  const v = (value || "").toString().toUpperCase();

  let bg = "#f3f4f6", bd = "#e5e7eb", fg = "#334155";
  if (palette === "status") {
    if (v === "PLANNED")     { bg="#eff6ff"; bd="#bfdbfe"; fg="#1d4ed8"; }
    if (v === "IN_PROGRESS") { bg="#ecfdf5"; bd="#a7f3d0"; fg="#065f46"; }
    if (v === "PAUSED")      { bg="#fef3c7"; bd="#fde68a"; fg="#92400e"; }
    if (v === "DONE")        { bg="#f0fdf4"; bd="#bbf7d0"; fg="#166534"; }
    if (v === "CANCELLED")   { bg="#f5f3ff"; bd="#ddd6fe"; fg="#6b21a8"; }
  } else if (palette === "shift") {
    if (v === "MORNING") { bg="#ecfeff"; bd="#a5f3fc"; fg="#155e75"; }
    if (v === "EVENING") { bg="#fff7ed"; bd="#fed7aa"; fg="#9a3412"; }
    if (v === "NIGHT")   { bg="#e5e7eb"; bd="#cbd5e1"; fg="#0f172a"; }
  } else if (palette === "type") {
    if (v === "STAYOVER")   { bg="#eef2ff"; bd="#c7d2fe"; fg="#3730a3"; }
    if (v === "CHECKOUT")   { bg="#fde68a"; bd="#fcd34d"; fg="#92400e"; }
    if (v === "DEEP_CLEAN") { bg="#fee2e2"; bd="#fecaca"; fg="#991b1b"; }
  }

  return (
    <span style={{
      display: "inline-block", padding: ".15rem .5rem",
      borderRadius: 999, background: bg, border: `1px solid ${bd}`,
      color: fg, fontSize: ".75rem", fontWeight: 700, whiteSpace: "nowrap"
    }}>
      {v.replaceAll("_", " ")}
    </span>
  );
}

/* ---------- helpers ---------- */
function truncate(s, n = 30) { if (!s) return ""; return s.length > n ? s.slice(0, n - 1) + "…" : s; }
function toISO(d) { const dt = new Date(d); if (Number.isNaN(+dt)) return ""; const y = dt.getFullYear(); const m = String(dt.getMonth()+1).padStart(2,"0"); const day = String(dt.getDate()).padStart(2,"0"); return `${y}-${m}-${day}`; }
function fmtDate(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(+dt) ? "—" : dt.toLocaleDateString(); }
function fmtDateTime(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(+dt) ? "—" : dt.toLocaleString(); }

/* ---------- inline styles ---------- */
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(900px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };
