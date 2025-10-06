// src/pages/pos/ReprintKOT.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import PosSidebar from "../../../components/sidebar/Possidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

const PAGE_SIZE = 20;

export default function ReprintKOT() {
  // Filters
  const [outlets, setOutlets] = useState([]);
  const [stations, setStations] = useState([]);
  const [outletId, setOutletId] = useState("");
  const [stationId, setStationId] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState(() => isoDate(new Date()));        // today by default
  const [to, setTo] = useState(() => isoDate(new Date()));            // today

  // Data
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // Reprint controls
  const [copies, setCopies] = useState(1);
  const [targetPrinter, setTargetPrinter] = useState(""); // optional override
  const [selected, setSelected] = useState(() => new Set());

  /* ---------- Load lookups ---------- */
  useEffect(() => {
    (async () => {
      // Outlets
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
        if (list.length && !stationId) setStationId("");
      } catch {
        setStations([{ _id: "k1", name: "Hot Kitchen" }, { _id: "k2", name: "Cold/Salad" }]);
      }
    })();
  }, [outletId]); // eslint-disable-line

  /* ---------- Load KOT history ---------- */
  const load = async () => {
    if (!outletId) return;
    setLoading(true); setErr(""); setOk("");
    try {
      const params = new URLSearchParams({
        outletId,
        stationId: stationId || "",
        from: from || "",
        to: to || "",
        q: q || "",
        page: String(page),
        limit: String(limit),
      });
      const res = await apiFetch(`/api/pos/kot/history?${params.toString()}`, { auth: true });
      const items = res?.data || res?.items || res || [];
      setRows(Array.isArray(items) ? items : []);
      setTotal(Number(res?.total ?? items.length ?? 0) || 0);
      setSelected(new Set()); // clear selection on fresh load
    } catch (e) {
      // Demo fallback
      const items = demoKots().filter((x) => (!stationId || x.stationId === stationId));
      setRows(items);
      setTotal(items.length);
      setErr(e?.message || "API not reachable, showing demo data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [outletId, stationId, from, to, page, limit]);
  const filtered = useMemo(() => clientFilter(rows, q), [rows, q]);

  /* ---------- Reprint actions ---------- */
  const reprintOne = async (id) => {
    setErr(""); setOk("");
    try {
      const body = { copies: Number(copies || 1), printer: targetPrinter || undefined };
      await apiFetch(`/api/pos/kot/${id}/reprint`, { method: "POST", auth: true, body: JSON.stringify(body) });
      setOk(`Reprint sent (copies: ${body.copies}).`);
    } catch (e) {
      setErr(e?.message || "Failed to reprint.");
    }
  };

  const reprintSelected = async () => {
    if (!selected.size) return;
    setErr(""); setOk("");
    try {
      const body = { ids: Array.from(selected), copies: Number(copies || 1), printer: targetPrinter || undefined };
      await apiFetch(`/api/pos/kot/reprint-batch`, { method: "POST", auth: true, body: JSON.stringify(body) });
      setOk(`Reprint sent for ${body.ids.length} ticket(s).`);
    } catch (e) {
      setErr(e?.message || "Batch reprint failed.");
    }
  };

  /* ---------- UI helpers ---------- */
  const toggleAll = (checked) => {
    if (checked) setSelected(new Set(filtered.map((r) => r._id || r.id)));
    else setSelected(new Set());
  };
  const toggleRow = (id, checked) => {
    const s = new Set(selected);
    checked ? s.add(id) : s.delete(id);
    setSelected(s);
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <PosSidebar />

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Reprint KOT</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select className="res-select" value={outletId} onChange={(e) => { setOutletId(e.target.value); setPage(1); }}>
              {outlets.map((o) => <option key={o._id || o.id} value={o._id || o.id}>{o.name}</option>)}
            </select>

            <select className="res-select" value={stationId} onChange={(e) => { setStationId(e.target.value); setPage(1); }}>
              <option value="">All Stations</option>
              {stations.map((s) => <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>)}
            </select>

            <label className="small" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              From
              <input className="res-select" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
            </label>
            <label className="small" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              To
              <input className="res-select" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
            </label>

            <input
              className="res-select"
              placeholder="Search (order / table / item / user)"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              style={{ minWidth: 260 }}
            />

            <input
              className="res-select"
              type="number" min="1"
              title="Copies"
              value={copies}
              onChange={(e) => setCopies(Math.max(1, Number(e.target.value || 1)))}
              style={{ width: 90 }}
            />
            <input
              className="res-select"
              placeholder="Printer (optional)"
              value={targetPrinter}
              onChange={(e) => setTargetPrinter(e.target.value)}
              style={{ width: 180 }}
              title="Override printer name/queue"
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

        {/* Table */}
        <div className="panel">
          <div className="panel-h">
            <span>Printed KOTs</span>
            <span className="small" style={{ color: "var(--muted)" }}>
              {loading ? "Loading…" : `Total: ${total || filtered.length}`}
            </span>
          </div>

          <div className="panel-b">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
          type="checkbox"
          checked={filtered.length > 0 && selected.size === filtered.length}
          onChange={(e) => toggleAll(e.target.checked)}
        />
        <span className="small">Select All</span>
              </label>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn"
                  onClick={reprintSelected}
                  disabled={selected.size === 0}
                  title="Reprint selected rows"
                >
                  Reprint Selected ({selected.size})
                </button>
              </div>
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}></th>
                    <th style={{ width: 90 }}>Action</th>
                    <th>Time</th>
                    <th>Order #</th>
                    <th>Table</th>
                    <th>Station</th>
                    <th>Items</th>
                    <th>Status</th>
                    <th>Printed To</th>
                    <th>User</th>
                  </tr>
                </thead>
                <tbody>
                  {(!filtered || filtered.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={10}>No records</td></tr>
                  )}

                  {filtered.map((r) => {
                    const id = r._id || r.id;
                    const checked = selected.has(id);
                    return (
                      <tr key={id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => toggleRow(id, e.target.checked)}
                          />
                        </td>
                        <td>
                          <button className="btn" style={btnSm} onClick={() => reprintOne(id)}>Reprint</button>
                        </td>
                        <td>{fmtDateTime(r.createdAt)}</td>
                        <td>{r.orderNo || id}</td>
                        <td>{r.table?.name || r.tableName || "—"}</td>
                        <td>{r.stationName || "—"}</td>
                        <td>{(r.items || []).reduce((n, it) => n + Number(it.qty || 1), 0)}</td>
                        <td><StatusPill value={r.status} /></td>
                        <td>{r.printerName || r.stationPrinter || "—"}</td>
                        <td>{r.userName || r.user?.name || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
              <select className="res-select" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
                {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}/page</option>)}
              </select>
              <button className="btn" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹ Prev</button>
              <span className="small" style={{ alignSelf: "center", color: "var(--muted)" }}>Page {page}</span>
              <button
                className="btn"
                disabled={loading || (total ? page * limit >= total : filtered.length < limit)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Small UI bits ---------- */
function Banner({ type = "ok", children }) {
  const style = type === "err"
    ? { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }
    : { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
  return <div style={{ ...style, padding: "8px 10px", borderRadius: 10, fontWeight: 700 }}>{children}</div>;
}
function StatusPill({ value }) {
  const v = String(value || "").toUpperCase();
  const map = {
    OPEN: { bg: "#eff6ff", fg: "#1d4ed8" },
    IN_PROGRESS: { bg: "#fff7ed", fg: "#c2410c" },
    READY: { bg: "#ecfdf5", fg: "#15803d" },
    SERVED: { bg: "#f5f5f5", fg: "#525252" },
    VOID: { bg: "#fef2f2", fg: "#b91c1c" },
  };
  const c = map[v] || { bg: "#f3f4f6", fg: "#334155" };
  return <span style={{ padding: ".15rem .5rem", borderRadius: 999, background: c.bg, color: c.fg, fontSize: ".75rem", fontWeight: 900 }}>{v || "—"}</span>;
}

/* ---------- Helpers ---------- */
function isoDate(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function fmtDateTime(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return Number.isNaN(dt) ? "—" : `${dt.toLocaleDateString()} ${dt.toLocaleTimeString()}`;
}
function clientFilter(items, term) {
  const t = String(term || "").trim().toLowerCase();
  if (!t) return items;
  return items.filter((r) =>
    [
      r.orderNo,
      r.table?.name,
      r.tableName,
      r.stationName,
      r.userName,
      ...(r.items || []).map((it) => it.name),
    ]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(t))
  );
}

/* ---------- Demo fallback data ---------- */
function demoKots() {
  const now = Date.now();
  return [
    {
      _id: "d1",
      orderNo: "POS-1010",
      table: { name: "T-01" },
      stationId: "k1",
      stationName: "Hot Kitchen",
      status: "READY",
      printerName: "Kitchen_Printer_1",
      userName: "John",
      createdAt: new Date(now - 3 * 60 * 1000).toISOString(),
      items: [{ name: "Tomato Soup", qty: 2 }, { name: "Garlic Bread", qty: 1 }],
    },
    {
      _id: "d2",
      orderNo: "POS-1011",
      table: { name: "T-03" },
      stationId: "k2",
      stationName: "Cold/Salad",
      status: "SERVED",
      printerName: "Kitchen_Printer_2",
      userName: "Asha",
      createdAt: new Date(now - 45 * 60 * 1000).toISOString(),
      items: [{ name: "Green Salad", qty: 1 }, { name: "Lemonade", qty: 2 }],
    },
  ];
}

const btnSm = { padding: ".3rem .5rem", fontWeight: 700 };
