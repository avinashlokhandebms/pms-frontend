// src/pages/pos/RunningOrders.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import PosSidebar from "../../components/sidebar/Possidebar";
import "../../components/sidebar/Sidebar.css";
import "../../assets/css/commanPage.css";

const REFRESH_SEC = 10;

export default function RunningOrders() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL"); // ALL | OPEN | PREPARING | SERVED | BILLED | HOLD
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [busyId, setBusyId] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams();
      // If your API supports a running flag, prefer that:
      params.set("running", "1");
      if (status !== "ALL") params.set("status", status);

      const res = await apiFetch(`/api/pos/orders?${params.toString()}`, { auth: true });
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

      // Fallback to filter out settled/cancelled locally
      const filtered = list.filter(
        (o) => !["SETTLED", "CANCELLED", "VOID"].includes((o.status || "").toUpperCase())
      );

      setRows(filtered);
    } catch (e) {
      setErr(e?.message || "Failed to load orders.");
      // Demo data fallback
      setRows([
        {
          _id: "ord1",
          orderNo: "POS-00123",
          table: "T-04",
          token: "12",
          customer: { name: "Walk-in" },
          items: [
            { name: "Cappuccino", qty: 2, rate: 160 },
            { name: "Fries", qty: 1, rate: 120 },
          ],
          subTotal: 440,
          discountPct: 0,
          taxPct: 5,
          taxAmt: 22,
          grandTotal: 462,
          status: "PREPARING",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          _id: "ord2",
          orderNo: "POS-00124",
          table: "T-05",
          token: "13",
          customer: { name: "John D." },
          items: [{ name: "Pasta", qty: 1, rate: 260 }],
          subTotal: 260,
          discountPct: 0,
          taxPct: 5,
          taxAmt: 13,
          grandTotal: 273,
          status: "OPEN",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // first load + polling
  useEffect(() => {
    let stop = false;
    (async () => { if (!stop) await load(); })();
    const t = setInterval(load, REFRESH_SEC * 1000);
    return () => { stop = true; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // client search
  const data = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [
        r.orderNo,
        r.table,
        r.token,
        r?.customer?.name,
        ...(r.items || []).map((i) => i.name),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  const openDetail = (row) => { setSelected(row); setShowDetail(true); };

  /* -------- actions -------- */
  const patchOrder = async (id, body) => {
    setBusyId(id);
    try {
      const updated = await apiFetch(`/api/pos/orders/${id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify(body),
      });
      // merge
      setRows((prev) => prev.map((r) => (r._id === id ? { ...r, ...updated } : r)));
    } catch (e) {
      alert(e?.message || "Action failed.");
    } finally {
      setBusyId("");
    }
  };

  const printKOT = async (id) => {
    setBusyId(id);
    try {
      await apiFetch(`/api/pos/orders/${id}/print-kot`, { method: "POST", auth: true });
      alert("KOT sent to printer.");
    } catch (e) {
      alert(e?.message || "Failed to print KOT.");
    } finally { setBusyId(""); }
  };

  const printBill = async (id) => {
    setBusyId(id);
    try {
      await apiFetch(`/api/pos/orders/${id}/print-bill`, { method: "POST", auth: true });
      alert("Bill sent to printer.");
    } catch (e) {
      alert(e?.message || "Failed to print bill.");
    } finally { setBusyId(""); }
  };

  const markServed = (id) => patchOrder(id, { status: "SERVED" });
  const settleOrder = (id) => patchOrder(id, { status: "BILLED" });
  const cancelOrder = async (id) => {
    const reason = prompt("Cancel reason?");
    if (!reason) return;
    await patchOrder(id, { status: "CANCELLED", cancelReason: reason });
    // remove from running list
    setRows((prev) => prev.filter((r) => r._id !== id));
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <PosSidebar />

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Running Orders</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="res-select"
              placeholder="Search order / table / item / guest…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: 280 }}
            />
            <select
              className="res-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              title="Status filter"
            >
              {["ALL", "OPEN", "PREPARING", "SERVED", "BILLED", "HOLD"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button className="btn" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
          </div>
        </div>

        {/* Table */}
        <div className="panel">
          <div className="panel-h">
            <span>Active tickets</span>
            <span className="small" style={{ color: "var(--muted)" }}>
              {loading ? "Loading…" : `${data.length} orders`}
            </span>
          </div>
          <div className="panel-b">
            {err && <Banner type="err">{err}</Banner>}

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 220 }}>Action</th>
                    <th>Order #</th>
                    <th>Table / Token</th>
                    <th>Guest</th>
                    <th style={{ textAlign: "right" }}>Items</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                    <th>Status</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 && !loading && (
                    <tr className="no-rows"><td colSpan={8}>No running orders</td></tr>
                  )}

                  {data.map((r) => {
                    const id = r._id || r.id;
                    const itemsCnt = (r.items || []).reduce((s, i) => s + Number(i.qty || 0), 0);
                    return (
                      <tr key={id}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="btn" style={btnSm} onClick={() => openDetail(r)}>View</button>
                          <button className="btn" style={btnSm} disabled={busyId === id} onClick={() => printKOT(id)}>KOT</button>
                          <button className="btn" style={btnSm} disabled={busyId === id} onClick={() => markServed(id)}>Serve</button>
                          <button className="btn" style={btnSm} disabled={busyId === id} onClick={() => printBill(id)}>Bill</button>
                          <button className="btn" style={btnSm} disabled={busyId === id} onClick={() => settleOrder(id)}>Settle</button>
                          <button className="btn" style={btnSm} disabled={busyId === id} onClick={() => cancelOrder(id)}>Cancel</button>
                        </td>
                        <td>{r.orderNo || id.slice(-6).toUpperCase()}</td>
                        <td>{r.table || (r.token ? `Token ${r.token}` : "—")}</td>
                        <td>{r?.customer?.name || "Walk-in"}</td>
                        <td style={{ textAlign: "right" }}>{itemsCnt}</td>
                        <td style={{ textAlign: "right" }}>₹ {Number(r.grandTotal ?? r.subTotal ?? 0).toFixed(2)}</td>
                        <td><StatusPill value={r.status} /></td>
                        <td>{fmtDateTime(r.updatedAt || r.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="small" style={{ color: "var(--muted)", marginTop: 6 }}>
              Auto-refresh every {REFRESH_SEC}s.
            </div>
          </div>
        </div>
      </div>

      {showDetail && selected && (
        <OrderDetailModal
          order={selected}
          onClose={() => { setShowDetail(false); setSelected(null); }}
        />
      )}
    </div>
  );
}

/* ---------- Detail Modal ---------- */
function OrderDetailModal({ order, onClose }) {
  const items = order?.items || [];
  return (
    <Modal title={`Order ${order?.orderNo || order?._id?.slice(-6) || ""}`} onClose={onClose}>
      <div style={{ display: "grid", gap: 10 }}>
        <div className="small" style={{ color: "var(--muted)" }}>
          Table: <b>{order.table || "—"}</b> {order.token ? ` | Token: ${order.token}` : ""} | Guest: <b>{order?.customer?.name || "Walk-in"}</b>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th style={{ width: 80, textAlign: "center" }}>Qty</th>
                <th style={{ width: 100, textAlign: "right" }}>Rate</th>
                <th style={{ width: 110, textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr className="no-rows"><td colSpan={4}>No items</td></tr>}
              {items.map((it, idx) => (
                <tr key={idx}>
                  <td>{it.name}</td>
                  <td style={{ textAlign: "center" }}>{it.qty}</td>
                  <td style={{ textAlign: "right" }}>{Number(it.rate || 0).toFixed(2)}</td>
                  <td style={{ textAlign: "right" }}>{(Number(it.rate || 0) * Number(it.qty || 0)).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel" style={{ padding: 10 }}>
          <KV label="Sub Total" value={`₹ ${Number(order.subTotal || 0).toFixed(2)}`} />
          {"discountPct" in order && <KV label={`Discount (${order.discountPct || 0}%)}`} value={`- ₹ ${Number(order.discountAmt || 0).toFixed(2)}`} />}
          <KV label={`Tax (${order.taxPct || 0}%)`} value={`₹ ${Number(order.taxAmt || 0).toFixed(2)}`} />
          <div style={{ borderTop: "1px dashed #e5e7eb", margin: "6px 0" }} />
          <KV strong label="Grand Total" value={`₹ ${Number(order.grandTotal ?? order.subTotal ?? 0).toFixed(2)}`} />
          <KV label="Status" value={<StatusPill value={order.status} />} />
          <KV label="Updated" value={fmtDateTime(order.updatedAt || order.createdAt)} />
          {order.note && <KV label="Note" value={order.note} />}
        </div>
      </div>
    </Modal>
  );
}

function KV({ label, value, strong }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 0",
      fontWeight: strong ? 800 : 600
    }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/* ---------- tiny UI helpers ---------- */
function StatusPill({ value }) {
  const v = (value || "").toUpperCase();
  const map = {
    OPEN: { bg: "#eff6ff", bd: "#bfdbfe", fg: "#1d4ed8", text: "Open" },
    PREPARING: { bg: "#fff7ed", bd: "#fed7aa", fg: "#c2410c", text: "Preparing" },
    SERVED: { bg: "#f0fdf4", bd: "#bbf7d0", fg: "#166534", text: "Served" },
    BILLED: { bg: "#f5f3ff", bd: "#ddd6fe", fg: "#6d28d9", text: "Billed" },
    HOLD: { bg: "#f3f4f6", bd: "#e5e7eb", fg: "#374151", text: "Hold" },
  };
  const s = map[v] || { bg: "#f3f4f6", bd: "#e5e7eb", fg: "#374151", text: v || "—" };
  return (
    <span style={{
      display: "inline-block", padding: ".15rem .5rem", borderRadius: 999,
      background: s.bg, border: `1px solid ${s.bd}`, color: s.fg, fontSize: ".75rem", fontWeight: 800
    }}>
      {s.text}
    </span>
  );
}

function Banner({ type = "ok", children }) {
  const style = type === "err"
    ? { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }
    : { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
  return <div style={{ ...style, padding: "8px 10px", borderRadius: 10, fontWeight: 700, marginBottom: 10 }}>{children}</div>;
}

function Modal({ title, onClose, children }) {
  return (
    <div style={backdropStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} aria-label="Close" style={xStyle}>×</button>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>
  );
}

/* ---------- styling helpers ---------- */
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(720px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };

function fmtDateTime(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "—" : `${dt.toLocaleDateString()} ${dt.toLocaleTimeString()}`;
}
