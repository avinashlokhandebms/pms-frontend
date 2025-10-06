// src/pages/pos/MoveTable.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import PosSidebar from "../../../components/sidebar/Possidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

export default function MoveTable() {
  const [outlets, setOutlets] = useState([]);
  const [outletId, setOutletId] = useState("");

  const [orders, setOrders] = useState([]);        // OPEN orders for outlet
  const [tables, setTables] = useState([]);        // AVAILABLE tables for outlet

  const [q, setQ] = useState("");
  const [orderId, setOrderId] = useState("");      // order to move
  const [toTableId, setToTableId] = useState("");  // destination table

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  /* -------- Loaders -------- */
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
    setLoading(true); setErr(""); setOk("");

    try {
      const res = await apiFetch(`/api/pos/orders?${new URLSearchParams({ outletId, status: "OPEN" })}`, { auth: true });
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setOrders(list);

      const resT = await apiFetch(`/api/pos/tables?${new URLSearchParams({ outletId, status: "AVAILABLE" })}`, { auth: true });
      const tabs = Array.isArray(resT?.data) ? resT.data : Array.isArray(resT) ? resT : [];
      setTables(tabs);
      if (!toTableId && tabs.length) setToTableId(tabs[0]._id || tabs[0].id || "");
    } catch (e) {
      // Demo fallback
      const demoOrders = [
        demoOrder("o-1001", "POS-1001", { id: "t1", name: "T-01", section: "Indoor" }, [
          demoLine("l1", "Paneer Tikka", 1, 240),
        ]),
        demoOrder("o-1002", "POS-1002", { id: "t3", name: "T-03", section: "Indoor" }, [
          demoLine("l2", "Noodles", 2, 180),
        ]),
      ];
      const demoTables = [
        { _id: "t7", name: "T-07", section: "Indoor", capacity: 2, status: "AVAILABLE" },
        { _id: "t12", name: "T-12", section: "Patio",  capacity: 4, status: "AVAILABLE" },
      ];
      setOrders(demoOrders);
      setTables(demoTables);
      if (!toTableId) setToTableId(demoTables[0]._id);
      setErr(e?.message || "API not reachable, showing demo data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOutlets(); }, []);
  useEffect(() => { loadOrdersAndTables(); }, [outletId]);

  /* -------- Derived -------- */
  const orderById = useMemo(() => {
    const m = new Map();
    orders.forEach(o => m.set(o._id || o.id, o));
    return m;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return orders;
    return orders.filter(o =>
      [o.orderNo, o.table?.name, o.table?.section]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(t))
    );
  }, [orders, q]);

  const selectedOrder = orderById.get(orderId);

  /* -------- Actions -------- */
  const moveOrder = async () => {
    setErr(""); setOk("");
    if (!orderId) return setErr("Select an order to move.");
    if (!toTableId) return setErr("Select a destination table.");

    try {
      await apiFetch("/api/pos/orders/move-table", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ orderId, toTableId }),
      });
      setOk("Order moved to the selected table.");
      setOrderId("");
      await loadOrdersAndTables();
    } catch (e) {
      setErr(e?.message || "Failed to move order.");
    }
  };

  /* -------- Render -------- */
  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <PosSidebar />

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Move Table</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select className="res-select" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
              {outlets.map(o => (
                <option key={o._id || o.id} value={o._id || o.id}>{o.name}</option>
              ))}
            </select>

            <input
              className="res-select"
              placeholder="Search orders by table / section / order no"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: 280 }}
            />

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

        <div className="panel">
          <div className="panel-h">Open Orders</div>
          <div className="panel-b">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 44 }}></th>
                    <th>Order No</th>
                    <th>Table</th>
                    <th>Section</th>
                    <th>Items</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 && (
                    <tr className="no-rows"><td colSpan={6}>No open orders</td></tr>
                  )}
                  {filteredOrders.map(o => {
                    const id = o._id || o.id;
                    const checked = orderId === id;
                    return (
                      <tr key={id} className={checked ? "active" : ""}>
                        <td>
                          <input
                            type="radio"
                            name="sel-order"
                            checked={checked}
                            onChange={() => setOrderId(id)}
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

            {/* Move action */}
            <div className="panel" style={{ marginTop: 12 }}>
              <div className="panel-h">Move To</div>
              <div className="panel-b" style={{ display: "grid", gap: 12 }}>
                {!selectedOrder && (
                  <div className="small" style={{ color: "var(--muted)" }}>
                    Select an order above to choose destination table.
                  </div>
                )}

                {selectedOrder && (
                  <>
                    <div className="small">
                      Moving <strong>{selectedOrder.orderNo || (selectedOrder._id || selectedOrder.id)}</strong> from{" "}
                      <strong>{selectedOrder.table?.name || selectedOrder.tableName}</strong>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <select
                        className="res-select"
                        value={toTableId}
                        onChange={(e) => setToTableId(e.target.value)}
                        title="Destination table"
                      >
                        {tables.map(t => (
                          <option key={t._id || t.id} value={t._id || t.id}>
                            {t.name} • {t.section || "—"} • cap {t.capacity || "-"}
                          </option>
                        ))}
                      </select>

                      <button className="btn" onClick={moveOrder} disabled={loading || !toTableId}>
                        Move Order
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------- Tiny UI bits -------- */
function Banner({ type = "ok", children }) {
  const style = type === "err"
    ? { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }
    : { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
  return <div style={{ ...style, padding: "8px 10px", borderRadius: 10, fontWeight: 700 }}>{children}</div>;
}

/* -------- Helpers / demo -------- */
function sumLines(lines) {
  return (lines || []).reduce((s, l) => s + Number(l.qty || 0) * Number(l.price || l.rate || 0), 0);
}
function demoLine(id, name, qty, price) { return { _id: id, name, qty, price }; }
function demoOrder(id, orderNo, table, items) { return { _id: id, orderNo, table, items, status: "OPEN" }; }
