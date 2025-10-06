import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import ReservationSidebar, { BackofficeSidebar } from "../../components/sidebar/ReservationSidebar";
import "../../components/sidebar/Sidebar.css";
import "../../assets/css/commanPage.css";

const PAGE_SIZE = 20;

export default function BookingSheetAccounts() {
  // filters
  const [propertyCode, setPropertyCode] = useState("");
  const [properties, setProperties] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");

  // paging + data
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // load properties for dropdown (optional)
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await apiFetch("/api/properties?limit=500", { auth: true });
        const list = res?.data || res?.items || res || [];
        if (!ignore) {
          setProperties(Array.isArray(list) ? list : []);
          // pick first property if none selected
          if (!propertyCode && list[0]?.code) {
            setPropertyCode(String(list[0].code).toUpperCase());
          }
        }
      } catch {
        // ignore property list errors; page still works
      }
    })();
    return () => { ignore = true; };
  }, []); // only on mount

  // load report
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const params = new URLSearchParams({ page, limit });
        if (propertyCode) params.set("propertyCode", propertyCode);
        if (q.trim()) params.set("q", q.trim());
        if (from) params.set("from", from);
        if (to) params.set("to", to);

        // expected backend:
        // GET /api/reports/booking-sheet-accounts?propertyCode=&from=&to=&q=&page=&limit=
        // -> { data: [...], total }
        const res = await apiFetch(`/api/reports/booking-sheet-accounts?${params.toString()}`, { auth: true });

        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;

        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number(count) || 0);
        }
      } catch (e) {
        if (!ignore) {
          setErr(e?.message || "Failed to load Booking Sheet – Accounts.");
          setRows([]); setTotal(0);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [propertyCode, q, from, to, page, limit]);

  // client fallback search if server didn't paginate
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [
        r.bookingCode, r.guestName, r.ledgerCode, r.ledgerName,
        r.narration, r.roomNo, r.channel
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  const dataToRender = rows?.length && total > rows.length ? rows : filtered;

  // totals
  const totals = useMemo(() => {
    const list = dataToRender || [];
    const debit = list.reduce((n, x) => n + Number(x.debit || 0), 0);
    const credit = list.reduce((n, x) => n + Number(x.credit || 0), 0);
    return { debit, credit, balance: debit - credit };
  }, [dataToRender]);

  // export CSV
  const exportCSV = () => {
    const cols = [
      "Posting Date", "Booking #", "Guest", "Room", "Channel",
      "Ledger Code", "Ledger Name", "Narration", "Debit", "Credit", "Balance"
    ];
    const lines = [cols.join(",")];

    let running = 0;
    (dataToRender || []).forEach((r) => {
      running += Number(r.debit || 0) - Number(r.credit || 0);
      const line = [
        toYMD(r.postingDate || r.createdAt),
        safe(r.bookingCode),
        safe(r.guestName),
        safe(r.roomNo),
        safe(r.channel),
        safe(r.ledgerCode),
        safe(r.ledgerName),
        qcsv(r.narration),
        Number(r.debit || 0),
        Number(r.credit || 0),
        running.toFixed(2)
      ];
      lines.push(line.map(csvCell).join(","));
    });

    // footer
    lines.push("");
    lines.push(["Totals", "", "", "", "", "", "", "", totals.debit.toFixed(2), totals.credit.toFixed(2), totals.balance.toFixed(2)].join(","));

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `booking-sheet-accounts_${propertyCode || "ALL"}_${from || "ALL"}_${to || "ALL"}.csv`;
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
          <h2 style={{ margin: 0 }}>Booking Sheet — Accounts</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {/* Property filter (optional) */}
            <select
              className="res-select"
              value={propertyCode}
              onChange={(e) => { setPropertyCode(e.target.value); setPage(1); }}
              title="Property"
            >
              {properties.length === 0 && <option value="">All Properties</option>}
              {properties.map((p) => (
                <option key={p.code} value={String(p.code).toUpperCase()}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>

            <input
              className="res-select"
              placeholder="Search (booking / guest / ledger / room / narration)"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              style={{ minWidth: 300 }}
            />
            <input className="res-select" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} title="From (Posting Date)" />
            <input className="res-select" type="date" value={to}   onChange={(e) => { setTo(e.target.value); setPage(1); }} title="To (Posting Date)" />
            <select className="res-select" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
              {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}/page</option>)}
            </select>
            <button className="btn" onClick={exportCSV}>⬇ Export CSV</button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <KPI label="Rows" value={dataToRender?.length || 0} icon="📄" />
          <KPI label="Total Debit" value={fmtINR(totals.debit)} icon="➕" />
          <KPI label="Total Credit" value={fmtINR(totals.credit)} icon="➖" />
          <KPI label="Balance" value={fmtINR(totals.balance)} icon="⚖️" />
        </div>

        {/* Table */}
        <div className="panel" style={{ marginTop: 12 }}>
          <div className="panel-h">
            <span>Entries</span>
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
                    <th>Posting Date</th>
                    <th>Booking #</th>
                    <th>Guest</th>
                    <th>Room</th>
                    <th>Channel</th>
                    <th>Ledger</th>
                    <th>Narration</th>
                    <th style={{ textAlign: "right" }}>Debit</th>
                    <th style={{ textAlign: "right" }}>Credit</th>
                    <th style={{ textAlign: "right" }}>Run Bal</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={10}>No entries found</td></tr>
                  )}

                  {(() => {
                    let running = 0;
                    return (dataToRender || []).map((r) => {
                      const id = r._id || r.id || `${r.bookingCode}-${r.ledgerCode}-${r.postingDate}`;
                      const d = Number(r.debit || 0);
                      const c = Number(r.credit || 0);
                      running += d - c;
                      return (
                        <tr key={id}>
                          <td>{fmtDate(r.postingDate || r.createdAt)}</td>
                          <td>{r.bookingCode || "—"}</td>
                          <td>
                            <div style={{ fontWeight: 700 }}>{r.guestName || "—"}</div>
                            <div className="small" style={{ color: "var(--muted)" }}>{r.guestMobile || r.guestEmail || " "}</div>
                          </td>
                          <td>{r.roomNo || "—"}</td>
                          <td>{r.channel || "—"}</td>
                          <td>
                            <div style={{ fontWeight: 700 }}>{r.ledgerCode || "—"}</div>
                            <div className="small" style={{ color: "var(--muted)" }}>{r.ledgerName || ""}</div>
                          </td>
                          <td title={r.narration || ""}>{ellipsis(r.narration)}</td>
                          <td style={{ textAlign: "right" }}>{num2(r.debit)}</td>
                          <td style={{ textAlign: "right" }}>{num2(r.credit)}</td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>{num2(running)}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
              <button className="btn" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                ‹ Prev
              </button>
              <span className="small" style={{ alignSelf: "center", color: "var(--muted)" }}>Page {page}</span>
              <button
                className="btn"
                disabled={loading || (!total ? dataToRender.length < limit : page * limit >= total)}
                onClick={() => setPage((p) => p + 1)}
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

/* ========== Small UI bits ========== */
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

/* ========== utils ========== */
function safe(v) { return v == null ? "" : String(v); }
function qcsv(v) { return (v || "").replaceAll("\n", " ").trim(); }
function csvCell(v) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes("\"")) return `"${s.replaceAll("\"", "\"\"")}"`;
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
function num2(n) { const v = Number(n || 0); return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtINR(n) {
  const v = Number(n || 0);
  return v.toLocaleString(undefined, { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function ellipsis(s, n = 36) {
  if (!s) return "—";
  const t = String(s);
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}
