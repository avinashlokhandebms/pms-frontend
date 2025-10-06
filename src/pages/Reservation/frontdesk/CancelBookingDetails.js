import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import ReservationSidebar, { BackofficeSidebar } from "../../../components/sidebar/ReservationSidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

const PAGE_SIZE = 10;

/**
 * Expected backend (adapt names if different):
 * GET   /api/bookings/cancelled?q=&page=&limit=&from=&to=&propertyCode=
 *   -> { data:[{ _id, bookingNo, propertyCode, guest:{name,mobile,email}, source, roomTypeCode,
 *                checkIn, checkOut, amountTotal, cancelledAt, cancelReason,
 *                refund:{status:"NONE|PENDING|PARTIAL|FULL", amount, method, ref, date},
 *                status:"CANCELLED|NO_SHOW" }], total }
 *
 * PATCH /api/bookings/:id/refund { status, amount, method, ref, date, note }
 * POST  /api/bookings/:id/reinstate {}
 * GET   /api/bookings/:id -> (optional) details for the view modal
 */

export default function CancelBookingDetails() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [propertyCode, setPropertyCode] = useState("");
  const [from, setFrom] = useState(""); // YYYY-MM-DD
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // modals
  const [viewing, setViewing] = useState(null);
  const [refunding, setRefunding] = useState(null);
  const [reinstating, setReinstating] = useState(null);

  // load list
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true); setErr(""); setOk("");
      try {
        const params = new URLSearchParams({ q, page, limit });
        if (propertyCode) params.set("propertyCode", propertyCode.trim().toUpperCase());
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        const res = await apiFetch(`/api/bookings/cancelled?${params.toString()}`, { auth: true });
        const data = res?.data || res?.items || res || [];
        const count = Number(res?.total ?? data.length ?? 0);
        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number.isFinite(count) ? count : 0);
        }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load cancelled bookings."); setRows([]); setTotal(0); }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [q, page, limit, propertyCode, from, to]);

  // client fallback search (if server didn't paginate)
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [
        r.bookingNo,
        r?.guest?.name,
        r?.guest?.mobile,
        r?.guest?.email,
        r.propertyCode,
        r.roomTypeCode,
        r.cancelReason
      ].filter(Boolean).some(v => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  const dataToRender = rows?.length && total > rows.length ? rows : filtered;

  const upsertRow = (saved) => {
    setRows(prev => {
      const id = saved._id || saved.id;
      const idx = prev.findIndex(p => (p._id || p.id) === id);
      if (idx === -1) return [saved, ...prev];
      const next = prev.slice(); next[idx] = saved; return next;
    });
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <ReservationSidebar />

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar" style={{ gap: 8 }}>
          <h2 style={{ margin: 0 }}>Cancel Booking Details</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="res-select"
              placeholder="Search (booking / guest / phone / reason)"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              style={{ minWidth: 280 }}
            />
            <input
              className="res-select"
              placeholder="Property Code"
              value={propertyCode}
              onChange={(e) => { setPropertyCode(e.target.value); setPage(1); }}
              style={{ width: 150, textTransform: "uppercase" }}
            />
            <input
              className="res-select"
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPage(1); }}
              title="Cancelled from (date)"
            />
            <input
              className="res-select"
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setPage(1); }}
              title="Cancelled to (date)"
            />
            <select
              className="res-select"
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              title="Rows per page"
            >
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
          </div>
        </div>

        {err && <Banner type="err">{err}</Banner>}
        {ok && <Banner type="ok">{ok}</Banner>}

        {/* Table */}
        <div className="panel">
          <div className="panel-h">
            <span>Cancelled / No-Show Bookings</span>
            <span className="small" style={{ color: "var(--muted)" }}>
              {loading ? "Loading…" : `Total: ${total || dataToRender.length}`}
            </span>
          </div>

          <div className="panel-b">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 90 }}>Action</th>
                    <th>Booking</th>
                    <th>Guest</th>
                    <th>Property</th>
                    <th>Room Type</th>
                    <th>Stay</th>
                    <th>Amount</th>
                    <th>Cancelled</th>
                    <th>Reason</th>
                    <th>Refund</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={11}>No records found</td></tr>
                  )}

                  {dataToRender.map(r => {
                    const id = r._id || r.id;
                    const nights = calcNights(r.checkIn, r.checkOut);
                    const refundTxt = toRefundText(r.refund);
                    return (
                      <tr key={id}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="btn" style={btnSm} onClick={() => setViewing(r)}>👁</button>
                          <button className="btn" style={btnSm} onClick={() => setRefunding(r)}>₹</button>
                          <button
                            className="btn"
                            style={btnSm}
                            onClick={() => setReinstating(r)}
                            title="Reinstate booking"
                          >
                            ↺
                          </button>
                        </td>
                        <td>
                          <div style={{ fontWeight: 800 }}>{r.bookingNo || "—"}</div>
                          <div className="small" style={{ color: "var(--muted)" }}>{r.source || "—"}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700 }}>{r?.guest?.name || "—"}</div>
                          <div className="small" style={{ color: "var(--muted)" }}>
                            {(r?.guest?.mobile || "—")}{r?.guest?.email ? " · " + r.guest.email : ""}
                          </div>
                        </td>
                        <td style={{ textTransform: "uppercase" }}>{r.propertyCode || "—"}</td>
                        <td>{r.roomTypeCode || "—"}</td>
                        <td>
                          <div>{fmtDate(r.checkIn)} → {fmtDate(r.checkOut)}</div>
                          <div className="small" style={{ color: "var(--muted)" }}>{nights} night(s)</div>
                        </td>
                        <td>{fmtMoney(r.amountTotal)}</td>
                        <td>{fmtDT(r.cancelledAt)}</td>
                        <td title={r.cancelReason || ""}>{r.cancelReason || "—"}</td>
                        <td title={refundTxt}>{refundTxt || "—"}</td>
                        <td><StatusPill value={r.status || "CANCELLED"} /></td>
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

      {/* Modals */}
      {viewing && (
        <ViewModal
          id={viewing._id || viewing.id}
          row={viewing}
          onClose={() => setViewing(null)}
        />
      )}

      {refunding && (
        <RefundModal
          row={refunding}
          onClose={() => setRefunding(null)}
          onSaved={(saved) => { upsertRow(saved); setRefunding(null); setOk("Refund updated."); }}
        />
      )}

      {reinstating && (
        <ReinstateModal
          row={reinstating}
          onClose={() => setReinstating(null)}
          onSaved={(saved) => { upsertRow(saved); setReinstating(null); setOk("Booking reinstated."); }}
        />
      )}
    </div>
  );
}

/* ------------ View Booking (read-only) ------------ */
function ViewModal({ id, row, onClose }) {
  const [details, setDetails] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let ignore = false;
    (async () => {
      setErr("");
      try {
        const res = await apiFetch(`/api/bookings/${id}`, { auth: true });
        if (!ignore) setDetails(res?.data || res || row);
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load details."); setDetails(row); }
      }
    })();
    return () => { ignore = true; };
  }, [id, row]);

  const d = details || row || {};
  const items = d.items || d.rooms || [];

  return (
    <Modal title={`Booking ${d.bookingNo || ""}`} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          <Info label="Guest" value={d?.guest?.name} />
          <Info label="Phone" value={d?.guest?.mobile} />
          <Info label="Email" value={d?.guest?.email} />
          <Info label="Property" value={d.propertyCode} />
          <Info label="Source" value={d.source} />
          <Info label="Status" value={d.status} />
          <Info label="Check-In" value={fmtDT(d.checkIn)} />
          <Info label="Check-Out" value={fmtDT(d.checkOut)} />
          <Info label="Amount" value={fmtMoney(d.amountTotal)} />
          <Info label="Cancelled" value={fmtDT(d.cancelledAt)} />
          <Info label="Reason" value={d.cancelReason} />
          <Info label="Refund" value={toRefundText(d.refund)} />
        </div>

        {!!items?.length && (
          <div className="panel" style={{ marginTop: 8 }}>
            <div className="panel-h">Items</div>
            <div className="panel-b">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Room Type</th>
                      <th>Room</th>
                      <th>Plan</th>
                      <th>Qty</th>
                      <th>Rate</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr key={i}>
                        <td>{it.roomTypeCode || it.roomTypeName || "—"}</td>
                        <td>{it.roomNo || "—"}</td>
                        <td>{it.plan || it.mealPlan || "—"}</td>
                        <td>{it.qty ?? 1}</td>
                        <td>{fmtMoney(it.rate || it.price || 0)}</td>
                        <td>{fmtMoney((it.qty ?? 1) * (it.rate || it.price || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </Modal>
  );
}

/* ------------ Refund Update ------------ */
function RefundModal({ row, onClose, onSaved }) {
  const [status, setStatus] = useState(row?.refund?.status || "PENDING");
  const [amount, setAmount] = useState(row?.refund?.amount ?? 0);
  const [method, setMethod] = useState(row?.refund?.method || "BANK");
  const [ref, setRef] = useState(row?.refund?.ref || "");
  const [date, setDate] = useState(row?.refund?.date ? toISODate(row.refund.date) : toISODate(new Date()));
  const [note, setNote] = useState(row?.refund?.note || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  return (
    <Modal title={`Refund — ${row.bookingNo || ""}`} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(140px, 1fr))" }}>
          <Field label="Status">
            <select className="res-select" value={status} onChange={e => setStatus(e.target.value)}>
              <option>NONE</option>
              <option>PENDING</option>
              <option>PARTIAL</option>
              <option>FULL</option>
            </select>
          </Field>
          <Field label="Amount">
            <input className="input" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(Number(e.target.value || 0))} />
          </Field>
          <Field label="Method">
            <select className="res-select" value={method} onChange={e => setMethod(e.target.value)}>
              <option>BANK</option>
              <option>CARD</option>
              <option>UPI</option>
              <option>CASH</option>
              <option>OTHER</option>
            </select>
          </Field>
        </div>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(140px, 1fr))" }}>
          <Field label="Reference / Txn ID">
            <input className="input" value={ref} onChange={e => setRef(e.target.value)} />
          </Field>
          <Field label="Date">
            <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </Field>
          <Field label="Note">
            <input className="input" value={note} onChange={e => setNote(e.target.value)} />
          </Field>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn"
            disabled={busy}
            onClick={async () => {
              setBusy(true); setErr("");
              try {
                const payload = { status, amount: Number(amount || 0), method, ref, date, note };
                const saved = await apiFetch(`/api/bookings/${row._id || row.id}/refund`, {
                  method: "PATCH", auth: true, body: JSON.stringify(payload),
                });
                onSaved?.(saved);
              } catch (e) { setErr(e?.message || "Failed to update refund."); }
              finally { setBusy(false); }
            }}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ------------ Reinstate ------------ */
function ReinstateModal({ row, onClose, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  return (
    <Modal title={`Reinstate — ${row.bookingNo || ""}`} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      <p style={{ marginTop: 0 }}>
        This will attempt to reinstate the cancelled booking. If the same rooms are unavailable,
        backend should allocate alternatives or fail with a message.
      </p>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button
          className="btn"
          disabled={busy}
          onClick={async () => {
            setBusy(true); setErr("");
            try {
              const saved = await apiFetch(`/api/bookings/${row._id || row.id}/reinstate`, {
                method: "POST", auth: true, body: "{}",
              });
              onSaved?.(saved);
            } catch (e) { setErr(e?.message || "Failed to reinstate."); }
            finally { setBusy(false); }
          }}
        >
          {busy ? "Working…" : "Reinstate"}
        </button>
      </div>
    </Modal>
  );
}

/* ------------ Small UI bits ------------ */
function Info({ label, value }) {
  return (
    <div>
      <div className="small" style={{ color: "var(--muted)", fontWeight: 700 }}>{label}</div>
      <div>{value ?? "—"}</div>
    </div>
  );
}
function Field({ label, required, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span className="label" style={{ fontWeight: 700 }}>
        {label}{required && <span style={{ color: "#b91c1c" }}>*</span>}
      </span>
      {children}
    </label>
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
function StatusPill({ value }) {
  const v = String(value || "CANCELLED").toUpperCase();
  const m = v === "NO_SHOW"
    ? { bg: "#fff7ed", border: "#fed7aa", fg: "#9a3412", text: "No-Show" }
    : { bg: "#f3f4f6", border: "#e5e7eb", fg: "#334155", text: "Cancelled" };
  return (
    <span style={{
      display: "inline-block", padding: ".15rem .5rem",
      borderRadius: 999, background: m.bg, border: `1px solid ${m.border}`,
      color: m.fg, fontSize: ".75rem", fontWeight: 800
    }}>
      {m.text}
    </span>
  );
}

/* ------------ helpers ------------ */
function calcNights(ci, co) {
  if (!ci || !co) return 0;
  const a = new Date(toISODate(ci));
  const b = new Date(toISODate(co));
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}
function fmtDate(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(dt) ? "—" : dt.toLocaleDateString(); }
function fmtDT(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(dt) ? "—" : dt.toLocaleString(); }
function fmtMoney(x) {
  const n = Number(x || 0);
  try { return n.toLocaleString(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 2 }); }
  catch { return `₹${n.toFixed(2)}`; }
}
function toRefundText(rf) {
  if (!rf) return "";
  const status = rf.status || "PENDING";
  const amt = rf.amount != null ? ` ${fmtMoney(rf.amount)}` : "";
  const meth = rf.method ? ` via ${rf.method}` : "";
  const ref = rf.ref ? ` (${rf.ref})` : "";
  return `${status}${amt}${meth}${ref}`.trim();
}
function toISODate(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt)) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* styles */
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(900px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };
