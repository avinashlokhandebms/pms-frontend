import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../../../lib/api";
import ReservationSidebar, { BackofficeSidebar } from "../../../components/sidebar/ReservationSidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

export default function PreRegCard() {
  // Filters / lookups
  const [properties, setProperties] = useState([]);
  const [propertyCode, setPropertyCode] = useState("");
  const [q, setQ] = useState(""); // booking code / guest search

  // Data
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // Form fields (can be prefilled from reservation if available)
  const [guestName, setGuestName] = useState("");
  const [guestMobile, setGuestMobile] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("India");
  const [pincode, setPincode] = useState("");
  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [nationality, setNationality] = useState("Indian");
  const [vehicleNo, setVehicleNo] = useState("");
  const [purpose, setPurpose] = useState("");
  const [company, setCompany] = useState("");
  const [gstNo, setGstNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [signatureName, setSignatureName] = useState("");

  // print ref
  const printRef = useRef(null);

  // Load properties (for propertyCode filter)
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await apiFetch("/api/properties?limit=500", { auth: true });
        const list = res?.data || res?.items || res || [];
        if (!ignore) {
          setProperties(Array.isArray(list) ? list : []);
          if (!propertyCode && list[0]?.code) {
            setPropertyCode(String(list[0].code).toUpperCase());
          }
        }
      } catch {
        // ignore
      }
    })();
    return () => { ignore = true; };
  }, []); // mount

  // When reservation changes, prefill form
  useEffect(() => {
    if (!reservation) return;
    setGuestName(reservation.guestName || "");
    setGuestMobile(reservation.guestMobile || "");
    setGuestEmail(reservation.guestEmail || "");
    setAddress(reservation.guestAddress?.line1 || "");
    setCity(reservation.guestAddress?.city || "");
    setState(reservation.guestAddress?.state || "");
    setCountry(reservation.guestAddress?.country || "India");
    setPincode(reservation.guestAddress?.pincode || "");
    setIdType(reservation.identity?.type || "");
    setIdNumber(reservation.identity?.number || "");
    setNationality(reservation.nationality || "Indian");
    setVehicleNo(reservation.vehicleNo || "");
    setPurpose(reservation.visitPurpose || "");
    setCompany(reservation.company || "");
    setGstNo(reservation.gstNo || "");
    setRemarks(reservation.remarks || "");
    setSignatureName(reservation.signatureName || reservation.guestName || "");
  }, [reservation]);

  // Lookup reservation
  const searchReservation = async () => {
    setErr(""); setOk("");
    if (!q.trim()) { setErr("Enter Booking # / Guest to search."); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: q.trim(), limit: 1 });
      if (propertyCode) params.set("propertyCode", propertyCode);

      // Expected server:
      // GET /api/reservations?q=&propertyCode=&limit=1
      // -> { data: [ { ...reservation } ], total }
      const res = await apiFetch(`/api/reservations?${params.toString()}`, { auth: true });
      const list = res?.data || res?.items || (Array.isArray(res) ? res : []);
      const r = list?.[0];
      if (!r) {
        setReservation(null);
        setErr("No reservation found.");
        return;
      }
      setReservation(r);
      setOk(`Loaded booking ${r.bookingCode || r.code || r._id}`);
    } catch (e) {
      setReservation(null);
      setErr(e?.message || "Failed to search reservation.");
    } finally { setLoading(false); }
  };

  // Save pre-reg fields back to reservation
  const savePreReg = async () => {
    if (!reservation?._id) { setErr("No reservation loaded."); return; }
    setErr(""); setOk("");
    try {
      const payload = {
        propertyCode: propertyCode || reservation.propertyCode,
        guestName, guestMobile, guestEmail,
        guestAddress: { line1: address, city, state, country, pincode },
        identity: { type: idType, number: idNumber },
        nationality, vehicleNo, visitPurpose: purpose,
        company, gstNo, remarks, signatureName,
      };

      // PATCH /api/reservations/:id/prereg  (implement in your API)
      const saved = await apiFetch(`/api/reservations/${reservation._id || reservation.id}/prereg`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify(payload),
      });
      setReservation(saved || reservation);
      setOk("Pre-Registration saved.");
    } catch (e) {
      setErr(e?.message || "Failed to save pre-registration.");
    }
  };

  const printCard = () => {
    const el = printRef.current;
    if (!el) return;
    // Open a minimal print window with the card content
    const w = window.open("", "PRINT", "height=800,width=700");
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>Pre-Registration Card</title>
          <style>
            body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color: #111; }
            .card { padding: 20px; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
            .row { display:flex; gap:8px; }
            .lbl { font-weight:700; min-width:150px; }
            .h { font-weight:900; font-size: 1.1rem; margin: 0 0 10px; text-align:center; }
            .sub { text-align:center; color:#555; margin-bottom: 14px; }
            .box { border:1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
            .muted { color:#6b7280; font-size:.85rem; }
            .sign { margin-top: 30px; display:flex; justify-content:space-between; }
            .line { margin-top: 40px; border-top:1px dashed #999; width: 260px; text-align:center; padding-top:6px; }
            table { width: 100%; border-collapse: collapse; }
            td, th { padding: 6px 8px; border-bottom: 1px solid #eee; }
          </style>
        </head>
        <body>
          ${el.innerHTML}
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  const hotelTitle = useMemo(() => {
    const p = properties.find(pp => String(pp.code).toUpperCase() === String(propertyCode).toUpperCase());
    return p ? `${p.name} (${p.code})` : (reservation?.propertyName || propertyCode || "Property");
  }, [properties, propertyCode, reservation]);

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
     <ReservationSidebar/>

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Pre-Registration Card</h2>
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
              placeholder="Booking # / Guest name / Mobile"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: 280 }}
            />
            <button className="btn" disabled={loading} onClick={searchReservation}>
              {loading ? "Searching…" : "Load Booking"}
            </button>
            <button className="btn" onClick={savePreReg} disabled={!reservation}>
              Save
            </button>
            <button className="btn" onClick={printCard} disabled={!reservation}>
              🖨 Print
            </button>
          </div>
        </div>

        {/* Alerts */}
        {err && <Banner type="err">{err}</Banner>}
        {ok && <Banner type="ok">{ok}</Banner>}

        {/* Info + Form */}
        <div className="panel">
          <div className="panel-h">Guest & Stay Details</div>
          <div className="panel-b" style={{ display: "grid", gap: 12 }}>
            {/* Reservation quick info */}
            {reservation ? (
              <div className="box" style={{ display: "grid", gap: 8 }}>
                <div><b>Booking #:</b> {reservation.bookingCode || reservation.code || reservation._id}</div>
                <div className="grid">
                  <div><b>Check-in:</b> {fmtDateTime(reservation.checkIn || reservation.arrival)}</div>
                  <div><b>Check-out:</b> {fmtDateTime(reservation.checkOut || reservation.departure)}</div>
                </div>
                <div className="grid">
                  <div><b>Nights:</b> {reservation.nights ?? diffNights(reservation.checkIn, reservation.checkOut)}</div>
                  <div><b>Adults/Children:</b> {(reservation.adults ?? 1)}/{reservation.children ?? 0}</div>
                </div>
                <div className="grid">
                  <div><b>Room Type:</b> {reservation.roomTypeName || "—"}</div>
                  <div><b>Room #:</b> {reservation.roomNo || "—"}</div>
                </div>
                <div className="grid">
                  <div><b>Rate Plan:</b> {reservation.ratePlanName || "—"}</div>
                  <div><b>Rate (Base):</b> {fmtMoney(reservation.rateBase)}</div>
                </div>
                <div className="muted">Channel: {reservation.channel || "DIRECT"} · Source: {reservation.source || "—"}</div>
              </div>
            ) : (
              <div className="box muted">Load a reservation to fill the Pre-Reg Card.</div>
            )}

            {/* Editable Pre-Reg Fields */}
            <div className="grid" style={{ gridTemplateColumns: "repeat(2, minmax(200px, 1fr))" }}>
              <Field label="Guest Name" required>
                <input className="input" value={guestName} onChange={e => setGuestName(e.target.value)} />
              </Field>
              <Field label="Mobile">
                <input className="input" value={guestMobile} onChange={e => setGuestMobile(e.target.value)} />
              </Field>
              <Field label="Email">
                <input className="input" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} />
              </Field>
              <Field label="Nationality">
                <input className="input" value={nationality} onChange={e => setNationality(e.target.value)} />
              </Field>
              <Field label="Address">
                <input className="input" value={address} onChange={e => setAddress(e.target.value)} />
              </Field>
              <Field label="City">
                <input className="input" value={city} onChange={e => setCity(e.target.value)} />
              </Field>
              <Field label="State">
                <input className="input" value={state} onChange={e => setState(e.target.value)} />
              </Field>
              <Field label="Country">
                <input className="input" value={country} onChange={e => setCountry(e.target.value)} />
              </Field>
              <Field label="Pincode">
                <input className="input" value={pincode} onChange={e => setPincode(e.target.value)} />
              </Field>

              <Field label="ID Type">
                <select className="res-select" value={idType} onChange={e => setIdType(e.target.value)}>
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
                <input className="input" value={idNumber} onChange={e => setIdNumber(e.target.value)} />
              </Field>

              <Field label="Vehicle No.">
                <input className="input" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} />
              </Field>
              <Field label="Purpose of Visit">
                <input className="input" value={purpose} onChange={e => setPurpose(e.target.value)} />
              </Field>

              <Field label="Company">
                <input className="input" value={company} onChange={e => setCompany(e.target.value)} />
              </Field>
              <Field label="GST No.">
                <input className="input" value={gstNo} onChange={e => setGstNo(e.target.value)} />
              </Field>

              <Field label="Remarks" wide>
                <textarea className="input" rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} />
              </Field>
              <Field label="Signature Name">
                <input className="input" value={signatureName} onChange={e => setSignatureName(e.target.value)} />
              </Field>
            </div>
          </div>
        </div>

        {/* Printable card */}
        <div className="panel">
          <div className="panel-h">Print Preview</div>
          <div className="panel-b">
            <div ref={printRef}>
              <div className="card">
                <div className="h">{hotelTitle}</div>
                <div className="sub">Pre-Registration Card</div>

                <table>
                  <tbody>
                    <TR label="Booking #">{reservation?.bookingCode || reservation?.code || "—"}</TR>
                    <TR label="Guest">{guestName || "—"}</TR>
                    <TR label="Mobile / Email">
                      {(guestMobile || "—") + " / " + (guestEmail || "—")}
                    </TR>
                    <TR label="Address">
                      {[
                        address,
                        [city, state, pincode].filter(Boolean).join(", "),
                        country
                      ].filter(Boolean).join(" · ") || "—"}
                    </TR>
                    <TR label="Identity">{[idType, idNumber].filter(Boolean).join(" : ") || "—"}</TR>
                    <TR label="Nationality / Vehicle">
                      {(nationality || "—") + " / " + (vehicleNo || "—")}
                    </TR>
                    <TR label="Purpose / Company">{[purpose || "—", company || "—"].join(" / ")}</TR>
                    <TR label="GST No.">{gstNo || "—"}</TR>
                    <TR label="Check-in / Check-out">
                      {[fmtDateTime(reservation?.checkIn || reservation?.arrival) || "—",
                        fmtDateTime(reservation?.checkOut || reservation?.departure) || "—"].join("  →  ")}
                    </TR>
                    <TR label="Room / Pax">
                      {[(reservation?.roomNo || "—"), `${reservation?.adults ?? 1} Adults, ${reservation?.children ?? 0} Children`].join("  ·  ")}
                    </TR>
                    <TR label="Rate Plan / Base Rate">
                      {[(reservation?.ratePlanName || "—"), fmtMoney(reservation?.rateBase)].join("  ·  ")}
                    </TR>
                    <TR label="Channel / Source">
                      {[(reservation?.channel || "DIRECT"), (reservation?.source || "—")].join(" / ")}
                    </TR>
                    <TR label="Remarks">{remarks || "—"}</TR>
                  </tbody>
                </table>

                <div className="sign">
                  <div className="line">Guest Signature</div>
                  <div className="line">Front Office</div>
                </div>

                <div className="muted" style={{ marginTop: 14 }}>
                  I/we agree to settle all bills, abide by hotel policies, and consent to verification of identity under applicable laws.
                </div>
              </div>
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn" onClick={printCard} disabled={!reservation}>🖨 Print</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Small UI bits ---------- */
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
      <td style={{ width: 240, fontWeight: 700 }}>{label}</td>
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
