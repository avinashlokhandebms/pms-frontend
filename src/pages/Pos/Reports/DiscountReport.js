// src/pages/pos/DiscountReport.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import PosSidebar, { BackofficeSidebar } from "../../../components/sidebar/Possidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

const GROUPS = [
  { key: "REASON", label: "By Discount Reason" },
  { key: "DAY",    label: "By Day" },
  { key: "OUTLET", label: "By Outlet" },
  { key: "USER",   label: "By User" },
  { key: "ITEM",   label: "By Item" },
];

export default function DiscountReport() {
  const today = toDateInput(new Date());
  const sevenAgo = toDateInput(addDays(new Date(), -6));

  const [start, setStart] = useState(sevenAgo);
  const [end, setEnd] = useState(today);
  const [groupBy, setGroupBy] = useState("REASON");
  const [outletId, setOutletId] = useState("");

  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  const [totals, setTotals] = useState(null);
  const [rows, setRows] = useState([]);

  // Preload outlets (optional)
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

  const loadReport = async () => {
    setLoading(true); setErr("");
    try {
      const params = new URLSearchParams({ start, end, groupBy });
      if (outletId) params.set("outletId", outletId);
      // Adjust the endpoint name if your backend differs
      const res = await apiFetch(`/api/pos/reports/discount-summary?${params.toString()}`, { auth: true });
      const norm = normalize(res);
      setTotals(norm.totals);
      setRows(norm.rows);
    } catch (e) {
      setErr(e?.message || "Failed to load discount report.");
      setTotals(null);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReport(); /* eslint-disable-next-line */ }, []);

  // Client search (by first column)
  const filteredRows = useMemo(() => {
    const term = (q || "").trim().toLowerCase();
    if (!term) return rows;
    const k = groupKeyField(groupBy);
    return rows.filter(r => String(r[k] ?? "").toLowerCase().includes(term));
  }, [rows, q, groupBy]);

  // Dynamic columns
  const columns = useMemo(() => {
    const first = (() => {
      switch (groupBy) {
        case "REASON": return { key: "reason", label: "Discount Reason" };
        case "DAY":    return { key: "day",    label: "Day" };
        case "OUTLET": return { key: "outlet", label: "Outlet" };
        case "USER":   return { key: "user",   label: "User" };
        case "ITEM":   return { key: "item",   label: "Item" };
        default:       return { key: "key",    label: "Group" };
      }
    })();
    return [
      first,
      { key: "grossBefore", label: "Gross (Before Disc.)", align: "right", fmt: fmtCur },
      { key: "discount",    label: "Discount",             align: "right", fmt: fmtCur },
      { key: "pct",         label: "Disc. %",              align: "right", fmt: fmtPct },
      { key: "net",         label: "Net (After Disc.)",    align: "right", fmt: fmtCur },
      { key: "bills",       label: "Bills",                align: "right", fmt: fmtNum },
    ];
  }, [groupBy]);

  const totalRow = useMemo(() => {
    if (!filteredRows?.length) return null;
    const grossBefore = sum(filteredRows, "grossBefore");
    const discount = sum(filteredRows, "discount");
    const net = sum(filteredRows, "net");
    const bills = sum(filteredRows, "bills");
    const pct = grossBefore > 0 ? discount / grossBefore : 0;
    return { grossBefore, discount, net, bills, pct };
  }, [filteredRows]);

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <PosSidebar />

      <div className="res-wrap">
        {/* Topbar / Filters */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Discount Report</h2>
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

            <button className="btn" onClick={loadReport} disabled={loading}>
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
              {totals ? `Showing ${filteredRows.length} groups` : ""}
            </span>
          </div>

          <div className="panel-b">
            {err && <Banner type="err">{err}</Banner>}

            {!!totals && (
              <div className="kpi-grid" style={{ marginBottom: 12 }}>
                <Kpi icon="💵" label="Gross (Before)" value={fmtCur(totals.grossBefore)} />
                <Kpi icon="🏷️" label="Discount" value={fmtCur(totals.discount)} />
                <Kpi icon="📉" label="Discount %" value={fmtPct(totals.pct)} />
                <Kpi icon="✅" label="Net (After)" value={fmtCur(totals.net)} primary />
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
                        let v = r[c.key];
                        if (c.key === "pct") v = r.grossBefore > 0 ? r.discount / r.grossBefore : 0;
                        const txt = c.fmt ? c.fmt(v) : String(v ?? "—");
                        return (
                          <td key={c.key} style={c.align === "right" ? { textAlign: "right" } : {}}>
                            {txt || "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {!!totalRow && (
                    <tr>
                      <td style={{ fontWeight: 800 }}>Total</td>
                      <td style={{ textAlign: "right", fontWeight: 800 }}>{fmtCur(totalRow.grossBefore)}</td>
                      <td style={{ textAlign: "right", fontWeight: 800 }}>{fmtCur(totalRow.discount)}</td>
                      <td style={{ textAlign: "right", fontWeight: 800 }}>{fmtPct(totalRow.pct)}</td>
                      <td style={{ textAlign: "right", fontWeight: 800 }}>{fmtCur(totalRow.net)}</td>
                      <td style={{ textAlign: "right", fontWeight: 800 }}>{fmtNum(totalRow.bills)}</td>
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
function fmtPct(x) {
  const v = Number(x || 0);
  const pct = Number.isFinite(v) ? v * 100 : 0;
  return `${pct.toFixed(2)}%`;
}
function sum(arr = [], key) {
  return arr.reduce((acc, x) => acc + Number(x?.[key] || 0), 0);
}
function groupKeyField(groupBy) {
  switch (groupBy) {
    case "REASON": return "reason";
    case "DAY":    return "day";
    case "OUTLET": return "outlet";
    case "USER":   return "user";
    case "ITEM":   return "item";
    default:       return "key";
  }
}

/** CSV Export */
function exportCSV(groupBy, rows = []) {
  if (!rows.length) return;
  const keyField = groupKeyField(groupBy);
  const headers = ["Group", "GrossBefore", "Discount", "DiscountPct", "Net", "Bills"];
  const lines = [headers.join(",")];

  for (const r of rows) {
    const pct = r.grossBefore > 0 ? r.discount / r.grossBefore : 0;
    lines.push([
      csv(r[keyField]),
      csv(r.grossBefore),
      csv(r.discount),
      csv((pct * 100).toFixed(2) + "%"),
      csv(r.net),
      csv(r.bills),
    ].join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `discount-report-${groupBy.toLowerCase()}-${Date.now()}.csv`;
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

  const mapped = rows.map(r => {
    const grossBefore = num(r.grossBefore ?? r.subtotal ?? r.amountBeforeDiscount);
    const discount = num(r.discount ?? r.discountAmount);
    const net = num(r.net ?? (grossBefore - discount));
    return {
      reason: r.reason ?? r.discountReason ?? "",
      day:    r.day ?? r.date ?? "",
      outlet: r.outlet ?? r.outletName ?? "",
      user:   r.user ?? r.userName ?? r.cashier ?? "",
      item:   r.item ?? r.itemName ?? "",
      grossBefore,
      discount,
      net,
      bills:  int(r.bills ?? r.count),
      key:    r.key ?? "",
    };
  });

  const totals = {
    grossBefore: sum(mapped, "grossBefore"),
    discount:    sum(mapped, "discount"),
    net:         sum(mapped, "net"),
    bills:       sum(mapped, "bills"),
  };
  totals.pct = totals.grossBefore > 0 ? totals.discount / totals.grossBefore : 0;

  return { totals, rows: mapped };
}
function num(v) { const n = Number(v || 0); return Number.isFinite(n) ? n : 0; }
function int(v) { const n = parseInt(v ?? 0, 10); return Number.isFinite(n) ? n : 0; }
