// src/pages/Frontdesk/RoomStatusBoard.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { BackofficeSidebar, HousekeepingSidebar } from "../../components/sidebar/HousekeepingSidebar";
import "../../components/sidebar/Sidebar.css";
import "../../assets/css/commanPage.css";

/**
 * Room Status Board
 *
 * Expected APIs (adjust to your backend):
 *  GET  /api/rooms/statusboard?date=YYYY-MM-DD&q=&status=&hk=&type=&floor=&propertyCode=&page=&limit=
 *      -> { data: [{ _id,id, roomNo, type, floor, status, hkStatus, guestName, checkIn, checkOut, dueOut, oooUntil }], total }
 *
 *  POST /api/rooms/:roomNo/hk
 *      Body: { action: "CLEAN" | "DIRTY" | "INSPECT", propertyCode }
 *
 *  POST /api/rooms/:roomNo/ooo
 *      Body to set:    { action: "SET",   from: "YYYY-MM-DD", to: "YYYY-MM-DD", reason, propertyCode }
 *      Body to release:{ action: "CLEAR", propertyCode }
 */

const PAGE_SIZE = 20;

export default function RoomStatusBoard() {
  // list state
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // filters
  const [date, setDate] = useState(toISO(new Date()));
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");   // VACANT / OCCUPIED / OOO
  const [hk, setHk] = useState("");           // CLEAN / DIRTY / INSPECT
  const [type, setType] = useState("");       // room type code
  const [floor, setFloor] = useState("");     // floor filter
  const [propertyCode, setPropertyCode] = useState("");

  // paging
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);

  // modals
  const [oooRoom, setOooRoom] = useState(null);   // room object for OOO set/clear

  // load
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const params = new URLSearchParams({
          date: date || "",
          page,
          limit,
        });
        if (q.trim()) params.set("q", q.trim());
        if (status) params.set("status", status);
        if (hk) params.set("hk", hk);
        if (type) params.set("type", type);
        if (floor) params.set("floor", floor);
        if (propertyCode.trim()) params.set("propertyCode", propertyCode.trim().toUpperCase());

        const res = await apiFetch(`/api/rooms/statusboard?${params.toString()}`, { auth: true });
        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;
        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number(count) || 0);
        }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load rooms."); setRows([]); setTotal(0); }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [date, q, status, hk, type, floor, propertyCode, page, limit]);

  // client fallback filter (if API doesn’t filter)
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [r.roomNo, r.type, r.floor, r.guestName]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  const dataToRender = rows?.length && total > rows.length ? rows : filtered;

  // summary
  const summary = useMemo(() => {
    const s = { total: dataToRender.length, vacant: 0, occ: 0, ooo: 0, clean: 0, dirty: 0, inspect: 0, dueOut: 0 };
    for (const r of dataToRender) {
      const st = (r.status || "").toUpperCase();
      if (st === "VACANT") s.vacant += 1;
      if (st === "OCCUPIED") s.occ += 1;
      if (st === "OOO") s.ooo += 1;
      const hk = (r.hkStatus || "").toUpperCase();
      if (hk === "CLEAN") s.clean += 1;
      if (hk === "DIRTY") s.dirty += 1;
      if (hk === "INSPECT") s.inspect += 1;
      if (r.dueOut) s.dueOut += 1;
    }
    return s;
  }, [dataToRender]);

  // actions
  const markHK = async (roomNo, action) => {
    try {
      await apiFetch(`/api/rooms/${encodeURIComponent(roomNo)}/hk`, {
        method: "POST",
        auth: true,
        body: JSON.stringify({ action, propertyCode: propertyCode || undefined }),
      });
      // optimistic update
      setRows(prev => prev.map(r => r.roomNo === roomNo ? { ...r, hkStatus: action } : r));
    } catch (e) {
      alert(e?.message || "Failed to update housekeeping status.");
    }
  };

  const openOOO = (r) => setOooRoom(r);
  const closeOOO = () => setOooRoom(null);

  const onOooChanged = (updated) => {
    closeOOO();
    if (!updated) return;
    setRows(prev => prev.map(r => r.roomNo === updated.roomNo ? { ...r, ...updated } : r));
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <HousekeepingSidebar />

      <div className="res-wrap">
        {/* Top filters */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Room Status Board</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input className="res-select" type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} />
            <input className="res-select" placeholder="Property Code" value={propertyCode} onChange={(e) => { setPropertyCode(e.target.value); setPage(1); }} style={{ textTransform: "uppercase", width: 140 }} />
            <input className="res-select" placeholder="Search (room/guest/type)" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} style={{ minWidth: 240 }} />
            <select className="res-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="VACANT">Vacant</option>
              <option value="OCCUPIED">Occupied</option>
              <option value="OOO">OOO</option>
            </select>
            <select className="res-select" value={hk} onChange={(e) => { setHk(e.target.value); setPage(1); }}>
              <option value="">HK: All</option>
              <option value="CLEAN">Clean</option>
              <option value="DIRTY">Dirty</option>
              <option value="INSPECT">Inspect</option>
            </select>
            <input className="res-select" placeholder="Type" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} style={{ width: 120 }} />
            <input className="res-select" placeholder="Floor" value={floor} onChange={(e) => { setFloor(e.target.value); setPage(1); }} style={{ width: 100 }} />
            <select className="res-select" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
              {[20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
          </div>
        </div>

        {/* Summary */}
        <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(6, minmax(120px,1fr))" }}>
          <KPI icon="🛏️" title="Total" value={summary.total} />
          <KPI icon="🟩" title="Vacant" value={summary.vacant} />
          <KPI icon="🟥" title="Occupied" value={summary.occ} />
          <KPI icon="🟨" title="OOO" value={summary.ooo} />
          <KPI icon="✅" title="Clean" value={summary.clean} />
          <KPI icon="🧹" title="Dirty" value={summary.dirty} extra={`Inspect: ${summary.inspect}`} />
        </div>

        {/* Table */}
        <div className="panel" style={{ marginTop: 12 }}>
          <div className="panel-h">
            <span>Rooms</span>
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
                    <th>Type</th>
                    <th>Floor</th>
                    <th>Status</th>
                    <th>HK</th>
                    <th>Guest</th>
                    <th>Arr</th>
                    <th>Dep</th>
                    <th>Due-Out</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={10}>No rooms</td></tr>
                  )}

                  {dataToRender?.map(r => (
                    <tr key={r._id || r.id || r.roomNo}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button className="btn" style={btnSm} onClick={() => markHK(r.roomNo, "CLEAN")}>Clean</button>
                        <button className="btn" style={btnSm} onClick={() => markHK(r.roomNo, "DIRTY")}>Dirty</button>
                        <button className="btn" style={btnSm} onClick={() => markHK(r.roomNo, "INSPECT")}>Inspect</button>
                        <button className="btn" style={btnSm} onClick={() => openOOO(r)}>OOO</button>
                      </td>
                      <td><b>{r.roomNo}</b></td>
                      <td>{r.type || "—"}</td>
                      <td>{r.floor || "—"}</td>
                      <td><StatusChip status={r.status} oooUntil={r.oooUntil} /></td>
                      <td><HkChip hk={r.hkStatus} /></td>
                      <td title={r.guestName || ""}>{r.guestName || (r.status === "VACANT" ? "—" : "—")}</td>
                      <td>{fmtDate(r.checkIn)}</td>
                      <td>{fmtDate(r.checkOut)}</td>
                      <td>{r.dueOut ? "Yes" : "—"}</td>
                    </tr>
                  ))}
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

      {oooRoom && (
        <OooModal
          room={oooRoom}
          propertyCode={propertyCode}
          onClose={closeOOO}
          onChanged={onOooChanged}
        />
      )}
    </div>
  );
}

/* ---------- Cells / Chips ---------- */
function StatusChip({ status, oooUntil }) {
  const st = (status || "").toUpperCase();
  let bg = "#f3f4f6", bd = "#e5e7eb", fg = "#334155", label = st || "—";
  if (st === "VACANT") { bg = "#ecfdf5"; bd = "#a7f3d0"; fg = "#047857"; }
  if (st === "OCCUPIED") { bg = "#eff6ff"; bd = "#bfdbfe"; fg = "#1d4ed8"; }
  if (st === "OOO") { bg = "#fff7ed"; bd = "#fed7aa"; fg = "#c2410c"; label = oooUntil ? `OOO (till ${fmtDate(oooUntil)})` : "OOO"; }
  return <span style={pill(bg, bd, fg)}>{label}</span>;
}
function HkChip({ hk }) {
  const s = (hk || "").toUpperCase();
  let bg = "#f3f4f6", bd = "#e5e7eb", fg = "#334155", label = s || "—";
  if (s === "CLEAN") { bg = "#ecfeff"; bd = "#a5f3fc"; fg = "#0e7490"; }
  if (s === "DIRTY") { bg = "#fef2f2"; bd = "#fecaca"; fg = "#b91c1c"; }
  if (s === "INSPECT") { bg = "#f5f3ff"; bd = "#ddd6fe"; fg = "#6d28d9"; }
  return <span style={pill(bg, bd, fg)}>{label}</span>;
}
function KPI({ icon, title, value, extra }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon">{icon}</div>
      <div>
        <div className="kpi-title">{title}</div>
        <div className="kpi-number">{value}</div>
        {extra && <div className="small" style={{ color: "var(--muted)" }}>{extra}</div>}
      </div>
    </div>
  );
}

/* ---------- OOO Modal ---------- */
function OooModal({ room, propertyCode, onClose, onChanged }) {
  const [mode, setMode] = useState(room?.status === "OOO" ? "CLEAR" : "SET");
  const [from, setFrom] = useState(toISO(new Date()));
  const [to, setTo] = useState(toISO(new Date()));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (mode === "SET" && new Date(to) < new Date(from)) {
      return setErr("End date must be on or after start date.");
    }
    setSaving(true);
    try {
      const payload = mode === "SET"
        ? { action: "SET", from, to, reason, propertyCode: propertyCode || undefined }
        : { action: "CLEAR", propertyCode: propertyCode || undefined };
      const res = await apiFetch(`/api/rooms/${encodeURIComponent(room.roomNo)}/ooo`, {
        method: "POST",
        auth: true,
        body: JSON.stringify(payload),
      });
      onChanged(res || { roomNo: room.roomNo, status: mode === "SET" ? "OOO" : "VACANT", oooUntil: mode === "SET" ? to : null });
    } catch (e2) {
      setErr(e2?.message || "Failed to update OOO.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Room ${room?.roomNo} — ${mode === "SET" ? "Set OOO" : "Clear OOO"}`} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      <div className="small" style={{ color: "var(--muted)", marginBottom: 8 }}>
        Current status: <b>{room?.status || "—"}</b>, HK: <b>{room?.hkStatus || "—"}</b>
      </div>

      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <label className="rsb-item no-caret" style={{ gap: 6 }}>
            <input type="radio" name="mode" checked={mode === "SET"} onChange={() => setMode("SET")} />
            Set OOO
          </label>
          <label className="rsb-item no-caret" style={{ gap: 6 }}>
            <input type="radio" name="mode" checked={mode === "CLEAR"} onChange={() => setMode("CLEAR")} />
            Clear OOO
          </label>
        </div>

        {mode === "SET" && (
          <>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(160px, 1fr))" }}>
              <Field label="From"><input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} /></Field>
              <Field label="To"><input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} /></Field>
              <Field label="Days"><input className="input" readOnly value={Math.max(1, diffDays(from, to))} /></Field>
            </div>
            <Field label="Reason">
              <input className="input" placeholder="e.g. Maintenance, Painting…" value={reason} onChange={e => setReason(e.target.value)} />
            </Field>
          </>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn" type="submit" disabled={saving}>{saving ? "Saving…" : (mode === "SET" ? "Set OOO" : "Clear OOO")}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Tiny UI helpers ---------- */
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

/* ---------- generic helpers ---------- */
function toISO(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(+dt)) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fmtDate(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(+dt) ? "—" : dt.toLocaleDateString(); }
function diffDays(from, to) {
  const a = new Date(toISO(from)), b = new Date(toISO(to));
  if (Number.isNaN(+a) || Number.isNaN(+b)) return 0;
  return Math.max(1, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}
function pill(bg, bd, fg) {
  return {
    display: "inline-block",
    padding: ".15rem .5rem",
    borderRadius: 999,
    background: bg,
    border: `1px solid ${bd}`,
    color: fg,
    fontSize: ".75rem",
    fontWeight: 700,
    whiteSpace: "nowrap",
  };
}

/* ---------- inline styles ---------- */
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };

const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(760px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };
