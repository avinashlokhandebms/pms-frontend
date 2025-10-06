// src/pages/pos/KDS.js
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../../../lib/api";
import PosSidebar from "../../../components/sidebar/Possidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

const REFRESH_DEFAULT = 10; // seconds

export default function KDS() {
  // Lookups / filters
  const [outlets, setOutlets] = useState([]);
  const [stations, setStations] = useState([]);
  const [outletId, setOutletId] = useState("");
  const [stationId, setStationId] = useState("");
  const [status, setStatus] = useState(""); // ALL | PENDING | IN_PROGRESS | READY
  const [q, setQ] = useState("");

  // Data
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // Auto refresh
  const [auto, setAuto] = useState(true);
  const [refreshSec, setRefreshSec] = useState(REFRESH_DEFAULT);
  const timerRef = useRef(null);

  /* ---------- Load lookups ---------- */
  useEffect(() => {
    (async () => {
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
    })();
  }, []); // eslint-disable-line

  useEffect(() => {
    (async () => {
      if (!outletId) return;
      try {
        const res = await apiFetch(`/api/pos/stations?${new URLSearchParams({ outletId })}`, { auth: true });
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setStations(list);
      } catch {
        setStations([{ _id: "k1", name: "Hot Kitchen" }, { _id: "k2", name: "Cold/Salad" }]);
      }
    })();
  }, [outletId]);

  /* ---------- Load tickets ---------- */
  const load = async () => {
    if (!outletId) return;
    setLoading(true); setErr(""); setOk("");
    try {
      const params = new URLSearchParams({
        outletId,
        stationId: stationId || "",
        status: status || "",
        q: q || "",
      });
      const res = await apiFetch(`/api/pos/kds/board?${params.toString()}`, { auth: true });
      const items = res?.data || res?.items || res || [];
      setTickets(Array.isArray(items) ? items : []);
    } catch (e) {
      setErr(e?.message || "API not reachable, showing demo data.");
      setTickets(demoTickets().filter(d => !stationId || d.stationId === stationId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [outletId, stationId, status]);

  // Auto refresh
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (auto && refreshSec > 0) {
      timerRef.current = setInterval(load, Math.max(2, refreshSec) * 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [auto, refreshSec, outletId, stationId, status]); // eslint-disable-line

  /* ---------- Actions ---------- */
  const updateTicket = async (id, action) => {
    setErr(""); setOk("");
    try {
      await apiFetch(`/api/pos/kds/${id}/${action}`, { method: "POST", auth: true });
      setOk(`Ticket ${action.replace("-", " ")}.`);
      // Optimistic update
      setTickets(prev => prev.map(t => (t._id === id || t.id === id) ? { ...t, status: nextStatus(t.status, action) } : t));
    } catch (e) {
      setErr(e?.message || `Failed to ${action}.`);
    }
  };

  const filtered = useMemo(() => {
    const t = (q || "").trim().toLowerCase();
    const base = tickets.filter(r => {
      if (!status) return true;
      return String(r.status || "").toUpperCase() === status.toUpperCase();
    });
    if (!t) return base;
    return base.filter(r =>
      [
        r.orderNo,
        r.table?.name,
        r.tableName,
        r.stationName,
        r.userName,
        ...(r.items || []).map(it => it.name),
      ]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(t))
    );
  }, [tickets, status, q]);

  // Group by station for nicer layout
  const byStation = useMemo(() => {
    const map = new Map();
    for (const t of filtered) {
      const key = t.stationName || "Unassigned";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <PosSidebar />

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Kitchen Display (KDS)</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select className="res-select" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
              {outlets.map(o => <option key={o._id || o.id} value={o._id || o.id}>{o.name}</option>)}
            </select>

            <select className="res-select" value={stationId} onChange={(e) => setStationId(e.target.value)}>
              <option value="">All Stations</option>
              {stations.map(s => <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>)}
            </select>

            <select className="res-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Status</option>
              {["PENDING", "IN_PROGRESS", "READY"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <input
              className="res-select"
              placeholder="Search (order / table / item / user)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: 260 }}
            />

            <label className="small" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
              Auto refresh
            </label>
            <input
              className="res-select"
              type="number" min="2"
              title="Refresh (seconds)"
              disabled={!auto}
              value={refreshSec}
              onChange={(e) => setRefreshSec(Math.max(2, Number(e.target.value || 2)))}
              style={{ width: 90 }}
            />
            <button className="btn" onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
          </div>
        </div>

        {(err || ok) && (
          <div style={{ marginBottom: 10 }}>
            {err && <Banner type="err">{err}</Banner>}
            {ok && <Banner type="ok">{ok}</Banner>}
          </div>
        )}

        {/* Stations */}
        {byStation.map(([stationName, list]) => (
          <div key={stationName} className="panel" style={{ marginBottom: 12 }}>
            <div className="panel-h">
              <span>{stationName}</span>
              <span className="small" style={{ color: "var(--muted)" }}>{list.length} ticket(s)</span>
            </div>
            <div className="panel-b">
              <div className="kds-grid">
                {list.map(t => <TicketCard key={t._id || t.id} t={t} onAction={updateTicket} />)}
              </div>
            </div>
          </div>
        ))}

        {!loading && filtered.length === 0 && (
          <div className="panel">
            <div className="panel-b">
              <div className="no-rows">No tickets</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Ticket Card ---------- */
function TicketCard({ t, onAction }) {
  const id = t._id || t.id;
  const totalQty = (t.items || []).reduce((n, it) => n + Number(it.qty || 1), 0);
  const totalItems = (t.items || []).length;

  return (
    <div className="kds-card">
      <div className="kds-card-h">
        <div>
          <div className="kds-title">
            <span className="kds-order">#{t.orderNo || id}</span>
            <span className="kds-table">{t.table?.name || t.tableName || "—"}</span>
          </div>
          <div className="kds-meta">
            <span>{fmtTime(t.createdAt)} • {t.userName || "—"}</span>
          </div>
        </div>
        <StatusPill value={t.status} />
      </div>

      <div className="kds-items">
        {(t.items || []).map((it, idx) => (
          <div key={idx} className="kds-item">
            <div className="kds-item-l">
              <div className="kds-item-name">{it.name}</div>
              {(it.notes || it.remarks) && <div className="kds-item-notes">{it.notes || it.remarks}</div>}
            </div>
            <div className="kds-item-r">×{it.qty || 1}</div>
          </div>
        ))}
      </div>

      <div className="kds-card-f">
        <div className="kds-count small">{totalItems} items • {totalQty} qty</div>
        <div className="kds-actions">
          {String(t.status).toUpperCase() === "PENDING" && (
            <button className="btn" onClick={() => onAction(id, "start")}>Start</button>
          )}
          {["PENDING", "IN_PROGRESS"].includes(String(t.status).toUpperCase()) && (
            <button className="btn" onClick={() => onAction(id, "ready")}>Ready</button>
          )}
          {String(t.status).toUpperCase() === "READY" && (
            <button className="btn" onClick={() => onAction(id, "bump")}>Bump</button>
          )}
          {String(t.status).toUpperCase() === "SERVED" && (
            <button className="btn" onClick={() => onAction(id, "recall")}>Recall</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Small UI bits ---------- */
function Banner({ type = "ok", children }) {
  const style = type === "err"
    ? { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }
    : { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" } ;
  return (
   <div style= {{ ...style, padding: "8px 10px", borderRadius: 10, fontWeight: 700}} >
    {children}
    </div>
  );
}
  

function StatusPill({ value }) {
  const v = String(value || "").toUpperCase();
  const map = {
    PENDING: { bg: "#fef3c7", fg: "#92400e" },
    IN_PROGRESS: { bg: "#e0e7ff", fg: "#3730a3" },
    READY: { bg: "#dcfce7", fg: "#166534" },
    SERVED: { bg: "#f3f4f6", fg: "#374151" },
    VOID: { bg: "#fee2e2", fg: "#b91c1c" },
  };
  const c = map[v] || { bg: "#e5e7eb", fg: "#374151" };
  return <span style={{ padding: ".15rem .5rem", borderRadius: 999, background: c.bg, color: c.fg, fontSize: ".75rem", fontWeight: 900 }}>{v || "—"}</span>;
}

/* ---------- Helpers ---------- */
function fmtTime(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return Number.isNaN(dt) ? "—" : dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function nextStatus(cur, action) {
  const c = String(cur || "").toUpperCase();
  const a = String(action || "").toUpperCase();
  if (a === "START") return "IN_PROGRESS";
  if (a === "READY") return "READY";
  if (a === "BUMP") return "SERVED";
  if (a === "RECALL") return "READY";
  return c;
}

/* ---------- Demo data ---------- */
function demoTickets() {
  const now = Date.now();
  return [
    {
      _id: "t1",
      orderNo: "POS-1201",
      table: { name: "T-01" },
      stationId: "k1",
      stationName: "Hot Kitchen",
      status: "PENDING",
      userName: "Sam",
      createdAt: new Date(now - 7 * 60 * 1000).toISOString(),
      items: [{ name: "Paneer Tikka", qty: 1 }, { name: "Butter Naan", qty: 2 }],
    },
    {
      _id: "t2",
      orderNo: "POS-1202",
      table: { name: "T-05" },
      stationId: "k1",
      stationName: "Hot Kitchen",
      status: "IN_PROGRESS",
      userName: "Asha",
      createdAt: new Date(now - 15 * 60 * 1000).toISOString(),
      items: [{ name: "Dal Makhani", qty: 1 }, { name: "Jeera Rice", qty: 1 }],
    },
    {
      _id: "t3",
      orderNo: "POS-1203",
      table: { name: "T-09" },
      stationId: "k2",
      stationName: "Cold/Salad",
      status: "READY",
      userName: "Ravi",
      createdAt: new Date(now - 3 * 60 * 1000).toISOString(),
      items: [{ name: "Greek Salad", qty: 1 }, { name: "Lemonade", qty: 2 }],
    },
  ];
}

/* ---------- Local styles (scoped) ---------- */
const kdsCss = `
.kds-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
.kds-card { border: 1px solid #e5e7eb; border-radius: 14px; padding: 12px; background: #fff; display: grid; gap: 10px; }
.kds-card-h { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.kds-title { font-weight: 900; display: flex; gap: 10px; align-items: baseline; }
.kds-order { font-size: 1.05rem; }
.kds-table { background: #f3f4f6; border-radius: 999px; padding: .05rem .5rem; font-size: .75rem; font-weight: 800; }
.kds-meta { color: #64748b; font-size: .8rem; }
.kds-items { display: grid; gap: 8px; }
.kds-item { display: flex; justify-content: space-between; gap: 8px; border-bottom: 1px dashed #e5e7eb; padding-bottom: 6px; }
.kds-item:last-child { border-bottom: 0; padding-bottom: 0; }
.kds-item-name { font-weight: 800; }
.kds-item-notes { color: #6b7280; font-size: .8rem; }
.kds-item-r { font-weight: 900; }
.kds-card-f { display: flex; align-items: center; justify-content: space-between; }
.kds-actions { display: flex; gap: 6px; }
`;
if (typeof document !== "undefined" && !document.getElementById("kds-inline-css")) {
  const s = document.createElement("style"); s.id = "kds-inline-css"; s.innerHTML = kdsCss; document.head.appendChild(s);
}
