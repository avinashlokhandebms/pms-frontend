// src/pages/pos/KOTBoard.js
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../../../lib/api";
import PosSidebar from "../../../components/sidebar/Possidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

const POLL_MS = 5000;

export default function KOTBoard() {
  const [outlets, setOutlets] = useState([]);
  const [outletId, setOutletId] = useState("");

  const [stations, setStations] = useState([]); // kitchens / sections
  const [stationId, setStationId] = useState("");

  const [status, setStatus] = useState("OPEN"); // OPEN | IN_PROGRESS | READY | SERVED
  const [q, setQ] = useState("");

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [autoRefresh, setAutoRefresh] = useState(true);
  const lastIdsRef = useRef(new Set()); // to detect newly arrived tickets

  /* ---------------- Loaders ---------------- */
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

  const loadStations = async (oid) => {
    if (!oid) return;
    try {
      const res = await apiFetch(`/api/pos/stations?${new URLSearchParams({ outletId: oid })}`, { auth: true });
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setStations(list);
      if (list.length && !stationId) setStationId(list[0]._id || list[0].id || "");
    } catch {
      const demo = [
        { _id: "k1", name: "Hot Kitchen" },
        { _id: "k2", name: "Cold/Salad" },
        { _id: "k3", name: "Bakery" },
      ];
      setStations(demo);
      if (!stationId) setStationId("k1");
    }
  };

  const loadTickets = async () => {
    if (!outletId) return;
    setLoading(true); setErr(""); setOk("");

    try {
      const res = await apiFetch(
        `/api/pos/kot?${new URLSearchParams({
          outletId,
          stationId: stationId || "",
          status,
        })}`,
        { auth: true }
      );

      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setTickets(list);
      beepOnNew(list);
    } catch (e) {
      // demo fallback
      const demo = demoTickets().filter(t => (status === "OPEN" ? t.status === "OPEN" : t.status === status));
      setTickets(demo);
      beepOnNew(demo);
      setErr(e?.message || "API not reachable, showing demo tickets.");
    } finally {
      setLoading(false);
    }
  };

  const beepOnNew = (list) => {
    const curr = new Set(list.map(t => t._id || t.id));
    if (lastIdsRef.current.size) {
      for (const id of curr) {
        if (!lastIdsRef.current.has(id)) {
          try {
            // If you have a sound file, put it under /public/sounds/notify.mp3
            const a = new Audio("/sounds/notify.mp3");
            a.play().catch(() => {});
            break;
          } catch {}
        }
      }
    }
    lastIdsRef.current = curr;
  };

  /* ---------------- Effects ---------------- */
  useEffect(() => { loadOutlets(); }, []);
  useEffect(() => { loadStations(outletId); }, [outletId]);
  useEffect(() => { loadTickets(); }, [outletId, stationId, status]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(loadTickets, POLL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, outletId, stationId, status]);

  /* ---------------- Derived ---------------- */
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return tickets;
    return tickets.filter(t =>
      [t.orderNo, t.table?.name, t.section, ...(t.items || []).map(i => i.name)]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(term))
    );
  }, [tickets, q]);

  /* ---------------- Actions ---------------- */
  const setTicketStatus = async (ticketId, nextStatus) => {
    setErr(""); setOk("");
    try {
      await apiFetch(`/api/pos/kot/${ticketId}/status`, {
        method: "POST",
        auth: true,
        body: JSON.stringify({ status: nextStatus }),
      });
      setOk(`Ticket updated to ${nextStatus}.`);
      await loadTickets();
    } catch (e) {
      setErr(e?.message || "Failed to update status.");
    }
  };

  /* ---------------- Render ---------------- */
  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <PosSidebar />

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>KOT Board</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select
              className="res-select"
              value={outletId}
              onChange={(e) => setOutletId(e.target.value)}
              title="Outlet"
            >
              {outlets.map(o => (
                <option key={o._id || o.id} value={o._id || o.id}>{o.name}</option>
              ))}
            </select>

            <select
              className="res-select"
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
              title="Kitchen / Station"
            >
              <option value="">All Stations</option>
              {stations.map(s => (
                <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>
              ))}
            </select>

            <select className="res-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              {["OPEN", "IN_PROGRESS", "READY", "SERVED"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <input
              className="res-select"
              placeholder="Find by table / item / order #"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: 260 }}
            />

            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
              Auto refresh
            </label>

            <button className="btn" onClick={loadTickets} disabled={loading}>
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
          <div className="panel-h">
            <span>Tickets</span>
            <span className="small" style={{ color: "var(--muted)" }}>
              {loading ? "Loading…" : `Showing ${filtered.length}`}
            </span>
          </div>

          <div className="panel-b">
            {filtered.length === 0 && !loading && (
              <div className="no-rows">No tickets found</div>
            )}

            <div style={gridWrap}>
              {filtered.map(t => (
                <KOTCard
                  key={t._id || t.id}
                  ticket={t}
                  onProgress={() => setTicketStatus(t._id || t.id, "IN_PROGRESS")}
                  onReady={() => setTicketStatus(t._id || t.id, "READY")}
                  onServe={() => setTicketStatus(t._id || t.id, "SERVED")}
                  onRecall={() => setTicketStatus(t._id || t.id, "IN_PROGRESS")}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Ticket Card ---------------- */
function KOTCard({ ticket, onProgress, onReady, onServe, onRecall }) {
  const since = useMemo(() => sinceMs(ticket.createdAt || Date.now()), [ticket.createdAt]);
  const color = badgeColor(ticket.status);

  return (
    <div style={card}>
      <div style={cardHeader}>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
          <span style={{ fontWeight: 900 }}>{ticket.table?.name || ticket.tableName || "—"}</span>
          <span className="small" style={{ color: "var(--muted)" }}>
            #{ticket.orderNo || ticket._id || ticket.id}
          </span>
        </div>
        <span style={{ ...pill, background: color.bg, color: color.fg }}>
          {ticket.status}
        </span>
      </div>

      <div className="small" style={{ color: "var(--muted)", marginBottom: 8 }}>
        {ticket.section ? `${ticket.section} • ` : ""}Placed {since.text} ago
      </div>

      <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
        {(ticket.items || []).map((it, i) => (
          <div key={i} style={line}>
            <div style={{ fontWeight: 800, minWidth: 28, textAlign: "right" }}>{it.qty || 1}×</div>
            <div>
              <div style={{ fontWeight: 700 }}>{it.name}</div>
              {it.notes && <div className="small" style={{ color: "#6b7280" }}>{it.notes}</div>}
              {Array.isArray(it.modifiers) && it.modifiers.length > 0 && (
                <div className="small" style={{ color: "#6b7280" }}>
                  {it.modifiers.map(m => m.name).join(", ")}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {ticket.status === "OPEN" && <button className="btn" style={btnSm} onClick={onProgress}>Start</button>}
        {ticket.status === "IN_PROGRESS" && (
          <>
            <button className="btn" style={btnSm} onClick={onReady}>Mark Ready</button>
          </>
        )}
        {ticket.status === "READY" && (
          <>
            <button className="btn" style={btnSm} onClick={onServe}>Serve</button>
            <button className="btn" style={btnSm} onClick={onRecall}>Recall</button>
          </>
        )}
        {["SERVED"].includes(ticket.status) && (
          <span className="small" style={{ color: "var(--muted)" }}>Completed</span>
        )}
      </div>
    </div>
  );
}

/* ---------------- UI bits ---------------- */
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

/* ---------------- Helpers ---------------- */
function sinceMs(isoOrMs) {
  const t = typeof isoOrMs === "string" ? new Date(isoOrMs).getTime() : Number(isoOrMs || 0);
  const ms = Math.max(0, Date.now() - (Number.isFinite(t) ? t : Date.now()));
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { ms, text: `${m}m ${s}s` };
}
function badgeColor(status) {
  switch (String(status || "").toUpperCase()) {
    case "OPEN": return { bg: "#eff6ff", fg: "#1d4ed8" };
    case "IN_PROGRESS": return { bg: "#fff7ed", fg: "#c2410c" };
    case "READY": return { bg: "#ecfdf5", fg: "#15803d" };
    case "SERVED": return { bg: "#f5f5f5", fg: "#525252" };
    default: return { bg: "#f3f4f6", fg: "#334155" };
  }
}

/* ---------------- Demo data ---------------- */
function demoTickets() {
  const now = Date.now();
  return [
    {
      _id: "k001",
      orderNo: "POS-1007",
      table: { name: "T-02" },
      section: "Indoor",
      status: "OPEN",
      createdAt: new Date(now - 2 * 60 * 1000).toISOString(),
      items: [
        { name: "Tomato Soup", qty: 2 },
        { name: "Garlic Bread", qty: 1, notes: "Extra crispy" },
      ],
    },
    {
      _id: "k002",
      orderNo: "POS-1008",
      table: { name: "T-05" },
      section: "Patio",
      status: "IN_PROGRESS",
      createdAt: new Date(now - 7 * 60 * 1000).toISOString(),
      items: [
        { name: "Paneer Tikka", qty: 1 },
        { name: "Green Salad", qty: 1, modifiers: [{ name: "No onion" }] },
      ],
    },
    {
      _id: "k003",
      orderNo: "POS-1009",
      table: { name: "T-11" },
      section: "Indoor",
      status: "READY",
      createdAt: new Date(now - 12 * 60 * 1000).toISOString(),
      items: [
        { name: "Hakka Noodles", qty: 2 },
        { name: "Spring Rolls", qty: 1 },
      ],
    },
  ];
}

/* ---------------- Inline styles ---------------- */
const gridWrap = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: 12,
};
const card = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 12,
  background: "#fff",
  boxShadow: "0 4px 20px rgba(0,0,0,.04)",
};
const cardHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  marginBottom: 6,
};
const pill = {
  padding: ".15rem .5rem",
  borderRadius: 999,
  fontSize: ".75rem",
  fontWeight: 900,
};
const line = {
  display: "grid",
  gridTemplateColumns: "32px 1fr",
  gap: 8,
  alignItems: "start",
};
const btnSm = { padding: ".3rem .5rem", fontWeight: 700 };
