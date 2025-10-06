import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import ReservationSidebar, { BackofficeSidebar } from "../../components/sidebar/ReservationSidebar";
import "../../components/sidebar/Sidebar.css";
import "../../assets/css/commanPage.css";

const PAGE_SIZE = 20;
const STATUS_OPTIONS = ["ALL", "CANCELLED", "NO_SHOW"];
const REFUND_STATUS = ["ALL", "REFUND_DUE", "REFUNDED", "NA"];

export default function CancelReservationList() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});

  const [dateFrom, setDateFrom] = useState(toYMD(new Date()));
  const [dateTo, setDateTo] = useState(toYMD(new Date()));
  const [status, setStatus] = useState("ALL");
  const [refund, setRefund] = useState("ALL");
  const [q, setQ] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const params = new URLSearchParams({
          dateFrom,
          dateTo,
          status,
          refundStatus: refund,
          q,
          page,
          limit,
        });

        // Expected API (adjust if needed):
        // GET /api/reservations/cancelled?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD&status=...&refundStatus=...&q=&page=&limit=
        const res = await apiFetch(`/api/reservations/cancelled?${params.toString()}`, { auth: true });

        const data = res?.data?.items || res?.items || res?.data || res || [];
        const sum  = res?.data?.summary || res?.summary || {};
        const count = res?.total ?? res?.data?.total ?? data.length ?? 0;

        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setSummary(isPlainObj(sum) ? sum : {});
          setTotal(Number(count) || 0);
        }
      } catch (e) {
        if (!ignore) {
          setErr(e?.message || "Failed to load cancelled reservations.");
          setRows([]); setSummary({}); setTotal(0);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [dateFrom, dateTo, status, refund, q, page, limit]);

  // client-side fallback search
  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const term = q.trim().toLowerCase();
    return rows.filter(r =>
      [r.code, r.guestName, r.roomNo, r.reason, r.cancelledBy, r.source]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  const dataToRender = rows?.length && total > rows.length ? rows : filtered;

  const onExportCSV = () => {
    const header = [
      "Res No",
      "Guest",
      "Status",
      "Cancelled On",
      "Reason",
      "Cancelled By",
      "Nights",
      "Amount",
      "Refund Status",
      "Refund Amount",
      "Source",
      "Created",
    ];
    const lines = dataToRender.map(r => [
      safe(r.code),
      safe(r.guestName),
      safe(r.status),
      fmtYMDH(r.cancelledAt || r.updatedAt),
      safe(r.reason),
      safe(r.cancelledBy),
      r.nights ?? diffNights(r.checkIn, r.checkOut),
      fmtMoneyCsv(r.amount),
      safe(r.refundStatus),
      fmtMoneyCsv(r.refundAmount),
      safe(r.source || r.channel),
      fmtYMDH(r.createdAt),
    ]);
    const csv = [header, ...lines].map(a => a.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cancelled-reservations_${dateFrom}_to_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page">
      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Cancelled Reservations</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input className="res-select" type="date" value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} title="From" />
            <input className="res-select" type="date" value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }} title="To" />

            <select className="res-select" value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }} title="Status">
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{labelize(s)}</option>)}
            </select>

            <select className="res-select" value={refund}
              onChange={(e) => { setRefund(e.target.value); setPage(1); }} title="Refund">
              {REFUND_STATUS.map(s => <option key={s} value={s}>{labelize(s)}</option>)}
            </select>

            <input className="res-select" placeholder="Search (guest / code / reason / source)"
              value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} style={{ minWidth: 280 }} />

            <select className="res-select" value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} title="Rows per page">
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>

            <button className="btn" onClick={onExportCSV}>⬇ Export CSV</button>
          </div>
        </div>

        {/* Summary KPIs */}
        <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <KPI label="Cancelled" value={summary.cancelled} />
          <KPI label="No Show" value={summary.noShow} />
          <KPI label="Refund Due (Count)" value={summary.refundDueCount} />
          <KPI label="Refund Due (Amount)" value={fmtMoney(summary.refundDueAmount)} />
          <KPI label="Refunded (Count)" value={summary.refundedCount} />
          <KPI label="Refunded (Amount)" value={fmtMoney(summary.refundedAmount)} />
          <KPI label="Total" value={summary.total ?? total} />
        </div>

        {/* Table */}
        <div className="panel" style={{ marginTop: 12 }}>
          <div className="panel-h">
            <span>Results — {fmtYMD(dateFrom)} to {fmtYMD(dateTo)} {status !== "ALL" ? `• ${labelize(status)}` : ""}</span>
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
                    <th>Res #</th>
                    <th>Guest</th>
                    <th>Status</th>
                    <th>Cancelled On</th>
                    <th>Reason</th>
                    <th>Cancelled By</th>
                    <th>Nights</th>
                    <th>Amount</th>
                    <th>Refund</th>
                    <th>Refund Amt</th>
                    <th>Source</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={12}>No records</td></tr>
                  )}

                  {dataToRender?.map(r => {
                    const id = r._id || r.id || r.code;
                    return (
                      <tr key={id}>
                        <td>{r.code || "—"}</td>
                        <td title={r.guestEmail || ""}>
                          <div style={{ fontWeight: 700 }}>{r.guestName || "—"}</div>
                          <div className="small" style={{ color: "var(--muted)" }}>
                            {r.adults ?? 0}A {r.children ? `• ${r.children}C` : ""}{r.company ? ` • ${r.company}` : ""}
                          </div>
                        </td>
                        <td><StatusPill value={r.status} /></td>
                        <td>{fmtYMDH(r.cancelledAt || r.updatedAt)}</td>
                        <td title={r.reason || ""}>{r.reason || "—"}</td>
                        <td>{r.cancelledBy || "—"}</td>
                        <td>{r.nights ?? diffNights(r.checkIn, r.checkOut)}</td>
                        <td style={{ textAlign: "right" }}>{fmtMoney(r.amount)}</td>
                        <td><RefundPill value={r.refundStatus} /></td>
                        <td style={{ textAlign: "right" }}>{fmtMoney(r.refundAmount)}</td>
                        <td>{r.source || r.channel || "—"}</td>
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
                disabled={loading || (total ? page * limit >= total : dataToRender.length < limit)}
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

/* ---------- Small UI bits ---------- */
function KPI({ label, value }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon">🧾</div>
      <div>
        <div className="kpi-title">{label}</div>
        <div className="kpi-number">{value ?? 0}</div>
      </div>
    </div>
  );
}

function StatusPill({ value }) {
  const v = String(value || "—").toUpperCase();
  const map = {
    CANCELLED: { bg: "#fef2f2", br: "#fecaca", fg: "#991b1b" },
    NO_SHOW:   { bg: "#fff1f2", br: "#fecdd3", fg: "#9f1239" },
  };
  const t = map[v] || { bg: "#f3f4f6", br: "#e5e7eb", fg: "#334155" };
  return (
    <span style={{
      display: "inline-block", padding: ".15rem .5rem",
      borderRadius: 999, background: t.bg, border: `1px solid ${t.br}`, color: t.fg,
      fontSize: ".75rem", fontWeight: 800
    }}>
      {labelize(v)}
    </span>
  );
}

function RefundPill({ value }) {
  const v = String(value || "NA").toUpperCase();
  const map = {
    REFUND_DUE: { bg: "#fff7ed", br: "#fed7aa", fg: "#9a3412" },
    REFUNDED:   { bg: "#ecfdf5", br: "#a7f3d0", fg: "#166534" },
    NA:         { bg: "#f1f5f9", br: "#e2e8f0", fg: "#334155" },
  };
  const t = map[v] || map.NA;
  return (
    <span style={{
      display: "inline-block", padding: ".15rem .5rem",
      borderRadius: 999, background: t.bg, border: `1px solid ${t.br}`, color: t.fg,
      fontSize: ".75rem", fontWeight: 800
    }}>
      {labelize(v)}
    </span>
  );
}

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

/* ---------- Helpers ---------- */
function labelize(s) { return String(s || "").replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()); }
function toYMD(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt)) return "";
  const m = `${dt.getMonth() + 1}`.padStart(2, "0");
  const day = `${dt.getDate()}`.padStart(2, "0");
  return `${dt.getFullYear()}-${m}-${day}`;
}
function fmtYMD(s) { try { const dt = new Date(s); return dt.toLocaleDateString(); } catch { return s || "—"; } }
function fmtYMDH(s) { try { const dt = new Date(s); return dt.toLocaleString(); } catch { return s || "—"; } }
function fmtDate(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(dt) ? "—" : dt.toLocaleDateString(); }
function fmtMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtMoneyCsv(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  return String(v);
}
function diffNights(a, b) {
  const A = new Date(a), B = new Date(b);
  if (Number.isNaN(A) || Number.isNaN(B)) return 0;
  return Math.max(0, Math.round((B - A) / (1000 * 60 * 60 * 24)));
}
function isPlainObj(o) { return !!o && typeof o === "object" && !Array.isArray(o); }
function safe(v) { return v == null ? "" : String(v); }
function csvCell(s) {
  const v = String(s ?? "");
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
