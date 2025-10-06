import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import ReservationSidebar, { BackofficeSidebar } from "../../../components/sidebar/ReservationSidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

const PAGE_SIZE = 10;

/**
 * Expected backend (adapt as needed):
 * GET    /api/pax-checkin?q=&page=&limit=&propertyCode=
 *   -> { data:[{ _id, reservationId, bookingNo, propertyCode, guest:{name,mobile,email,gender}, paxType:"ADULT|CHILD", roomTypeCode, roomNo, arrival, departure, status:"PENDING|ASSIGNED|CHECKEDIN", idType, idNumber, remarks }], total }
 *
 * PATCH  /api/pax/:id/assign-room        { roomNo }
 * PATCH  /api/pax/:id/identity           { idType, idNumber }
 * PATCH  /api/pax/:id                    { guest:{...}, paxType }
 * POST   /api/pax/:id/checkin            {}
 * POST   /api/pax/bulk-checkin           { ids:[...] }
 *
 * GET    /api/rooms?propertyCode=&status=VACANT&from=&to=&roomType=
 */

export default function PaxCheckin() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [propertyCode, setPropertyCode] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // modals
  const [assigning, setAssigning] = useState(null); // row
  const [editing, setEditing] = useState(null); // row
  const [idEditing, setIdEditing] = useState(null); // row
  const [checking, setChecking] = useState(null); // row

  // selections for bulk
  const [sel, setSel] = useState(new Set());

  // load list
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true); setErr(""); setOk("");
      try {
        const params = new URLSearchParams({ q, page, limit });
        if (propertyCode) params.set("propertyCode", propertyCode.trim().toUpperCase());
        const res = await apiFetch(`/api/pax-checkin?${params.toString()}`, { auth: true });
        const data = res?.data || res?.items || res || [];
        const count = Number(res?.total ?? data.length ?? 0);
        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number.isFinite(count) ? count : 0);
          setSel(new Set()); // reset selection on load
        }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load PAX list."); setRows([]); setTotal(0); }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [q, page, limit, propertyCode]);

  // client fallback search (only if total not provided)
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [
        r.bookingNo,
        r.propertyCode,
        r.roomTypeCode,
        r.roomNo,
        r?.guest?.name,
        r?.guest?.mobile,
        r?.guest?.email,
      ]
      .filter(Boolean)
      .some(v => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  const dataToRender = rows?.length && total > rows.length ? rows : filtered;

  // selection helpers
  const toggleSel = (id) => {
    const s = new Set(sel);
    s.has(id) ? s.delete(id) : s.add(id);
    setSel(s);
  };
  const toggleAllOnPage = () => {
    const s = new Set(sel);
    const idsOnPage = dataToRender.map(r => r._id || r.id);
    const allSelected = idsOnPage.every(id => s.has(id));
    if (allSelected) idsOnPage.forEach(id => s.delete(id));
    else idsOnPage.forEach(id => s.add(id));
    setSel(s);
  };

  // optimistic updates
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
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>PAX Check-In</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="res-select"
              placeholder="Search (booking no / guest / phone / room)"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              style={{ minWidth: 300 }}
            />
            <input
              className="res-select"
              placeholder="Property Code (optional)"
              value={propertyCode}
              onChange={(e) => { setPropertyCode(e.target.value); setPage(1); }}
              style={{ width: 160, textTransform: "uppercase" }}
            />
            <select
              className="res-select"
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              title="Rows per page"
            >
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
            <button
              className="btn"
              disabled={sel.size === 0 || loading}
              onClick={async () => {
                setErr(""); setOk("");
                try {
                  const ids = Array.from(sel);
                  await apiFetch("/api/pax/bulk-checkin", {
                    method: "POST",
                    auth: true,
                    body: JSON.stringify({ ids }),
                  });
                  setOk(`Checked-in ${ids.length} pax.`);
                  // refresh current page
                  const params = new URLSearchParams({ q, page, limit });
                  if (propertyCode) params.set("propertyCode", propertyCode.trim().toUpperCase());
                  const res = await apiFetch(`/api/pax-checkin?${params.toString()}`, { auth: true });
                  const data = res?.data || res || [];
                  setRows(Array.isArray(data) ? data : []);
                  setTotal(Number(res?.total ?? data.length ?? 0));
                  setSel(new Set());
                } catch (e) {
                  setErr(e?.message || "Bulk check-in failed.");
                }
              }}
            >
              ✓ Check-In Selected ({sel.size})
            </button>
          </div>
        </div>

        {/* Feedback */}
        {err && <Banner type="err">{err}</Banner>}
        {ok && <Banner type="ok">{ok}</Banner>}

        {/* Table */}
        <div className="panel">
          <div className="panel-h">
            <span>PAX Waiting / Assigned / In-House</span>
            <span className="small" style={{ color: "var(--muted)" }}>
              {loading ? "Loading…" : `Total: ${total || dataToRender.length}`}
            </span>
          </div>
          <div className="panel-b">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        onChange={toggleAllOnPage}
                        checked={dataToRender.length > 0 && dataToRender.every(r => sel.has(r._id || r.id))}
                        aria-label="Select all on page"
                      />
                    </th>
                    <th>Action</th>
                    <th>Booking</th>
                    <th>Guest</th>
                    <th>PAX</th>
                    <th>Property</th>
                    <th>Room Type</th>
                    <th>Room</th>
                    <th>Status</th>
                    <th>Arrival</th>
                    <th>Departure</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={11}>No PAX found</td></tr>
                  )}
                  {dataToRender.map(r => {
                    const id = r._id || r.id;
                    const selectable = String(r.status).toUpperCase() !== "CHECKEDIN";
                    return (
                      <tr key={id}>
                        <td>
                          <input
                            type="checkbox"
                            disabled={!selectable}
                            checked={sel.has(id)}
                            onChange={() => toggleSel(id)}
                            aria-label="Select row"
                          />
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="btn" style={btnSm} onClick={() => setEditing(r)}>✏️</button>
                          <button className="btn" style={btnSm} onClick={() => setAssigning(r)}>🛏️</button>
                          <button className="btn" style={btnSm} onClick={() => setIdEditing(r)}>🪪</button>
                          <button
                            className="btn"
                            style={btnSm}
                            disabled={String(r.status).toUpperCase() === "CHECKEDIN"}
                            onClick={() => setChecking(r)}
                          >
                            ✓
                          </button>
                        </td>
                        <td title={r.reservationId}>{r.bookingNo || "—"}</td>
                        <td>
                          <div style={{ fontWeight: 700 }}>{r?.guest?.name || "—"}</div>
                          <div className="small" style={{ color: "var(--muted)" }}>
                            {(r?.guest?.mobile || "—")}{r?.guest?.email ? " · " + r.guest.email : ""}
                          </div>
                        </td>
                        <td>{r.paxType || "ADULT"}</td>
                        <td style={{ textTransform: "uppercase" }}>{r.propertyCode || "—"}</td>
                        <td>{r.roomTypeCode || "—"}</td>
                        <td>{r.roomNo || "—"}</td>
                        <td><StatusPill value={r.status} /></td>
                        <td>{fmtDT(r.arrival)}</td>
                        <td>{fmtDT(r.departure)}</td>
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
      {assigning && (
        <AssignRoomModal
          row={assigning}
          onClose={() => setAssigning(null)}
          onSaved={(saved) => { upsertRow(saved); setOk("Room assigned."); setAssigning(null); }}
        />
      )}
      {editing && (
        <EditGuestModal
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => { upsertRow(saved); setOk("Guest updated."); setEditing(null); }}
        />
      )}
      {idEditing && (
        <IdModal
          row={idEditing}
          onClose={() => setIdEditing(null)}
          onSaved={(saved) => { upsertRow(saved); setOk("Identity updated."); setIdEditing(null); }}
        />
      )}
      {checking && (
        <CheckinModal
          row={checking}
          onClose={() => setChecking(null)}
          onSaved={(saved) => { upsertRow(saved); setOk("Checked-in."); setChecking(null); }}
        />
      )}
    </div>
  );
}

/* ----------------- Assign Room ----------------- */
function AssignRoomModal({ row, onClose, onSaved }) {
  const [rooms, setRooms] = useState([]);
  const [roomNo, setRoomNo] = useState(row?.roomNo || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const qs = new URLSearchParams({
          propertyCode: row?.propertyCode || "",
          status: "VACANT",
          from: toISODate(row?.arrival || new Date()),
          to: toISODate(row?.departure || addDays(new Date(), 1)),
          roomType: row?.roomTypeCode || "",
        });
        const res = await apiFetch(`/api/rooms?${qs.toString()}`, { auth: true });
        const list = res?.data || res || [];
        if (!ignore) {
          setRooms(list);
          // Choose first if empty
          if (!roomNo) {
            const first = list?.[0];
            const no = first?.roomNo || first?.number || first?.code || "";
            no && setRoomNo(no);
          }
        }
      } catch {
        if (!ignore) setRooms([]);
      }
    })();
    return () => { ignore = true; };
  }, [row]); // eslint-disable-line

  return (
    <Modal title="Assign Room" onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      <div style={{ display: "grid", gap: 12 }}>
        <Field label="Room" required>
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
                const saved = await apiFetch(`/api/pax/${row._id || row.id}/assign-room`, {
                  method: "PATCH", auth: true, body: JSON.stringify({ roomNo }),
                });
                onSaved?.(saved);
              } catch (e) { setErr(e?.message || "Failed to assign room."); }
              finally { setBusy(false); }
            }}
          >
            {busy ? "Working…" : "Assign"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ----------------- Edit Guest ----------------- */
function EditGuestModal({ row, onClose, onSaved }) {
  const [guest, setGuest] = useState({
    name: row?.guest?.name || "",
    mobile: row?.guest?.mobile || "",
    email: row?.guest?.email || "",
    gender: row?.guest?.gender || "MALE",
  });
  const [paxType, setPaxType] = useState(row?.paxType || "ADULT");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const setG = (k, v) => setGuest(g => ({ ...g, [k]: v }));

  return (
    <Modal title="Edit Guest" onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      <div style={{ display: "grid", gap: 12 }}>
        <Row>
          <Field label="Name" required>
            <input className="input" value={guest.name} onChange={e => setG("name", e.target.value)} />
          </Field>
          <Field label="Mobile">
            <input className="input" value={guest.mobile} onChange={e => setG("mobile", e.target.value)} />
          </Field>
          <Field label="Email">
            <input className="input" value={guest.email} onChange={e => setG("email", e.target.value)} />
          </Field>
        </Row>
        <Row>
          <Field label="Gender">
            <select className="res-select" value={guest.gender} onChange={e => setG("gender", e.target.value)}>
              <option>MALE</option>
              <option>FEMALE</option>
              <option>OTHER</option>
            </select>
          </Field>
          <Field label="PAX Type">
            <select className="res-select" value={paxType} onChange={e => setPaxType(e.target.value)}>
              <option>ADULT</option>
              <option>CHILD</option>
            </select>
          </Field>
        </Row>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn"
            disabled={!guest.name.trim() || busy}
            onClick={async () => {
              setBusy(true); setErr("");
              try {
                const payload = { guest: { ...guest, name: guest.name.trim() }, paxType };
                const saved = await apiFetch(`/api/pax/${row._id || row.id}`, {
                  method: "PATCH", auth: true, body: JSON.stringify(payload),
                });
                onSaved?.(saved);
              } catch (e) { setErr(e?.message || "Failed to update guest."); }
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

/* ----------------- Identity ----------------- */
function IdModal({ row, onClose, onSaved }) {
  const [idType, setIdType] = useState(row?.idType || "AADHAAR");
  const [idNumber, setIdNumber] = useState(row?.idNumber || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  return (
    <Modal title="Identity Details" onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      <div style={{ display: "grid", gap: 12 }}>
        <Row>
          <Field label="ID Type">
            <select className="res-select" value={idType} onChange={e => setIdType(e.target.value)}>
              <option>AADHAAR</option>
              <option>PAN</option>
              <option>PASSPORT</option>
              <option>DL</option>
              <option>VOTERID</option>
              <option>OTHER</option>
            </select>
          </Field>
          <Field label="ID Number">
            <input className="input" value={idNumber} onChange={e => setIdNumber(e.target.value)} />
          </Field>
        </Row>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn"
            disabled={!idNumber.trim() || busy}
            onClick={async () => {
              setBusy(true); setErr("");
              try {
                const saved = await apiFetch(`/api/pax/${row._id || row.id}/identity`, {
                  method: "PATCH", auth: true, body: JSON.stringify({ idType, idNumber: idNumber.trim() }),
                });
                onSaved?.(saved);
              } catch (e) { setErr(e?.message || "Failed to save identity."); }
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

/* ----------------- Single Check-in ----------------- */
function CheckinModal({ row, onClose, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const needsRoom = !row?.roomNo;

  return (
    <Modal title="Confirm Check-In" onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      <p style={{ marginTop: 0 }}>
        {needsRoom
          ? "This PAX does not have a room assigned. Please assign a room first."
          : `Check-in ${row?.guest?.name || "guest"} for booking ${row?.bookingNo || ""}?`}
      </p>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button
          className="btn"
          disabled={busy || needsRoom}
          onClick={async () => {
            setBusy(true); setErr("");
            try {
              const saved = await apiFetch(`/api/pax/${row._id || row.id}/checkin`, {
                method: "POST", auth: true, body: "{}",
              });
              onSaved?.(saved);
            } catch (e) { setErr(e?.message || "Check-in failed."); }
            finally { setBusy(false); }
          }}
        >
          {busy ? "Working…" : "Check-In"}
        </button>
      </div>
    </Modal>
  );
}

/* ----------------- UI bits ----------------- */
function StatusPill({ value }) {
  const v = String(value || "PENDING").toUpperCase();
  const color = v === "CHECKEDIN"
    ? { bg: "#ecfdf5", border: "#a7f3d0", fg: "#065f46", text: "Checked-In" }
    : v === "ASSIGNED"
    ? { bg: "#eff6ff", border: "#bfdbfe", fg: "#1e3a8a", text: "Assigned" }
    : { bg: "#f3f4f6", border: "#e5e7eb", fg: "#334155", text: "Pending" };

  return (
    <span style={{
      display: "inline-block", padding: ".15rem .5rem",
      borderRadius: 999, background: color.bg, border: `1px solid ${color.border}`,
      color: color.fg, fontSize: ".75rem", fontWeight: 800
    }}>
      {color.text}
    </span>
  );
}

function Row({ children }) {
  return <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(160px, 1fr))" }}>{children}</div>;
}
function Field({ label, required, children }) {
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
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(880px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };

/* ----------------- tiny helpers ----------------- */
function fmtDT(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return Number.isNaN(dt) ? "—" : dt.toLocaleString();
}
function toISODate(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(d, n) { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt; }
