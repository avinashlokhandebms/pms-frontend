import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../../../lib/api";
import ReservationSidebar, { BackofficeSidebar } from "../../../components/sidebar/ReservationSidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

export default function DirectCheckInGuest() {
  // ------- Scope / property -------
  const [properties, setProperties] = useState([]);
  const [propertyCode, setPropertyCode] = useState("");

  // ------- Guest -------
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const guestName = useMemo(() => [firstName, lastName].filter(Boolean).join(" ").trim(), [firstName, lastName]);
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [country, setCountry] = useState("India");
  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");

  // ------- Stay details -------
  const todayISO = useMemo(() => toISODate(new Date()), []);
  const tomorrowISO = useMemo(() => toISODate(addDays(new Date(), 1)), []);
  const [arrival, setArrival] = useState(todayISO);
  const [departure, setDeparture] = useState(tomorrowISO);
  const nights = useMemo(() => Math.max(1, diffDays(arrival, departure)), [arrival, departure]);

  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [remarks, setRemarks] = useState("");

  // ------- Rooming / rate -------
  const [roomTypes, setRoomTypes] = useState([]);
  const [roomTypeCode, setRoomTypeCode] = useState("");
  const [rooms, setRooms] = useState([]);
  const [roomNo, setRoomNo] = useState("");

  const [ratePlanCode, setRatePlanCode] = useState("");
  const [baseRate, setBaseRate] = useState(0);

  // ------- Payment (optional) -------
  const [payMode, setPayMode] = useState("CASH");
  const [payAmount, setPayAmount] = useState(0);

  // ------- UX -------
  const [loading, setLoading] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [createdStay, setCreatedStay] = useState(null);
  const printRef = useRef(null);

  // Load properties
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
      } catch (e) {
        // ignore
      }
    })();
    return () => { ignore = true; };
  }, []); // mount

  // Load room types when property changes
  useEffect(() => {
    if (!propertyCode) return;
    let ignore = false;
    (async () => {
      try {
        const res = await apiFetch(`/api/room-types?propertyCode=${encodeURIComponent(propertyCode)}`, { auth: true });
        const list = res?.data || res?.items || (Array.isArray(res) ? res : []);
        if (!ignore) {
          setRoomTypes(list);
          if (list?.[0]?.code) setRoomTypeCode(list[0].code);
        }
      } catch {
        setRoomTypes([]);
      }
    })();
    return () => { ignore = true; };
  }, [propertyCode]);

  // Load vacant rooms whenever property / room type / dates change
  useEffect(() => {
    if (!propertyCode) return;
    let ignore = false;
    (async () => {
      setLoadingRooms(true);
      try {
        const qs = new URLSearchParams({
          propertyCode,
          status: "VACANT",
          roomType: roomTypeCode || "",
          from: arrival,
          to: departure,
        });
        // Expected: GET /api/rooms?propertyCode=..&status=VACANT&roomType=DLX&from=YYYY-MM-DD&to=YYYY-MM-DD
        const res = await apiFetch(`/api/rooms?${qs.toString()}`, { auth: true });
        const list = res?.data || res?.items || (Array.isArray(res) ? res : []);
        if (!ignore) {
          setRooms(list);
          if (list?.length) {
            const first = list[0];
            const no = first.roomNo || first.number || first.code;
            setRoomNo(no || "");
          } else {
            setRoomNo("");
          }
        }
      } catch {
        if (!ignore) { setRooms([]); setRoomNo(""); }
      } finally {
        if (!ignore) setLoadingRooms(false);
      }
    })();
    return () => { ignore = true; };
  }, [propertyCode, roomTypeCode, arrival, departure]);

  // Compute approx total (simple: baseRate * nights). Adjust as you need.
  const estTotal = useMemo(() => {
    const base = Number(baseRate || 0);
    return base > 0 ? base * nights : 0;
  }, [baseRate, nights]);

  async function handleCheckIn() {
    setErr(""); setOk("");
    // basic validations
    if (!propertyCode) return setErr("Select a property.");
    if (!guestName) return setErr("Enter guest name.");
    if (!mobile && !email) return setErr("Enter mobile or email.");
    if (!arrival || !departure || nights < 1) return setErr("Check dates (min 1 night).");
    if (!roomNo) return setErr("Select a room.");
    // Optionally enforce ID
    // if (!idType || !idNumber) return setErr("Identity Type & Number are required.");

    setLoading(true);
    try {
      const payload = {
        propertyCode,
        guest: {
          name: guestName,
          firstName, lastName, mobile, email,
          address, city, state: stateName, country,
          identity: idType || idNumber ? { type: idType, number: idNumber } : undefined,
        },
        arrival, departure, nights,
        adults: Number(adults || 1),
        children: Number(children || 0),
        roomTypeCode: roomTypeCode || undefined,
        roomNo,
        rate: {
          planCode: ratePlanCode || undefined,
          base: Number(baseRate || 0),
          estTotal,
        },
        remarks,
        payment: Number(payAmount) > 0 ? { mode: payMode, amount: Number(payAmount) } : undefined,
      };

      // Expected: POST /api/checkins/direct  -> returns stay/folio object
      const created = await apiFetch("/api/checkins/direct", {
        method: "POST", auth: true, body: JSON.stringify(payload),
      });

      setCreatedStay(created || null);
      setOk("Guest checked in successfully.");
    } catch (e) {
      setErr(e?.message || "Direct check-in failed.");
    } finally {
      setLoading(false);
    }
  }

  const hotelTitle = useMemo(() => {
    const p = properties.find(pp => (pp.code || "").toUpperCase() === (propertyCode || "").toUpperCase());
    return p ? `${p.name} (${p.code})` : propertyCode || "Property";
  }, [properties, propertyCode]);

  const printSlip = () => {
    const el = printRef.current;
    if (!el) return;
    const w = window.open("", "PRINT", "height=800,width=700");
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>Direct Check-in Slip</title>
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
      <ReservationSidebar />

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Direct Check-In</h2>
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

            <button className="btn" onClick={handleCheckIn} disabled={loading}>
              {loading ? "Checking in…" : "✅ Direct Check-In"}
            </button>
            <button className="btn" onClick={printSlip} disabled={!createdStay && !guestName}>
              🖨 Print
            </button>
          </div>
        </div>

        {err && <Banner type="err">{err}</Banner>}
        {ok && <Banner type="ok">{ok}</Banner>}

        {/* Guest Details */}
        <div className="panel">
          <div className="panel-h">Guest Details</div>
          <div className="panel-b">
            <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(220px, 1fr))", gap: 12 }}>
              <Field label="First Name" required>
                <input className="input" value={firstName} onChange={e => setFirstName(e.target.value)} />
              </Field>
              <Field label="Last Name">
                <input className="input" value={lastName} onChange={e => setLastName(e.target.value)} />
              </Field>
              <Field label="Mobile / Phone" required>
                <input className="input" value={mobile} onChange={e => setMobile(e.target.value)} />
              </Field>
              <Field label="Email">
                <input className="input" value={email} onChange={e => setEmail(e.target.value)} />
              </Field>
              <Field label="Address">
                <input className="input" value={address} onChange={e => setAddress(e.target.value)} />
              </Field>
              <Field label="City">
                <input className="input" value={city} onChange={e => setCity(e.target.value)} />
              </Field>
              <Field label="State">
                <input className="input" value={stateName} onChange={e => setStateName(e.target.value)} />
              </Field>
              <Field label="Country">
                <input className="input" value={country} onChange={e => setCountry(e.target.value)} />
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
              <Field label="Remarks" wide>
                <textarea className="input" rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} />
              </Field>
            </div>
          </div>
        </div>

        {/* Stay & Room */}
        <div className="panel">
          <div className="panel-h">Stay & Room</div>
          <div className="panel-b">
            <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(220px, 1fr))", gap: 12 }}>
              <Field label="Arrival" required>
                <input className="input" type="date" value={arrival} onChange={e => setArrival(e.target.value)} />
              </Field>
              <Field label="Departure" required>
                <input className="input" type="date" value={departure} onChange={e => setDeparture(e.target.value)} />
              </Field>
              <Field label="Nights">
                <input className="input" value={nights} disabled />
              </Field>

              <Field label="Adults">
                <input className="input" type="number" min="1" value={adults} onChange={e => setAdults(e.target.value)} />
              </Field>
              <Field label="Children">
                <input className="input" type="number" min="0" value={children} onChange={e => setChildren(e.target.value)} />
              </Field>

              <Field label="Room Type">
                <select className="res-select" value={roomTypeCode} onChange={e => setRoomTypeCode(e.target.value)}>
                  {roomTypes.map(rt => (
                    <option key={rt.code} value={rt.code}>{rt.code} — {rt.name}</option>
                  ))}
                  {roomTypes.length === 0 && <option value="">No room types</option>}
                </select>
              </Field>

              <Field label={`Room ${loadingRooms ? "(Loading…)" : ""}`} required>
                <select className="res-select" value={roomNo} onChange={e => setRoomNo(e.target.value)}>
                  <option value="">{loadingRooms ? "Please wait…" : "— Choose —"}</option>
                  {rooms.map(r => {
                    const no = r.roomNo || r.number || r.code;
                    const label = `${no}${r.roomTypeName ? " · " + r.roomTypeName : ""}`;
                    return <option key={no} value={no}>{label}</option>;
                  })}
                </select>
              </Field>

              <Field label="Rate Plan Code">
                <input className="input" value={ratePlanCode} onChange={e => setRatePlanCode(e.target.value)} />
              </Field>
              <Field label="Base Rate (per night)">
                <input className="input" type="number" min="0" step="0.01" value={baseRate} onChange={e => setBaseRate(e.target.value)} />
              </Field>
              <Field label={`Estimated Total (${nights} night${nights > 1 ? "s" : ""})`}>
                <input className="input" value={fmtMoney(estTotal)} disabled />
              </Field>
            </div>
          </div>
        </div>

        {/* Payment (optional) */}
        <div className="panel">
          <div className="panel-h">Payment (Optional)</div>
          <div className="panel-b">
            <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(220px, 1fr))", gap: 12 }}>
              <Field label="Mode">
                <select className="res-select" value={payMode} onChange={e => setPayMode(e.target.value)}>
                  <option>CASH</option>
                  <option>CARD</option>
                  <option>UPI</option>
                  <option>BANK</option>
                  <option>WALLET</option>
                </select>
              </Field>
              <Field label="Amount">
                <input className="input" type="number" min="0" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
              </Field>
            </div>
          </div>
        </div>

        {/* Slip preview */}
        <div className="panel">
          <div className="panel-h">Check-in Slip Preview</div>
          <div className="panel-b">
            <div ref={printRef}>
              <div className="card">
                <div className="h">{hotelTitle}</div>
                <div className="sub">Direct Check-in Slip</div>
                <table>
                  <tbody>
                    <TR label="Guest">{guestName || "—"}</TR>
                    <TR label="Mobile / Email">{(mobile || "—") + " / " + (email || "—")}</TR>
                    <TR label="Stay">{[
                      "In: " + fmtDateTime(arrival),
                      "Out: " + fmtDateTime(departure),
                      `${nights} night(s)`
                    ].join(" · ")}</TR>
                    <TR label="Pax">{`${adults} Adult(s), ${children} Child(ren)`}</TR>
                    <TR label="Room">{(roomTypeCode || "—") + " / " + (roomNo || "—")}</TR>
                    <TR label="Rate">{(ratePlanCode || "—") + " · " + (baseRate ? fmtMoney(baseRate) : "—")}</TR>
                    <TR label="Estimated Total">{fmtMoney(estTotal)}</TR>
                    <TR label="ID">{[idType, idNumber].filter(Boolean).join(" : ") || "—"}</TR>
                    <TR label="Payment">{Number(payAmount) > 0 ? `${payMode} · ${fmtMoney(payAmount)}` : "—"}</TR>
                    <TR label="Remarks">{remarks || "—"}</TR>
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
              <button className="btn" onClick={printSlip}>🖨 Print</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------- small UI atoms ------------- */
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

/* ------------- helpers ------------- */
function toISODate(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(d, n) {
  const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt;
}
function diffDays(aISO, bISO) {
  const a = new Date(aISO), b = new Date(bISO);
  if (Number.isNaN(a) || Number.isNaN(b)) return 1;
  return Math.max(1, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}
function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d) ? "—" : d.toLocaleString();
}
function fmtMoney(n) {
  const v = Number(n || 0);
  if (!v) return "—";
  return v.toLocaleString(undefined, { style: "currency", currency: "INR" });
}
