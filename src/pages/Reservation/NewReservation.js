// src/pages/Reservation/NewReservations.js
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../../lib/api";

import ReservationSidebar from "../../components/sidebar/ReservationSidebar";
import "../../components/sidebar/Sidebar.css";
import "../../assets/css/commanPage.css";

export default function NewReservations() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // ---- sidebar (mobile drawer) ----
  const [sbOpen, setSbOpen] = useState(false);
  const openSidebar = () => setSbOpen(true);
  const closeSidebar = () => setSbOpen(false);

  // ---- page mode ----
  const [mode] = useState(params.get("id") ? "edit" : "create");

  // ---- stay details ----
  const [roomType, setRoomType] = useState("DLX");
  const [arrivalDate, setArrivalDate] = useState(today());
  const [arrivalTime, setArrivalTime] = useState("14:00");
  const [nights, setNights] = useState(1);
  const [departureTime, setDepartureTime] = useState("11:00");
  const [noOfRooms, setNoOfRooms] = useState(1);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [mealPlan, setMealPlan] = useState("CP");
  const [rateCode, setRateCode] = useState("BAR");
  const [tariff, setTariff] = useState(2500);

  // ---- guest & commercial ----
  const [guestName, setGuestName] = useState("");
  const [guestMobile, setGuestMobile] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [salesPerson, setSalesPerson] = useState("");
  const [reservationMode, setReservationMode] = useState("OTA");
  const [instruction, setInstruction] = useState("");
  const [specialRequest, setSpecialRequest] = useState("");
  const [reservationNumber, setReservationNumber] = useState(() => genResNo());
  const [billingInstruction, setBillingInstruction] = useState("");

  // ---- UX ----
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  // popups
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);

  // ---- derived ----
  const departureDate = useMemo(
    () => addDays(arrivalDate, Number(nights || 0)),
    [arrivalDate, nights]
  );
  const totalAmount = useMemo(() => {
    const n = Number(nights || 0);
    const r = Number(noOfRooms || 0);
    const t = Number(tariff || 0);
    return Math.max(0, n * r * t);
  }, [nights, noOfRooms, tariff]);

  // ---- validation & submit ----
  const validate = () => {
    if (!roomType) return "Room type is required.";
    if (!arrivalDate) return "Arrival date is required.";
    if (!arrivalTime) return "Arrival time is required.";
    if (Number(nights) <= 0) return "No. of nights must be greater than 0.";
    if (!noOfRooms || Number(noOfRooms) <= 0) return "No. of rooms must be at least 1.";
    if (!guestName.trim()) return "Guest name is required.";
    if (!guestMobile.trim()) return "Guest mobile number is required.";
    if (!reservationMode) return "Reservation mode is required.";
    if (!reservationNumber.trim()) return "Reservation number is required.";
    if (!tariff || Number(tariff) <= 0) return "Tariff must be greater than 0.";
    return "";
  };

  const resetForm = () => {
    setRoomType("DLX");
    setArrivalDate(today());
    setArrivalTime("14:00");
    setNights(1);
    setDepartureTime("11:00");
    setNoOfRooms(1);
    setAdults(2);
    setChildren(0);
    setInfants(0);
    setMealPlan("CP");
    setRateCode("BAR");
    setTariff(2500);
    setGuestName("");
    setGuestMobile("");
    setGuestEmail("");
    setSalesPerson("");
    setReservationMode("OTA");
    setInstruction("");
    setSpecialRequest("");
    setReservationNumber(genResNo());
    setBillingInstruction("");
    setOk("");
    setErr("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");

    const v = validate();
    if (v) {
      setErr(v);
      setShowError(true);
      return;
    }

    const payload = {
      propertyCode: "HSE001",  // TODO: set from logged-in context
      roomType,
      checkIn: new Date(`${arrivalDate}T${arrivalTime}:00`),
      checkOut: new Date(`${departureDate}T${departureTime}:00`),
      nights: Number(nights),
      rooms: Number(noOfRooms),
      adults: Number(adults),
      children: Number(children),
      infant: Number(infants),
      mealPlan,
      rateCode,
      ratePlan: rateCode,
      rate: Number(tariff),
      amount: totalAmount,
      guestName,
      phone: guestMobile,
      email: guestEmail,
      salesPerson,
      reservationMode,
      notes: instruction,
      specialRequest,
      billingInstruction,
      reservationNo: reservationNumber,
      status: "Booked",
    };

    setLoading(true);
    try {
      if (mode === "edit") {
        const id = params.get("id");
        await apiFetch(`/api/reservations/${id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setOk("Reservation updated successfully.");
      } else {
        await apiFetch("/api/reservations", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setOk("Reservation created successfully.");
      }
      setShowSuccess(true);     // ✅ popup success, stay on page
    } catch (e2) {
      setErr(e2?.message || "Failed to save reservation.");
      setShowError(true);       // ✅ popup error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      {/* ===== Sidebar ===== */}
      <ReservationSidebar className={`rsb ${sbOpen ? "open" : ""}`} />
      {sbOpen && <div className="rsb-overlay" onClick={closeSidebar} />}

      {/* ===== Content ===== */}
      <div className="res-wrap">
        <div className="res-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* <button type="button" className="btn" onClick={() => setSbOpen(true)} aria-label="Open menu" style={{ padding: ".45rem .6rem" }}>
                ☰
              </button> */}
            <h2 style={{ margin: 0 }}>
              {mode === "edit" ? "Edit Reservation" : "New Reservation"}
            </h2>
          </div>
          <div className="res-actions" style={{ display: "flex", gap: 8 }}>
            <button className="btn" type="button" onClick={() => navigate("/reservation")}>
              ← Reservation Overview
            </button>
          </div>
        </div>

        {/* Stay Details */}
        <form className="panel" onSubmit={onSubmit} noValidate>
          <div className="panel-h">Stay Details</div>
          <div className="panel-b" style={{ display: "grid", gap: 12 }}>
            {err && <Alert type="err">{err}</Alert>}
            {ok && <Alert type="ok">{ok}</Alert>}

            <Row>
              <Field label="Room Type" required>
                <select className="res-select" value={roomType} onChange={(e) => setRoomType(e.target.value)}>
                  <option value="DLX">Deluxe</option>
                  <option value="STD">Standard</option>
                  <option value="SUI">Suite</option>
                </select>
              </Field>
              <Field label="Arrival Date" required>
                <input className="input" type="date" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} />
              </Field>
              <Field label="Arrival Time" required>
                <input className="input" type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} />
              </Field>
            </Row>

            <Row>
              <Field label="No. of Nights" required>
                <input className="input" type="number" min="1" value={nights} onChange={(e) => setNights(e.target.value)} />
              </Field>
              <Field label="Departure Date">
                <input className="input" type="date" value={departureDate} readOnly />
              </Field>
              <Field label="Departure Time">
                <input className="input" type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} />
              </Field>
            </Row>

            <Row>
              <Field label="No. of Rooms" required>
                <input className="input" type="number" min="1" value={noOfRooms} onChange={(e) => setNoOfRooms(e.target.value)} />
              </Field>
              <Field label="Adults">
                <input className="input" type="number" min="1" value={adults} onChange={(e) => setAdults(e.target.value)} />
              </Field>
              <Field label="Children">
                <input className="input" type="number" min="0" value={children} onChange={(e) => setChildren(e.target.value)} />
              </Field>
            </Row>

            <Row>
              <Field label="Infants">
                <input className="input" type="number" min="0" value={infants} onChange={(e) => setInfants(e.target.value)} />
              </Field>
              <Field label="Meal Plan">
                <select className="res-select" value={mealPlan} onChange={(e) => setMealPlan(e.target.value)}>
                  <option value="EP">EP (Room Only)</option>
                  <option value="CP">CP (Room + Breakfast)</option>
                  <option value="MAP">MAP (Breakfast + One Meal)</option>
                  <option value="AP">AP (All Meals)</option>
                </select>
              </Field>
              <Field label="Rate Code">
                <input className="input" value={rateCode} onChange={(e) => setRateCode(e.target.value)} />
              </Field>
            </Row>

            <Row>
              <Field label="Tariff (₹/night)" required>
                <input className="input" type="number" min="1" value={tariff} onChange={(e) => setTariff(e.target.value)} />
              </Field>
              <Field label="Total Amount (₹)">
                <input className="input" value={totalAmount} readOnly />
              </Field>
              <Field label="Reservation Mode" required>
                <select className="res-select" value={reservationMode} onChange={(e) => setReservationMode(e.target.value)}>
                  <option value="OTA">OTA</option>
                  <option value="FIT">FIT</option>
                  <option value="Corporate">Corporate</option>
                  <option value="Travel Agent">Travel Agent</option>
                </select>
              </Field>
            </Row>
          </div>
        </form>

        {/* Guest & Billing */}
        <form className="panel" onSubmit={onSubmit} noValidate style={{ marginTop: 12 }}>
          <div className="panel-h">Guest & Billing</div>
          <div className="panel-b" style={{ display: "grid", gap: 12 }}>
            <Row>
              <Field label="Guest Name" required>
                <input className="input" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
              </Field>
              <Field label="Mobile No." required>
                <input className="input" value={guestMobile} onChange={(e) => setGuestMobile(e.target.value)} />
              </Field>
              <Field label="Email">
                <input className="input" type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
              </Field>
            </Row>

            <Row>
              <Field label="Sales Person Name">
                <input className="input" value={salesPerson} onChange={(e) => setSalesPerson(e.target.value)} />
              </Field>
              <Field label="Reservation Number" required>
                <input className="input" value={reservationNumber} onChange={(e) => setReservationNumber(e.target.value)} />
              </Field>
              <Field label="Billing Instruction">
                <input className="input" value={billingInstruction} onChange={(e) => setBillingInstruction(e.target.value)} />
              </Field>
            </Row>

            <Row full>
              <Field label="Instruction">
                <textarea className="input" rows={3} value={instruction} onChange={(e) => setInstruction(e.target.value)} />
              </Field>
              <Field label="Guest Special Request">
                <textarea className="input" rows={3} value={specialRequest} onChange={(e) => setSpecialRequest(e.target.value)} />
              </Field>
            </Row>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="btn" onClick={() => navigate("/reservation")} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn" disabled={loading}>
                {loading ? "Saving…" : mode === "edit" ? "Update Reservation" : "Create Reservation"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ===== Modals ===== */}
      {showSuccess && (
        <Modal title="Success" onClose={() => setShowSuccess(false)}>
          <p style={{ margin: 0 }}>{ok || "Reservation saved."}</p>
          <div className="cp-actions">
            <button
              className="btn"
              type="button"
              onClick={() => {
                setShowSuccess(false);
                resetForm();            // stay on same page and clear form
              }}
            >
              Create Another
            </button>
            <button className="btn" type="button" onClick={() => navigate("/reservation")}>
              Go to Overview
            </button>
          </div>
        </Modal>
      )}

      {showError && (
        <Modal title="Error" onClose={() => setShowError(false)}>
          <p style={{ margin: 0, color: "#991b1b" }}>{err || "Something went wrong."}</p>
          <div className="cp-actions">
            <button className="btn" type="button" onClick={() => setShowError(false)}>OK</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------- atoms ---------- */
function Row({ children, full }) {
  return (
    <div style={{
      display: "grid",
      gap: 12,
      gridTemplateColumns: full ? "1fr 1fr" : "repeat(3, minmax(160px, 1fr))",
    }}>
      {children}
    </div>
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
function Alert({ type = "ok", children }) {
  const style = type === "err"
    ? { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }
    : { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
  return <div style={{ ...style, padding: "8px 10px", borderRadius: 10, fontWeight: 700 }}>{children}</div>;
}

/* Simple modal using your color palette */
function Modal({ title, onClose, children }) {
  return (
    <div className="cp-backdrop" style={backdropStyle}>
      <div className="cp-modal" style={modalStyle}>
        <div className="cp-header" style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>{title}</h3>
          <button className="cp-x" onClick={onClose} aria-label="Close" style={xStyle}>×</button>
        </div>
        <div className="cp-body" style={{ padding: 16 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ---------- utils ---------- */
function today(){ const d=new Date(); return d.toISOString().slice(0,10); }
function addDays(dateStr, days){ const d=new Date(dateStr); d.setDate(d.getDate()+Number(days||0)); return d.toISOString().slice(0,10); }
function genResNo(){ const d=new Date().toISOString().slice(0,10).replaceAll("-",""); const r=Math.random().toString(36).slice(2,6).toUpperCase(); return `RSV-${d}-${r}`; }

/* ---------- minimal inline styles for modal (matches your blue theme) ---------- */
const backdropStyle = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
  display: "grid", placeItems: "center", zIndex: 1000
};
const modalStyle = {
  width: "min(520px, calc(100% - 24px))",
  background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden"
};
const headerStyle = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff"
};
const xStyle = {
  border: "1px solid #e5e7eb", background: "#fff", color: "#111827",
  borderRadius: 10, width: 36, height: 36, cursor: "pointer"
};
