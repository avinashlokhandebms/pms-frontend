import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../lib/api";

import ReservationSidebar from "../../components/sidebar/ReservationSidebar";
import "../../components/sidebar/Sidebar.css";
import "../../assets/css/commanPage.css";

const PAGE_SIZE = 20;

export default function ReservationDetails() {
  const navigate = useNavigate();

  // drawer (mobile)
  const [sbOpen, setSbOpen] = useState(false);

  // ---- filters (top toolbar) ----
  const [bookingNo, setBookingNo] = useState("");
  const [guest, setGuest] = useState("");                 // name / mobile
  const [type, setType] = useState("Arrival Date");       // Arrival / Departure / Reservation
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [company, setCompany] = useState("");
  const [salesRep, setSalesRep] = useState("");
  const [bookedBy, setBookedBy] = useState("");
  const [voucher, setVoucher] = useState("");
  const [roomNo, setRoomNo] = useState("");
  const [resType, setResType] = useState("");             // FIT/Direct/OTA etc.
  const [days, setDays] = useState("");                   // optional
  const [filterType, setFilterType] = useState("Last BookingNo");

  // ---- table state ----
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // ---- search/sort/paging ----
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [sort, setSort] = useState("checkIn");
  const [dir, setDir] = useState("desc");

  // build query string
  const qs = useMemo(() => {
    const s = new URLSearchParams({
      bookingNo, guest, type,
      from, to,
      company, salesRep,
      bookedBy, voucher,
      roomNo, resType, days, filterType,
      q, page: String(page), limit: String(limit), sort, dir
    });
    // remove blanks for a clean URL
    [...s.keys()].forEach(k => { if (!s.get(k)) s.delete(k); });
    return s.toString();
  }, [bookingNo, guest, type, from, to, company, salesRep, bookedBy, voucher, roomNo, resType, days, filterType, q, page, limit, sort, dir]);

  // fetch
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true); setErr("");
      try {
        const res = await apiFetch(`/api/reservations?${qs}`);
        const data = res?.data || res?.rows || res || [];
        const count = res?.total ?? data.length ?? 0;
        if (!ignore) { setRows(Array.isArray(data) ? data : []); setTotal(Number(count) || 0); }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load reservations."); setRows([]); setTotal(0); }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [qs]);

  // client fallback for q
  const visibleRows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [r.reservationNo, r.guestName, r.phone, r.email, r.companyName, r.roomType, r.reservationMode, r.status]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  const dataToRender = rows?.length && total > rows.length ? rows : visibleRows;

  const th = (key, label) => (
    <th
      role="button"
      onClick={() => { if (sort === key) setDir(d => d === "asc" ? "desc" : "asc"); else { setSort(key); setDir("asc"); } setPage(1); }}
      title="Sort"
      style={{ cursor: "pointer", userSelect: "none" }}
    >
      {label} <SortMark active={sort === key} dir={dir} />
    </th>
  );

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <ReservationSidebar className={`rsb ${sbOpen ? "open" : ""}`} />
      {sbOpen && <div className="rsb-overlay" onClick={() => setSbOpen(false)} />}

      <div className="res-wrap">
        {/* Header bar */}
        <div className="res-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* <button className="btn" onClick={() => setSbOpen(true)} aria-label="Open menu" style={{ padding: ".45rem .6rem" }}>☰</button> */}
            <h2 style={{ margin: 0 }}>Reservation Booking Details</h2>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={() => navigate("/reservation/new")}>New Reservation</button>
          </div>
        </div>

        {/* Filter toolbar */}
        <div className="panel" style={{ marginBottom: 10 }}>
          <div className="panel-h">Filters</div>
          <div className="panel-b" style={{ display: "grid", gap: 8 }}>
            <Grid cols={6}>
              <Input label="Booking No." value={bookingNo} onChange={setBookingNo} />
              <Input label="Guest Name / Mob No." value={guest} onChange={setGuest} />
              <Select label="Type" value={type} onChange={setType} options={["Arrival Date", "Departure Date", "Reservation Date"]} />
              <Input type="date" label="From" value={from} onChange={setFrom} />
              <Input type="date" label="To" value={to} onChange={setTo} />
              <Input label="Company" value={company} onChange={setCompany} />
            </Grid>
            <Grid cols={6}>
              <Input label="Sales Representative By" value={salesRep} onChange={setSalesRep} />
              <Input label="Booked By" value={bookedBy} onChange={setBookedBy} />
              <Input label="Confirm Voucher No." value={voucher} onChange={setVoucher} />
              <Input label="Room No." value={roomNo} onChange={setRoomNo} />
              <Input label="Reservation Type" value={resType} onChange={setResType} />
              <Input label="Days" type="number" value={days} onChange={v => setDays(v.replace(/\D/g, ""))} />
            </Grid>
            <Grid cols={6}>
              <Select label="Filter Type" value={filterType} onChange={setFilterType} options={["Last BookingNo", "First BookingNo", "High Amount", "Low Amount"]} />
              <Input label="Quick Search" placeholder="name / phone / email / res#" value={q} onChange={setQ} />
              <div />
              <div />
              <div />
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "end" }}>
                <button className="btn" type="button" onClick={() => setPage(1)}>Search</button>
              </div>
            </Grid>
          </div>
        </div>

        {/* Results grid */}
        <div className="panel">
          <div className="panel-h">
            <span>Results</span>
            <span className="small" style={{ color: "var(--muted)" }}>
              {loading ? "Loading..." : `Total: ${total || dataToRender.length}`}
            </span>
          </div>
          <div className="panel-b">
            {err && <Banner type="err">{err}</Banner>}

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    {th("reservationNo", "Booking No.")}
                    {th("guestName", "Guest Name")}
                    {th("reservationDate", "Reservation Date")}
                    {th("companyName", "Company Name")}
                    {th("rooms", "No. of Rooms")}
                    {th("nights", "No. of Days")}
                    {th("roomType", "Room Details")}
                    {th("checkIn", "Arrival Date")}
                    {th("checkOut", "Departure Date")}
                    {th("amount", "Total (₹)")}
                    {th("paid", "Paid (₹)")}
                    {th("balance", "Balance (₹)")}
                    <th>Service Detail</th>
                    <th>Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && (
                    <tr className="no-rows">
                      <td colSpan={15}>No reservations found</td>
                    </tr>
                  )}

                  {dataToRender?.map((r, idx) => {
                    const paid = Number(r.paid || 0);
                    const totalAmt = Number(r.amount || 0);
                    const balance = totalAmt - paid;
                    return (
                      <tr key={r._id || r.id || r.reservationNo || idx}>
                        <td>{(page - 1) * limit + idx + 1}</td>
                        <td>{r.reservationNo || "—"} {r.reservationMode ? `(${r.reservationMode})` : ""} {r.status ? `(${prettyStatus(r.status)})` : ""}</td>
                        <td>
                          {r.guestName || "—"}
                          <div className="small" style={{ color: "var(--muted)" }}>
                            {r.phone || ""} {r.email ? ` • ${r.email}` : ""}
                          </div>
                        </td>
                        <td>{fmtDateTime(r.createdAt || r.reservationDate)}</td>
                        <td>{r.companyName || "—"}</td>
                        <td>{safeNum(r.rooms)}</td>
                        <td>{safeNum(r.nights)}</td>
                        <td>{[r.roomType, r.mealPlan].filter(Boolean).join(" / ") || "—"}</td>
                        <td>{fmtDateTime(r.checkIn, true)}</td>
                        <td>{fmtDateTime(r.checkOut, true)}</td>
                        <td>{fmtMoney(totalAmt)}</td>
                        <td>{fmtMoney(paid)}</td>
                        <td style={{ color: balance >= 0 ? "#166534" : "#b91c1c", fontWeight: 700 }}>
                          {balance >= 0 ? "+" : ""}{fmtMoney(balance)}
                        </td>
                        <td>—</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <TableIconBtn title="Edit" onClick={() => navigate(`/reservation/new?id=${r._id || r.id || ""}`)}>✏️</TableIconBtn>
                          <TableIconBtn title="Delete" onClick={() => navigate(`/reservation/details/${r._id || r.id || ""}`)}>🗑️</TableIconBtn>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer: count + rows per page + pager */}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 8, alignItems: "center" }}>
              <div className="small" style={{ color: "var(--muted)" }}>
                Total Count: {total || dataToRender.length} | Show{" "}
                <select
                  className="res-select"
                  value={limit}
                  onChange={(e) => { setPage(1); setLimit(Number(e.target.value)); }}
                  style={{ padding: "2px 6px" }}
                >
                  {[10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>{" "}
                Rows per page
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn" disabled={page <= 1 || loading} onClick={() => setPage(1)}>«</button>
                <button className="btn" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>‹</button>
                <span className="small" style={{ alignSelf: "center", color: "var(--muted)" }}> {page} </span>
                <button
                  className="btn"
                  disabled={loading || (!total ? dataToRender.length < limit : page * limit >= total)}
                  onClick={() => setPage(p => p + 1)}
                >›</button>
                <button
                  className="btn"
                  disabled={loading || (!total ? true : page * limit >= total)}
                  onClick={() => {
                    if (total) {
                      const last = Math.max(1, Math.ceil(total / limit));
                      setPage(last);
                    }
                  }}
                >»</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- small UI helpers ---- */
function Grid({ children, cols = 3 }) {
  return (
    <div style={{ display: "grid", gap: 8, gridTemplateColumns: `repeat(${cols}, minmax(160px, 1fr))` }}>
      {children}
    </div>
  );
}
function Field({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span className="small" style={{ fontWeight: 700 }}>{label}</span>
      {children}
    </label>
  );
}
function Input({ label, value, onChange, type = "text", placeholder }) {
  return (
    <Field label={label}>
      <input className="input" value={value} type={type} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}
function Select({ label, value, onChange, options = [] }) {
  return (
    <Field label={label}>
      <select className="res-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  );
}
function Banner({ type = "ok", children }) {
  const style = type === "err"
    ? { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }
    : { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
  return <div style={{ ...style, padding: "8px 10px", borderRadius: 10, fontWeight: 700, marginBottom: 10 }}>{children}</div>;
}
function SortMark({ active, dir }) { return <span style={{ opacity: active ? 1 : .35 }}>{active ? (dir === "asc" ? "▲" : "▼") : "↕"}</span>; }
function TableIconBtn({ children, ...props }) {
  return <button className="btn" style={{ padding: ".3rem .5rem", marginRight: 6 }} {...props}>{children}</button>;
}

/* ---- utils ---- */
function prettyStatus(s){ return String(s||"").replace(/_/g," ").replace(/\b\w/g, c => c.toUpperCase()); }
function today(){ const d=new Date(); return d.toISOString().slice(0,10); }
function fmtDateTime(d, showTime = false) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  if (!showTime) return dt.toLocaleDateString();
  const hh = String(dt.getHours()).padStart(2,"0");
  const mm = String(dt.getMinutes()).padStart(2,"0");
  return `${dt.toLocaleDateString()} ${hh}:${mm}`;
}
function fmtMoney(n){ const x = Number(n||0); return x.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function safeNum(n){ return Number(n ?? 0) || 0; }
