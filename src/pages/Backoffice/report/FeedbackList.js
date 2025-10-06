import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { BackofficeSidebar } from "../../../components/sidebar/backofficesidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

const PAGE_SIZE = 10;
const LS_KEY = "currentPropertyCode";

export default function FeedbackList() {
  const propertyCode = (localStorage.getItem(LS_KEY) || "").toUpperCase();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // query state
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");        // "", "OPEN", "IN_PROGRESS", "RESOLVED"
  const [source, setSource] = useState("");        // e.g. "WEB","APP","OTA","EMAIL","WALKIN"
  const [rating, setRating] = useState("");        // "", "1".."5"
  const [from, setFrom] = useState("");            // createdAt >=
  const [to, setTo] = useState("");                // createdAt <=
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);

  // modals
  const [viewing, setViewing] = useState(null);

  // load list from API
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const params = new URLSearchParams({ q, page, limit, propertyCode });
        if (status) params.set("status", status);
        if (source) params.set("source", source);
        if (rating) params.set("rating", rating);
        if (from) params.set("from", from);
        if (to) params.set("to", to);

        const res = await apiFetch(`/api/feedback?${params.toString()}`, { auth: true });
        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;
        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number(count) || 0);
        }
      } catch (e) {
        if (!ignore) {
          setErr(e?.message || "Failed to load feedback.");
          setRows([]); setTotal(0);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [q, status, source, rating, from, to, page, limit, propertyCode]);

  // client fallback search (if server didn’t paginate)
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [r.guestName, r.email, r.phone, r.message, r.roomNo, r.source]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  const dataToRender = rows?.length && total > rows.length ? rows : filtered;

  const resetFilters = () => {
    setQ(""); setStatus(""); setSource(""); setRating(""); setFrom(""); setTo("");
    setPage(1); setLimit(PAGE_SIZE);
  };

  const exportCsv = async () => {
    try {
      const params = new URLSearchParams({ q, propertyCode, limit: 10000 });
      if (status) params.set("status", status);
      if (source) params.set("source", source);
      if (rating) params.set("rating", rating);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await apiFetch(`/api/feedback?${params.toString()}`, { auth: true });
      const all = res?.data || res?.items || res || [];
      const rowsCsv = [
        [
          "Date", "Guest", "Email", "Phone", "Room",
          "Rating", "Source", "Status", "Message", "Property"
        ].join(","),
        ...all.map(f => [
          csv(f.createdAt ? new Date(f.createdAt).toLocaleString() : ""),
          csv(f.guestName),
          csv(f.email),
          csv(f.phone),
          csv(f.roomNo),
          csv(f.rating),
          csv(f.source),
          csv(f.status),
          csv(f.message),
          csv(f.propertyCode || ""),
        ].join(",")),
      ].join("\n");

      const blob = new Blob([rowsCsv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `feedback_${propertyCode || "ALL"}_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e?.message || "Export failed.");
    }
  };

  const openView = (row) => setViewing(row);

  const saveStatus = async (id, next) => {
    try {
      const saved = await apiFetch(`/api/feedback/${id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ status: next }),
      });
      // reflect in UI
      setRows(prev => prev.map(r => (r._id === id || r.id === id) ? { ...r, status: saved.status } : r));
      setViewing(v => v && (v._id === id || v.id === id) ? { ...v, status: saved.status } : v);
    } catch (e) {
      alert(e?.message || "Failed to update status.");
    }
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <BackofficeSidebar />

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <div>
            <h2 style={{ margin: 0 }}>Report — Feedback List</h2>
            <div className="small" style={{ color: "var(--muted)" }}>
              {propertyCode ? `Property: ${propertyCode}` : "Global"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <input
              className="res-select"
              placeholder="Search name / email / phone / message"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              style={{ minWidth: 280 }}
            />
            <select className="res-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>
            <select className="res-select" value={source} onChange={e => { setSource(e.target.value); setPage(1); }}>
              <option value="">All Sources</option>
              <option value="WEB">WEB</option>
              <option value="APP">APP</option>
              <option value="OTA">OTA</option>
              <option value="EMAIL">EMAIL</option>
              <option value="WALKIN">WALKIN</option>
              <option value="OTHER">OTHER</option>
            </select>
            <select className="res-select" value={rating} onChange={e => { setRating(e.target.value); setPage(1); }}>
              <option value="">All Ratings</option>
              {[5,4,3,2,1].map(n => <option key={n} value={n}>{n}★ & up</option>)}
            </select>
            <input className="res-select" type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} title="From date" />
            <input className="res-select" type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} title="To date" />
            <select className="res-select" value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}>
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
            <button className="btn" onClick={resetFilters}>Reset</button>
            <button className="btn" onClick={exportCsv}>Export CSV</button>
          </div>
        </div>

        {/* Table */}
        <div className="panel">
          <div className="panel-h">
            <span>Feedback</span>
            <span className="small" style={{ color: "var(--muted)" }}>
              {loading ? "Loading…" : `Total: ${total || dataToRender.length}`}
            </span>
          </div>

          <div className="panel-b">
            {err && <Banner type="err">{err}</Banner>}

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 70 }}>Action</th>
                    <th>Date</th>
                    <th>Guest</th>
                    <th>Contact</th>
                    <th>Room</th>
                    <th>Rating</th>
                    <th>Source</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th>Property</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={10}>No feedback found</td></tr>
                  )}

                  {dataToRender?.map(f => {
                    const id = f._id || f.id;
                    return (
                      <tr key={id}>
                        <td>
                          <button className="btn" style={btnSm} onClick={() => openView(f)}>👁️</button>
                        </td>
                        <td title={f.createdAt ? new Date(f.createdAt).toLocaleString() : ""}>{fmtDate(f.createdAt)}</td>
                        <td>{f.guestName || "—"}</td>
                        <td>
                          <div>{f.email || "—"}</div>
                          <div className="small" style={{ color: "var(--muted)" }}>{f.phone || "—"}</div>
                        </td>
                        <td>{f.roomNo || "—"}</td>
                        <td>{renderStars(f.rating)}</td>
                        <td>{f.source || "—"}</td>
                        <td title={f.message || ""} style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {f.message || "—"}
                        </td>
                        <td>
                          <StatusPill value={f.status} />
                        </td>
                        <td>{f.propertyCode || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
              <button className="btn" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>
                ‹ Prev
              </button>
              <span className="small" style={{ alignSelf: "center", color: "var(--muted)" }}>Page {page}</span>
              <button
                className="btn"
                disabled={loading || (!total ? dataToRender.length < limit : page * limit >= total)}
                onClick={() => setPage(p => p + 1)}
              >
                Next ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {viewing && (
        <FeedbackViewModal
          item={viewing}
          onClose={() => setViewing(null)}
          onStatusChange={(next) => saveStatus(viewing._id || viewing.id, next)}
        />
      )}
    </div>
  );
}

/* ---------- Modals & atoms ---------- */
function FeedbackViewModal({ item, onClose, onStatusChange }) {
  const [notes, setNotes] = useState(item?.internalNotes || "");
  const [busy, setBusy] = useState(false);
  const id = item?._id || item?.id;

  const saveNotes = async () => {
    setBusy(true);
    try {
      await apiFetch(`/api/feedback/${id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ internalNotes: notes }),
      });
    } catch (e) {
      alert(e?.message || "Failed to save notes.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Feedback Details" onClose={onClose}>
      <div style={{ display: "grid", gap: 10 }}>
        <div className="small" style={{ color: "var(--muted)" }}>
          {item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"} • {item.propertyCode || "—"}
        </div>

        <div className="panel">
          <div className="panel-h">Guest</div>
          <div className="panel-b">
            <div><b>Name:</b> {item.guestName || "—"}</div>
            <div><b>Email:</b> {item.email || "—"}</div>
            <div><b>Phone:</b> {item.phone || "—"}</div>
            <div><b>Room:</b> {item.roomNo || "—"}</div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-h">Feedback</div>
          <div className="panel-b" style={{ display: "grid", gap: 6 }}>
            <div><b>Rating:</b> {renderStars(item.rating)} ({item.rating || "—"})</div>
            <div><b>Source:</b> {item.source || "—"}</div>
            <div><b>Status:</b> <StatusPill value={item.status} /></div>
            <div><b>Message:</b><div style={{ whiteSpace: "pre-wrap" }}>{item.message || "—"}</div></div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-h">Actions</div>
          <div className="panel-b" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["OPEN", "IN_PROGRESS", "RESOLVED"].map(s => (
              <button
                key={s}
                className="btn"
                onClick={() => onStatusChange?.(s)}
                disabled={item.status === s}
                title={`Mark as ${s}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-h">Internal Notes</div>
          <div className="panel-b" style={{ display: "grid", gap: 8 }}>
            <textarea
              className="input"
              rows={4}
              placeholder="Only staff can see these notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn" onClick={onClose}>Close</button>
              <button className="btn" onClick={saveNotes} disabled={busy}>
                {busy ? "Saving…" : "Save Notes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function StatusPill({ value }) {
  const map = {
    OPEN:   { bg: "#fef3c7", bd: "#fde68a", fg: "#92400e", label: "OPEN" },
    IN_PROGRESS: { bg: "#e0f2fe", bd: "#bae6fd", fg: "#075985", label: "IN PROGRESS" },
    RESOLVED: { bg: "#dcfce7", bd: "#bbf7d0", fg: "#166534", label: "RESOLVED" },
  };
  const s = map[value] || { bg: "#f3f4f6", bd: "#e5e7eb", fg: "#334155", label: value || "—" };
  return (
    <span style={{
      display: "inline-block", padding: ".15rem .5rem",
      borderRadius: 999, background: s.bg, border: `1px solid ${s.bd}`,
      color: s.fg, fontSize: ".75rem", fontWeight: 700,
    }}>
      {s.label}
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

/* ---------- utils ---------- */
function csv(v) {
  const s = (v == null ? "" : String(v));
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function fmtDate(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(dt) ? "—" : dt.toLocaleDateString(); }
function renderStars(n) {
  const x = Math.max(0, Math.min(5, Number(n) || 0));
  return "★★★★★☆☆☆☆☆".slice(5 - x, 10 - x); // quick visual stars
}

/* ---------- styles ---------- */
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(720px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };
