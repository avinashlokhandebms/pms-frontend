import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import ReservationSidebar, { BackofficeSidebar } from "../../components/sidebar/ReservationSidebar";
import "../../components/sidebar/Sidebar.css";
import "../../assets/css/commanPage.css";

const PAGE_SIZE = 10;

export default function NoShowRoomReport() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState(""); // YYYY-MM-DD (check-in date range)
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Load (server-side)
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const params = new URLSearchParams({ page, limit });
        if (q.trim()) params.set("q", q.trim());
        if (from) params.set("from", from);
        if (to) params.set("to", to);

        // Expected backend: GET /api/reports/no-show?from=&to=&q=&page=&limit=
        const res = await apiFetch(`/api/reports/no-show?${params.toString()}`, { auth: true });

        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;

        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number(count) || 0);
        }
      } catch (e) {
        if (!ignore) {
          setErr(e?.message || "Failed to load No Show Room Report.");
          setRows([]); setTotal(0);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [q, from, to, page, limit]);

  // Client search fallback when server didn’t paginate
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [
        r.bookingCode, r.guestName, r.mobile, r.email,
        r.roomNo, r.roomType, r.source, r.reason, r.channel
      ]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  const dataToRender = rows?.length && total > rows.length ? rows : filtered;

  // KPIs
  const kpis = useMemo(() => {
    const list = dataToRender || [];
    const count = list.length;
    const rooms = new Set(list.map(x => x.roomNo).filter(Boolean)).size;
    const nights = list.reduce((n, x) => n + (Number(x.nights) || 0), 0);
    const amount = list.reduce((n, x) => n + (Number(x.estimatedLoss) || 0), 0);
    return { count, rooms, nights, amount };
  }, [dataToRender]);

  // CSV export
  const exportCSV = () => {
    const cols = [
      "Check-In Date", "Booking #", "Guest", "Mobile", "Email",
      "Room", "Room Type", "Nights", "Channel/Source",
      "Estimated Loss", "Reason", "Created"
    ];
    const lines = [cols.join(",")];

    (dataToRender || []).forEach(r => {
      const line = [
        toYMD(r.checkInDate),
        safe(r.bookingCode),
        safe(r.guestName),
        safe(r.mobile),
        safe(r.email),
        safe(r.roomNo),
        safe(r.roomType),
        Number(r.nights || 0),
        safe(r.channel || r.source),
        Number(r.estimatedLoss || 0),
        qcsv(r.reason),
        toYMD(r.createdAt)
      ];
      lines.push(line.map(csvCell).join(","));
    });

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `no-show-report_${from || "all"}_${to || "all"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <ReservationSidebar />

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>No Show Room Report</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="res-select"
              placeholder="Search (booking / guest / room / channel / reason)"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              style={{ minWidth: 320 }}
            />
            <input className="res-select" type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} title="From (Check-in)" />
            <input className="res-select" type="date" value={to}   onChange={e => { setTo(e.target.value); setPage(1); }} title="To (Check-in)" />
            <select className="res-select" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
            <button className="btn" onClick={exportCSV}>⬇ Export CSV</button>
          </div>
        </div>

        {/* KPIs */}
        <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <KPI label="No Shows" value={kpis.count} icon="🚫" />
          <KPI label="Unique Rooms" value={kpis.rooms} icon="🛏️" />
          <KPI label="Total Nights" value={kpis.nights} icon="🌙" />
          <KPI label="Est. Loss" value={fmtINR(kpis.amount)} icon="💸" />
        </div>

        {/* Table */}
        <div className="panel" style={{ marginTop: 12 }}>
          <div className="panel-h">
            <span>No Show List</span>
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
                    <th>Check-In</th>
                    <th>Booking #</th>
                    <th>Guest</th>
                    <th>Room</th>
                    <th>Room Type</th>
                    <th style={{ textAlign: "right" }}>Nights</th>
                    <th>Channel/Source</th>
                    <th style={{ textAlign: "right" }}>Est. Loss</th>
                    <th>Reason</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={10}>No no-show records found</td></tr>
                  )}

                  {dataToRender?.map(r => {
                    const id = r._id || r.id || `${r.bookingCode}-${r.roomNo}-${r.checkInDate}`;
                    return (
                      <tr key={id}>
                        <td>{fmtDate(r.checkInDate)}</td>
                        <td>{r.bookingCode || "—"}</td>
                        <td title={r.email || ""}>
                          <div style={{ fontWeight: 700 }}>{r.guestName || "—"}</div>
                          <div className="small" style={{ color: "var(--muted)" }}>{r.mobile || "—"}</div>
                        </td>
                        <td>{r.roomNo || "—"}</td>
                        <td>{r.roomType || "—"}</td>
                        <td style={{ textAlign: "right" }}>{Number(r.nights || 0)}</td>
                        <td>{r.channel || r.source || "—"}</td>
                        <td style={{ textAlign: "right", fontWeight: 800 }}>{fmtINR(r.estimatedLoss)}</td>
                        <td title={r.reason || ""}>{ellipsis(r.reason)}</td>
                        <td>{fmtDate(r.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
              <button className="btn" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>
                ‹ Prev
              </button>
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
    </div>
  );
}

/* ---------- Small UI atoms ---------- */
function KPI({ label, value, icon = "📌" }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon">{icon}</div>
      <div>
        <div className="kpi-title">{label}</div>
        <div className="kpi-number">{value ?? 0}</div>
      </div>
    </div>
  );
}
function Banner({ type = "ok", children }) {
  const style = type === "err"
    ? { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }
    : { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
  return <div style={{ ...style, padding: "8px 10px", borderRadius: 10, fontWeight: 700, marginBottom: 10 }}>{children}</div>;
}

/* ---------- utils ---------- */
function safe(v) { return v == null ? "" : String(v); }
function qcsv(v) { return (v || "").replaceAll("\n", " ").trim(); }
function csvCell(v) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes("\"")) {
    return `"${s.replaceAll("\"", "\"\"")}"`;
  }
  return s;
}
function toYMD(d) {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt)) return "";
  const m = `${dt.getMonth() + 1}`.padStart(2, "0");
  const day = `${dt.getDate()}`.padStart(2, "0");
  return `${dt.getFullYear()}-${m}-${day}`;
}
function fmtDate(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(dt) ? "—" : dt.toLocaleDateString(); }
function fmtINR(n) {
  const v = Number(n || 0);
  return v.toLocaleString(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 2 });
}
function ellipsis(s, n = 28) {
  if (!s) return "—";
  const t = String(s);
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}
