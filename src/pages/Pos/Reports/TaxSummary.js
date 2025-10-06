// src/pages/pos/TaxSummary.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import PosSidebar, { BackofficeSidebar } from "../../../components/sidebar/Possidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

const GROUPS = [
  { key: "TAX", label: "By Tax Rate / Name" },
  { key: "DAY", label: "By Day" },
  { key: "OUTLET", label: "By Outlet" },
  { key: "ITEM", label: "By Item" },
];

export default function TaxSummary() {
  const today = toDateInput(new Date());
  const sevenAgo = toDateInput(addDays(new Date(), -6));

  const [start, setStart] = useState(sevenAgo);
  const [end, setEnd] = useState(today);
  const [groupBy, setGroupBy] = useState("TAX");
  const [outletId, setOutletId] = useState("");
  const [outlets, setOutlets] = useState([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  const [totals, setTotals] = useState(null);
  const [rows, setRows] = useState([]);

  // preload outlets
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/api/fnb/outlets?limit=500", { auth: true });
        const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        setOutlets(data);
      } catch {
        setOutlets([]);
      }
    })();
  }, []);

  const loadSummary = async () => {
    setLoading(true); setErr("");
    try {
      const params = new URLSearchParams({ start, end, groupBy });
      if (outletId) params.set("outletId", outletId);
      const res = await apiFetch(`/api/pos/reports/tax-summary?${params.toString()}`, { auth: true });
      const norm = normalize(res);
      setTotals(norm.totals);
      setRows(norm.rows);
    } catch (e) {
      setErr(e?.message || "Failed to load tax summary.");
      setTotals(null);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSummary(); /* eslint-disable-next-line */ }, []);

  // client filter
  const filteredRows = useMemo(() => {
    const term = (q || "").trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      String(r[groupKeyField(groupBy)] ?? "")
        .toLowerCase()
        .includes(term)
    );
  }, [rows, q, groupBy]);

  // dynamic columns
  const columns = useMemo(() => {
    const first = (() => {
      switch (groupBy) {
        case "TAX":    return { key: "tax", label: "Tax Rate / Name" };
        case "DAY":    return { key: "day", label: "Day" };
        case "OUTLET": return { key: "outlet", label: "Outlet" };
        case "ITEM":   return { key: "item", label: "Item" };
        default:       return { key: "key", label: "Group" };
      }
    })();
    return [
      first,
      { key: "taxable", label: "Taxable",  align: "right", fmt: fmtCur },
      { key: "tax",     label: "Tax Amt",  align: "right", fmt: fmtCur },
      { key: "gross",   label: "Gross",    align: "right", fmt: fmtCur },
      { key: "bills",   label: "Bills",    align: "right", fmt: fmtNum },
    ];
  }, [groupBy]);

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <PosSidebar />

      <div className="res-wrap">
        {/* Topbar / Filters */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Tax Summary</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input className="res-select" type="date" value={start} onChange={e => setStart(e.target.value)} />
            <span className="small" style={{ color: "var(--muted)" }}>to</span>
            <input className="res-select" type="date" value={end} onChange={e => setEnd(e.target.value)} />

            <select className="res-select" value={groupBy} onChange={e => setGroupBy(e.target.value)}>
              {GROUPS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
            </select>

            <select className="res-select" value={outletId} onChange={e => setOutletId(e.target.value)}>
              <option value="">All Outlets</option>
              {outlets.map(o => <option key={o._id || o.id} value={o._id || o.id}>{o.name}</option>)}
            </select>

            <input
              className="res-select"
              placeholder={`Search (${columns[0].label})`}
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{ minWidth: 220 }}
            />

            <button className="btn" onClick={loadSummary} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </button>
            <button className="btn" onClick={() => exportCSV(groupBy, filteredRows)} disabled={!filteredRows?.length}>
              Export CSV
            </button>
            <button className="btn" onClick={() => window.print()} disabled={!filteredRows?.length}>
              Print
            </button>
          </div>
        </div>

        {/* Summary + Table */}
        <div className="panel">
          <div className="panel-h">
            <span>Summary</span>
            <span className="small" style={{ color: "var(--muted)" }}>
              {totals ? `Showing ${filteredRows.length} ${GROUPS.find(g => g.key === groupBy)?.label.toLowerCase()}` : ""}
            </span>
          </div>

          <div className="panel-b">
            {err && <Banner type="err">{err}</Banner>}

            {!!totals && (
              <div className="kpi-grid" style={{ marginBottom: 12 }}>
                <Kpi icon="💰" label="Taxable" value={fmtCur(totals.taxable)} />
                <Kpi icon="🧾" label="Tax" value={fmtCur(totals.tax)} />
                <Kpi icon="✅" label="Gross" value={fmtCur(totals.gross)} primary />
                <Kpi icon="🧾" label="Bills" value={fmtNum(totals.bills)} />
              </div>
            )}

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    {columns.map(c => (
                      <th key={c.key} style={c.align === "right" ? { textAlign: "right" } : {}}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(!filteredRows || filteredRows.length === 0) && !loading && (
                    <tr className="no-rows">
                      <td colSpan={columns.length}>No data for the selected filters.</td>
                    </tr>
                  )}

                  {filteredRows.map((r, i) => (
                    <tr key={i}>
                      {columns.map(c => {
                        const v = r[c.key];
                        const txt = c.fmt ? c.fmt(v) : String(v ?? "—");
                        return (
                          <td key={c.key} style={c.align === "right" ? { textAlign: "right" } : {}}>
                            {txt || "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {!!filteredRows?.length && (
                    <tr>
                      <td style={{ fontWeight: 800 }}>Total</td>
                      {columns.slice(1).map(c => (
                        <td key={c.key} style={{ textAlign: c.align === "right" ? "right" : "left", fontWeight: 800 }}>
                          {c.fmt ? c.fmt(sum(filteredRows, c.key)) : sum(filteredRows, c.key)}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Small UI bits ---------- */
function Kpi({ icon, label, value, primary }) {
  return (
    <div className="kpi-card" style={primary ? { borderColor: "#16a34a" } : {}}>
      <div className="kpi-icon">{icon}</div>
      <div>
        <div className="kpi-title">{label}</div>
        <div className="kpi-number">{value}</div>
      </div>
    </div>
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
function toDateInput(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(d, n) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt;
}
function fmtNum(n) {
  n = Number(n || 0);
  return Number.isFinite(n) ? n.toLocaleString() : "0";
}
function fmtCur(n) {
  n = Number(n || 0);
  return Number.isFinite(n)
    ? n.toLocaleString(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 2 })
    : "₹0.00";
}
function sum(arr = [], key) {
  return arr.reduce((acc, x) => acc + Number(x?.[key] || 0), 0);
}
function groupKeyField(groupBy) {
  switch (groupBy) {
    case "TAX":    return "tax";
    case "DAY":    return "day";
    case "OUTLET": return "outlet";
    case "ITEM":   return "item";
    default:       return "key";
  }
}
function exportCSV(groupBy, rows = []) {
  if (!rows.length) return;
  const cols = ["group", "taxable", "tax", "gross", "bills"];
  const head = ["Group", "Taxable", "Tax", "Gross", "Bills"];
  const keyField = groupKeyField(groupBy);

  const lines = [head.join(",")];
  for (const r of rows) {
    const line = [
      csv(r[keyField]),
      csv(r.taxable),
      csv(r.tax),
      csv(r.gross),
      csv(r.bills),
    ].join(",");
    lines.push(line);
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `tax-summary-${groupBy.toLowerCase()}-${Date.now()}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function csv(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Accepts multiple backend shapes; normalizes to { totals, rows } */
function normalize(res) {
  const t = res?.totals || res?.summary || {};
  const rows = Array.isArray(res?.rows) ? res.rows
    : Array.isArray(res?.data) ? res.data
    : Array.isArray(res) ? res
    : [];

  return {
    totals: {
      taxable: num(t.taxable ?? t.subtotal),
      tax:     num(t.tax     ?? t.taxAmount),
      gross:   num(t.gross   ?? (num(t.taxable) + num(t.tax))),
      bills:   int(t.bills),
    },
    rows: rows.map(r => ({
      tax:     r.taxName ?? r.taxRateName ?? r.taxCode ?? r.tax ?? "",
      day:     r.day ?? r.date ?? "",
      outlet:  r.outlet ?? r.outletName ?? "",
      item:    r.item ?? r.itemName ?? "",
      taxable: num(r.taxable ?? r.subtotal),
      tax:     num(r.tax ?? r.taxAmount),
      gross:   num(r.gross ?? (num(r.taxable) + num(r.tax))),
      bills:   int(r.bills),
      key:     r.key ?? "",
    })),
  };
}
function num(v) { const n = Number(v || 0); return Number.isFinite(n) ? n : 0; }
function int(v) { const n = parseInt(v ?? 0, 10); return Number.isFinite(n) ? n : 0; }
