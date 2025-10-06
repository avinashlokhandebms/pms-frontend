// src/pages/Housekeeping/StatusHistory.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { BackofficeSidebar, HousekeepingSidebar } from "../../../components/sidebar/HousekeepingSidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

/**
 * Status History (Housekeeping / Rooms)
 *
 * Suggested backend endpoints:
 *  GET    /api/hk-status-history?q=&room=&status=&from=&to=&propertyCode=&page=&limit=
 *  POST   /api/hk-status-history
 *  PATCH  /api/hk-status-history/:id
 *  DELETE /api/hk-status-history/:id
 *
 * Record example:
 * {
 *   _id,
 *   roomNo,                // "101"
 *   prevStatus,            // "DIRTY"
 *   nextStatus,            // "CLEAN"
 *   changedAt,             // ISO datetime
 *   changedById,           // user id
 *   changedByName,         // "Ravi"
 *   note,                  // optional
 *   propertyCode,          // "TST"
 *   createdAt, updatedAt
 * }
 */

const PAGE_SIZE = 10;
const ROOM_STATUSES = ["VACANT", "OCCUPIED", "DIRTY", "CLEANING", "CLEAN", "OOO", "INSPECTION"];

export default function StatusHistory() {
  // list / filters
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [room, setRoom] = useState("");
  const [status, setStatus] = useState(""); // by nextStatus
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
        if (room.trim()) params.set("room", room.trim());
        if (status) params.set("status", status);
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        if (propertyCode.trim()) params.set("propertyCode", propertyCode.trim().toUpperCase());

        const res = await apiFetch(`/api/hk-status-history?${params.toString()}`, { auth: true });
        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;

        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number(count) || 0);
        }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load status history."); setRows([]); setTotal(0); }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [q, room, status, from, to, propertyCode, page, limit]);

  // client fallback search
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [r.roomNo, r.prevStatus, r.nextStatus, r.changedByName, r.note, r.propertyCode]
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
          <h2 style={{ margin: 0 }}>Status History</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input className="res-select" placeholder="Search…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} style={{ minWidth: 220 }} />
            <input className="res-select" placeholder="Room No" value={room} onChange={(e) => { setRoom(e.target.value); setPage(1); }} style={{ width: 120 }} />
            <select className="res-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} style={{ width: 150 }}>
              <option value="">All Status</option>
              {ROOM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
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
            <span>Room Status Changes</span>
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
                    <th style={{ width: 150 }}>Action</th>
                    <th>Date/Time</th>
                    <th>Room</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Changed By</th>
                    <th>Note</th>
                    <th>Property</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={9}>No history found</td></tr>
                  )}

                  {dataToRender?.map(r => {
                    const id = r._id || r.id;
                    return (
                      <tr key={id}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="btn" style={btnSm} onClick={() => openEdit(r)}>✏️</button>
                          <button className="btn" style={btnSm} onClick={() => askDelete(r)}>🗑️</button>
                        </td>
                        <td>{fmtDateTime(r.changedAt)}</td>
                        <td>{r.roomNo}</td>
                        <td><StatusBadge value={r.prevStatus} /></td>
                        <td><StatusBadge value={r.nextStatus} /></td>
                        <td title={r.changedById || ""}>{r.changedByName || "—"}</td>
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
        <StatusFormModal
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={afterSave}
        />
      )}

      {showDelete && (
        <ConfirmModal
          title="Delete Entry?"
          message={`Delete status change for room ${toDelete?.roomNo} (${toDelete?.prevStatus} → ${toDelete?.nextStatus})? This cannot be undone.`}
          confirmText="Delete"
          onClose={() => { setShowDelete(false); setToDelete(null); }}
          onConfirm={async () => {
            const id = toDelete?._id || toDelete?.id;
            await apiFetch(`/api/hk-status-history/${id}`, { method: "DELETE", auth: true });
            afterDelete(id);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Create/Edit Modal ---------- */
function StatusFormModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial;

  const [changedAt, setChangedAt] = useState(toDateTimeValue(initial?.changedAt || new Date()));
  const [roomNo, setRoomNo] = useState(initial?.roomNo || "");
  const [prevStatus, setPrevStatus] = useState(initial?.prevStatus || "DIRTY");
  const [nextStatus, setNextStatus] = useState(initial?.nextStatus || "CLEAN");
  const [changedByName, setChangedByName] = useState(initial?.changedByName || "");
  const [changedById, setChangedById] = useState(initial?.changedById || "");
  const [note, setNote] = useState(initial?.note || "");
  const [propertyCode, setPropertyCode] = useState(initial?.propertyCode || "");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");

    if (!roomNo.trim()) return setErr("Room No is required.");
    if (!nextStatus) return setErr("Next status is required.");

    const payload = {
      changedAt: new Date(changedAt).toISOString(),
      roomNo: roomNo.trim(),
      prevStatus,
      nextStatus,
      changedByName: changedByName?.trim() || undefined,
      changedById: changedById?.trim() || undefined,
      note: note?.trim() || undefined,
      propertyCode: propertyCode?.trim().toUpperCase() || undefined,
    };

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const id = initial._id || initial.id;
        saved = await apiFetch(`/api/hk-status-history/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(payload) });
      } else {
        saved = await apiFetch(`/api/hk-status-history`, { method: "POST", auth: true, body: JSON.stringify(payload) });
      }
      setOk("Saved.");
      onSaved(saved);
    } catch (e2) {
      setErr(e2?.message || "Failed to save entry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Status Entry" : "Add Status Entry"} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      {ok && <Banner type="ok">{ok}</Banner>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <Row>
          <Field label="Date/Time">
            <input className="input" type="datetime-local" value={changedAt} onChange={e => setChangedAt(e.target.value)} />
          </Field>
          <Field label="Room No" required>
            <input className="input" value={roomNo} onChange={e => setRoomNo(e.target.value)} />
          </Field>
          <Field label="Property Code">
            <input className="input" style={{ textTransform: "uppercase" }} value={propertyCode} onChange={e => setPropertyCode(e.target.value)} />
          </Field>
        </Row>

        <Row>
          <Field label="Previous Status">
            <select className="res-select" value={prevStatus} onChange={e => setPrevStatus(e.target.value)}>
              {ROOM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Next Status" required>
            <select className="res-select" value={nextStatus} onChange={e => setNextStatus(e.target.value)}>
              {ROOM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Note">
            <input className="input" value={note} onChange={e => setNote(e.target.value)} />
          </Field>
        </Row>

        <Row>
          <Field label="Changed By (Name)">
            <input className="input" value={changedByName} onChange={e => setChangedByName(e.target.value)} />
          </Field>
          <Field label="Changed By (ID)">
            <input className="input" value={changedById} onChange={e => setChangedById(e.target.value)} />
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
function StatusBadge({ value }) {
  const v = (value || "").toString().toUpperCase();
  const palette = {
    VACANT:   { bg: "#eff6ff", bd: "#bfdbfe", fg: "#1d4ed8" },
    OCCUPIED: { bg: "#fef2f2", bd: "#fecaca", fg: "#b91c1c" },
    DIRTY:    { bg: "#fff7ed", bd: "#fed7aa", fg: "#c2410c" },
    CLEANING: { bg: "#fefce8", bd: "#fde68a", fg: "#92400e" },
    CLEAN:    { bg: "#f0fdf4", bd: "#bbf7d0", fg: "#166534" },
    OOO:      { bg: "#f5f3ff", bd: "#ddd6fe", fg: "#6d28d9" },
    INSPECTION:{ bg:"#ecfeff", bd:"#a5f3fc", fg:"#155e75" },
    DEFAULT:  { bg: "#f3f4f6", bd: "#e5e7eb", fg: "#374151" },
  };
  const c = palette[v] || palette.DEFAULT;
  return (
    <span style={{
      display: "inline-block", padding: ".15rem .5rem",
      borderRadius: 999, background: c.bg, border: `1px solid ${c.bd}`,
      color: c.fg, fontSize: ".75rem", fontWeight: 700
    }}>
      {v || "—"}
    </span>
  );
}

/* ---------- date helpers ---------- */
function fmtDateTime(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(+dt) ? "—" : dt.toLocaleString(); }
function toDateTimeValue(d) {
  const dt = new Date(d);
  if (Number.isNaN(+dt)) return "";
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
