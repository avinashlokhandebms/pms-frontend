// src/pages/pos/SalesSummary.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import PosSidebar, { BackofficeSidebar } from "../../../components/sidebar/Possidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

const GROUPS = [
  { key: "DAY", label: "By Day" },
  { key: "CATEGORY", label: "By Category" },
  { key: "ITEM", label: "By Item" },
  { key: "USER", label: "By User / Cashier" },
  { key: "HOUR", label: "By Hour" },
];

export default function SalesSummary() {
  const today = toDateInput(new Date());
  const sevenAgo = toDateInput(addDays(new Date(), -6));

  const [start, setStart] = useState(sevenAgo);
  const [end, setEnd] = useState(today);
  const [groupBy, setGroupBy] = useState("DAY");
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

  // load summary
  const loadSummary = async () => {
    setLoading(true); setErr("");
    try {
      const params = new URLSearchParams({ start, end, groupBy });
      if (outletId) params.set("outletId", outletId);
      const res = await apiFetch(`/api/pos/reports/sales-summary?${params.toString()}`, { auth: true });
      const norm = normalize(res);
      setTotals(norm.totals);
      setRows(norm.rows);
    } catch (e) {
      setErr(e?.message || "Failed to load sales summary.");
      setTotals(null);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSummary(); /* eslint-disable-next-line */ }, []);

  // filtering
  const filteredRows = useMemo(() => {
    const term = (q || "").trim().toLowerCase();
    if (!term) return rows;
    const keyField = groupKeyField(groupBy);
    return rows.filter(r =>
      String(r[keyField] ?? "")
        .toLowerCase()
        .includes(term)
    );
  }, [rows, q, groupBy]);

  // columns per group
  const columns = useMemo(() => {
    const common = [
      { key: "qty",    label: "Qty",     align: "right", fmt: fmtNum },
      { key: "gross",  label: "Gross",   align: "right", fmt: fmtCur },
      { key: "disc",   label: "Discount",align: "right", fmt: fmtCur },
      { key: "tax",    label: "Tax",     align: "right", fmt: fmtCur },
      { key: "net",    label: "Net",     align: "right", fmt: fmtCur },
      { key: "bills",  label: "Bills",   align: "right", fmt: fmtNum },
    ];
    const first = (() => {
      switch (groupBy) {
        case "DAY":      return { key: "day", label: "Day" };
        case "CATEGORY": return { key: "category", label: "Category" };
        case "ITEM":     return { key: "item", label: "Item" };
        case "USER":     return { key: "user", label: "User / Cashier" };
        case "HOUR":     return { key: "hour", label: "Hour" };
        default:         return { key: "key", label: "Group" };
      }
    })();
    return [first, ...common];
  }, [groupBy]);

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <PosSidebar />

      <div className="res-wrap">
        {/* Topbar / Filters */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Sales Summary</h2>
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
                <Kpi icon="💵" label="Gross" value={fmtCur(totals.gross)} />
                <Kpi icon="🏷️" label="Discount" value={fmtCur(totals.disc)} />
                <Kpi icon="🧾" label="Tax" value={fmtCur(totals.tax)} />
                <Kpi icon="✅" label="Net" value={fmtCur(totals.net)} primary />
                <Kpi icon="🧾" label="Bills" value={fmtNum(totals.bills)} />
                <Kpi icon="👥" label="Covers" value={fmtNum(totals.covers)} />
                <Kpi icon="📈" label="Avg / Cover" value={fmtCur(safeDiv(totals.net, totals.covers))} />
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
function safeDiv(a, b) {
  const A = Number(a || 0), B = Number(b || 0);
  return B ? A / B : 0;
}
function sum(arr = [], key) {
  return arr.reduce((acc, x) => acc + Number(x?.[key] || 0), 0);
}
function groupKeyField(groupBy) {
  switch (groupBy) {
    case "DAY": return "day";
    case "CATEGORY": return "category";
    case "ITEM": return "item";
    case "USER": return "user";
    case "HOUR": return "hour";
    default: return "key";
  }
}
function exportCSV(groupBy, rows = []) {
  if (!rows.length) return;
  const cols = ["group", "qty", "gross", "disc", "tax", "net", "bills"];
  const head = ["Group", "Qty", "Gross", "Discount", "Tax", "Net", "Bills"];
  const keyField = groupKeyField(groupBy);

  const lines = [head.join(",")];
  for (const r of rows) {
    const line = [
      csv(r[keyField]),
      csv(r.qty),
      csv(r.gross),
      csv(r.disc),
      csv(r.tax),
      csv(r.net),
      csv(r.bills),
    ].join(",");
    lines.push(line);
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `sales-summary-${groupBy.toLowerCase()}-${Date.now()}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function csv(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Accepts a variety of backend shapes and normalizes to { totals, rows } */
function normalize(res) {
  const t = res?.totals || res?.summary || {};
  const rows = Array.isArray(res?.rows) ? res.rows
    : Array.isArray(res?.data) ? res.data
    : Array.isArray(res) ? res
    : [];

  return {
    totals: {
      gross: num(t.gross),
      disc: num(t.disc ?? t.discount),
      tax: num(t.tax),
      net: num(t.net ?? t.netSales),
      bills: int(t.bills),
      covers: int(t.covers),
    },
    rows: rows.map(r => ({
      day: r.day ?? r.date ?? "",
      category: r.category ?? r.cat ?? "",
      item: r.item ?? r.itemName ?? "",
      user: r.user ?? r.cashier ?? "",
      hour: r.hour ?? r.hr ?? "",
      qty: num(r.qty),
      gross: num(r.gross),
      disc: num(r.disc ?? r.discount),
      tax: num(r.tax),
      net: num(r.net),
      bills: int(r.bills),
      key: r.key ?? "",
    })),
  };
}
function num(v) { const n = Number(v || 0); return Number.isFinite(n) ? n : 0; }
function int(v) { const n = parseInt(v ?? 0, 10); return Number.isFinite(n) ? n : 0; }
