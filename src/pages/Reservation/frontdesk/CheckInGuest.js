import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../../../lib/api";
import ReservationSidebar, { BackofficeSidebar } from "../../../components/sidebar/ReservationSidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";
import ReservationStatusView from "../ReservationStatusView";

export default function CheckInGuest() {
  // Property scope
  const [properties, setProperties] = useState([]);
  const [propertyCode, setPropertyCode] = useState("");

  // Search / reservation
  const [q, setQ] = useState("");
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // Room assignment
  const [rooms, setRooms] = useState([]);
  const [roomNo, setRoomNo] = useState("");

  // Guest verification / extras
  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [remarks, setRemarks] = useState("");

  // Payment (optional on check-in)
  const [payMode, setPayMode] = useState("CASH");
  const [payAmount, setPayAmount] = useState(0);

  // Print slip
  const printRef = useRef(null);

  // Load properties first
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await apiFetch("/api/properties?limit=500", { auth: true });
        const list = res?.data || res?.items || (Array.isArray(res) ? res : []);
        if (!ignore) {
          setProperties(list || []);
          if (!propertyCode && list?.[0]?.code) {
            setPropertyCode(String(list[0].code).toUpperCase());
          }
        }
      } catch { /* ignore */ }
    })();
    return () => { ignore = true; };
  }, []); // mount

  // Pre-fill form fields from reservation
  useEffect(() => {
    if (!reservation) return;
    setRoomNo(reservation.roomNo || "");
    setIdType(reservation.identity?.type || "");
    setIdNumber(reservation.identity?.number || "");
    setVehicleNo(reservation.vehicleNo || "");
    setRemarks(reservation.remarks || "");
    // refresh rooms for this room type if present
    loadAvailableRooms(reservation?.roomTypeCode || "");
  }, [reservation]);

  const hotelTitle = useMemo(() => {
    const p = properties.find(pp => (pp.code || "").toUpperCase() === (propertyCode || "").toUpperCase());
    return p ? `${p.name} (${p.code})` : propertyCode || "Property";
  }, [properties, propertyCode]);

  const searchReservation = async () => {
    setErr(""); setOk("");
    if (!q.trim()) { setErr("Enter Booking # / Guest / Mobile to search."); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: q.trim(), limit: 1 });
      if (propertyCode) params.set("propertyCode", propertyCode);
      const res = await apiFetch(`/api/reservations?${params.toString()}`, { auth: true });
      const list = res?.data || res?.items || (Array.isArray(res) ? res : []);
      const r = list?.[0];
      if (!r) { setReservation(null); setErr("No reservation found."); return; }
      setReservation(r);
      setOk(`Loaded booking ${r.bookingCode || r.code || r._id}`);
    } catch (e) {
      setReservation(null);
      setErr(e?.message || "Failed to search reservation.");
    } finally { setLoading(false); }
  };

  async function loadAvailableRooms(roomTypeCode = "") {
    if (!propertyCode) return;
    try {
      const params = new URLSearchParams({ propertyCode, status: "VACANT" });
      if (roomTypeCode) params.set("roomType", roomTypeCode);
      // Expected: GET /api/rooms?propertyCode=...&status=VACANT&roomType=DLX
      const res = await apiFetch(`/api/rooms?${params.toString()}`, { auth: true });
      const data = res?.data || res?.items || (Array.isArray(res) ? res : []);
      setRooms(Array.isArray(data) ? data : []);
    } catch {
      setRooms([]);
    }
  }

  const doCheckIn = async () => {
    setErr(""); setOk("");
    if (!reservation?._id) return setErr("No reservation loaded.");
    if (!roomNo) return setErr("Select/enter a room number.");
    // Optional: basic ID validation (uncomment if you want to enforce)
    // if (!idType || !idNumber) return setErr("Identity Type & Number are required.");

    try {
      const payload = {
        propertyCode: propertyCode || reservation.propertyCode,
        roomNo,
        identity: { type: idType, number: idNumber },
        vehicleNo,
        remarks,
        payment: Number(payAmount) > 0 ? { mode: payMode, amount: Number(payAmount) } : undefined,
      };
      // Expected API:
      // PATCH /api/reservations/:id/checkin  -> returns updated reservation
      const updated = await apiFetch(`/api/reservations/${reservation._id || reservation.id}/checkin`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify(payload),
      });
      setReservation(updated || reservation);
      setOk("Guest checked in successfully.");
      // Remove assigned room from vacancy list
      setRooms(prev => prev.filter(r => (r.roomNo || r.number) !== roomNo));
    } catch (e) {
      setErr(e?.message || "Check-in failed.");
    }
  };

  const balDue = useMemo(() => calcDue(reservation), [reservation]);

  const printSlip = () => {
    const el = printRef.current;
    if (!el) return;
    const w = window.open("", "PRINT", "height=800,width=700");
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>Check-in Slip</title>
          <style>
            body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#111; }
            .card { padding: 20px; }
            .h { font-weight:900; font-size: 1.1rem; margin: 0 0 10px; text-align:center; }
            .sub { text-align:center; color:#555; margin-bottom: 14px; }
            table { width:100%; border-collapse: collapse; }
            td { padding: 6px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
            .lbl { width: 220px; font-weight: 700; }
            .sign { margin-top: 34px; display:flex; justify-content:space-between; }
            .line { margin-top: 42px; border-top:1px dashed #999; width:240px; text-align:center; padding-top:6px; }
            .muted { color:#6b7280; font-size:.85rem; }
          </style>
        </head>
        <body>${el.innerHTML}</body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <ReservationSidebar/>
      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Check-In Guest</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select
              className="res-select"
              value={propertyCode}
              onChange={(e) => setPropertyCode(e.target.value)}
              title="Property"
            >
              {properties.map(p => (
                <option key={p.code} value={String(p.code).toUpperCase()}>
                  {p.code} — {p.name}
                </option>
              ))}
              {properties.length === 0 && <option value="">Select Property</option>}
            </select>

            <input
              className="res-select"
              placeholder="Booking # / Guest / Mobile"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: 260 }}
            />
            <button className="btn" disabled={loading} onClick={searchReservation}>
              {loading ? "Searching…" : "Load Booking"}
            </button>
            <button className="btn" onClick={() => reservation && loadAvailableRooms(reservation.roomTypeCode || "")} disabled={!reservation}>
              Refresh Rooms
            </button>
            <button className="btn" onClick={doCheckIn} disabled={!reservation}>
              ✅ Check In
            </button>
            <button className="btn" onClick={printSlip} disabled={!reservation}>
              🖨 Print
            </button>
          </div>
        </div>

        {/* Alerts */}
        {err && <Banner type="err">{err}</Banner>}
        {ok && <Banner type="ok">{ok}</Banner>}

        {/* Reservation summary */}
        <div className="panel">
          <div className="panel-h">Reservation Details</div>
          <div className="panel-b" style={{ display: "grid", gap: 10 }}>
            {reservation ? (
              <>
                <div className="table-wrap">
                  <table className="table">
                    <tbody>
                      <TR label="Booking #">{reservation.bookingCode || reservation.code || reservation._id}</TR>
                      <TR label="Guest">{reservation.guestName || "—"}</TR>
                      <TR label="Mobile / Email">{(reservation.guestMobile || "—") + " / " + (reservation.guestEmail || "—")}</TR>
                      <TR label="Stay">
                        {[
                          "In: " + (fmtDateTime(reservation.checkIn || reservation.arrival) || "—"),
                          "Out: " + (fmtDateTime(reservation.checkOut || reservation.departure) || "—"),
                          `${reservation.nights ?? diffNights(reservation.checkIn, reservation.checkOut)} night(s)`
                        ].join(" · ")}
                      </TR>
                      <TR label="Pax">{`${reservation.adults ?? 1} Adult(s), ${reservation.children ?? 0} Child(ren)`}</TR>
                      <TR label="Room Type / Room #">{(reservation.roomTypeName || "—") + " / " + (reservation.roomNo || "—")}</TR>
                      <TR label="Rate Plan / Base Rate">
                        {(reservation.ratePlanName || "—") + " / " + fmtMoney(reservation.rateBase)}
                      </TR>
                      <TR label="Balance Due">{fmtMoney(balDue)}</TR>
                      <TR label="Channel / Source">{(reservation.channel || "DIRECT") + " / " + (reservation.source || "—")}</TR>
                      <TR label="Status">{reservation.status || "—"}</TR>
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="muted">Load a reservation to proceed.</div>
            )}
          </div>
        </div>

        {/* Assignment + Verification + Payment */}
        <div className="panel">
          <div className="panel-h">Assign Room & Check-in Details</div>
          <div className="panel-b" style={{ display: "grid", gap: 12 }}>
            <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(220px, 1fr))", gap: 12 }}>
              <Field label="Select Room">
                <div style={{ display: "flex", gap: 8 }}>
                  <select
                    className="res-select"
                    value={roomNo}
                    onChange={(e) => setRoomNo(e.target.value)}
                    disabled={!reservation}
                  >
                    <option value="">— Choose —</option>
                    {rooms.map(r => {
                      const no = r.roomNo || r.number || r.code;
                      const label = `${no} ${r.roomTypeName ? "· " + r.roomTypeName : ""}`;
                      return <option key={no} value={no}>{label}</option>;
                    })}
                  </select>
                  <input
                    className="input"
                    placeholder="Or type room no."
                    value={roomNo}
                    onChange={(e) => setRoomNo(e.target.value)}
                    disabled={!reservation}
                    style={{ maxWidth: 140 }}
                  />
                </div>
              </Field>

              <Field label="ID Type">
                <select className="res-select" value={idType} onChange={(e) => setIdType(e.target.value)} disabled={!reservation}>
                  <option value="">Select</option>
                  <option>AADHAAR</option>
                  <option>PASSPORT</option>
                  <option>DRIVING LICENSE</option>
                  <option>VOTER ID</option>
                  <option>PAN</option>
                  <option>OTHER</option>
                </select>
              </Field>

              <Field label="ID Number">
                <input className="input" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} disabled={!reservation} />
              </Field>

              <Field label="Vehicle No.">
                <input className="input" value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} disabled={!reservation} />
              </Field>

              <Field label="Remarks" wide>
                <textarea className="input" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} disabled={!reservation} />
              </Field>
            </div>

            <div className="panel" style={{ marginTop: 6 }}>
              <div className="panel-h">Payment (Optional on Check-in)</div>
              <div className="panel-b" style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(3, minmax(220px, 1fr))" }}>
                <Field label="Mode">
                  <select className="res-select" value={payMode} onChange={(e) => setPayMode(e.target.value)} disabled={!reservation}>
                    <option>CASH</option>
                    <option>CARD</option>
                    <option>UPI</option>
                    <option>BANK</option>
                    <option>WALLET</option>
                  </select>
                </Field>
                <Field label={`Amount (Due: ${fmtMoney(balDue)})`}>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    disabled={!reservation}
                  />
                </Field>
              </div>
            </div>
          </div>
        </div>

        {/* Printable slip */}
        <div className="panel">
          <div className="panel-h">Check-in Slip Preview</div>
          <div className="panel-b">
            <div ref={printRef}>
              <div className="card">
                <div className="h">{hotelTitle}</div>
                <div className="sub">Guest Check-in Slip</div>
                <table>
                  <tbody>
                    <TR label="Booking #">{reservation?.bookingCode || reservation?.code || "—"}</TR>
                    <TR label="Guest">{reservation?.guestName || "—"}</TR>
                    <TR label="Room">{roomNo || reservation?.roomNo || "—"}</TR>
                    <TR label="Stay">{[
                      "In: " + (fmtDateTime(reservation?.checkIn || reservation?.arrival) || "—"),
                      "Out: " + (fmtDateTime(reservation?.checkOut || reservation?.departure) || "—"),
                      `${reservation?.nights ?? diffNights(reservation?.checkIn, reservation?.checkOut)} night(s)`
                    ].join(" · ")}</TR>
                    <TR label="Pax">{`${reservation?.adults ?? 1} Adult(s), ${reservation?.children ?? 0} Child(ren)`}</TR>
                    <TR label="ID">{[idType || reservation?.identity?.type, idNumber || reservation?.identity?.number].filter(Boolean).join(" : ") || "—"}</TR>
                    <TR label="Vehicle">{vehicleNo || reservation?.vehicleNo || "—"}</TR>
                    <TR label="Payment">{Number(payAmount) > 0 ? `${payMode} · ${fmtMoney(payAmount)}` : "—"}</TR>
                    <TR label="Balance Due">{fmtMoney(balDue)}</TR>
                    <TR label="Remarks">{remarks || reservation?.remarks || "—"}</TR>
                  </tbody>
                </table>

                <div className="sign">
                  <div className="line">Guest Signature</div>
                  <div className="line">Front Office</div>
                </div>
                <div className="muted" style={{ marginTop: 10 }}>
                  I/we acknowledge receipt of room keys and agree to hotel policies, including ID verification and settlement of dues.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
              <button className="btn" onClick={printSlip} disabled={!reservation}>🖨 Print</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- tiny UI ---------- */
function Field({ label, children, required, wide }) {
  return (
    <label style={{ display: "grid", gap: 6, gridColumn: wide ? "1 / -1" : "auto" }}>
      <span className="label" style={{ fontWeight: 700 }}>
        {label} {required && <span style={{ color: "#b91c1c" }}>*</span>}
      </span>
      {children}
    </label>
  );
}
function TR({ label, children }) {
  return (
    <tr>
      <td className="lbl">{label}</td>
      <td>{children}</td>
    </tr>
  );
}
function Banner({ type = "ok", children }) {
  const style = type === "err"
    ? { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }
    : { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
  return <div style={{ ...style, padding: "8px 10px", borderRadius: 10, fontWeight: 700, marginBottom: 10 }}>{children}</div>;
}

/* ---------- utils ---------- */
function fmtDateTime(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt)) return "—";
  return dt.toLocaleString();
}
function diffNights(ci, co) {
  const a = new Date(ci), b = new Date(co);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}
function fmtMoney(n) {
  const v = Number(n || 0);
  if (!v) return "—";
  return v.toLocaleString(undefined, { style: "currency", currency: "INR" });
}
function calcDue(r) {
  if (!r) return 0;
  const total = Number(r.grandTotal ?? r.total ?? r.totalAmount ?? 0);
  const paid  = Number(r.paid ?? r.advance ?? r.amountPaid ?? 0);
  const due = total - paid;
  return due > 0 ? due : 0;
}
