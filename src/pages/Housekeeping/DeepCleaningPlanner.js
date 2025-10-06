// src/pages/Housekeeping/DeepCleaningPlanner.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { BackofficeSidebar, HousekeepingSidebar } from "../../components/sidebar/HousekeepingSidebar";
import "../../components/sidebar/Sidebar.css";
import "../../assets/css/commanPage.css";

/**
 * Deep Cleaning Planner (Housekeeping)
 *
 * Suggested API (adapt as needed):
 *  GET    /api/deep-cleaning-plans?q=&status=&frequency=&dateFrom=&dateTo=&room=&propertyCode=&page=&limit=
 *         -> { data: [...], total }
 *  POST   /api/deep-cleaning-plans
 *  PATCH  /api/deep-cleaning-plans/:id
 *  DELETE /api/deep-cleaning-plans/:id
 *
 * Optional helpers:
 *  GET    /api/employees?role=HK&limit=500   -> { data: [{_id,name}] }
 *  GET    /api/rooms?limit=500               -> { data: [{_id,number,name}] }
 */

const PAGE_SIZE = 10;
const STATUSES = ["PLANNED", "SCHEDULED", "IN_PROGRESS", "DONE", "SKIPPED", "CANCELED"];
const FREQUENCIES = ["ONE_TIME", "WEEKLY", "MONTHLY", "QUARTERLY", "BI_ANNUAL", "ANNUAL", "CUSTOM_DAYS"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export default function DeepCleaningPlanner() {
  // list state
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [frequency, setFrequency] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [room, setRoom] = useState("");
  const [propertyCode, setPropertyCode] = useState("");

  // paging
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);

  // modals
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  // dropdowns (optional)
  const [staff, setStaff] = useState([]);
  const [rooms, setRooms] = useState([]);

  // load dropdowns
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const [empRes, roomRes] = await Promise.allSettled([
          apiFetch(`/api/employees?role=HK&limit=500`, { auth: true }),
          apiFetch(`/api/rooms?limit=500`, { auth: true }),
        ]);
        if (!ignore) {
          if (empRes.status === "fulfilled") {
            const list = Array.isArray(empRes.value?.data) ? empRes.value.data : (Array.isArray(empRes.value) ? empRes.value : []);
            setStaff(list);
          }
          if (roomRes.status === "fulfilled") {
            const list = Array.isArray(roomRes.value?.data) ? roomRes.value.data : (Array.isArray(roomRes.value) ? roomRes.value : []);
            setRooms(list);
          }
        }
      } catch {/* ignore */}
    })();
    return () => { ignore = true; };
  }, []);

  // load list
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const params = new URLSearchParams({ page, limit });
        if (q.trim()) params.set("q", q.trim());
        if (status) params.set("status", status);
        if (frequency) params.set("frequency", frequency);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
        if (room.trim()) params.set("room", room.trim());
        if (propertyCode.trim()) params.set("propertyCode", propertyCode.trim().toUpperCase());

        const res = await apiFetch(`/api/deep-cleaning-plans?${params.toString()}`, { auth: true });
        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;

        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number(count) || 0);
        }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load deep cleaning plans."); setRows([]); setTotal(0); }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [q, status, frequency, dateFrom, dateTo, room, propertyCode, page, limit]);

  // client fallback search
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [r.roomNumber, r.assigneeName, r.status, r.frequency, r.notes]
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
      const res = await apiFetch(`/api/deep-cleaning-plans/${id}`, {
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
          <h2 style={{ margin: 0 }}>Deep Cleaning Planner</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="res-select"
              placeholder="Search (room / assignee / note)"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              style={{ minWidth: 220 }}
            />
            <select className="res-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="res-select" value={frequency} onChange={(e) => { setFrequency(e.target.value); setPage(1); }}>
              <option value="">All Frequencies</option>
              {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <input className="res-select" type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} title="From" />
            <input className="res-select" type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} title="To" />
            <input className="res-select" placeholder="Room #" value={room} onChange={(e) => { setRoom(e.target.value); setPage(1); }} style={{ width: 120 }} />
            <input className="res-select" placeholder="Property Code" value={propertyCode} onChange={(e) => { setPropertyCode(e.target.value); setPage(1); }} style={{ textTransform: "uppercase", width: 140 }} />
            <select className="res-select" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
            <button className="btn" onClick={openCreate}>+ Add Plan</button>
          </div>
        </div>

        {/* Table */}
        <div className="panel">
          <div className="panel-h">
            <span>Plans</span>
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
                    <th>Window</th>
                    <th>Frequency</th>
                    <th>Tasks</th>
                    <th>Materials</th>
                    <th>Est (min)</th>
                    <th>Priority</th>
                    <th>Assignee</th>
                    <th>Status</th>
                    <th>Last Done</th>
                    <th>Next Due</th>
                    <th>Property</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={14}>No deep cleaning plans found</td></tr>
                  )}

                  {dataToRender?.map(r => {
                    const id = r._id || r.id;
                    const tasksTxt = Array.isArray(r.tasks) ? r.tasks.join(", ") : (r.tasks || "—");
                    const matsTxt = Array.isArray(r.materials) ? r.materials.join(", ") : (r.materials || "—");
                    const win = [fmtDate(r.windowStart), fmtDate(r.windowEnd)].filter(Boolean).join(" – ") || "—";

                    return (
                      <tr key={id}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="btn" style={btnSm} onClick={() => openEdit(r)}>✏️</button>
                          <button className="btn" style={btnSm} onClick={() => askDelete(r)}>🗑️</button>
                        </td>
                        <td>{r.roomNumber || r.roomName || "—"}</td>
                        <td>{win}</td>
                        <td><Chip value={r.frequency || "ONE_TIME"} palette="freq" /></td>
                        <td title={tasksTxt}>{truncate(tasksTxt, 24)}</td>
                        <td title={matsTxt}>{truncate(matsTxt, 18)}</td>
                        <td style={{ textAlign: "right" }}>{r.estMinutes || "—"}</td>
                        <td><Chip value={r.priority || "MEDIUM"} palette="priority" /></td>
                        <td>{r.assigneeName || "—"}</td>
                        <td>
                          <Chip value={r.status || "PLANNED"} palette="status" />
                          <div style={{ marginTop: 4 }}>
                            <select
                              className="res-select"
                              value={(r.status || "PLANNED")}
                              onChange={(e) => quickUpdateStatus(r, e.target.value)}
                            >
                              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        </td>
                        <td>{fmtDateTime(r.lastDoneAt)}</td>
                        <td>{fmtDate(r.nextDueAt)}</td>
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
        <PlanFormModal
          initial={editing}
          staff={staff}
          rooms={rooms}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={afterSave}
        />
      )}

      {showDelete && (
        <ConfirmModal
          title="Delete Plan?"
          message={`Delete deep cleaning plan for room "${toDelete?.roomNumber || toDelete?.roomName}"? This cannot be undone.`}
          confirmText="Delete"
          onClose={() => { setShowDelete(false); setToDelete(null); }}
          onConfirm={async () => {
            const id = toDelete?._id || toDelete?.id;
            await apiFetch(`/api/deep-cleaning-plans/${id}`, { method: "DELETE", auth: true });
            afterDelete(id);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Form Modal ---------- */
function PlanFormModal({ initial, onClose, onSaved, staff = [], rooms = [] }) {
  const isEdit = !!initial;

  const [roomId, setRoomId] = useState(initial?.roomId || "");
  const [roomNumber, setRoomNumber] = useState(initial?.roomNumber || "");
  const [windowStart, setWindowStart] = useState(initial?.windowStart ? toLocalDate(initial.windowStart) : toLocalDate(new Date()));
  const [windowEnd, setWindowEnd] = useState(initial?.windowEnd ? toLocalDate(initial.windowEnd) : toLocalDate(new Date()));
  const [frequency, setFrequency] = useState(initial?.frequency || "ONE_TIME");
  const [customDays, setCustomDays] = useState(initial?.customDays || 0);
  const [estMinutes, setEstMinutes] = useState(initial?.estMinutes || 60);
  const [priority, setPriority] = useState(initial?.priority || "MEDIUM");
  const [status, setStatus] = useState(initial?.status || "PLANNED");
  const [assigneeId, setAssigneeId] = useState(initial?.assigneeId || "");
  const [assigneeName, setAssigneeName] = useState(initial?.assigneeName || "");
  const [tasks, setTasks] = useState(Array.isArray(initial?.tasks) ? initial.tasks.join(", ") : (initial?.tasks || ""));
  const [materials, setMaterials] = useState(Array.isArray(initial?.materials) ? initial.materials.join(", ") : (initial?.materials || ""));
  const [notes, setNotes] = useState(initial?.notes || "");
  const [propertyCode, setPropertyCode] = useState(initial?.propertyCode || "");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");

    if (!roomId && !roomNumber.trim()) return setErr("Room is required");
    if (!windowStart) return setErr("Window start date is required");
    if (!windowEnd) return setErr("Window end date is required");

    const chosenEmp = staff.find(e => (e._id || e.id) === assigneeId);
    const chosenRoom = rooms.find(r => (r._id || r.id) === roomId);

    const tasksArr = splitCsv(tasks);
    const materialsArr = splitCsv(materials);

    const payload = {
      roomId: roomId || undefined,
      roomNumber: (chosenRoom?.number || roomNumber || "").trim(),
      windowStart,
      windowEnd,
      frequency,
      customDays: Number(customDays || 0) || undefined,
      estMinutes: Number(estMinutes || 0) || undefined,
      priority,
      status,
      assigneeId: assigneeId || undefined,
      assigneeName: chosenEmp?.name || assigneeName || undefined,
      tasks: tasksArr.length ? tasksArr : undefined,
      materials: materialsArr.length ? materialsArr : undefined,
      notes: notes.trim() || undefined,
      propertyCode: propertyCode ? propertyCode.trim().toUpperCase() : undefined,
    };

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const id = initial._id || initial.id;
        saved = await apiFetch(`/api/deep-cleaning-plans/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(payload) });
      } else {
        saved = await apiFetch(`/api/deep-cleaning-plans`, { method: "POST", auth: true, body: JSON.stringify(payload) });
      }
      setOk("Saved.");
      onSaved(saved);
    } catch (e2) {
      setErr(e2?.message || "Failed to save plan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Deep Cleaning Plan" : "Create Deep Cleaning Plan"} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      {ok && <Banner type="ok">{ok}</Banner>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        {/* Room & Window */}
        <Row>
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
          <Field label="Window Start" required>
            <input className="input" type="date" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} />
          </Field>
        </Row>

        <Row>
          <Field label="Window End" required>
            <input className="input" type="date" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} />
          </Field>
          <Field label="Frequency">
            <select className="res-select" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
              {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Custom Days (if CUSTOM_DAYS)">
            <input className="input" type="number" min="0" value={customDays} onChange={(e) => setCustomDays(e.target.value)} />
          </Field>
        </Row>

        {/* Details */}
        <Row>
          <Field label="Estimated Minutes">
            <input className="input" type="number" min="0" value={estMinutes} onChange={(e) => setEstMinutes(e.target.value)} />
          </Field>
          <Field label="Priority">
            <select className="res-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className="res-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </Row>

        <Row>
          <Field label="Assignee">
            <select
              className="res-select"
              value={assigneeId}
              onChange={(e) => {
                setAssigneeId(e.target.value);
                const emp = staff.find(x => (x._id || x.id) === e.target.value);
                if (emp?.name) setAssigneeName(emp.name);
              }}
            >
              <option value="">— Select —</option>
              {staff.map(emp => (
                <option key={emp._id || emp.id} value={emp._id || emp.id}>
                  {emp.name || emp.email || (emp._id || emp.id)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Property Code">
            <input className="input" style={{ textTransform: "uppercase" }} value={propertyCode} onChange={(e) => setPropertyCode(e.target.value)} />
          </Field>
          <Field label="Notes">
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </Row>

        {/* Tasks / Materials */}
        <div className="panel" style={{ marginTop: 4 }}>
          <div className="panel-h">Tasks & Materials (comma-separated)</div>
          <div className="panel-b" style={{ display: "grid", gap: 8 }}>
            <textarea className="input" rows={2} placeholder="Tasks (e.g. curtains, vents, mattress flip, descaling, ...)"
              value={tasks} onChange={(e) => setTasks(e.target.value)} />
            <textarea className="input" rows={2} placeholder="Materials (e.g. descaler, polish, liners, ...)"
              value={materials} onChange={(e) => setMaterials(e.target.value)} />
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

/* ---------- UI atoms ---------- */
function Row({ children }) {
  return <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(160px, 1fr))" }}>{children}</div>;
}
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
function Chip({ value, palette = "status" }) {
  const v = (value || "").toString().toUpperCase();
  let bg = "#f3f4f6", bd = "#e5e7eb", fg = "#334155";
  if (palette === "status") {
    if (v === "PLANNED")     { bg="#eff6ff"; bd="#bfdbfe"; fg="#1d4ed8"; }
    if (v === "SCHEDULED")   { bg="#e0f2fe"; bd="#bae6fd"; fg="#075985"; }
    if (v === "IN_PROGRESS") { bg="#fef3c7"; bd="#fde68a"; fg="#92400e"; }
    if (v === "DONE")        { bg="#f0fdf4"; bd="#bbf7d0"; fg="#166534"; }
    if (v === "SKIPPED")     { bg="#f5f3ff"; bd="#ddd6fe"; fg="#5b21b6"; }
    if (v === "CANCELED")    { bg="#fee2e2"; bd="#fecaca"; fg="#991b1b"; }
  }
  if (palette === "priority") {
    if (v === "LOW")    { bg="#eef2ff"; bd="#c7d2fe"; fg="#3730a3"; }
    if (v === "MEDIUM") { bg="#e0e7ff"; bd="#c7d2fe"; fg="#312e81"; }
    if (v === "HIGH")   { bg="#ffe4e6"; bd="#fecdd3"; fg="#9f1239"; }
    if (v === "URGENT") { bg="#fee2e2"; bd="#fecaca"; fg="#991b1b"; }
  }
  if (palette === "freq") {
    if (v === "ONE_TIME")   { bg="#f3f4f6"; bd="#e5e7eb"; fg="#334155"; }
    if (v === "WEEKLY")     { bg="#ecfeff"; bd="#a5f3fc"; fg="#155e75"; }
    if (v === "MONTHLY")    { bg="#fff7ed"; bd="#fed7aa"; fg="#9a3412"; }
    if (v === "QUARTERLY")  { bg="#fef9c3"; bd="#fde68a"; fg="#a16207"; }
    if (v === "BI_ANNUAL")  { bg="#f1f5f9"; bd="#e2e8f0"; fg="#0f172a"; }
    if (v === "ANNUAL")     { bg="#ede9fe"; bd="#ddd6fe"; fg="#6d28d9"; }
    if (v === "CUSTOM_DAYS"){ bg="#e9d5ff"; bd="#d8b4fe"; fg="#6b21a8"; }
  }
  return (
    <span style={{
      display: "inline-block", padding: ".15rem .5rem",
      borderRadius: 999, background: bg, border: `1px solid ${bd}`,
      color: fg, fontSize: ".75rem", fontWeight: 700, whiteSpace: "nowrap"
    }}>
      {v}
    </span>
  );
}

/* ---------- helpers ---------- */
function splitCsv(s) {
  const val = (s || "").split(",").map(x => x.trim()).filter(Boolean);
  return Array.from(new Set(val)); // dedupe
}
function truncate(s, n = 30) { if (!s) return ""; return s.length > n ? s.slice(0, n - 1) + "…" : s; }
function toLocalDate(d) {
  const dt = new Date(d);
  if (Number.isNaN(+dt)) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fmtDate(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(+dt) ? "—" : dt.toLocaleDateString(); }
function fmtDateTime(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(+dt) ? "—" : dt.toLocaleString(); }

/* ---------- inline styles ---------- */
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(980px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };
