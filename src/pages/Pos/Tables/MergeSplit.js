// src/pages/pos/MergeSplit.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import PosSidebar from "../../../components/sidebar/Possidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

export default function MergeSplit() {
  const [tab, setTab] = useState("MERGE"); // MERGE | SPLIT
  const [outlets, setOutlets] = useState([]);
  const [outletId, setOutletId] = useState("");

  // open orders + available tables for destination
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // ---- MERGE state ----
  const [selected, setSelected] = useState([]); // orderIds to merge
  const [target, setTarget] = useState(""); // target orderId

  // ---- SPLIT state ----
  const [orderId, setOrderId] = useState(""); // order to split
  const [splitMap, setSplitMap] = useState({}); // {lineId: qtyToSplit}
  const [destType, setDestType] = useState("NEW_ORDER_SAME_TABLE"); // NEW_ORDER_SAME_TABLE | NEW_ORDER_NEW_TABLE
  const [destTableId, setDestTableId] = useState("");

  /* ---------- Loaders ---------- */
  const loadOutlets = async () => {
    try {
      const res = await apiFetch("/api/pos/outlets", { auth: true });
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setOutlets(list);
      if (list.length && !outletId) setOutletId(list[0]._id || list[0].id || "");
    } catch {
      const demo = [{ _id: "o1", name: "Main Restaurant" }, { _id: "o2", name: "Rooftop" }];
      setOutlets(demo);
      if (!outletId) setOutletId("o1");
    }
  };

  const loadOrdersAndTables = async () => {
    if (!outletId) return;
    setLoading(true);
    setErr(""); setOk("");
    try {
      const qs = new URLSearchParams({ outletId, status: "OPEN" });
      const res = await apiFetch(`/api/pos/orders?${qs}`, { auth: true });

      // normalize
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setOrders(list);

      // tables for potential destination
      const resT = await apiFetch(`/api/pos/tables?outletId=${outletId}&status=AVAILABLE`, { auth: true });
      const tabs = Array.isArray(resT?.data) ? resT.data : Array.isArray(resT) ? resT : [];
      setTables(tabs);
      if (!destTableId && tabs.length) setDestTableId(tabs[0]._id || tabs[0].id || "");
    } catch (e) {
      // demo fallback data
      setOrders([
        demoOrder("A101", "POS-1001", "Indoor", [
          demoLine("l1", "Paneer Tikka", 2, 240),
          demoLine("l2", "Butter Naan", 4, 60),
        ]),
        demoOrder("A102", "POS-1002", "Indoor", [
          demoLine("l3", "Veg Biryani", 1, 320),
          demoLine("l4", "Raita", 1, 70),
        ]),
        demoOrder("A201", "POS-1003", "Patio", [
          demoLine("l5", "Margherita Pizza", 1, 450),
        ]),
      ]);
      const demoTables = [
        { _id: "t9", name: "T-09", capacity: 2, section: "Patio", status: "AVAILABLE" },
        { _id: "t10", name: "T-10", capacity: 4, section: "Indoor", status: "AVAILABLE" },
      ];
      setTables(demoTables);
      if (!destTableId) setDestTableId(demoTables[0]._id);
      setErr(e?.message || "API not available, showing demo data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOutlets(); }, []);
  useEffect(() => { loadOrdersAndTables(); }, [outletId]);

  /* ---------- Derived ---------- */
  const orderById = useMemo(() => {
    const m = new Map();
    orders.forEach(o => m.set(o._id || o.id, o));
    return m;
  }, [orders]);

  const selectedOrders = useMemo(
    () => selected.map(id => orderById.get(id)).filter(Boolean),
    [selected, orderById]
  );

  const mergeTotal = useMemo(() => {
    const all = selectedOrders.flatMap(o => o.items || []);
    return sumLines(all);
  }, [selectedOrders]);

  const splitSource = orderById.get(orderId);

  const splitPreview = useMemo(() => {
    if (!splitSource) return { moving: [], keep: [], movingTotal: 0, keepTotal: 0 };
    const moving = (splitSource.items || [])
      .map(l => ({ ...l, qty: Math.min(Math.max(Number(splitMap[l._id] || 0), 0), l.qty) }))
      .filter(l => l.qty > 0);
    const keep = (splitSource.items || [])
      .map(l => ({ ...l, qty: Math.max(l.qty - (Number(splitMap[l._id] || 0) || 0), 0) }))
      .filter(l => l.qty > 0);
    return {
      moving,
      keep,
      movingTotal: sumLines(moving),
      keepTotal: sumLines(keep),
    };
  }, [splitSource, splitMap]);

  /* ---------- Actions ---------- */
  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    if (!target) setTarget(id);
  };

  const doMerge = async () => {
    setErr(""); setOk("");
    if (selected.length < 2) return setErr("Pick at least two orders to merge.");
    if (!target || !selected.includes(target)) return setErr("Select a valid target order.");

    const others = selected.filter(id => id !== target);
    if (!others.length) return setErr("Select at least one source order besides the target.");

    try {
      const res = await apiFetch("/api/pos/orders/merge", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ orderIds: selected, targetOrderId: target }),
      });
      setOk("Orders merged.");
      // Refresh
      await loadOrdersAndTables();
      setSelected([]); setTarget("");
    } catch (e) {
      setErr(e?.message || "Merge failed.");
    }
  };

  const doSplit = async () => {
    setErr(""); setOk("");
    if (!orderId) return setErr("Choose an order to split.");
    if (!splitPreview.moving?.length) return setErr("Pick at least one line/qty to move.");

    const payload = {
      orderId,
      lines: splitPreview.moving.map(l => ({ lineId: l._id || l.id, qty: l.qty })),
      destination:
        destType === "NEW_ORDER_NEW_TABLE"
          ? { type: "NEW_ORDER_NEW_TABLE", tableId: destTableId }
          : { type: "NEW_ORDER_SAME_TABLE" },
    };

    try {
      await apiFetch("/api/pos/orders/split", {
        method: "POST",
        auth: true,
        body: JSON.stringify(payload),
      });
      setOk("Order split created.");
      // Reset
      setSplitMap({});
      await loadOrdersAndTables();
    } catch (e) {
      setErr(e?.message || "Split failed.");
    }
  };

  /* ---------- Render ---------- */
  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <PosSidebar />

      <div className="res-wrap">
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Merge / Split Orders</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select className="res-select" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
              {outlets.map(o => <option key={o._id || o.id} value={o._id || o.id}>{o.name}</option>)}
            </select>

            <div className="tabs">
              <button className={"btn" + (tab === "MERGE" ? " btn-dark" : "")} onClick={() => setTab("MERGE")}>Merge</button>
              <button className={"btn" + (tab === "SPLIT" ? " btn-dark" : "")} onClick={() => setTab("SPLIT")}>Split</button>
            </div>

            <button className="btn" onClick={loadOrdersAndTables} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {(err || ok) && (
          <div style={{ marginBottom: 10 }}>
            {err && <Banner type="err">{err}</Banner>}
            {ok && <Banner type="ok">{ok}</Banner>}
          </div>
        )}

        {/* ------------ MERGE ------------ */}
        {tab === "MERGE" && (
          <div className="panel">
            <div className="panel-h">Merge Orders (keep everything in the target order)</div>
            <div className="panel-b" style={{ display: "grid", gap: 12 }}>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}></th>
                      <th>Target</th>
                      <th>Order No</th>
                      <th>Table</th>
                      <th>Section</th>
                      <th>Items</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 && (
                      <tr className="no-rows"><td colSpan={7}>No open orders</td></tr>
                    )}
                    {orders.map(o => {
                      const id = o._id || o.id;
                      const isSel = selected.includes(id);
                      return (
                        <tr key={id}>
                          <td>
                            <input type="checkbox" checked={isSel} onChange={() => toggleSelect(id)} />
                          </td>
                          <td>
                            <input
                              type="radio"
                              name="merge-target"
                              disabled={!isSel}
                              checked={target === id}
                              onChange={() => setTarget(id)}
                              title="Target order (will keep this order id)"
                            />
                          </td>
                          <td>{o.orderNo || id}</td>
                          <td>{o.table?.name || o.tableName || "—"}</td>
                          <td>{o.table?.section || o.section || "—"}</td>
                          <td>{(o.items || []).length}</td>
                          <td>₹ {sumLines(o.items || []).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary of what will result */}
              {selected.length > 0 && (
                <div className="panel" style={{ marginTop: 8 }}>
                  <div className="panel-h">Preview</div>
                  <div className="panel-b">
                    <div className="small" style={{ marginBottom: 6 }}>
                      Selected: <strong>{selected.length}</strong> • Target:{" "}
                      <strong>{orderById.get(target)?.orderNo || target || "—"}</strong>
                    </div>
                    <div className="small">
                      Combined total of selected orders: <strong>₹ {mergeTotal.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button className="btn" onClick={() => { setSelected([]); setTarget(""); }}>Clear</button>
                <button className="btn" onClick={doMerge} disabled={loading || selected.length < 2}>Merge Orders</button>
              </div>
            </div>
          </div>
        )}

        {/* ------------ SPLIT ------------ */}
        {tab === "SPLIT" && (
          <div className="panel">
            <div className="panel-h">Split Order (move selected quantities to a new order)</div>
            <div className="panel-b" style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select
                  className="res-select"
                  value={orderId}
                  onChange={(e) => { setOrderId(e.target.value); setSplitMap({}); }}
                >
                  <option value="">Select an order…</option>
                  {orders.map(o => (
                    <option key={o._id || o.id} value={o._id || o.id}>
                      {(o.orderNo || o._id || o.id)} • {o.table?.name || o.tableName}
                    </option>
                  ))}
                </select>

                <select
                  className="res-select"
                  value={destType}
                  onChange={(e) => setDestType(e.target.value)}
                >
                  <option value="NEW_ORDER_SAME_TABLE">New order on same table</option>
                  <option value="NEW_ORDER_NEW_TABLE">New order on another table…</option>
                </select>

                {destType === "NEW_ORDER_NEW_TABLE" && (
                  <select
                    className="res-select"
                    value={destTableId}
                    onChange={(e) => setDestTableId(e.target.value)}
                  >
                    {tables.map(t => (
                      <option key={t._id || t.id} value={t._id || t.id}>
                        {t.name} • {t.section || "—"} • cap {t.capacity || "-"}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Lines */}
              {!splitSource && <div className="small" style={{ color: "var(--muted)" }}>Pick an order to split.</div>}
              {splitSource && (
                <>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th style={{ width: 80, textAlign: "right" }}>Qty</th>
                          <th style={{ width: 120, textAlign: "right" }}>Rate</th>
                          <th style={{ width: 120, textAlign: "right" }}>Move Qty</th>
                          <th style={{ width: 120, textAlign: "right" }}>Line Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(splitSource.items || []).map(l => {
                          const lineId = l._id || l.id;
                          const moveQty = Number(splitMap[lineId] || 0);
                          return (
                            <tr key={lineId}>
                              <td>{l.name}</td>
                              <td style={{ textAlign: "right" }}>{l.qty}</td>
                              <td style={{ textAlign: "right" }}>₹ {Number(l.price || l.rate || 0).toFixed(2)}</td>
                              <td style={{ textAlign: "right" }}>
                                <input
                                  className="input"
                                  type="number"
                                  min="0"
                                  max={l.qty}
                                  value={moveQty}
                                  onChange={(e) => setSplitMap(s => ({ ...s, [lineId]: clamp(Number(e.target.value || 0), 0, l.qty) }))}
                                  style={{ width: 90, textAlign: "right" }}
                                />
                              </td>
                              <td style={{ textAlign: "right" }}>
                                ₹ {(Number(l.price || l.rate || 0) * moveQty).toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="panel">
                    <div className="panel-h">Preview</div>
                    <div className="panel-b small" style={{ display: "grid", gap: 6 }}>
                      <div>
                        Moving lines: <strong>{splitPreview.moving.length}</strong> •
                        Total: <strong>₹ {splitPreview.movingTotal.toFixed(2)}</strong>
                      </div>
                      <div>
                        Remaining on original: <strong>{splitPreview.keep.length}</strong> •
                        Total: <strong>₹ {splitPreview.keepTotal.toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <button className="btn" onClick={() => setSplitMap({})}>Clear</button>
                    <button className="btn" onClick={doSplit} disabled={loading || !splitPreview.moving.length}>
                      Create Split
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Small UI bits ---------- */
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

/* ---------- Helpers / demo ---------- */
function sumLines(lines) {
  return (lines || []).reduce((s, l) => s + Number(l.qty || 0) * Number(l.price || l.rate || 0), 0);
}
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function demoLine(id, name, qty, price) { return { _id: id, name, qty, price }; }
function demoOrder(tableName, orderNo, section, lines) {
  return {
    _id: "o_" + orderNo,
    orderNo,
    table: { id: "t_" + tableName, name: tableName, section },
    items: lines,
    status: "OPEN",
  };
}
