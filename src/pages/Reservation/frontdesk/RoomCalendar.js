import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import ReservationSidebar, { BackofficeSidebar } from "../../../components/sidebar/ReservationSidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

/**
 * Expected backend (adjust to your API):
 * GET  /api/rooms?propertyCode=TRST&activeOnly=1
 *   -> { data: [{ _id, code, roomTypeCode, floor, status }], total }
 *
 * GET  /api/bookings/room-calendar?from=YYYY-MM-DD&to=YYYY-MM-DD&propertyCode=TRST
 *   -> { data: [{
 *        _id, bookingNo, roomCode, roomTypeCode,
 *        guest: { name }, checkIn, checkOut, status, color
 *      }], total }
 *
 * Optional:
 * GET  /api/bookings/:id for details (used in View modal).
 */

const DEFAULT_SPAN = 14; // days

export default function RoomCalendar() {
  const [propertyCode, setPropertyCode] = useState("");
  const [from, setFrom] = useState(toISODate(startOfDay(new Date())));
  const [spanDays, setSpanDays] = useState(DEFAULT_SPAN);

  const to = useMemo(() => toISODate(addDays(new Date(from), spanDays - 1)), [from, spanDays]);
  const days = useMemo(() => eachDay(new Date(from), new Date(to)), [from, to]);

  const [rooms, setRooms] = useState([]);
  const [events, setEvents] = useState([]); // bookings/blocks
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // modals
  const [viewing, setViewing] = useState(null);

  // Load rooms + calendar
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true); setErr(""); setOk("");
      try {
        // 1) Rooms
        const roomParams = new URLSearchParams();
        if (propertyCode) roomParams.set("propertyCode", propertyCode.trim().toUpperCase());
        roomParams.set("activeOnly", "1");
        const rRes = await apiFetch(`/api/rooms?${roomParams.toString()}`, { auth: true });
        const roomList = rRes?.data || rRes?.items || rRes || [];

        // 2) Bookings/Blocks
        const calParams = new URLSearchParams({ from, to });
        if (propertyCode) calParams.set("propertyCode", propertyCode.trim().toUpperCase());
        const bRes = await apiFetch(`/api/bookings/room-calendar?${calParams.toString()}`, { auth: true });
        const evList = bRes?.data || bRes?.items || bRes || [];

        if (!ignore) {
          setRooms(Array.isArray(roomList) ? roomList : []);
          setEvents(Array.isArray(evList) ? evList : []);
        }
      } catch (e) {
        if (!ignore) setErr(e?.message || "Failed to load room calendar.");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [propertyCode, from, to]);

  // Fast lookup by date for a given room
  const grid = useMemo(() => {
    const byRoom = new Map();
    rooms.forEach(r => byRoom.set(r.code || r.roomNo || r._id, {}));
    for (const ev of events) {
      const rc = ev.roomCode || ev.roomNo || ev.room || "";
      const start = startOfDay(new Date(ev.checkIn));
      const end = startOfDay(new Date(ev.checkOut));
      for (const d of days) {
        // mark the night if date is >= checkIn and < checkOut
        if (isBetween(start, d, addDays(end, -1))) {
          const key = toISODate(d);
          const row = byRoom.get(rc);
          if (row) {
            (row[key] ||= []).push(ev);
          }
        }
      }
    }
    return byRoom;
  }, [rooms, events, days]);

  const goPrev = () => setFrom(toISODate(addDays(new Date(from), -spanDays)));
  const goNext = () => setFrom(toISODate(addDays(new Date(from), +spanDays)));
  const goToday = () => setFrom(toISODate(startOfDay(new Date())));

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <ReservationSidebar />

      <div className="res-wrap">
        {/* Topbar / Filters */}
        <div className="res-topbar" style={{ gap: 8, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Room Calendar</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="res-select"
              placeholder="Property Code (e.g. TRUSTJA)"
              value={propertyCode}
              onChange={(e) => setPropertyCode(e.target.value)}
              style={{ width: 180, textTransform: "uppercase" }}
            />
            <input
              className="res-select"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              title="From date"
            />
            <select
              className="res-select"
              value={spanDays}
              onChange={(e) => setSpanDays(Number(e.target.value))}
              title="Span (days)"
            >
              {[7, 14, 21, 30].map(n => <option key={n} value={n}>{n} days</option>)}
            </select>
            <button className="btn" onClick={goPrev}>‹ Prev</button>
            <button className="btn" onClick={goToday}>Today</button>
            <button className="btn" onClick={goNext}>Next ›</button>
          </div>
        </div>

        {err && <Banner type="err">{err}</Banner>}
        {ok && <Banner type="ok">{ok}</Banner>}

        {/* Legend */}
        <div className="panel" style={{ marginBottom: 10 }}>
          <div className="panel-b" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Legend label="Booked" color="#e0f2fe" border="#bae6fd" text="#075985" />
            <Legend label="In-House" color="#dcfce7" border="#bbf7d0" text="#166534" />
            <Legend label="Blocked" color="#f3f4f6" border="#e5e7eb" text="#334155" />
            <Legend label="Out of Order" color="#fee2e2" border="#fecaca" text="#991b1b" />
          </div>
        </div>

        {/* Grid */}
        <div className="panel">
          <div className="panel-h">
            <span>Rooms</span>
            <span className="small" style={{ color: "var(--muted)" }}>
              {loading ? "Loading…" : `${rooms.length} rooms · ${days.length} days (${from} → ${to})`}
            </span>
          </div>
          <div className="panel-b" style={{ overflow: "auto" }}>
            <div style={{ minWidth: 860 }}>
              {/* Header row */}
              <div style={{ display: "grid", gridTemplateColumns: `220px repeat(${days.length}, 1fr)` }} className="table">
                <div className="table thead" style={{ position: "sticky", left: 0, zIndex: 2, background: "#fff" }}>
                  <div style={{ padding: "8px 10px", fontWeight: 800 }}>Room</div>
                </div>
                {days.map((d) => (
                  <div key={+d} className="table thead" style={{ textAlign: "center" }}>
                    <div style={{ padding: "8px 4px", fontWeight: 800 }}>
                      <div className="small" style={{ color: "var(--muted)" }}>{weekdayShort(d)}</div>
                      <div>{d.getDate()} {monthShort(d)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Body rows */}
              {rooms.map((r) => {
                const rKey = r.code || r.roomNo || r._id;
                const rowMap = grid.get(rKey) || {};
                return (
                  <div
                    key={rKey}
                    style={{ display: "grid", gridTemplateColumns: `220px repeat(${days.length}, 1fr)` }}
                    className="table"
                  >
                    {/* Sticky first column with room info */}
                    <div
                      className="table tbody"
                      style={{
                        position: "sticky", left: 0, zIndex: 1, background: "#fff",
                        borderRight: "1px solid #e5e7eb",
                      }}
                    >
                      <div style={{ padding: "8px 10px" }}>
                        <div style={{ fontWeight: 800 }}>{rKey}</div>
                        <div className="small" style={{ color: "var(--muted)" }}>
                          {r.roomTypeCode || r.type || "—"}{r.floor ? ` · Fl ${r.floor}` : ""}
                        </div>
                      </div>
                    </div>

                    {/* Day cells */}
                    {days.map((d) => {
                      const key = toISODate(d);
                      const evs = rowMap[key] || [];
                      // merge all events visually; show first one and "+N"
                      const first = evs[0];
                      return (
                        <div key={key} className="table tbody" style={{ position: "relative" }}>
                          {first ? (
                            <CellEvent ev={first} onClick={() => setViewing(first)} />
                          ) : (
                            <div style={{ height: 38 }} />
                          )}
                          {evs.length > 1 && (
                            <span
                              className="small"
                              title={`${evs.length} events`}
                              style={{ position: "absolute", right: 4, bottom: 2, color: "var(--muted)" }}
                            >
                              +{evs.length - 1}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* View modal */}
      {viewing && <ViewModal ev={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

/* ---------- Cells / Legend ---------- */
function CellEvent({ ev, onClick }) {
  const style = colorForStatus(ev?.status, ev?.color);
  const g = ev?.guest?.name || "—";
  const tag = (ev?.status || "").toUpperCase();
  return (
    <button
      className="btn"
      onClick={onClick}
      title={`${ev.bookingNo || ""}\n${g}`}
      style={{
        ...style,
        width: "100%",
        height: 30,
        marginTop: 4,
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
        justifyContent: "flex-start",
      }}
    >
      <span className="small" style={{ opacity: 0.8 }}>{tagLabel(tag)}</span>
      <span style={{ fontWeight: 700 }}>{ev.bookingNo || ""}</span>
      <span className="small" style={{ color: "var(--muted)" }}>{g}</span>
    </button>
  );
}

function Legend({ label, color, border, text }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: ".2rem .5rem", borderRadius: 999,
      background: color, border: `1px solid ${border}`, color: text, fontWeight: 700, fontSize: ".8rem"
    }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, background: text, opacity: .45 }} />
      {label}
    </span>
  );
}

/* ---------- Modals ---------- */
function ViewModal({ ev, onClose }) {
  const [details, setDetails] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let ignore = false;
    (async () => {
      setErr("");
      try {
        const res = await apiFetch(`/api/bookings/${ev._id || ev.id}`, { auth: true });
        if (!ignore) setDetails(res?.data || res || ev);
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load details."); setDetails(ev); }
      }
    })();
    return () => { ignore = true; };
  }, [ev]);

  const d = details || ev || {};
  return (
    <Modal title={`Booking ${d.bookingNo || ""}`} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}

      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          <Info label="Guest" value={d?.guest?.name} />
          <Info label="Phone" value={d?.guest?.mobile} />
          <Info label="Email" value={d?.guest?.email} />
          <Info label="Room" value={d.roomCode || "—"} />
          <Info label="Room Type" value={d.roomTypeCode || "—"} />
          <Info label="Property" value={d.propertyCode || "—"} />
          <Info label="Status" value={d.status || "—"} />
          <Info label="Check-In" value={fmtDT(d.checkIn)} />
          <Info label="Check-Out" value={fmtDT(d.checkOut)} />
          <Info label="Total" value={fmtMoney(d.amountTotal)} />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Small UI ---------- */
function Info({ label, value }) {
  return (
    <div>
      <div className="small" style={{ color: "var(--muted)", fontWeight: 700 }}>{label}</div>
      <div>{value ?? "—"}</div>
    </div>
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

/* ---------- Helpers ---------- */
function colorForStatus(status, custom) {
  if (custom) return {
    background: custom, border: "1px solid rgba(0,0,0,.12)", color: "#111827"
  };
  const s = String(status || "").toUpperCase();
  if (s === "IN_HOUSE")   return { background: "#dcfce7", border: "1px solid #bbf7d0", color: "#166534" };
  if (s === "BLOCKED")    return { background: "#f3f4f6", border: "1px solid #e5e7eb", color: "#334155" };
  if (s === "OOO" || s === "OUT_OF_ORDER")
                          return { background: "#fee2e2", border: "1px solid #fecaca", color: "#991b1b" };
  // default: booked/held
  return { background: "#e0f2fe", border: "1px solid #bae6fd", color: "#075985" };
}
function tagLabel(s) {
  switch (s) {
    case "IN_HOUSE": return "IN";
    case "BLOCKED": return "BLK";
    case "OOO":
    case "OUT_OF_ORDER": return "OOO";
    default: return "BKD";
  }
}
function startOfDay(d) { const dt = new Date(d); dt.setHours(0,0,0,0); return dt; }
function addDays(d, n) { const dt = new Date(d); dt.setDate(dt.getDate() + n); return startOfDay(dt); }
function toISODate(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt)) return "";
  const y = dt.getFullYear(), m = String(dt.getMonth()+1).padStart(2,"0"), day = String(dt.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function eachDay(a, b) {
  const start = startOfDay(a), end = startOfDay(b);
  const out = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) out.push(new Date(d));
  return out;
}
function isBetween(start, d, end) { return +start <= +d && +d <= +end; }
function weekdayShort(d) { return d.toLocaleDateString(undefined, { weekday: "short" }); }
function monthShort(d) { return d.toLocaleDateString(undefined, { month: "short" }); }
function fmtDT(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(dt) ? "—" : dt.toLocaleString(); }
function fmtMoney(x) { const n = Number(x || 0); try { return n.toLocaleString(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 2 }); } catch { return `₹${n.toFixed(2)}`; } }

/* ---------- inline styles ---------- */
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(900px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };
