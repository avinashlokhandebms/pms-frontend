// src/pages/Tasks/AssignTasks.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { BackofficeSidebar, HousekeepingSidebar } from "../../components/sidebar/HousekeepingSidebar";
import "../../components/sidebar/Sidebar.css";
import "../../assets/css/commanPage.css";

/**
 * Assign Tasks
 *
 * API (adjust to your backend):
 *  GET    /api/tasks?q=&status=&page=&limit=&propertyCode=
 *         -> { data: [...], total }
 *  POST   /api/tasks
 *  PATCH  /api/tasks/:id
 *  DELETE /api/tasks/:id
 *
 * Optional (assignee dropdown):
 *  GET    /api/employees?limit=500 -> { data: [{_id,name,email}], ... }
 */

const PAGE_SIZE = 10;

export default function AssignTasks() {
  // list state
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [propertyCode, setPropertyCode] = useState("");

  // paging
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);

  // modals
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  // employees for dropdown (optional)
  const [employees, setEmployees] = useState([]);

  // load employees (optional)
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await apiFetch(`/api/employees?limit=500`, { auth: true });
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        if (!ignore) setEmployees(list);
      } catch {
        // ignore silently
      }
    })();
    return () => { ignore = true; };
  }, []);

  // load tasks
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const params = new URLSearchParams({ page, limit });
        if (q.trim()) params.set("q", q.trim());
        if (status) params.set("status", status);
        if (propertyCode.trim()) params.set("propertyCode", propertyCode.trim().toUpperCase());

        const res = await apiFetch(`/api/tasks?${params.toString()}`, { auth: true });
        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;
        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number(count) || 0);
        }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load tasks."); setRows([]); setTotal(0); }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [q, status, propertyCode, page, limit]);

  // client fallback search
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [r.title, r.description, r.assigneeName, r.priority, r.status]
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

  const quickUpdateStatus = async (row, nextStatus) => {
    const id = row._id || row.id;
    try {
      const res = await apiFetch(`/api/tasks/${id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ status: nextStatus }),
      });
      afterSave(res || { ...row, status: nextStatus });
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
          <h2 style={{ margin: 0 }}>Assign Tasks</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="res-select"
              placeholder="Search (title / desc / assignee)"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              style={{ minWidth: 260 }}
            />
            <select
              className="res-select"
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              title="Status"
            >
              <option value="">All Status</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <input
              className="res-select"
              placeholder="Property Code"
              value={propertyCode}
              onChange={(e) => { setPropertyCode(e.target.value); setPage(1); }}
              style={{ textTransform: "uppercase", width: 140 }}
            />
            <select
              className="res-select"
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              title="Rows per page"
            >
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
            <button className="btn" onClick={openCreate}>+ New Task</button>
          </div>
        </div>

        {/* Table */}
        <div className="panel">
          <div className="panel-h">
            <span>Tasks</span>
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
                    <th>Title</th>
                    <th>Assignee</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Due</th>
                    <th>Property</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={8}>No tasks found</td></tr>
                  )}

                  {dataToRender?.map(r => {
                    const id = r._id || r.id;
                    return (
                      <tr key={id}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="btn" style={btnSm} onClick={() => openEdit(r)}>✏️</button>
                          <button className="btn" style={btnSm} onClick={() => askDelete(r)}>🗑️</button>
                        </td>
                        <td title={r.description || ""}>
                          <b>{r.title}</b>
                          {r.description ? <div className="small" style={{ color: "var(--muted)" }}>{truncate(r.description, 80)}</div> : null}
                        </td>
                        <td>{r.assigneeName || "—"}</td>
                        <td><PriorityChip value={r.priority} /></td>
                        <td>
                          <StatusChip value={r.status} />
                          <div style={{ marginTop: 4 }}>
                            <select
                              className="res-select"
                              value={(r.status || "OPEN")}
                              onChange={(e) => quickUpdateStatus(r, e.target.value)}
                            >
                              {["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        </td>
                        <td>{fmtDate(r.dueDate)}</td>
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
        <TaskFormModal
          initial={editing}
          employees={employees}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={afterSave}
        />
      )}

      {showDelete && (
        <ConfirmModal
          title="Delete Task?"
          message={`Delete "${toDelete?.title}"? This cannot be undone.`}
          confirmText="Delete"
          onClose={() => { setShowDelete(false); setToDelete(null); }}
          onConfirm={async () => {
            const id = toDelete?._id || toDelete?.id;
            await apiFetch(`/api/tasks/${id}`, { method: "DELETE", auth: true });
            afterDelete(id);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Form Modal ---------- */
function TaskFormModal({ initial, employees = [], onClose, onSaved }) {
  const isEdit = !!initial;

  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [priority, setPriority] = useState(initial?.priority || "NORMAL");
  const [status, setStatus] = useState(initial?.status || "OPEN");
  const [dueDate, setDueDate] = useState(initial?.dueDate ? toISO(initial.dueDate) : "");
  const [propertyCode, setPropertyCode] = useState(initial?.propertyCode || "");

  const [assigneeId, setAssigneeId] = useState(initial?.assigneeId || "");
  const [assigneeName, setAssigneeName] = useState(initial?.assigneeName || "");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");

    if (!title.trim()) return setErr("Title is required");

    const chosen = employees.find(e => (e._id || e.id) === assigneeId);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      dueDate: dueDate || null,
      propertyCode: propertyCode ? propertyCode.trim().toUpperCase() : undefined,
      assigneeId: assigneeId || undefined,
      assigneeName: chosen?.name || assigneeName || undefined,
    };

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const id = initial._id || initial.id;
        saved = await apiFetch(`/api/tasks/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(payload) });
      } else {
        saved = await apiFetch(`/api/tasks`, { method: "POST", auth: true, body: JSON.stringify(payload) });
      }
      setOk("Saved.");
      onSaved(saved);
    } catch (e2) {
      setErr(e2?.message || "Failed to save task.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Task" : "Create Task"} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      {ok && <Banner type="ok">{ok}</Banner>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(160px, 1fr))" }}>
          <Field label="Title" required>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Priority">
            <select className="res-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {["LOW", "NORMAL", "HIGH", "URGENT"].map(p => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className="res-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              {["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(160px, 1fr))" }}>
          <Field label="Assignee (Employee)">
            <select
              className="res-select"
              value={assigneeId}
              onChange={(e) => {
                setAssigneeId(e.target.value);
                const emp = employees.find(x => (x._id || x.id) === e.target.value);
                if (emp?.name) setAssigneeName(emp.name);
              }}
            >
              <option value="">— Select —</option>
              {employees.map(emp => (
                <option key={emp._id || emp.id} value={emp._id || emp.id}>
                  {emp.name || emp.email || (emp._id || emp.id)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Due Date">
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label="Property Code">
            <input className="input" style={{ textTransform: "uppercase" }} value={propertyCode} onChange={(e) => setPropertyCode(e.target.value)} />
          </Field>
        </div>

        <Field label="Description">
          <textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
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

/* ---------- Small UI atoms ---------- */
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
function PriorityChip({ value }) {
  const p = (value || "NORMAL").toUpperCase();
  let bg = "#f3f4f6", bd = "#e5e7eb", fg = "#334155";
  if (p === "LOW")    { bg = "#ecfeff"; bd = "#a5f3fc"; fg = "#155e75"; }
  if (p === "NORMAL") { bg = "#eef2ff"; bd = "#c7d2fe"; fg = "#3730a3"; }
  if (p === "HIGH")   { bg = "#fff7ed"; bd = "#fed7aa"; fg = "#9a3412"; }
  if (p === "URGENT") { bg = "#fef2f2"; bd = "#fecaca"; fg = "#991b1b"; }
  return <span style={pill(bg, bd, fg)}>{p}</span>;
}
function StatusChip({ value }) {
  const s = (value || "OPEN").toUpperCase();
  let bg = "#f3f4f6", bd = "#e5e7eb", fg = "#334155";
  if (s === "OPEN")        { bg = "#ecfdf5"; bd = "#a7f3d0"; fg = "#065f46"; }
  if (s === "IN_PROGRESS") { bg = "#eff6ff"; bd = "#bfdbfe"; fg = "#1d4ed8"; }
  if (s === "DONE")        { bg = "#f0fdf4"; bd = "#bbf7d0"; fg = "#166534"; }
  if (s === "CANCELLED")   { bg = "#faf5ff"; bd = "#e9d5ff"; fg = "#6b21a8"; }
  return <span style={pill(bg, bd, fg)}>{s.replace("_", " ")}</span>;
}

/* ---------- Confirm Modal ---------- */
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

/* ---------- helpers ---------- */
function truncate(s, n) { if (!s) return ""; return s.length > n ? s.slice(0, n - 1) + "…" : s; }
function toISO(d) { const dt = new Date(d); if (Number.isNaN(+dt)) return ""; const y = dt.getFullYear(); const m = String(dt.getMonth()+1).padStart(2,"0"); const day = String(dt.getDate()).padStart(2,"0"); return `${y}-${m}-${day}`; }
function fmtDate(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(+dt) ? "—" : dt.toLocaleDateString(); }
function fmtDateTime(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(+dt) ? "—" : dt.toLocaleString(); }
function pill(bg, bd, fg) {
  return {
    display: "inline-block", padding: ".15rem .5rem",
    borderRadius: 999, background: bg, border: `1px solid ${bd}`,
    color: fg, fontSize: ".75rem", fontWeight: 700, whiteSpace: "nowrap",
  };
}

/* ---------- inline styles ---------- */
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(900px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };
