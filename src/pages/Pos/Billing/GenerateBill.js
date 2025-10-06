// src/pages/pos/GenerateBill.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import PosSidebar from "../../../components/sidebar/Possidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

/**
 * Generate Bill
 * - Left: open orders list (filterable)
 * - Right: order details + totals + payment rows
 * - Actions: Generate Bill (POST), Print toggle, Email receipt toggle
 */

const DEFAULT_PMTS = [{ mode: "CASH", amount: 0 }];

export default function GenerateBill() {
  // filters / lookups
  const [outlets, setOutlets] = useState([]);
  const [outletId, setOutletId] = useState("");
  const [q, setQ] = useState("");

  // open orders & selection
  const [orders, setOrders] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [order, setOrder] = useState(null);

  // ui state
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  // payments
  const [payments, setPayments] = useState(DEFAULT_PMTS);
  const [emailReceipt, setEmailReceipt] = useState(false);
  const [printImmediately, setPrintImmediately] = useState(true);

  // discount overrides (optional)
  const [discPct, setDiscPct] = useState("");
  const [discFlat, setDiscFlat] = useState("");

  /* ---------- load outlets ---------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/api/pos/outlets", { auth: true });
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setOutlets(list);
        if (list.length && !outletId) setOutletId(list[0]._id || list[0].id || "");
      } catch {
        // fallback demo
        const demo = [{ _id: "o1", name: "Main Restaurant" }, { _id: "o2", name: "Rooftop" }];
        setOutlets(demo);
        if (!outletId) setOutletId("o1");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- load open orders ---------- */
  const loadOpenOrders = async () => {
    if (!outletId) return;
    setLoading(true); setErr(""); setOk("");
    try {
      const params = new URLSearchParams({ outletId, q });
      const res = await apiFetch(`/api/pos/open-orders?${params.toString()}`, { auth: true });
      const list = res?.data || res?.items || res || [];
      setOrders(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e?.message || "Failed to load orders. Showing demo data.");
      setOrders(demoOrders());
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadOpenOrders(); /* eslint-disable-next-line */ }, [outletId]);

  /* ---------- load order details when selected ---------- */
  useEffect(() => {
    (async () => {
      setOrder(null);
      setPayments(DEFAULT_PMTS);
      setDiscPct(""); setDiscFlat("");

      if (!selectedId) return;
      setErr(""); setOk("");
      try {
        const res = await apiFetch(`/api/pos/orders/${selectedId}`, { auth: true });
        setOrder(res?.data || res);
      } catch (e) {
        setErr(e?.message || "Failed to load order, using demo.");
        const d = demoOrders().find(x => (x._id || x.id) === selectedId);
        setOrder(d || null);
      }
    })();
  }, [selectedId]);

  /* ---------- totals ---------- */
  const totals = useMemo(() => {
    if (!order) return emptyTotals();
    return computeTotals(order, discPct, discFlat);
  }, [order, discPct, discFlat]);

  const paid = useMemo(() => sumPayments(payments), [payments]);
  const due = Math.max(0, round2(totals.grandTotal - paid));
  const change = Math.max(0, round2(paid - totals.grandTotal));

  /* ---------- actions ---------- */
  const generateBill = async () => {
    if (!order) return;
    if (due > 0) { setErr("Payment is incomplete."); return; }
    setBusy(true); setErr(""); setOk("");
    try {
      const payload = {
        payments: payments.filter(p => Number(p.amount) > 0),
        discountPct: discPct ? Number(discPct) : undefined,
        discountFlat: discFlat ? Number(discFlat) : undefined,
        emailReceipt: !!emailReceipt,
        print: !!printImmediately,
      };
      const res = await apiFetch(`/api/pos/orders/${order._id || order.id}/generate-bill`, {
        method: "POST", auth: true, body: JSON.stringify(payload),
      });
      const billNo = res?.bill?.number || res?.billNo || "BILL";
      setOk(`Bill generated: ${billNo}`);
      // refresh left list & clear selection
      await loadOpenOrders();
      setSelectedId("");
      setOrder(null);
      setPayments(DEFAULT_PMTS);
    } catch (e) {
      setErr(e?.message || "Failed to generate bill.");
    } finally {
      setBusy(false);
    }
  };

  const addPayment = () => setPayments(prev => [...prev, { mode: "CASH", amount: 0, ref: "" }]);
  const editPayment = (idx, patch) => setPayments(prev => {
    const next = prev.slice(); next[idx] = { ...next[idx], ...patch }; return next;
  });
  const removePayment = (idx) => setPayments(prev => prev.filter((_, i) => i !== idx));

  /* ---------- render ---------- */
  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <PosSidebar />

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Generate Bill</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select className="res-select" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
              {outlets.map(o => <option key={o._id || o.id} value={o._id || o.id}>{o.name}</option>)}
            </select>
            <input
              className="res-select"
              placeholder="Search (order / table / guest)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadOpenOrders()}
              style={{ minWidth: 240 }}
            />
            <button className="btn" onClick={loadOpenOrders} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>

        {(err || ok) && (
          <div style={{ marginBottom: 10 }}>
            {err && <Banner type="err">{err}</Banner>}
            {ok && <Banner type="ok">{ok}</Banner>}
          </div>
        )}

        <div className="gb-grid">
          {/* Left: Orders list */}
          <div className="panel">
            <div className="panel-h">Open Orders</div>
            <div className="panel-b" style={{ padding: 0 }}>
              <div className="order-list">
                {orders.length === 0 && (
                  <div className="no-rows" style={{ padding: 12 }}>No open orders</div>
                )}
                {orders.map(o => {
                  const id = o._id || o.id;
                  const active = selectedId === id;
                  return (
                    <button
                      key={id}
                      className={"order-row" + (active ? " active" : "")}
                      onClick={() => setSelectedId(id)}
                      title={`Server: ${o.userName || "—"}`}
                    >
                      <div className="order-row-l">
                        <div className="order-no">#{o.orderNo || id}</div>
                        <div className="order-meta small">
                          {o.table?.name || o.tableName || "—"} • {fmtTime(o.createdAt)}
                        </div>
                      </div>
                      <div className="order-row-r small">{fmtAmount(o.netTotal || o.total || o.amount || 0)}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Details & payment */}
          <div className="panel">
            <div className="panel-h">Order Details</div>
            <div className="panel-b">
              {!order && (
                <div className="no-rows">Select an order from the left to proceed.</div>
              )}

              {order && (
                <div className="gb-detail">
                  {/* Header */}
                  <div className="gb-head">
                    <div>
                      <div className="kds-title" style={{ marginBottom: 4 }}>
                        <span className="kds-order">#{order.orderNo || (order._id || order.id)}</span>
                        <span className="kds-table">{order.table?.name || order.tableName || "—"}</span>
                      </div>
                      <div className="small" style={{ color: "var(--muted)" }}>
                        {order.guestName || "—"} • {fmtTime(order.createdAt)} • {order.userName || "—"}
                      </div>
                    </div>
                    <span className="small" style={{ color: "var(--muted)" }}>
                      {order.items?.length || 0} items
                    </span>
                  </div>

                  {/* Items */}
                  <div className="table-wrap" style={{ marginTop: 8 }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th style={{ width: 40 }}>#</th>
                          <th>Item</th>
                          <th style={{ width: 60, textAlign: "right" }}>Qty</th>
                          <th style={{ width: 100, textAlign: "right" }}>Rate</th>
                          <th style={{ width: 100, textAlign: "right" }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items?.map((it, i) => {
                          const qty = Number(it.qty || 1);
                          const rate = Number(it.rate || it.price || 0);
                          const amt = round2(qty * rate);
                          return (
                            <tr key={i}>
                              <td>{i + 1}</td>
                              <td>
                                <div style={{ fontWeight: 800 }}>{it.name}</div>
                                {(it.notes || it.remarks) && (
                                  <div className="small" style={{ color: "#6b7280" }}>{it.notes || it.remarks}</div>
                                )}
                              </td>
                              <td style={{ textAlign: "right" }}>{qty}</td>
                              <td style={{ textAlign: "right" }}>{fmtAmount(rate)}</td>
                              <td style={{ textAlign: "right" }}>{fmtAmount(amt)}</td>
                            </tr>
                          );
                        })}
                        {(!order.items || order.items.length === 0) && (
                          <tr className="no-rows"><td colSpan={5}>No items</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Discount overrides (optional) */}
                  <div className="panel mini" style={{ marginTop: 10 }}>
                    <div className="panel-h">Discount (optional override)</div>
                    <div className="panel-b" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <label className="small" style={{ display: "grid", gap: 6 }}>
                        <span>Percent (%)</span>
                        <input className="input" type="number" min="0" step="0.1" value={discPct}
                          onChange={(e) => setDiscPct(e.target.value)} placeholder={order.discountPct ? String(order.discountPct) : "0"} />
                      </label>
                      <label className="small" style={{ display: "grid", gap: 6 }}>
                        <span>Flat (₹)</span>
                        <input className="input" type="number" min="0" step="0.01" value={discFlat}
                          onChange={(e) => setDiscFlat(e.target.value)} placeholder={order.discountFlat ? String(order.discountFlat) : "0"} />
                      </label>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="gb-totals">
                    <Line label="Sub Total" value={totals.subtotal} />
                    <Line label="Service Charge" value={totals.serviceCharge} />
                    <Line label="Tax" value={totals.taxTotal} />
                    {totals.discount > 0 && <Line label="Discount" value={-totals.discount} />}
                    <Line label="Round Off" value={totals.roundOff} />
                    <Line label="Grand Total" value={totals.grandTotal} bold />
                  </div>

                  {/* Payments */}
                  <div className="panel mini" style={{ marginTop: 10 }}>
                    <div className="panel-h">Payment</div>
                    <div className="panel-b" style={{ display: "grid", gap: 10 }}>
                      {payments.map((p, idx) => (
                        <div key={idx} className="pay-row">
                          <select
                            className="res-select"
                            value={p.mode}
                            onChange={(e) => editPayment(idx, { mode: e.target.value })}
                          >
                            {["CASH", "CARD", "UPI", "WALLET", "BANK", "OTHER"].map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                          <input
                            className="input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={p.amount}
                            onChange={(e) => editPayment(idx, { amount: Number(e.target.value || 0) })}
                            placeholder="Amount"
                          />
                          <input
                            className="input"
                            value={p.ref || ""}
                            onChange={(e) => editPayment(idx, { ref: e.target.value })}
                            placeholder="Ref / Txn ID (optional)"
                          />
                          <button className="btn" onClick={() => removePayment(idx)} disabled={payments.length <= 1}>Remove</button>
                        </div>
                      ))}
                      <div>
                        <button className="btn" onClick={addPayment}>+ Add Payment Row</button>
                        <button
                          className="btn"
                          style={{ marginLeft: 8 }}
                          onClick={() => setPayments([{ mode: "CASH", amount: totals.grandTotal }])}
                        >
                          Pay Full (Cash)
                        </button>
                      </div>

                      <div className="pay-sum">
                        <span>Paid</span><b>{fmtAmount(paid)}</b>
                        <span>Due</span><b>{fmtAmount(due)}</b>
                        <span>Change</span><b>{fmtAmount(change)}</b>
                      </div>

                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <label className="small" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <input type="checkbox" checked={emailReceipt} onChange={(e) => setEmailReceipt(e.target.checked)} />
                          Email receipt to guest
                        </label>
                        <label className="small" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <input type="checkbox" checked={printImmediately} onChange={(e) => setPrintImmediately(e.target.checked)} />
                          Print immediately
                        </label>
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <button className="btn" onClick={generateBill} disabled={!order || busy || due > 0}>
                          {busy ? "Generating…" : "Generate Bill"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Inline CSS scoped for this page */}
      <Style />
    </div>
  );
}

/* ---------- atoms ---------- */
function Line({ label, value, bold }) {
  return (
    <div className={"gb-line" + (bold ? " bold" : "")}>
      <span>{label}</span>
      <span>{fmtAmount(value)}</span>
    </div>
  );
}

function Banner({ type = "ok", children }) {
  const style = type === "err"
    ? { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }
    : { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
  return (
    <div style={{ ...style, padding: "8px 10px", borderRadius: 10, fontWeight: 700 }}>
      {children}
    </div>
  );
}

function Style() {
  const css = `
  .gb-grid { display: grid; gap: 12px; grid-template-columns: minmax(260px, 340px) 1fr; }
  @media (max-width: 1024px) { .gb-grid { grid-template-columns: 1fr; } }
  .order-list { display: grid; }
  .order-row { all: unset; cursor: pointer; padding: 10px 12px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between; }
  .order-row:hover { background: #f9fafb; }
  .order-row.active { background: #eef2ff; }
  .order-no { font-weight: 900; }
  .order-meta { color: #64748b; }
  .gb-detail { display: grid; gap: 10px; }
  .gb-head { display: flex; align-items: center; justify-content: space-between; }
  .kds-title { font-weight: 900; display: flex; gap: 10px; align-items: baseline; }
  .kds-order { font-size: 1.05rem; }
  .kds-table { background: #f3f4f6; border-radius: 999px; padding: .05rem .5rem; font-size: .75rem; font-weight: 800; }
  .gb-totals { margin-top: 8px; border: 1px dashed #e5e7eb; border-radius: 10px; padding: 8px; }
  .gb-line { display: flex; justify-content: space-between; padding: 4px 2px; }
  .gb-line.bold { font-weight: 900; border-top: 1px solid #e5e7eb; margin-top: 6px; padding-top: 8px; }
  .panel.mini { border: 1px solid #e5e7eb; }
  .pay-row { display: grid; gap: 8px; grid-template-columns: 140px 1fr 1fr auto; align-items: center; }
  @media (max-width: 720px) { .pay-row { grid-template-columns: 1fr; } }
  .pay-sum { display: grid; grid-template-columns: auto auto auto auto auto auto; gap: 10px; align-items: center; justify-content: end; }
  @media (max-width: 720px) { .pay-sum { justify-content: start; } }
  `;
  if (typeof document !== "undefined" && !document.getElementById("gen-bill-css")) {
    const el = document.createElement("style");
    el.id = "gen-bill-css"; el.innerHTML = css; document.head.appendChild(el);
  }
  return null;
}

/* ---------- helpers ---------- */
function computeTotals(order, discPctOverride, discFlatOverride) {
  const items = Array.isArray(order.items) ? order.items : [];
  // try use given totals if present
  const givenSubtotal = num(order.subtotal || order.subTotal);
  const givenTax = num(order.taxTotal || order.tax || 0);
  const givenSvc = num(order.serviceCharge || 0);
  const givenDiscount = num(order.discount || order.discountAmount || 0);
  const givenRound = num(order.roundOff || 0);
  const givenGrand = num(order.grandTotal || order.netTotal || order.total);

  let subtotal;
  if (givenSubtotal) {
    subtotal = givenSubtotal;
  } else {
    subtotal = items.reduce((n, it) => n + num(it.qty) * num(it.rate || it.price), 0);
  }

  let taxTotal = givenTax;
  if (!taxTotal) {
    taxTotal = items.reduce((n, it) => {
      const line = num(it.qty) * num(it.rate || it.price);
      const pct = num(it.taxPct || it.gstPct);
      return n + round2((line * pct) / 100);
    }, 0);
  }

  let serviceCharge = givenSvc;
  if (!serviceCharge && order.serviceChargePct) {
    serviceCharge = round2((subtotal * num(order.serviceChargePct)) / 100);
  }

  // discount override
  let discount = (discFlatOverride ? num(discFlatOverride) : givenDiscount) || 0;
  const pct = discPctOverride ? num(discPctOverride) : num(order.discountPct || 0);
  if (pct) discount = round2((subtotal * pct) / 100) + discount;

  const gross = Math.max(0, subtotal + serviceCharge + taxTotal - discount);
  const grandRaw = givenGrand || gross;
  // prefer recalc when overrides present
  const base = (discPctOverride || discFlatOverride) ? gross : grandRaw;
  const grand = round2(base);
  const roundOff = round2(grand - base); // usually 0 when already rounded

  return { subtotal: round2(subtotal), serviceCharge, taxTotal: round2(taxTotal), discount: round2(discount), roundOff, grandTotal: grand };
}
function emptyTotals() {
  return { subtotal: 0, serviceCharge: 0, taxTotal: 0, discount: 0, roundOff: 0, grandTotal: 0 };
}
function num(v) { const n = Number(v || 0); return Number.isFinite(n) ? n : 0; }
function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
function fmtAmount(n) { return (Number(n) || 0).toLocaleString(undefined, { style: "currency", currency: "INR", minimumFractionDigits: 2 }); }
function fmtTime(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(dt) ? "—" : dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
function sumPayments(pmts) { return round2((pmts || []).reduce((n, p) => n + Number(p.amount || 0), 0)); }

/* ---------- demo data ---------- */
function demoOrders() {
  const now = Date.now();
  return [
    {
      _id: "o-101", orderNo: "POS-101", tableName: "T-01", userName: "Sam", createdAt: new Date(now - 12 * 60000).toISOString(),
      items: [
        { name: "Paneer Tikka", qty: 1, rate: 260, taxPct: 5 },
        { name: "Butter Naan", qty: 2, rate: 60, taxPct: 5 },
      ],
      discountPct: 0, serviceChargePct: 5,
    },
    {
      _id: "o-102", orderNo: "POS-102", tableName: "T-04", userName: "Asha", createdAt: new Date(now - 6 * 60000).toISOString(),
      items: [
        { name: "Dal Makhani", qty: 1, rate: 220, taxPct: 5 },
        { name: "Jeera Rice", qty: 1, rate: 160, taxPct: 5 },
        { name: "Masala Papad", qty: 1, rate: 80, taxPct: 5 },
      ],
      discountPct: 10, serviceChargePct: 0,
    },
  ];
}
