// src/pages/pos/ZReport.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import PosSidebar, { BackofficeSidebar } from "../../../components/sidebar/Possidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

export default function ZReport() {
  const [date, setDate] = useState(toDateInput(new Date()));
  const [outletId, setOutletId] = useState("");
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // data
  const [report, setReport] = useState(null);

  // quick filters (optional)
  const [q, setQ] = useState("");

  // preload outlet list
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

  // load report
  const loadReport = async () => {
    setLoading(true); setErr("");
    try {
      const params = new URLSearchParams({ date });
      if (outletId) params.set("outletId", outletId);
      const res = await apiFetch(`/api/pos/reports/z?${params.toString()}`, { auth: true });
      setReport(normalizeReport(res));
    } catch (e) {
      setErr(e?.message || "Failed to load Z Report.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReport(); /* eslint-disable-next-line */ }, []);

  const payments = report?.payments || [];
  const categories = useFiltered(report?.categories || [], q, ["name"]);
  const users = useFiltered(report?.users || [], q, ["user"]);
  const hours = report?.hours || [];

  const totals = report?.totals || {};
  const counters = report?.counters || {};

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <PosSidebar />

      <div className="res-wrap">
        {/* Topbar / Filters */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Z Report (End of Day)</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input className="res-select" type="date" value={date} onChange={e => setDate(e.target.value)} />
            <select className="res-select" value={outletId} onChange={e => setOutletId(e.target.value)}>
              <option value="">All Outlets</option>
              {outlets.map(o => <option key={o._id || o.id} value={o._id || o.id}>{o.name}</option>)}
            </select>
            <input
              className="res-select"
              placeholder="Quick filter (category/user)"
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{ minWidth: 220 }}
            />
            <button className="btn" onClick={loadReport} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </button>
            <button className="btn" onClick={() => "exportCSV"(report)} disabled={!report}>Export CSV</button>
            <button className="btn" onClick={() => window.print()} disabled={!report}>Print</button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-h">
            <span>Summary</span>
            <span className="small" style={{ color: "var(--muted)" }}>
              {report ? `Business Date: ${report.businessDate}${report.outlet?.name ? ` — ${report.outlet.name}` : ""}` : ""}
            </span>
          </div>

          <div className="panel-b">
            {err && <Banner type="err">{err}</Banner>}

            {!report && !loading && <div className="small" style={{ color: "var(--muted)" }}>No data.</div>}

            {!!report && (
              <>
                {/* KPI grid */}
                <div className="kpi-grid" style={{ marginBottom: 12 }}>
                  <Kpi icon="💵" label="Gross Sales" value={fmtCur(totals.gross)} />
                  <Kpi icon="🏷️" label="Discounts" value={fmtCur(totals.discount)} />
                  <Kpi icon="🧮" label="Service Charge" value={fmtCur(totals.serviceCharge)} />
                  <Kpi icon="🧾" label="Tax" value={fmtCur(totals.tax)} />
                  <Kpi icon="➖" label="Round Off" value={fmtCur(totals.roundOff)} />
                  <Kpi icon="✅" label="Net Sales" value={fmtCur(totals.net)} primary />
                </div>

                {/* Counters */}
                <div className="kpi-grid" style={{ marginBottom: 12 }}>
                  <Kpi icon="🧾" label="Bills" value={fmtNum(counters.bills)} />
                  <Kpi icon="👥" label="Covers" value={fmtNum(counters.covers)} />
                  <Kpi icon="🍽️" label="Items" value={fmtNum(counters.items)} />
                  <Kpi icon="🚫" label="Voids" value={fmtNum(counters.voids)} />
                  <Kpi icon="↩️" label="Returns" value={fmtNum(counters.returns)} />
                  <Kpi icon="📈" label="Avg / Cover" value={fmtCur(safeDiv(totals.net, counters.covers))} />
                </div>

                {/* Payments */}
                <div className="panel" style={{ marginBottom: 12 }}>
                  <div className="panel-h">Payment Summary</div>
                  <div className="panel-b">
                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Mode</th>
                            <th style={{ textAlign: "right" }}>Amount</th>
                            <th style={{ textAlign: "right" }}>Bills</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.length === 0 && (
                            <tr className="no-rows"><td colSpan={3}>No payments</td></tr>
                          )}
                          {payments.map((p, i) => (
                            <tr key={i}>
                              <td>{p.mode || "—"}</td>
                              <td style={{ textAlign: "right" }}>{fmtCur(p.amount)}</td>
                              <td style={{ textAlign: "right" }}>{fmtNum(p.bills)}</td>
                            </tr>
                          ))}
                          <tr>
                            <td style={{ fontWeight: 800 }}>Total</td>
                            <td style={{ textAlign: "right", fontWeight: 800 }}>{fmtCur(sum(payments, "amount"))}</td>
                            <td style={{ textAlign: "right", fontWeight: 800 }}>{fmtNum(sum(payments, "bills"))}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Category Sales */}
                <div className="panel" style={{ marginBottom: 12 }}>
                  <div className="panel-h">Category Sales</div>
                  <div className="panel-b">
                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th style={{ textAlign: "right" }}>Qty</th>
                            <th style={{ textAlign: "right" }}>Gross</th>
                            <th style={{ textAlign: "right" }}>Net</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categories.length === 0 && (
                            <tr className="no-rows"><td colSpan={4}>No categories</td></tr>
                          )}
                          {categories.map((c, i) => (
                            <tr key={i}>
                              <td>{c.name}</td>
                              <td style={{ textAlign: "right" }}>{fmtNum(c.qty)}</td>
                              <td style={{ textAlign: "right" }}>{fmtCur(c.gross)}</td>
                              <td style={{ textAlign: "right" }}>{fmtCur(c.net)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* User / Cashier breakdown */}
                <div className="panel" style={{ marginBottom: 12 }}>
                  <div className="panel-h">User / Cashier</div>
                  <div className="panel-b">
                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>User</th>
                            <th style={{ textAlign: "right" }}>Bills</th>
                            <th style={{ textAlign: "right" }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.length === 0 && (
                            <tr className="no-rows"><td colSpan={3}>No users</td></tr>
                          )}
                          {users.map((u, i) => (
                            <tr key={i}>
                              <td>{u.user}</td>
                              <td style={{ textAlign: "right" }}>{fmtNum(u.bills)}</td>
                              <td style={{ textAlign: "right" }}>{fmtCur(u.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Hourly analysis */}
                <div className="panel">
                  <div className="panel-h">Hourly Sales</div>
                  <div className="panel-b">
                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Hour</th>
                            <th style={{ textAlign: "right" }}>Bills</th>
                            <th style={{ textAlign: "right" }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hours.length === 0 && (
                            <tr className="no-rows"><td colSpan={3}>No data</td></tr>
                          )}
                          {hours.map((h, i) => (
                            <tr key={i}>
                              <td>{h.hour}</td>
                              <td style={{ textAlign: "right" }}>{fmtNum(h.bills)}</td>
                              <td style={{ textAlign: "right" }}>{fmtCur(h.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}
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
function fmtNum(n) {
  n = Number(n || 0);
  return Number.isFinite(n) ? n.toLocaleString() : "0";
}
function fmtCur(n) {
  n = Number(n || 0);
  return Number.isFinite(n) ? n.toLocaleString(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 2 }) : "₹0.00";
}
function sum(arr, key) {
  return (arr || []).reduce((acc, x) => acc + Number(x?.[key] || 0), 0);
}
function safeDiv(a, b) {
  const A = Number(a || 0), B = Number(b || 0);
  return B ? A / B : 0;
}
function useFiltered(arr, q, keys) {
  return useMemo(() => {
    const term = (q || "").trim().toLowerCase();
    if (!term) return arr || [];
    return (arr || []).filter(r =>
      keys.some(k => String(r?.[k] ?? "").toLowerCase().includes(term))
    );
  }, [arr, q, keys]);
}

/** Normalize any backend shape into what this page expects. */
function normalizeReport(res) {
  // Expected fields with sensible fallbacks
  return {
    businessDate: res?.businessDate || res?.date || "",
    outlet: res?.outlet || null,
    totals: {
      gross: num(res?.totals?.gross || res?.gross),
      discount: num(res?.totals?.discount || res?.discount),
      serviceCharge: num(res?.totals?.serviceCharge || res?.service_charge),
      tax: num(res?.totals?.tax || res?.tax),
      roundOff: num(res?.totals?.roundOff || res?.round_off),
      net: num(res?.totals?.net || res?.net),
    },
    counters: {
      bills: int(res?.counters?.bills || res?.bills),
      covers: int(res?.counters?.covers || res?.covers),
      items: int(res?.counters?.items || res?.items),
      voids: int(res?.counters?.voids || res?.voids),
      returns: int(res?.counters?.returns || res?.returns),
    },
    payments: Array.isArray(res?.payments) ? res.payments : [],
    categories: Array.isArray(res?.categories) ? res.categories : [],
    users: Array.isArray(res?.users) ? res.users : [],
    hours: Array.isArray(res?.hours) ? res.hours : [],
  };
}
function num(v) { const n = Number(v || 0); return Number.isFinite(n) ? n : 0; }
function int(v) { const n = parseInt(v ?? 0, 10); return Number.isFinite(n) ? n : 0; }

/* ---------- Minimal styles (already covered by your CSS, kept here for safety) ---------- */
// .kpi-grid expects display:grid in your global css; leaving layout to commanPage.css
