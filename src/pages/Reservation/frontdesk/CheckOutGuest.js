// src/pages/Frontdesk/CheckOutGuest.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import ReservationSidebar, { BackofficeSidebar } from "../../../components/sidebar/ReservationSidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

const PAGE_SIZE = 20;

export default function CheckOutGuest() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // filters
  const [propertyCode, setPropertyCode] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState(toISODate(addDays(new Date(), -1)));
  const [to, setTo] = useState(toISODate(new Date()));
  const [status, setStatus] = useState("DUE"); // DUE | CHECKED_OUT | ALL
  const [applyTick, setApplyTick] = useState(0);

  // selections for bulk actions
  const [sel, setSel] = useState(new Set());

  // confirm dialog state
  const [confirmOne, setConfirmOne] = useState(null); // row

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          from,
          to,
        });
        if (q.trim()) params.set("q", q.trim());
        if (propertyCode.trim()) params.set("propertyCode", propertyCode.trim().toUpperCase());
        if (status && status !== "ALL") params.set("status", status);

        // Backend is expected to return { data, total }
        const res = await apiFetch(`/api/frontdesk/checkouts?${params.toString()}`, { auth: true });
        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;

        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number(count) || 0);
          setSel(new Set()); // clear selection on load
        }
      } catch (e) {
        if (!ignore) {
          setErr(e?.message || "Failed to load check-out list.");
          setRows([]); setTotal(0);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, applyTick]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [
        r.guestName, r.roomNo, r.reservationNo, r.propertyCode, r.status,
        r.company, r.email, r.phone
      ]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  const dataToRender = rows?.length && total > rows.length ? rows : filtered;

  const onApply = () => { setPage(1); setApplyTick(t => t + 1); };

  const toggleSel = (id) => {
    const s = new Set(sel);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSel(s);
  };
  const allIds = dataToRender.map(r => r._id || r.id);
  const isAllSelected = allIds.length > 0 && allIds.every(id => sel.has(id));
  const toggleAll = () => {
    if (isAllSelected) setSel(new Set());
    else setSel(new Set(allIds));
  };

  const doCheckoutOne = async (row) => {
    const id = row._id || row.id;
    await apiFetch(`/api/frontdesk/checkouts/${id}/checkout`, { method: "POST", auth: true });
    // optimistic update
    setRows(prev => prev.map(p => {
      const pid = p._id || p.id;
      return pid === id ? { ...p, status: "CHECKED_OUT", checkedOutAt: new Date().toISOString() } : p;
    }));
    setSel(s => { const ns = new Set(s); ns.delete(id); return ns; });
  };

  const doCheckoutBulk = async () => {
    const ids = Array.from(sel);
    if (ids.length === 0) return;
    await apiFetch(`/api/frontdesk/checkouts/bulk-checkout`, {
      method: "POST", auth: true, body: JSON.stringify({ ids }),
    });
    setRows(prev => prev.map(p => (sel.has(p._id || p.id) ? { ...p, status: "CHECKED_OUT", checkedOutAt: new Date().toISOString() } : p)));
    setSel(new Set());
  };

  const exportCSV = () => {
    const headers = [
      "Property","Status","Room","GuestName","ReservationNo","Company",
      "Nights","Balance","CheckIn","DueOut","CheckedOut","Phone","Email"
    ];
    const body = dataToRender.map(r => [
      safe(r.propertyCode),
      safe(r.status),
      safe(r.roomNo),
      safe(r.guestName),
      safe(r.reservationNo),
      safe(r.company),
      safe(r.nights),
      num(r.balance),
      fmtDT(r.checkInAt),
      fmtDT(r.dueOutAt),
      fmtDT(r.checkedOutAt),
      safe(r.phone),
      safe(r.email),
    ]);
    const csv = toCSV([headers, ...body]);
    downloadText(csv, `checkout-guests-${from}_to_${to}.csv`, "text/csv;charset=utf-8;");
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <ReservationSidebar />

      <div className="res-wrap">
        {/* Filters / Topbar */}
        <div className="res-topbar" style={{ gap: 8, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Check-Out Guests</h2>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="res-select"
              placeholder="Property Code"
              value={propertyCode}
              onChange={(e) => setPropertyCode(e.target.value)}
              style={{ width: 150, textTransform: "uppercase" }}
              title="Optional property"
            />
            <select
              className="res-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              title="Status filter"
            >
              <option value="DUE">Due</option>
              <option value="CHECKED_OUT">Checked-out</option>
              <option value="ALL">All</option>
            </select>
            <input className="res-select" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <input className="res-select" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <input
              className="res-select"
              placeholder="Search (name / room / res no / company)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: 260 }}
            />
            <button className="btn" onClick={onApply} disabled={loading}>Apply</button>
            <button className="btn" onClick={exportCSV} disabled={loading || dataToRender.length === 0}>Export CSV</button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-h">
            <span>Guests {status === "DUE" ? "Due for Check-out" : status === "CHECKED_OUT" ? "(Checked-out)" : ""}</span>
            <span className="small" style={{ color: "var(--muted)" }}>
              {loading ? "Loading…" : `Total: ${total || dataToRender.length}`}
            </span>
          </div>

          <div className="panel-b">
            {err && <Banner type="err">{err}</Banner>}

            {/* Bulk actions */}
            <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
              <button
                className="btn"
                disabled={sel.size === 0 || loading}
                onClick={doCheckoutBulk}
                title="Check-out selected"
              >
                ✓ Bulk Check-out ({sel.size})
              </button>
              <span className="small" style={{ color: "var(--muted)" }}>
                Tip: select rows with the checkboxes to bulk check-out.
              </span>
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleAll}
                        aria-label="Select all"
                      />
                    </th>
                    <th style={{ width: 120 }}>Action</th>
                    <th>Room</th>
                    <th>Guest</th>
                    <th>Reservation</th>
                    <th>Company</th>
                    <th>Nights</th>
                    <th style={{ textAlign: "right" }}>Balance</th>
                    <th>Status</th>
                    <th>Check-in</th>
                    <th>Due-out</th>
                    <th>Checked-out</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={12}>No records</td></tr>
                  )}

                  {dataToRender.map(r => {
                    const id = r._id || r.id;
                    const canCheckout = (r.status || "").toUpperCase() !== "CHECKED_OUT";
                    return (
                      <tr key={id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={sel.has(id)}
                            onChange={() => toggleSel(id)}
                            aria-label={`Select ${r.guestName || "row"}`}
                          />
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button
                            className="btn"
                            style={btnSm}
                            onClick={() => setConfirmOne(r)}
                            disabled={!canCheckout}
                            title={canCheckout ? "Check-out" : "Already checked-out"}
                          >
                            ✓ Check-out
                          </button>
                          <button
                            className="btn"
                            style={btnSm}
                            onClick={() => window.open(`/reservation/booking-details?res=${encodeURIComponent(r.reservationNo || "")}`, "_blank")}
                          >
                            👁 View
                          </button>
                        </td>
                        <td>{r.roomNo || "—"}</td>
                        <td>
                          <div style={{ display: "grid" }}>
                            <strong>{r.guestName || "—"}</strong>
                            <span className="small" style={{ color: "var(--muted)" }}>
                              {r.phone || r.email || "—"}
                            </span>
                          </div>
                        </td>
                        <td>{r.reservationNo || "—"}</td>
                        <td>{r.company || "—"}</td>
                        <td>{r.nights ?? "—"}</td>
                        <td style={{ textAlign: "right" }}>{fmtMoney(r.balance)}</td>
                        <td><StatusChip value={r.status} /></td>
                        <td>{fmtDT(r.checkInAt)}</td>
                        <td>{fmtDT(r.dueOutAt)}</td>
                        <td>{fmtDT(r.checkedOutAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
              <select
                className="res-select"
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                title="Rows per page"
              >
                {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
              </select>
              <button className="btn" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>
                ‹ Prev
              </button>
              <span className="small" style={{ alignSelf: "center", color: "var(--muted)" }}>Page {page}</span>
              <button
                className="btn"
                disabled={loading || (total ? page * limit >= total : dataToRender.length < limit)}
                onClick={() => setPage(p => p + 1)}
              >
                Next ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {confirmOne && (
        <ConfirmModal
          title="Confirm Check-out"
          message={
            <>
              Check-out <strong>{confirmOne.guestName || "guest"}</strong>
              {confirmOne.roomNo ? ` (Room ${confirmOne.roomNo})` : ""}?
            </>
          }
          confirmText="Check-out"
          onClose={() => setConfirmOne(null)}
          onConfirm={async () => {
            await doCheckoutOne(confirmOne);
            setConfirmOne(null);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Tiny UI ---------- */
function StatusChip({ value }) {
  const v = (value || "").toUpperCase();
  const isOut = v === "CHECKED_OUT";
  const style = isOut
    ? { background: "#dcfce7", border: "1px solid #bbf7d0", color: "#166534" }
    : { background: "#fef9c3", border: "1px solid #fde68a", color: "#92400e" }; // due
  return (
    <span style={{ ...style, display: "inline-block", padding: ".15rem .5rem", borderRadius: 999, fontSize: ".75rem", fontWeight: 800 }}>
      {isOut ? "CHECKED-OUT" : "DUE"}
    </span>
  );
}

function Banner({ type = "ok", children }) {
  const style = type === "err"
    ? { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }
    : { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
  return <div style={{ ...style, padding: "8px 10px", borderRadius: 10, fontWeight: 700, marginBottom: 10 }}>{children}</div>;
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
          onClick={async () => {
            setBusy(true);
            try { await onConfirm?.(); } finally { setBusy(false); }
          }}
        >
          {busy ? "Working…" : confirmText}
        </button>
      </div>
    </Modal>
  );
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

/* ---------- helpers ---------- */
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(700px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };

function addDays(d, n) { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt; }
function toISODate(d) {
  const dt = new Date(d);
  if (Number.isNaN(+dt)) return "";
  const y = dt.getFullYear(), m = String(dt.getMonth() + 1).padStart(2, "0"), day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fmtDT(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(+dt) ? "—" : dt.toLocaleString(); }
function fmtMoney(n) { const v = Number(n || 0); try { return v.toLocaleString(undefined, { style: "currency", currency: "INR" }); } catch { return v.toFixed(2); } }
function num(x) { const v = Number(x); return Number.isFinite(v) ? v : ""; }
function safe(x) { return x == null ? "" : String(x).replace(/\r?\n/g, " ").trim(); }

function toCSV(rows) {
  return rows.map(r =>
    r.map((cell) => {
      const c = cell == null ? "" : String(cell);
      if (/[",\n]/.test(c)) return `"${c.replace(/"/g, '""')}"`;
      return c;
    }).join(",")
  ).join("\n");
}
function downloadText(text, filename, mime = "text/plain;charset=utf-8;") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
}
