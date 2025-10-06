// src/pages/Frontdesk/Calendar.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import ReservationSidebar, { BackofficeSidebar } from "../../../components/sidebar/ReservationSidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

/**
 * Simple monthly Calendar for Frontdesk.
 * Fetches events from: GET /api/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD&propertyCode=&q=
 * Expected response: { data: Event[] } or Event[]
 * Event shape (flexible): { id, date: ISO string, title, roomNo, guestName, status, ... }
 */

export default function Calendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-11
  const [q, setQ] = useState("");
  const [propertyCode, setPropertyCode] = useState(""); // optional filter

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // day modal
  const [openDay, setOpenDay] = useState(null); // ISO date string

  const { monthStartISO, monthEndISO, days, monthLabel } = useMemo(
    () => buildMonth(year, month),
    [year, month]
  );

  // Map events by date (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const m = new Map();
    for (const e of events) {
      const d = toISODate(e.date || e.when || e.start || e.checkIn || e.checkInAt);
      if (!d) continue;
      if (!m.has(d)) m.set(d, []);
      m.get(d).push(e);
    }
    // sort each list (by roomNo or title)
    for (const k of m.keys()) {
      m.get(k).sort((a, b) =>
        String(a.roomNo || a.title || a.guestName || "").localeCompare(
          String(b.roomNo || b.title || b.guestName || "")
        )
      );
    }
    return m;
  }, [events]);

  // Load events for current month
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const params = new URLSearchParams({
          from: monthStartISO,
          to: monthEndISO,
        });
        if (q.trim()) params.set("q", q.trim());
        if (propertyCode.trim()) params.set("propertyCode", propertyCode.trim().toUpperCase());

        const res = await apiFetch(`/api/calendar?${params.toString()}`, { auth: true });
        const data = res?.data || res?.items || res || [];
        if (!ignore) setEvents(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load calendar."); setEvents([]); }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [monthStartISO, monthEndISO, q, propertyCode]);

  const goPrev = () => {
    const d = addMonths(new Date(year, month, 1), -1);
    setYear(d.getFullYear()); setMonth(d.getMonth());
  };
  const goNext = () => {
    const d = addMonths(new Date(year, month, 1), 1);
    setYear(d.getFullYear()); setMonth(d.getMonth());
  };
  const goToday = () => {
    const d = new Date();
    setYear(d.getFullYear()); setMonth(d.getMonth());
  };

  const openDayEvents = (dISO) => setOpenDay(dISO);
  const dayList = openDay ? (eventsByDate.get(openDay) || []) : [];

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <ReservationSidebar />

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar" style={{ gap: 8, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Monthly Calendar</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn" onClick={goPrev}>‹ Prev</button>
            <div
              className="res-select"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "0 .6rem", fontWeight: 800
              }}
              aria-label="Current month"
            >
              {monthLabel}
            </div>
            <button className="btn" onClick={goNext}>Next ›</button>
            <button className="btn" onClick={goToday}>Today</button>

            <input
              className="res-select"
              placeholder="Property Code (optional)"
              value={propertyCode}
              onChange={(e) => setPropertyCode(e.target.value)}
              style={{ width: 160, textTransform: "uppercase" }}
            />
            <input
              className="res-select"
              placeholder="Search (guest / room / title)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: 250 }}
            />
          </div>
        </div>

        <div className="panel">
          <div className="panel-h">
            <span>{monthLabel}</span>
            <span className="small" style={{ color: "var(--muted)" }}>
              {loading ? "Loading…" : `Events: ${events.length}`}
            </span>
          </div>

          <div className="panel-b">
            {err && <Banner type="err">{err}</Banner>}

            <CalendarGrid
              days={days}
              eventsByDate={eventsByDate}
              onOpenDay={openDayEvents}
            />
          </div>
        </div>
      </div>

      {openDay && (
        <Modal title={`Events — ${fmtLong(openDay)}`} onClose={() => setOpenDay(null)}>
          {dayList.length === 0 ? (
            <div className="small" style={{ color: "var(--muted)" }}>No events.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {dayList.map((e, i) => (
                <div key={e.id || i} className="card" style={cardRow}>
                  <div style={{ fontWeight: 800 }}>{e.title || e.guestName || "Event"}</div>
                  <div className="small" style={{ color: "var(--muted)" }}>
                    {[
                      e.roomNo && `Room ${e.roomNo}`,
                      e.status && String(e.status).toUpperCase(),
                      e.company,
                      e.reservationNo && `Res# ${e.reservationNo}`,
                    ].filter(Boolean).join(" • ")}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <button className="btn" onClick={() => setOpenDay(null)}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ============ Calendar Grid ============ */
function CalendarGrid({ days, eventsByDate, onOpenDay }) {
  const weekHdr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <div>
      <div style={gridHdr}>
        {weekHdr.map((d) => (
          <div key={d} style={hdrCell}>{d}</div>
        ))}
      </div>

      <div style={gridBody}>
        {days.map((d, idx) => {
          const dISO = d?.iso || "";
          const list = dISO ? (eventsByDate.get(dISO) || []) : [];
          return (
            <div
              key={idx}
              className={"cal-cell" + (!d ? " cal-cell--empty" : "")}
              style={cell}
              onClick={() => dISO && onOpenDay?.(dISO)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && dISO && onOpenDay?.(dISO)}
              title={dISO ? `${fmtLong(dISO)} — ${list.length} event(s)` : undefined}
            >
              <div style={cellTop}>
                <span className="small" style={{ fontWeight: 800 }}>
                  {d?.day ?? ""}
                </span>
                {list.length > 0 && (
                  <span className="badge">{list.length}</span>
                )}
              </div>

              {/* Peek events (max 3) */}
              {list.slice(0, 3).map((e, i) => (
                <div key={e.id || i} className="small ellipsis" style={evtRow}>
                  {e.roomNo && <b>{e.roomNo}</b>} {e.title || e.guestName || ""}
                </div>
              ))}

              {list.length > 3 && (
                <div className="tiny" style={{ color: "var(--muted)" }}>+{list.length - 3} more</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============ Tiny UI ============ */
function Banner({ type = "ok", children }) {
  const style = type === "err"
    ? { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }
    : { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
  return (
    <div style={{ ...style, padding: "8px 10px", borderRadius: 10, fontWeight: 700, marginBottom: 10 }}>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={backdropStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>{title}</h3>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
        <button onClick={onClose} aria-label="Close" style={xStyle}>×</button>
      </div>
    </div>
  );
}

/* ============ Date helpers ============ */
function buildMonth(year, monthIdx) {
  const first = new Date(year, monthIdx, 1);
  const last = new Date(year, monthIdx + 1, 0);
  const startWeekday = first.getDay(); // 0-6
  const daysIn = last.getDate();

  const days = [];
  // leading blanks
  for (let i = 0; i < startWeekday; i++) days.push(null);
  for (let d = 1; d <= daysIn; d++) {
    const iso = toISODate(new Date(year, monthIdx, d).toISOString());
    days.push({ day: d, iso });
  }
  // trailing to complete rows (optional)
  const remainder = days.length % 7;
  if (remainder) for (let i = 0; i < 7 - remainder; i++) days.push(null);

  const monthStartISO = toISODate(first.toISOString());
  const monthEndISO = toISODate(last.toISOString());
  const monthLabel = `${first.toLocaleString(undefined, { month: "long" })} ${year}`;
  return { monthStartISO, monthEndISO, days, monthLabel };
}

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function toISODate(dLike) {
  const d = new Date(dLike);
  if (Number.isNaN(+d)) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fmtLong(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" });
  } catch { return iso; }
}

/* ============ styles ============ */
const gridHdr = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: 6,
  marginBottom: 6,
};
const hdrCell = {
  fontWeight: 800,
  color: "var(--muted)",
  textTransform: "uppercase",
  fontSize: ".75rem",
  textAlign: "center",
};

const gridBody = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: 6,
  alignItems: "stretch",
};

const cell = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  minHeight: 110,
  padding: 8,
  background: "#fff",
  display: "grid",
  alignContent: "start",
  gap: 4,
  cursor: "pointer",
};

const cellTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 4,
};
const evtRow = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  padding: "2px 6px",
  borderRadius: 6,
  border: "1px solid #e5e7eb",
};
const cardRow = {
  padding: "8px 10px",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  background: "#fff",
};

const backdropStyle = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
  display: "grid", placeItems: "center", zIndex: 1000
};
const modalStyle = {
  position: "relative",
  width: "min(700px, calc(100% - 24px))",
  background: "#fff",
  borderRadius: 16,
  boxShadow: "0 20px 60px rgba(0,0,0,.22)",
  overflow: "hidden"
};
const headerStyle = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff"
};
const xStyle = {
  position: "absolute", top: 10, right: 10,
  border: "1px solid #e5e7eb", background: "#fff",
  color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer"
};
