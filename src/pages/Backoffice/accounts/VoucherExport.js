import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { BackofficeSidebar } from "../../../components/sidebar/backofficesidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";
import { getSession } from "../../../auth";

const PAGE_SIZE = 20;
const LS_KEY = "currentPropertyCode";

export default function VoucherExportPage() {
  const propertyCode = (localStorage.getItem(LS_KEY) || "").toUpperCase();

  // filters
  const [fromDate, setFromDate] = useState(() => isoDateNDaysAgo(30));
  const [toDate, setToDate] = useState(() => isoDateNDaysAgo(0));
  const [type, setType] = useState("");        // RECEIPT / PAYMENT / JOURNAL / CONTRA / ...
  const [q, setQ] = useState("");              // free text (voucher no / ledger / narration)
  const [minAmt, setMinAmt] = useState("");
  const [maxAmt, setMaxAmt] = useState("");

  // paging
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);

  // data
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // load preview
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true); setErr("");
      try {
        const params = new URLSearchParams({
          page, limit, fromDate, toDate,
        });
        if (q) params.set("q", q);
        if (type) params.set("type", type);
        if (minAmt) params.set("minAmt", String(minAmt));
        if (maxAmt) params.set("maxAmt", String(maxAmt));
        if (propertyCode) params.set("propertyCode", propertyCode);

        // Expect JSON preview
        const res = await apiFetch(`/api/accounts/voucher-export?${params.toString()}`, { auth: true });
        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;
        if (!ignore) { setRows(Array.isArray(data) ? data : []); setTotal(Number(count) || 0); }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load vouchers."); setRows([]); setTotal(0); }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [page, limit, fromDate, toDate, q, type, minAmt, maxAmt, propertyCode]);

  // client fallback filter for quick search
  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const term = q.trim().toLowerCase();
    return rows.filter(r =>
      [
        r.voucherNo, r.type, r.narration, r.refNo,
        r.ledgerDr, r.ledgerCr, r.partyName,
      ].filter(Boolean).some(v => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  const dataToRender = rows?.length && total > rows.length ? rows : filtered;

  const exportFile = async (format /* csv|xlsx */) => {
    try {
      const params = new URLSearchParams({
        fromDate, toDate, format,
      });
      if (q) params.set("q", q);
      if (type) params.set("type", type);
      if (minAmt) params.set("minAmt", String(minAmt));
      if (maxAmt) params.set("maxAmt", String(maxAmt));
      if (propertyCode) params.set("propertyCode", propertyCode);

      const session = getSession?.();
      const res = await fetch(`/api/accounts/voucher-export/download?${params.toString()}`, {
        headers: {
          "Accept": "application/octet-stream",
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        },
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
      a.download = `voucher-export_${propertyCode || "GLOBAL"}_${ts}.${format === "xlsx" ? "xlsx" : "csv"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e?.message || "Export failed");
    }
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <BackofficeSidebar />

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <div>
            <h2 style={{ margin: 0 }}>Voucher Export</h2>
            <div className="small" style={{ color: "var(--muted)" }}>
              {propertyCode ? `Property: ${propertyCode}` : "Global"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input type="date" className="res-select" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} />
            <span className="small" style={{ color: "var(--muted)" }}>to</span>
            <input type="date" className="res-select" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} />

            <select className="res-select" value={type} onChange={e => { setType(e.target.value); setPage(1); }}>
              <option value="">All Types</option>
              {["RECEIPT","PAYMENT","JOURNAL","CONTRA","SALES","PURCHASE"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <input
              className="res-select"
              placeholder="Search (voucher / ledger / narration)"
              value={q}
              onChange={e => { setQ(e.target.value); setPage(1); }}
              style={{ minWidth: 240 }}
            />

            <input
              className="res-select"
              type="number"
              step="0.01"
              placeholder="Min Amt"
              value={minAmt}
              onChange={e => { setMinAmt(e.target.value); setPage(1); }}
              style={{ width: 110 }}
            />
            <input
              className="res-select"
              type="number"
              step="0.01"
              placeholder="Max Amt"
              value={maxAmt}
              onChange={e => { setMaxAmt(e.target.value); setPage(1); }}
              style={{ width: 110 }}
            />

            <select className="res-select" value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}>
              {[20, 50, 100, 200].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>

            <button className="btn" onClick={() => exportFile("csv")}>⬇ Export CSV</button>
            <button className="btn" onClick={() => exportFile("xlsx")}>⬇ Export XLSX</button>
          </div>
        </div>

        {/* Table */}
        <div className="panel">
          <div className="panel-h">
            <span>Preview</span>
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
                    <th>Date</th>
                    <th>Voucher No</th>
                    <th>Type</th>
                    <th>Ref No</th>
                    <th>Debit Ledger</th>
                    <th>Credit Ledger</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                    <th>Narration</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={8}>No vouchers</td></tr>
                  )}

                  {dataToRender?.map((r, i) => (
                    <tr key={(r._id || r.id || i) + ""}>
                      <td>{fmtDate(r.date)}</td>
                      <td>{r.voucherNo || "—"}</td>
                      <td>{r.type || "—"}</td>
                      <td>{r.refNo || "—"}</td>
                      <td>{r.ledgerDr || r.debitLedger || "—"}</td>
                      <td>{r.ledgerCr || r.creditLedger || "—"}</td>
                      <td style={{ textAlign: "right" }}>{fmtMoney(r.amount)}</td>
                      <td title={r.narration || ""}>{r.narration || "—"}</td>
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
    </div>
  );
}

/* ---- tiny UI helpers ---- */
function Banner({ type = "ok", children }) {
  const style = type === "err"
    ? { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }
    : { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
  return <div style={{ ...style, padding: "8px 10px", borderRadius: 10, fontWeight: 700, marginBottom: 10 }}>{children}</div>;
}

/* ---- utils ---- */
function fmtDate(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(dt) ? "—" : dt.toLocaleDateString(); }
function fmtMoney(n) { const x = Number(n || 0); return x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function isoDateNDaysAgo(n) { const dt = new Date(); dt.setDate(dt.getDate() - n); return dt.toISOString().slice(0,10); }
