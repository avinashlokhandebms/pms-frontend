import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiFetch } from "../../../lib/api";
import ReservationSidebar, { BackofficeSidebar } from "../../../components/sidebar/ReservationSidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";


/**
 * Expected backend (shape, feel free to adapt):
 * GET    /api/checkins/:id                 -> { _id, status, propertyCode, guest:{name,mobile,email}, arrival, departure, nights, adults, children, roomTypeCode, roomNo, rate:{planCode, base}, remarks }
 * GET    /api/checkins/:id/folio           -> { data:[{_id, ts, kind:"CHARGE"|"PAYMENT", desc, amount}], total }
 * POST   /api/checkins/:id/extend          -> body { newDeparture } -> returns updated stay
 * POST   /api/checkins/:id/move-room       -> body { roomNo }       -> returns updated stay
 * POST   /api/checkins/:id/charges         -> body { desc, amount } -> returns created charge row
 * POST   /api/checkins/:id/payments        -> body { mode, amount } -> returns created payment row
 * POST   /api/checkins/:id/checkout        -> body {}               -> returns { ok:true, stay }
 * GET    /api/rooms?propertyCode=..&status=VACANT&from=..&to=..&roomType=.. (for move-room modal)
 */

export default function CheckInGuestDetails() {
  const navigate = useNavigate();
  const { id: idFromParams } = useParams();
  const [sp] = useSearchParams();
  const id = idFromParams || sp.get("id");

  const [stay, setStay] = useState(null);
  const [folio, setFolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // action modals
  const [showExtend, setShowExtend] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [showCharge, setShowCharge] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  const printRef = useRef(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!id) { setErr("Missing check-in id."); setLoading(false); return; }
      setLoading(true); setErr(""); setOk("");
      try {
        const st = await apiFetch(`/api/checkins/${id}`, { auth: true });
        const fo = await apiFetch(`/api/checkins/${id}/folio`, { auth: true });
        if (!ignore) {
          setStay(st || null);
          setFolio(fo?.data || fo || []);
        }
      } catch (e) {
        if (!ignore) setErr(e?.message || "Failed to load guest details.");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [id]);

  const totals = useMemo(() => {
    let charges = 0, payments = 0;
    for (const r of folio || []) {
      const amt = Number(r.amount || 0);
      if ((r.kind || "").toUpperCase() === "PAYMENT") payments += amt;
      else charges += amt;
    }
    return {
      charges,
      payments,
      balance: round2(charges - payments),
    };
  }, [folio]);

  const canAct = useMemo(() => (stay?.status || "").toUpperCase() === "INHOUSE" || (stay?.status || "").toUpperCase() === "CHECKEDIN", [stay]);

  function refreshFolioSoft() {
    // re-pull folio quickly after an action
    (async () => {
      try {
        const fo = await apiFetch(`/api/checkins/${id}/folio`, { auth: true });
        setFolio(fo?.data || fo || []);
      } catch {}
    })();
  }

  function printSlip() {
    const el = printRef.current;
    if (!el) return;
    const w = window.open("", "PRINT", "height=800,width=700");
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>Check-in Details</title>
          <style>
            body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#111; }
            .card { padding: 20px; }
            .h { font-weight:900; font-size: 1.15rem; margin: 0 0 10px; text-align:center; }
            .sub { text-align:center; color:#555; margin-bottom: 14px; }
            table { width:100%; border-collapse: collapse; }
            td, th { padding: 6px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
            .lbl { width: 220px; font-weight: 700; }
            .muted { color:#6b7280; font-size:.85rem; }
            .totals { margin-top: 10px; }
            .right { text-align:right; }
          </style>
        </head>
        <body>${el.innerHTML}</body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  }

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <ReservationSidebar/>

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>Check-In — Guest Details</h2>
            {stay?.status && (
              <span className="small" style={{
                padding: ".15rem .5rem", borderRadius: 999, border: "1px solid #e5e7eb",
                background: "#f3f4f6", fontWeight: 800
              }}>
                {String(stay.status).toUpperCase()}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn" onClick={() => navigate(-1)}>← Back</button>
            <button className="btn" onClick={printSlip} disabled={!stay}>🖨 Print</button>
            <button className="btn" onClick={() => setShowExtend(true)} disabled={!canAct}>⏱ Extend</button>
            <button className="btn" onClick={() => setShowMove(true)} disabled={!canAct}>🔁 Move Room</button>
            <button className="btn" onClick={() => setShowCharge(true)} disabled={!canAct}>➕ Charge</button>
            <button className="btn" onClick={() => setShowPayment(true)} disabled={!canAct}>💳 Payment</button>
            <button className="btn" onClick={() => setShowCheckout(true)} disabled={!canAct || totals.balance > 0}>✅ Checkout</button>
          </div>
        </div>

        {err && <Banner type="err">{err}</Banner>}
        {ok && <Banner type="ok">{ok}</Banner>}

        {/* Summary card */}
        <div className="panel">
          <div className="panel-h">Stay Summary</div>
          <div className="panel-b">
            {loading && <div className="small">Loading…</div>}
            {!loading && !stay && <div className="small">No data.</div>}

            {stay && (
              <div ref={printRef}>
                <div className="card">
                  <div className="h">{stay.guest?.name || "Guest"}</div>
                  <div className="sub">Property: {stay.propertyCode || "—"}</div>

                  <table>
                    <tbody>
                      <TR label="Contact">{[(stay.guest?.mobile || "—"), (stay.guest?.email || "—")].join(" / ")}</TR>
                      <TR label="Stay">
                        {[
                          "In: " + fmtDateTime(stay.arrival),
                          "Out: " + fmtDateTime(stay.departure),
                          `${stay.nights || diffDays(stay.arrival, stay.departure)} night(s)`,
                          `${stay.adults || 1} Adult(s), ${stay.children || 0} Child(ren)`,
                        ].join(" · ")}
                      </TR>
                      <TR label="Room">{(stay.roomTypeCode || "—") + " / " + (stay.roomNo || "—")}</TR>
                      <TR label="Rate">{(stay.rate?.planCode || "—") + " · " + (stay.rate?.base ? fmtMoney(stay.rate.base) : "—")}</TR>
                      <TR label="Remarks">{stay.remarks || "—"}</TR>
                    </tbody>
                  </table>

                  {/* Folio snapshot */}
                  <div style={{ marginTop: 14, fontWeight: 900 }}>Folio</div>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 140 }}>Date/Time</th>
                        <th>Description</th>
                        <th style={{ width: 120 }} className="right">Charge</th>
                        <th style={{ width: 120 }} className="right">Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(folio || []).map(r => (
                        <tr key={r._id || r.id}>
                          <td>{fmtDateTime(r.ts || r.date)}</td>
                          <td>{r.desc || r.description || r.note || "—"}</td>
                          <td className="right">
                            {((r.kind || "").toUpperCase() === "PAYMENT") ? "—" : fmtMoney(r.amount)}
                          </td>
                          <td className="right">
                            {((r.kind || "").toUpperCase() === "PAYMENT") ? fmtMoney(r.amount) : "—"}
                          </td>
                        </tr>
                      ))}
                      {(!folio || folio.length === 0) && (
                        <tr><td colSpan={4} className="small">No folio entries yet.</td></tr>
                      )}
                    </tbody>
                  </table>

                  <table className="totals">
                    <tbody>
                      <tr>
                        <td className="lbl">Total Charges</td>
                        <td className="right">{fmtMoney(totals.charges)}</td>
                      </tr>
                      <tr>
                        <td className="lbl">Total Payments</td>
                        <td className="right">{fmtMoney(totals.payments)}</td>
                      </tr>
                      <tr>
                        <td className="lbl"><strong>Balance</strong></td>
                        <td className="right"><strong>{fmtMoney(totals.balance)}</strong></td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="muted" style={{ marginTop: 8 }}>
                    Note: Please settle balance before checkout. Printed on {new Date().toLocaleString()}.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Modals */}
        {showExtend && <ExtendModal stay={stay} onClose={() => setShowExtend(false)} onDone={(s) => { setStay(s); setOk("Stay extended."); setShowExtend(false); }} />}
        {showMove && <MoveRoomModal stay={stay} onClose={() => setShowMove(false)} onDone={(s) => { setStay(s); setOk("Room moved."); setShowMove(false); }} />}
        {showCharge && <ChargeModal id={id} onClose={() => setShowCharge(false)} onDone={(row) => { setFolio(prev => [row, ...prev]); setOk("Charge posted."); setShowCharge(false); }} />}
        {showPayment && <PaymentModal id={id} onClose={() => setShowPayment(false)} onDone={(row) => { setFolio(prev => [row, ...prev]); setOk("Payment posted."); setShowPayment(false); }} />}
        {showCheckout && <CheckoutModal id={id} disabled={totals.balance > 0} onClose={() => setShowCheckout(false)} onDone={(s) => { setStay(s); setOk("Checked out."); setShowCheckout(false); refreshFolioSoft(); }} />}
      </div>
    </div>
  );
}

/* ----------------- Extend Stay ----------------- */
function ExtendModal({ stay, onClose, onDone }) {
  const [newDeparture, setNewDeparture] = useState(stay?.departure ? toISODate(stay.departure) : toISODate(addDays(new Date(), 1)));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  return (
    <Modal title="Extend Stay" onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      <div style={{ display: "grid", gap: 12 }}>
        <Field label="New Departure" required>
          <input className="input" type="date" value={newDeparture} onChange={e => setNewDeparture(e.target.value)} />
        </Field>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn"
            disabled={busy}
            onClick={async () => {
              setBusy(true); setErr("");
              try {
                const res = await apiFetch(`/api/checkins/${stay._id || stay.id}/extend`, {
                  method: "POST", auth: true, body: JSON.stringify({ newDeparture })
                });
                onDone?.(res || stay);
              } catch (e) {
                setErr(e?.message || "Failed to extend stay.");
              } finally { setBusy(false); }
            }}
          >
            {busy ? "Working…" : "Extend"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ----------------- Move Room ----------------- */
function MoveRoomModal({ stay, onClose, onDone }) {
  const [rooms, setRooms] = useState([]);
  const [roomNo, setRoomNo] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const qs = new URLSearchParams({
          propertyCode: stay?.propertyCode || "",
          status: "VACANT",
          from: toISODate(stay?.arrival || new Date()),
          to: toISODate(stay?.departure || addDays(new Date(), 1)),
          roomType: stay?.roomTypeCode || "",
        });
        const res = await apiFetch(`/api/rooms?${qs.toString()}`, { auth: true });
        const list = res?.data || res || [];
        if (!ignore) {
          setRooms(list);
          const first = list?.[0];
          const no = first?.roomNo || first?.number || first?.code || "";
          setRoomNo(no);
        }
      } catch { if (!ignore) setRooms([]); }
    })();
    return () => { ignore = true; };
  }, [stay]);

  return (
    <Modal title="Move Room" onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      <div style={{ display: "grid", gap: 12 }}>
        <Field label="New Room" required>
          <select className="res-select" value={roomNo} onChange={e => setRoomNo(e.target.value)}>
            <option value="">— Choose —</option>
            {rooms.map(r => {
              const no = r.roomNo || r.number || r.code;
              const label = `${no}${r.roomTypeName ? " · " + r.roomTypeName : ""}`;
              return <option key={no} value={no}>{label}</option>;
            })}
          </select>
        </Field>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn"
            disabled={!roomNo || busy}
            onClick={async () => {
              setBusy(true); setErr("");
              try {
                const res = await apiFetch(`/api/checkins/${stay._id || stay.id}/move-room`, {
                  method: "POST", auth: true, body: JSON.stringify({ roomNo })
                });
                onDone?.(res || stay);
              } catch (e) {
                setErr(e?.message || "Failed to move room.");
              } finally { setBusy(false); }
            }}
          >
            {busy ? "Working…" : "Move"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ----------------- Post Charge ----------------- */
function ChargeModal({ id, onClose, onDone }) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  return (
    <Modal title="Post Charge" onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      <div style={{ display: "grid", gap: 12 }}>
        <Field label="Description" required>
          <input className="input" value={desc} onChange={e => setDesc(e.target.value)} />
        </Field>
        <Field label="Amount" required>
          <input className="input" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
        </Field>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn"
            disabled={!desc.trim() || Number(amount) <= 0 || busy}
            onClick={async () => {
              setBusy(true); setErr("");
              try {
                const row = await apiFetch(`/api/checkins/${id}/charges`, {
                  method: "POST", auth: true, body: JSON.stringify({ desc: desc.trim(), amount: Number(amount) })
                });
                onDone?.(row);
              } catch (e) {
                setErr(e?.message || "Failed to post charge.");
              } finally { setBusy(false); }
            }}
          >
            {busy ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ----------------- Post Payment ----------------- */
function PaymentModal({ id, onClose, onDone }) {
  const [mode, setMode] = useState("CASH");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  return (
    <Modal title="Post Payment" onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      <div style={{ display: "grid", gap: 12 }}>
        <Field label="Mode">
          <select className="res-select" value={mode} onChange={e => setMode(e.target.value)}>
            <option>CASH</option>
            <option>CARD</option>
            <option>UPI</option>
            <option>BANK</option>
            <option>WALLET</option>
          </select>
        </Field>
        <Field label="Amount" required>
          <input className="input" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
        </Field>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn"
            disabled={Number(amount) <= 0 || busy}
            onClick={async () => {
              setBusy(true); setErr("");
              try {
                const row = await apiFetch(`/api/checkins/${id}/payments`, {
                  method: "POST", auth: true, body: JSON.stringify({ mode, amount: Number(amount) })
                });
                onDone?.(row);
              } catch (e) {
                setErr(e?.message || "Failed to post payment.");
              } finally { setBusy(false); }
            }}
          >
            {busy ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ----------------- Checkout ----------------- */
function CheckoutModal({ id, onClose, onDone, disabled }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  return (
    <Modal title="Confirm Checkout" onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      <p style={{ marginTop: 0 }}>
        Are you sure you want to checkout this guest? This will close the stay and finalize the folio.
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button
          className="btn"
          disabled={busy || disabled}
          onClick={async () => {
            setBusy(true); setErr("");
            try {
              const res = await apiFetch(`/api/checkins/${id}/checkout`, { method: "POST", auth: true, body: "{}" });
              onDone?.(res?.stay || res);
            } catch (e) {
              setErr(e?.message || "Failed to checkout.");
            } finally { setBusy(false); }
          }}
        >
          {busy ? "Working…" : "Checkout"}
        </button>
      </div>
      {disabled && <div className="small" style={{ marginTop: 8, color: "#991b1b" }}>Settle balance before checkout.</div>}
    </Modal>
  );
}

/* ----------------- tiny UI / helpers ----------------- */
function TR({ label, children }) {
  return (
    <tr>
      <td className="lbl">{label}</td>
      <td>{children}</td>
    </tr>
  );
}
function Field({ label, children, required }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span className="label" style={{ fontWeight: 700 }}>
        {label} {required && <span style={{ color: "#b91c1c" }}>*</span>}
      </span>
      {children}
    </label>
  );
}
function Banner({ type = "ok", children }) {
  const style = type === "err"
    ? { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }
    : { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
  // fix tiny typo in border color for ok:
  if (type !== "err") style.border = "1px solid #bbf7d0";
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
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(720px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };

function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d) ? "—" : d.toLocaleString();
}
function toISODate(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(d, n) { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt; }
function diffDays(aISO, bISO) {
  const a = new Date(aISO), b = new Date(bISO);
  if (Number.isNaN(a) || Number.isNaN(b)) return 1;
  return Math.max(1, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}
function round2(n) { return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100; }
function fmtMoney(n) {
  const v = Number(n || 0);
  if (!v) return "—";
  return v.toLocaleString(undefined, { style: "currency", currency: "INR" });
}
