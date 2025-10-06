// src/pages/pos/TableStatus.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import PosSidebar from "../../../components/sidebar/Possidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

const STATUS = ["ALL", "AVAILABLE", "OCCUPIED", "RESERVED", "CLEANING", "OUT_OF_SERVICE"];

export default function TableStatus() {
  const [rows, setRows] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [outletId, setOutletId] = useState("");
  const [status, setStatus] = useState("ALL");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [active, setActive] = useState(null); // table clicked
  const [busyId, setBusyId] = useState("");

  /* ---------- load data ---------- */
  const loadOutlets = async () => {
    try {
      const res = await apiFetch("/api/pos/outlets", { auth: true });
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setOutlets(list);
      if (list.length && !outletId) setOutletId(list[0]._id || list[0].id || "");
    } catch {
      // demo fallback
      const demo = [{ _id: "o1", name: "Main Restaurant" }, { _id: "o2", name: "Rooftop" }];
      setOutlets(demo);
      if (!outletId) setOutletId("o1");
    }
  };

  const loadTables = async () => {
    setLoading(true);
    setErr("");
    try {
      const qs = new URLSearchParams(outletId ? { outletId } : {});
      const res = await apiFetch(`/api/pos/tables?${qs}`, { auth: true });
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setRows(list);
    } catch (e) {
      setErr(e?.message || "Failed to load tables.");
      // demo fallback
      setRows([
        { _id: "t1", name: "T-01", capacity: 2, status: "AVAILABLE", section: "Indoor" },
        { _id: "t2", name: "T-02", capacity: 4, status: "RESERVED", reservedFor: "19:30", section: "Indoor" },
        { _id: "t3", name: "T-03", capacity: 4, status: "OCCUPIED", currentOrderId: "POS-1042", since: new Date().toISOString(), server: "Ravi", section: "Indoor" },
        { _id: "t4", name: "T-04", capacity: 6, status: "CLEANING", section: "Patio" },
        { _id: "t5", name: "T-05", capacity: 2, status: "OUT_OF_SERVICE", note: "Wobbly leg", section: "Patio" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOutlets(); }, []);          // once
  useEffect(() => { loadTables(); /* reload when outlet changes */ }, [outletId]);

  /* ---------- filters ---------- */
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let data = rows;
    if (status !== "ALL") data = data.filter(r => (r.status || "").toUpperCase() === status);
    if (!term) return data;
    return data.filter(r =>
      [
        r.name,
        r.section,
        r?.server,
        r?.currentOrderId,
        r?.reservedFor,
        r?.note,
      ]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(term))
    );
  }, [rows, status, q]);

  const counts = useMemo(() => {
    const c = { ALL: rows.length };
    STATUS.slice(1).forEach(s => { c[s] = rows.filter(r => (r.status || "").toUpperCase() === s).length; });
    return c;
  }, [rows]);

  /* ---------- actions ---------- */
  const markStatus = async (table, nextStatus) => {
    const id = table._id || table.id;
    setBusyId(id);
    try {
      const upd = await apiFetch(`/api/pos/tables/${id}`, {
        method: "PATCH", auth: true, body: JSON.stringify({ status: nextStatus })
      });
      setRows(prev => prev.map(t => (t._id || t.id) === id ? { ...t, ...(upd || { status: nextStatus }) } : t));
      setActive(a => a && (a._id || a.id) === id ? { ...a, ...(upd || { status: nextStatus }) } : a);
    } catch (e) {
      alert(e?.message || "Update failed.");
    } finally {
      setBusyId("");
    }
  };

  const openOrder = async (table) => {
    const id = table._id || table.id;
    setBusyId(id);
    try {
      const order = await apiFetch("/api/pos/orders", {
        method: "POST", auth: true, body: JSON.stringify({ tableId: id })
      });
      const orderId = order?._id || order?.id || order?.orderNo || "NEW";
      setRows(prev => prev.map(t => (t._id || t.id) === id ? { ...t, status: "OCCUPIED", currentOrderId: orderId, since: new Date().toISOString() } : t));
      setActive(a => a ? { ...a, status: "OCCUPIED", currentOrderId: orderId, since: new Date().toISOString() } : a);
    } catch (e) {
      alert(e?.message || "Could not open order.");
    } finally { setBusyId(""); }
  };

  const closeOrderAndFree = async (table) => {
    const id = table._id || table.id;
    const orderId = table.currentOrderId;
    if (!orderId) return markStatus(table, "AVAILABLE");
    setBusyId(id);
    try {
      await apiFetch(`/api/pos/orders/${orderId}`, { method: "PATCH", auth: true, body: JSON.stringify({ status: "CLOSED" }) });
      await markStatus(table, "AVAILABLE");
      setRows(prev => prev.map(t => (t._id || t.id) === id ? { ...t, currentOrderId: null, since: null } : t));
    } catch (e) {
      alert(e?.message || "Failed to close order.");
    } finally { setBusyId(""); }
  };

  /* ---------- render ---------- */
  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <PosSidebar />

      <div className="res-wrap">
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Table Status</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select className="res-select" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
              {outlets.map(o => <option key={o._id || o.id} value={o._id || o.id}>{o.name}</option>)}
            </select>
            <select className="res-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS.map(s => <option key={s} value={s}>{s} {s !== "ALL" ? `(${counts[s] || 0})` : `(${counts.ALL || 0})`}</option>)}
            </select>
            <input
              className="res-select"
              placeholder="Search table / section / server / order…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: 260 }}
            />
            <button className="btn" onClick={loadTables} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-h">
            <span>Tables</span>
            <span className="small" style={{ color: "var(--muted)" }}>
              {loading ? "Loading…" : `${filtered.length} shown`}
            </span>
          </div>

          <div className="panel-b">
            {err && <Banner type="err">{err}</Banner>}

            <div style={gridWrap}>
              {filtered.length === 0 && !loading && (
                <div className="small" style={{ color: "var(--muted)" }}>No tables match the filter.</div>
              )}

              {filtered.map(t => (
                <button
                  key={t._id || t.id}
                  className="table-card"
                  onClick={() => setActive(t)}
                  disabled={busyId === (t._id || t.id)}
                  style={{ ...cardStyle, ...statusStyle(t.status) }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 900, fontSize: "1.05rem" }}>{t.name}</div>
                    <StatusPill value={t.status} />
                  </div>
                  <div className="small" style={{ marginTop: 6 }}>
                    Capacity: <strong>{t.capacity || "-"}</strong> • Section: <strong>{t.section || "-"}</strong>
                  </div>
                  {t.status === "OCCUPIED" && (
                    <div className="small" style={{ marginTop: 6 }}>
                      Order: <strong>{t.currentOrderId}</strong>{t.server ? ` • Server: ${t.server}` : ""}<br />
                      Since: {fmtSince(t.since)}
                    </div>
                  )}
                  {t.status === "RESERVED" && (
                    <div className="small" style={{ marginTop: 6 }}>
                      Reserved For: <strong>{t.reservedFor || "-"}</strong>
                    </div>
                  )}
                  {t.status === "OUT_OF_SERVICE" && (
                    <div className="small" style={{ marginTop: 6 }}>
                      Note: {t.note || "—"}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action modal */}
      {active && (
        <Modal title={`Table ${active.name}`} onClose={() => setActive(null)}>
          <div style={{ display: "grid", gap: 8 }}>
            <KV label="Status" value={<StatusPill value={active.status} />} />
            <KV label="Capacity" value={active.capacity || "-"} />
            <KV label="Section" value={active.section || "-"} />
            {active.status === "OCCUPIED" && (
              <>
                <KV label="Order" value={active.currentOrderId} />
                <KV label="Server" value={active.server || "—"} />
                <KV label="Since" value={fmtSince(active.since)} />
              </>
            )}
          </div>

          <div className="panel" style={{ marginTop: 12 }}>
            <div className="panel-h">Actions</div>
            <div className="panel-b" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {active.status === "AVAILABLE" && (
                <>
                  <button className="btn" disabled={busyId === (active._id || active.id)} onClick={() => openOrder(active)}>Seat Guests / Open Order</button>
                  <button className="btn" onClick={() => markStatus(active, "RESERVED")}>Mark Reserved</button>
                  <button className="btn" onClick={() => markStatus(active, "OUT_OF_SERVICE")}>Mark Out Of Service</button>
                </>
              )}

              {active.status === "RESERVED" && (
                <>
                  <button className="btn" onClick={() => openOrder(active)}>Seat Now</button>
                  <button className="btn" onClick={() => markStatus(active, "AVAILABLE")}>Cancel Reservation</button>
                </>
              )}

              {active.status === "OCCUPIED" && (
                <>
                  <button className="btn" onClick={() => alert(`Open order ${active.currentOrderId} page`)}>View Order</button>
                  <button className="btn" onClick={() => closeOrderAndFree(active)}>Close Order & Free</button>
                </>
              )}

              {active.status === "CLEANING" && (
                <button className="btn" onClick={() => markStatus(active, "AVAILABLE")}>Mark Available</button>
              )}

              {active.status === "OUT_OF_SERVICE" && (
                <button className="btn" onClick={() => markStatus(active, "AVAILABLE")}>Back to Available</button>
              )}

              {/* Always available */}
              <button className="btn" onClick={() => markStatus(active, "CLEANING")}>Mark Cleaning</button>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="btn" onClick={() => setActive(null)}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------- tiny UI ---------- */
function StatusPill({ value }) {
  const v = String(value || "AVAILABLE").toUpperCase();
  const { bg, border, color } = statusColors[v] || statusColors.AVAILABLE;
  return (
    <span style={{
      display: "inline-block", padding: ".15rem .5rem", borderRadius: 999,
      background: bg, border: `1px solid ${border}`, color, fontSize: ".72rem", fontWeight: 800
    }}>
      {v.replaceAll("_", " ")}
    </span>
  );
}
function KV({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <div style={{ fontWeight: 700 }}>{label}</div>
      <div>{value}</div>
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

/* ---------- styles ---------- */
const gridWrap = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, alignItems: "stretch" };

const cardStyle = {
  textAlign: "left",
  borderRadius: 14,
  padding: 12,
  cursor: "pointer",
  border: "1px solid #e5e7eb",
  background: "#fff",
  boxShadow: "0 1px 2px rgba(0,0,0,.06)",
};

const statusColors = {
  AVAILABLE:      { bg: "#ecfdf5", border: "#a7f3d0", color: "#065f46" },
  OCCUPIED:       { bg: "#fffbeb", border: "#fde68a", color: "#92400e" },
  RESERVED:       { bg: "#eef2ff", border: "#c7d2fe", color: "#3730a3" },
  CLEANING:       { bg: "#f3f4f6", border: "#e5e7eb", color: "#374151" },
  OUT_OF_SERVICE: { bg: "#fef2f2", border: "#fecaca", color: "#991b1b" },
};

function statusStyle(s) {
  const { bg, border } = statusColors[(s || "AVAILABLE").toUpperCase()] || statusColors.AVAILABLE;
  return { background: "#fff", borderColor: border, boxShadow: `0 4px 20px ${hexToRgba(border, .25)}` };
}

const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(720px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };

/* ---------- helpers ---------- */
function fmtSince(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d)) return "—";
  const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60); const m = mins % 60;
  return `${h}h ${m}m`;
}
function hexToRgba(hex, a) {
  const h = hex.replace("#", "");
  const bigint = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  const r = (bigint >> 16) & 255, g = (bigint >> 8) & 255, b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
