// src/pages/Housekeeping/Productivity.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { BackofficeSidebar, HousekeepingSidebar } from "../../../components/sidebar/HousekeepingSidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

/**
 * Housekeeping Productivity
 *
 * Suggested backend endpoints (adapt as needed):
 *  GET    /api/hk-productivity?q=&staff=&status=&from=&to=&propertyCode=&page=&limit=
 *  POST   /api/hk-productivity
 *  PATCH  /api/hk-productivity/:id
 *  DELETE /api/hk-productivity/:id
 *
 * Record example:
 * {
 *   _id, date, staffName, staffId, shift, roomsCleaned, tasksCompleted,
 *   timeMinutes, efficiency, note, posted, propertyCode, createdAt, updatedAt
 * }
 */

const PAGE_SIZE = 10;

export default function Productivity() {
  // list state
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [staff, setStaff] = useState("");
  const [status, setStatus] = useState(""); // "", "POSTED", "DRAFT"
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
        if (staff.trim()) params.set("staff", staff.trim());
        if (status) params.set("status", status);
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        if (propertyCode.trim()) params.set("propertyCode", propertyCode.trim().toUpperCase());

        const res = await apiFetch(`/api/hk-productivity?${params.toString()}`, { auth: true });
        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;

        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number(count) || 0);
        }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load productivity logs."); setRows([]); setTotal(0); }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [q, staff, status, from, to, propertyCode, page, limit]);

  // client fallback search
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [r.staffName, r.staffId, r.shift, r.propertyCode, r.note]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  const dataToRender = rows?.length && total > rows.length ? rows : filtered;

  // actions
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

  const togglePosted = async (row) => {
    const id = row._id || row.id;
    try {
      const res = await apiFetch(`/api/hk-productivity/${id}`, {
        method: "PATCH", auth: true, body: JSON.stringify({ posted: !row.posted })
      });
      afterSave(res || { ...row, posted: !row.posted });
    } catch (e) {
      alert(e?.message || "Failed to change status.");
    }
  };

  // totals (current page)
  const totals = useMemo(() => {
    const tRooms = dataToRender.reduce((s, r) => s + num(r.roomsCleaned), 0);
    const tTasks = dataToRender.reduce((s, r) => s + num(r.tasksCompleted), 0);
    const tMins  = dataToRender.reduce((s, r) => s + num(r.timeMinutes), 0);
    return { tRooms, tTasks, tMins };
  }, [dataToRender]);

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <HousekeepingSidebar />

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Housekeeping Productivity</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input className="res-select" placeholder="Search (staff / note)" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} style={{ minWidth: 220 }} />
            <input className="res-select" placeholder="Staff" value={staff} onChange={(e) => { setStaff(e.target.value); setPage(1); }} style={{ width: 180 }} />
            <select className="res-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} style={{ width: 140 }}>
              <option value="">All Status</option>
              <option value="POSTED">POSTED</option>
              <option value="DRAFT">DRAFT</option>
            </select>
            <input className="res-select" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
            <input className="res-select" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
            <input className="res-select" placeholder="Property Code" value={propertyCode} onChange={(e) => { setPropertyCode(e.target.value); setPage(1); }} style={{ textTransform: "uppercase", width: 160 }} />
            <select className="res-select" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
            <button className="btn" onClick={openCreate}>+ Add</button>
          </div>
        </div>

        {/* Table */}
        <div className="panel">
          <div className="panel-h">
            <span>Daily Logs</span>
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
                    <th style={{ width: 180 }}>Action</th>
                    <th>Date</th>
                    <th>Staff</th>
                    <th>Shift</th>
                    <th>Rooms</th>
                    <th>Tasks</th>
                    <th>Time (min)</th>
                    <th>Efficiency</th>
                    <th>Status</th>
                    <th>Property</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={11}>No productivity records</td></tr>
                  )}

                  {dataToRender?.map(r => {
                    const id = r._id || r.id;
                    return (
                      <tr key={id}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="btn" style={btnSm} onClick={() => openEdit(r)}>✏️</button>
                          <button className="btn" style={btnSm} onClick={() => togglePosted(r)}>
                            {r.posted ? "Unpost" : "Post"}
                          </button>
                          <button className="btn" style={btnSm} onClick={() => { setToDelete(r); setShowDelete(true); }}>🗑️</button>
                        </td>
                        <td>{fmtDate(r.date) || fmtDate(r.createdAt)}</td>
                        <td title={r.staffId || ""}>{r.staffName || "—"}</td>
                        <td>{r.shift || "—"}</td>
                        <td>{num(r.roomsCleaned)}</td>
                        <td>{num(r.tasksCompleted)}</td>
                        <td>{num(r.timeMinutes)}</td>
                        <td title="tasks/hour">
                          {fmtEff(r.efficiency ?? calcEfficiency(r.roomsCleaned, r.tasksCompleted, r.timeMinutes))}
                        </td>
                        <td><Chip value={r.posted ? "POSTED" : "DRAFT"} /></td>
                        <td>{r.propertyCode || "—"}</td>
                        <td>{fmtDateTime(r.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} style={{ textAlign: "right", fontWeight: 800 }}>Totals (page):</td>
                    <td style={{ fontWeight: 800 }}>{totals.tRooms}</td>
                    <td style={{ fontWeight: 800 }}>{totals.tTasks}</td>
                    <td style={{ fontWeight: 800 }}>{totals.tMins}</td>
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
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
        <ProductivityFormModal
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={afterSave}
        />
      )}

      {showDelete && (
        <ConfirmModal
          title="Delete Record?"
          message={`Delete productivity entry for ${toDelete?.staffName || "staff"} on ${fmtDate(toDelete?.date)}? This cannot be undone.`}
          confirmText="Delete"
          onClose={() => { setShowDelete(false); setToDelete(null); }}
          onConfirm={async () => {
            const id = toDelete?._id || toDelete?.id;
            await apiFetch(`/api/hk-productivity/${id}`, { method: "DELETE", auth: true });
            afterDelete(id);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Create/Edit Modal ---------- */
function ProductivityFormModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial;

  const [date, setDate] = useState(initial?.date ? toDateValue(initial.date) : toDateValue(new Date()));
  const [staffName, setStaffName] = useState(initial?.staffName || "");
  const [staffId, setStaffId] = useState(initial?.staffId || "");
  const [shift, setShift] = useState(initial?.shift || "MORNING");
  const [roomsCleaned, setRoomsCleaned] = useState(num(initial?.roomsCleaned) || 0);
  const [tasksCompleted, setTasksCompleted] = useState(num(initial?.tasksCompleted) || 0);
  const [timeMinutes, setTimeMinutes] = useState(num(initial?.timeMinutes) || 0);
  const [note, setNote] = useState(initial?.note || "");
  const [propertyCode, setPropertyCode] = useState(initial?.propertyCode || "");
  const [posted, setPosted] = useState(initial?.posted ?? false);

  const eff = useMemo(
    () => calcEfficiency(roomsCleaned, tasksCompleted, timeMinutes),
    [roomsCleaned, tasksCompleted, timeMinutes]
  );

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");

    if (!date) return setErr("Date is required.");
    if (!staffName.trim()) return setErr("Staff name is required.");
    if (!Number.isFinite(Number(timeMinutes)) || Number(timeMinutes) <= 0) return setErr("Time (minutes) must be > 0.");

    const payload = {
      date,
      staffName: staffName.trim(),
      staffId: staffId?.trim() || undefined,
      shift,
      roomsCleaned: Number(roomsCleaned || 0),
      tasksCompleted: Number(tasksCompleted || 0),
      timeMinutes: Number(timeMinutes || 0),
      efficiency: eff,
      note: note?.trim() || undefined,
      propertyCode: propertyCode?.trim().toUpperCase() || undefined,
      posted: !!posted,
    };

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const id = initial._id || initial.id;
        saved = await apiFetch(`/api/hk-productivity/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(payload) });
      } else {
        saved = await apiFetch(`/api/hk-productivity`, { method: "POST", auth: true, body: JSON.stringify(payload) });
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
    <Modal title={isEdit ? "Edit Productivity" : "Add Productivity"} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      {ok && <Banner type="ok">{ok}</Banner>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <Row>
          <Field label="Date" required>
            <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </Field>
          <Field label="Staff Name" required>
            <input className="input" value={staffName} onChange={e => setStaffName(e.target.value)} />
          </Field>
          <Field label="Staff ID">
            <input className="input" value={staffId} onChange={e => setStaffId(e.target.value)} />
          </Field>
        </Row>

        <Row>
          <Field label="Shift">
            <select className="res-select" value={shift} onChange={e => setShift(e.target.value)}>
              {["MORNING", "EVENING", "NIGHT"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Rooms Cleaned">
            <input className="input" type="number" min="0" step="1" value={roomsCleaned} onChange={e => setRoomsCleaned(e.target.value)} />
          </Field>
          <Field label="Tasks Completed">
            <input className="input" type="number" min="0" step="1" value={tasksCompleted} onChange={e => setTasksCompleted(e.target.value)} />
          </Field>
        </Row>

        <Row>
          <Field label="Time (minutes)" required>
            <input className="input" type="number" min="1" step="1" value={timeMinutes} onChange={e => setTimeMinutes(e.target.value)} />
          </Field>
          <Field label="Efficiency (tasks/hour)">
            <input className="input" value={fmtEff(eff)} readOnly />
          </Field>
          <Field label="Property Code">
            <input className="input" style={{ textTransform: "uppercase" }} value={propertyCode} onChange={e => setPropertyCode(e.target.value)} />
          </Field>
        </Row>

        <Row>
          <Field label="Posted">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={posted} onChange={e => setPosted(e.target.checked)} />
              <span>{posted ? "Yes" : "No"}</span>
            </label>
          </Field>
          <Field label="Note">
            <input className="input" value={note} onChange={e => setNote(e.target.value)} />
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

/* ---------- Small UI blocks ---------- */
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
        <button className="btn" type="button" disabled={busy} onClick={async () => { setBusy(true); try { await onConfirm?.(); onClose(); } finally { setBusy(false); } }}>
          {busy ? "Working…" : confirmText}
        </button>
      </div>
    </Modal>
  );
}
function Chip({ value }) {
  const v = (value || "").toString().toUpperCase();
  const posted = v === "POSTED";
  return (
    <span style={{
      display: "inline-block", padding: ".15rem .5rem",
      borderRadius: 999, background: posted ? "#f0fdf4" : "#fefce8",
      border: `1px solid ${posted ? "#bbf7d0" : "#fde68a"}`,
      color: posted ? "#166534" : "#92400e", fontSize: ".75rem", fontWeight: 700
    }}>
      {posted ? "POSTED" : "DRAFT"}
    </span>
  );
}

/* ---------- helpers ---------- */
function num(v) { const n = Number(v ?? 0); return Number.isFinite(n) ? n : 0; }
function calcEfficiency(roomsCleaned, tasksCompleted, timeMinutes) {
  const mins = Number(timeMinutes || 0);
  if (!mins) return 0;
  const hours = mins / 60;
  // simple metric: tasks per hour (rooms count as a task too at 1.5x weight)
  const score = (Number(tasksCompleted || 0) + 1.5 * Number(roomsCleaned || 0)) / hours;
  return Number.isFinite(score) ? score : 0;
}
function fmtEff(v) { const n = Number(v || 0); return n.toFixed(2); }
function fmtDate(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(+dt) ? "—" : dt.toLocaleDateString(); }
function fmtDateTime(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(+dt) ? "—" : dt.toLocaleString(); }
function toDateValue(d) { const dt = new Date(d); if (Number.isNaN(+dt)) return ""; const y=dt.getFullYear(), m=String(dt.getMonth()+1).padStart(2,"0"), da=String(dt.getDate()).padStart(2,"0"); return `${y}-${m}-${da}`; }

/* ---------- inline styles ---------- */
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(980px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };
