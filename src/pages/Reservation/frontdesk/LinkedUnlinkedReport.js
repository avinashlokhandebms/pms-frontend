// src/pages/Report/LinkedUnlinkedReport.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import ReservationSidebar, { BackofficeSidebar } from "../../../components/sidebar/ReservationSidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

const PAGE_SIZE = 20;

export default function LinkedUnlinkedReport() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // filters
  const [propertyCode, setPropertyCode] = useState("");
  const [status, setStatus] = useState("ALL"); // ALL | LINKED | UNLINKED
  const [q, setQ] = useState("");
  const [from, setFrom] = useState(toISODate(addDays(new Date(), -14)));
  const [to, setTo] = useState(toISODate(new Date()));
  const [applyTick, setApplyTick] = useState(0); // press Apply to refresh

  // load data
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          from,
          to,
        });
        if (q.trim()) params.set("q", q.trim());
        if (propertyCode.trim()) params.set("propertyCode", propertyCode.trim().toUpperCase());
        if (status && status !== "ALL") params.set("status", status);

        const res = await apiFetch(`/api/reports/links?${params.toString()}`, { auth: true });
        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;

        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number(count) || 0);
        }
      } catch (e) {
        if (!ignore) {
          setErr(e?.message || "Failed to load report.");
          setRows([]);
          setTotal(0);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, applyTick]);

  // client fallback filter if your API doesn't filter
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [
        r.sourceType, r.sourceId, r.targetType, r.targetId,
        r.propertyCode, r.status, r.refNo, r.notes
      ]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  const dataToRender = rows?.length && total > rows.length ? rows : filtered;

  const onApply = () => { setPage(1); setApplyTick(t => t + 1); };

  const exportCSV = () => {
    const headers = [
      "Property", "Status", "SourceType", "SourceId",
      "TargetType", "TargetId", "Reference", "Notes",
      "CreatedAt", "UpdatedAt",
    ];
    const body = dataToRender.map(r => [
      safe(r.propertyCode),
      safe(r.status),
      safe(r.sourceType),
      safe(r.sourceId),
      safe(r.targetType),
      safe(r.targetId),
      safe(r.refNo || r.reference),
      safe(r.notes),
      fmtDT(r.createdAt),
      fmtDT(r.updatedAt),
    ]);
    const csv = toCSV([headers, ...body]);
    downloadText(csv, `linked-unlinked-${from}_to_${to}.csv`, "text/csv;charset=utf-8;");
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <ReservationSidebar />

      <div className="res-wrap">
        <div className="res-topbar" style={{ gap: 8, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Linked / Unlinked Report</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="res-select"
              placeholder="Property Code"
              value={propertyCode}
              onChange={(e) => setPropertyCode(e.target.value)}
              style={{ width: 150, textTransform: "uppercase" }}
              title="Optional property scope"
            />
            <select className="res-select" value={status} onChange={(e) => setStatus(e.target.value)} title="Link status">
              <option value="ALL">All</option>
              <option value="LINKED">Linked</option>
              <option value="UNLINKED">Unlinked</option>
            </select>
            <input
              className="res-select"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              title="From date"
            />
            <input
              className="res-select"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              title="To date"
            />
            <input
              className="res-select"
              placeholder="Search (ref / id / notes)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: 240 }}
            />
            <button className="btn" onClick={onApply} disabled={loading}>Apply</button>
            <button className="btn" onClick={exportCSV} disabled={loading || dataToRender.length === 0}>Export CSV</button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-h">
            <span>Results</span>
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
                    <th>Status</th>
                    <th>Property</th>
                    <th>Source</th>
                    <th>Target</th>
                    <th>Reference</th>
                    <th>Notes</th>
                    <th>Created</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={8}>No records</td></tr>
                  )}

                  {dataToRender.map((r, i) => (
                    <tr key={(r._id || r.id || i) + ""}>
                      <td><StatusChip value={(r.status || "").toUpperCase()} /></td>
                      <td>{r.propertyCode || "—"}</td>
                      <td>
                        <div style={{ display: "grid" }}>
                          <span>{r.sourceType || "—"}</span>
                          <span className="small" style={{ color: "var(--muted)" }}>{r.sourceId || "—"}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "grid" }}>
                          <span>{r.targetType || "—"}</span>
                          <span className="small" style={{ color: "var(--muted)" }}>{r.targetId || "—"}</span>
                        </div>
                      </td>
                      <td>{r.refNo || r.reference || "—"}</td>
                      <td title={r.notes || ""}>{truncate(r.notes, 60) || "—"}</td>
                      <td>{fmtDT(r.createdAt)}</td>
                      <td>{fmtDT(r.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
              <select
                className="res-select"
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                title="Rows per page"
              >
                {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
              </select>
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

/* ---------- Tiny UI ---------- */
function StatusChip({ value }) {
  const v = (value || "").toUpperCase();
  const isLinked = v === "LINKED";
  const style = isLinked
    ? { background: "#dcfce7", border: "1px solid #bbf7d0", color: "#166534" }
    : { background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b" };
  return (
    <span style={{ ...style, display: "inline-block", padding: ".15rem .5rem", borderRadius: 999, fontSize: ".75rem", fontWeight: 800 }}>
      {isLinked ? "LINKED" : "UNLINKED"}
    </span>
  );
}

function Banner({ type = "ok", children }) {
  const style = type === "err"
    ? { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }
    : { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
  return <div style={{ ...style, padding: "8px 10px", borderRadius: 10, fontWeight: 700, marginBottom: 10 }}>{children}</div>;
}

/* ---------- Helpers ---------- */
function addDays(d, n) { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt; }
function toISODate(d) {
  const dt = new Date(d);
  if (Number.isNaN(+dt)) return "";
  const y = dt.getFullYear(), m = String(dt.getMonth() + 1).padStart(2, "0"), day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fmtDT(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(+dt) ? "—" : dt.toLocaleString(); }
function safe(x) { return x == null ? "" : String(x).replace(/\r?\n/g, " ").trim(); }
function truncate(s, n) { if (!s) return ""; const t = String(s); return t.length > n ? t.slice(0, n - 1) + "…" : t; }

function toCSV(rows) {
  return rows.map(r =>
    r.map((cell) => {
      const c = cell == null ? "" : String(cell);
      if (/[",\n]/.test(c)) return `"${c.replace(/"/g, '""')}"`;
      return c;
    }).join(",")
  ).join("\n");
}
function downloadText(text, filename, mime = "text/plain;charset=utf-8;") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
}
