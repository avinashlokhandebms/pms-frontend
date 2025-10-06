// src/pages/pos/Cancelled.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import PosSidebar from "../../components/sidebar/Possidebar";
import "../../components/sidebar/Sidebar.css";
import "../../assets/css/commanPage.css";

export default function Cancelled() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState("");

  const [viewing, setViewing] = useState(null); // order to view
  const [toDelete, setToDelete] = useState(null);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await apiFetch(`/api/pos/orders?status=CANCELLED`, { auth: true });
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      // hard guard
      setRows(list.filter(o => (o.status || "").toUpperCase() === "CANCELLED"));
    } catch (e) {
      setErr(e?.message || "Failed to load cancelled orders.");
      // demo fallback so the UI is visible
      setRows([
        {
          _id: "c1",
          orderNo: "POS-00101",
          table: "T-05",
          customer: { name: "Walk-in" },
          items: [
            { name: "Pasta", qty: 1, rate: 280 },
            { name: "Ice Tea", qty: 2, rate: 90 },
          ],
          subTotal: 460,
          taxPct: 5,
          taxAmt: 23,
          grandTotal: 483,
          cancelReason: "Guest left",
          cancelledBy: "akash",
          cancelledAt: new Date().toISOString(),
          status: "CANCELLED",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const data = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [
        r.orderNo,
        r.table,
        r?.customer?.name,
        r.cancelReason,
        r.cancelledBy,
        ...(r.items || []).map((i) => i.name),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  /* -------- actions -------- */
  const restoreOrder = async (id) => {
    if (!window.confirm("Restore this order back to OPEN?")) return;
    setBusyId(id);
    try {
      const upd = await apiFetch(`/api/pos/orders/${id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ status: "OPEN", cancelReason: null, cancelledBy: null, cancelledAt: null }),
      });
      // remove from cancelled list
      setRows((prev) => prev.filter((r) => (r._id || r.id) !== id));
      return upd;
    } catch (e) {
      alert(e?.message || "Failed to restore.");
    } finally {
      setBusyId("");
    }
  };

  const deleteOrder = async (id) => {
    setBusyId(id);
    try {
      await apiFetch(`/api/pos/orders/${id}`, { method: "DELETE", auth: true });
      setRows((prev) => prev.filter((r) => (r._id || r.id) !== id));
    } catch (e) {
      alert(e?.message || "Delete failed.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <PosSidebar />
      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Cancelled Orders</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="res-select"
              placeholder="Search order / table / guest / item / reason…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: 320 }}
            />
            <button className="btn" onClick={load} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="panel">
          <div className="panel-h">
            <span>Cancelled Orders</span>
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
                    <th style={{ width: 260 }}>Action</th>
                    <th>Order #</th>
                    <th>Table</th>
                    <th>Guest</th>
                    <th style={{ textAlign: "right" }}>Items</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                    <th>Reason</th>
                    <th>Cancelled By</th>
                    <th>Cancelled At</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 && !loading && (
                    <tr className="no-rows"><td colSpan={9}>No cancelled orders</td></tr>
                  )}

                  {data.map((r) => {
                    const id = r._id || r.id;
                    const itemsCnt = (r.items || []).reduce((s, i) => s + Number(i.qty || 0), 0);
                    const total = Number(r.grandTotal ?? r.subTotal ?? 0);
                    return (
                      <tr key={id}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="btn" style={btnSm} disabled={busyId === id} onClick={() => setViewing(r)}>
                            View
                          </button>
                          <button className="btn" style={btnSm} disabled={busyId === id} onClick={() => restoreOrder(id)}>
                            Restore
                          </button>
                          <button className="btn" style={btnSm} onClick={() => setToDelete(r)}>
                            Delete
                          </button>
                        </td>
                        <td>{r.orderNo || id?.slice(-6)?.toUpperCase()}</td>
                        <td>{r.table || "—"}</td>
                        <td>{r?.customer?.name || "Walk-in"}</td>
                        <td style={{ textAlign: "right" }}>{itemsCnt}</td>
                        <td style={{ textAlign: "right" }}>₹ {total.toFixed(2)}</td>
                        <td title={r.cancelReason || ""}>{r.cancelReason || "—"}</td>
                        <td>{r.cancelledBy || "—"}</td>
                        <td>{fmtDateTime(r.cancelledAt || r.updatedAt || r.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="small" style={{ color: "var(--muted)", marginTop: 6 }}>
              Tip: <b>Restore</b> moves an order back to <b>OPEN</b> so you can bill it again.
            </div>
          </div>
        </div>
      </div>

      {/* View modal */}
      {viewing && (
        <Modal title={`Order ${viewing.orderNo || viewing._id?.slice(-6)?.toUpperCase()}`} onClose={() => setViewing(null)}>
          <div className="panel">
            <div className="panel-h">Items</div>
            <div className="panel-b">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th style={{ textAlign: "right" }}>Qty</th>
                      <th style={{ textAlign: "right" }}>Rate</th>
                      <th style={{ textAlign: "right" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewing.items || []).map((i, idx) => (
                      <tr key={idx}>
                        <td>{i.name}</td>
                        <td style={{ textAlign: "right" }}>{i.qty}</td>
                        <td style={{ textAlign: "right" }}>₹ {Number(i.rate || 0).toFixed(2)}</td>
                        <td style={{ textAlign: "right" }}>₹ {(Number(i.qty || 0) * Number(i.rate || 0)).toFixed(2)}</td>
                      </tr>
                    ))}
                    {(!viewing.items || viewing.items.length === 0) && (
                      <tr className="no-rows"><td colSpan={4}>No items</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 8 }}>
                <KV label="Subtotal" value={`₹ ${Number(viewing.subTotal || 0).toFixed(2)}`} />
                {viewing.taxPct != null && (
                  <KV label={`Tax (${viewing.taxPct}%)`} value={`₹ ${Number(viewing.taxAmt || 0).toFixed(2)}`} />
                )}
                <KV strong label="Grand Total" value={`₹ ${Number(viewing.grandTotal || viewing.subTotal || 0).toFixed(2)}`} />
              </div>
            </div>
          </div>

          <div className="panel" style={{ marginTop: 10 }}>
            <div className="panel-h">Cancellation</div>
            <div className="panel-b">
              <KV label="Reason" value={viewing.cancelReason || "—"} />
              <KV label="Cancelled By" value={viewing.cancelledBy || "—"} />
              <KV label="Cancelled At" value={fmtDateTime(viewing.cancelledAt)} />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
            <button className="btn" onClick={() => setViewing(null)}>Close</button>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {toDelete && (
        <ConfirmModal
          title="Delete Cancelled Order?"
          message={`Delete order "${toDelete.orderNo || toDelete._id?.slice(-6)}" permanently? This cannot be undone.`}
          confirmText="Delete"
          onClose={() => setToDelete(null)}
          onConfirm={() => deleteOrder(toDelete._id || toDelete.id)}
        />
      )}
    </div>
  );
}

/* ---------- UI primitives ---------- */
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

function ConfirmModal({ title, message, confirmText = "OK", onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={onClose}>
      <p style={{ marginTop: 0 }}>{message}</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn" type="button" onClick={onClose}>Cancel</button>
        <button
          className="btn"
          type="button"
          disabled={busy}
          onClick={async () => { setBusy(true); try { await onConfirm?.(); onClose(); } finally { setBusy(false); } }}
        >
          {busy ? "Working…" : confirmText}
        </button>
      </div>
    </Modal>
  );
}

/* ---------- styles ---------- */
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(800px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };

function fmtDateTime(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "—" : `${dt.toLocaleDateString()} ${dt.toLocaleTimeString()}`;
}
