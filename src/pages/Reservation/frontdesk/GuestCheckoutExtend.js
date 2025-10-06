// src/pages/Frontdesk/GuestCheckoutExtend.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import ReservationSidebar, { BackofficeSidebar } from "../../../components/sidebar/ReservationSidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

/**
 * Guest Checkout Date Extend
 * - Lists in-house guests
 * - Open a modal to extend checkout date
 * - Validates date & (optionally) availability via API
 *
 * Expected APIs (adjust if your endpoints differ):
 *  - GET  /api/frontdesk/inhouse?q=&page=&limit=&propertyCode=
 *      -> { data: [ { _id,id, reservationNo, guestName, roomNo, checkIn, checkOut, nights } ], total }
 *  - GET  /api/rooms/availability?roomNo=&from=&to=&propertyCode=
 *      -> { ok: boolean, conflicts: number }
 *  - POST /api/reservations/:id/extend
 *      Body: { newCheckout: 'YYYY-MM-DD', reason, propertyCode }
 *      -> returns updated reservation
 */

const PAGE_SIZE = 10;

export default function GuestCheckoutExtend() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [propertyCode, setPropertyCode] = useState(""); // optional filter
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [showExtend, setShowExtend] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const params = new URLSearchParams({ q, page, limit });
        if (propertyCode.trim()) params.set("propertyCode", propertyCode.trim().toUpperCase());
        const res = await apiFetch(`/api/frontdesk/inhouse?${params.toString()}`, { auth: true });
        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;
        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number(count) || 0);
        }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load in-house list."); setRows([]); setTotal(0); }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [q, page, limit, propertyCode]);

  // client filter fallback
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [r.reservationNo, r.guestName, r.roomNo]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  const dataToRender = rows?.length && total > rows.length ? rows : filtered;

  const openExtend = (row) => { setSelected(row); setShowExtend(true); };
  const onExtended = (updated) => {
    setShowExtend(false); setSelected(null);
    setRows(prev => {
      const id = updated._id || updated.id;
      const idx = prev.findIndex(p => (p._id || p.id) === id);
      if (idx === -1) return prev;
      const next = prev.slice(); next[idx] = updated; return next;
    });
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <ReservationSidebar />

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Guest Checkout — Extend</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="res-select"
              placeholder="Property Code (optional)"
              value={propertyCode}
              onChange={(e) => { setPropertyCode(e.target.value); setPage(1); }}
              style={{ width: 180, textTransform: "uppercase" }}
            />
            <input
              className="res-select"
              placeholder="Search (name / res# / room)"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              style={{ minWidth: 260 }}
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

        {/* Table */}
        <div className="panel">
          <div className="panel-h">
            <span>In-House Guests</span>
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
                    <th style={{ width: 90 }}>Action</th>
                    <th>Res#</th>
                    <th>Guest</th>
                    <th>Room</th>
                    <th>Check-In</th>
                    <th>Current Check-Out</th>
                    <th>Nights</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={7}>No in-house guests</td></tr>
                  )}

                  {dataToRender?.map(r => {
                    const id = r._id || r.id;
                    return (
                      <tr key={id}>
                        <td>
                          <button className="btn" style={btnSm} onClick={() => openExtend(r)}>
                            Extend
                          </button>
                        </td>
                        <td>{r.reservationNo || "—"}</td>
                        <td>{r.guestName || "—"}</td>
                        <td>{r.roomNo || "—"}</td>
                        <td>{fmtDate(r.checkIn)}</td>
                        <td>{fmtDate(r.checkOut)}</td>
                        <td>{r.nights ?? diffDays(r.checkIn, r.checkOut)}</td>
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

      {showExtend && (
        <ExtendModal
          reservation={selected}
          propertyCode={propertyCode}
          onClose={() => { setShowExtend(false); setSelected(null); }}
          onExtended={onExtended}
        />
      )}
    </div>
  );
}

/* ---------- Extend Modal ---------- */
function ExtendModal({ reservation, propertyCode, onClose, onExtended }) {
  const id = reservation?._id || reservation?.id;
  const currentCO = toISO(reservation?.checkOut);
  const [newCO, setNewCO] = useState(currentCO || "");
  const [reason, setReason] = useState("");
  const [checking, setChecking] = useState(false);
  const [availMsg, setAvailMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const nights = useMemo(() => diffDays(reservation?.checkIn, newCO), [reservation, newCO]);

  const checkAvailability = async () => {
    if (!reservation?.roomNo || !currentCO || !newCO) return;
    if (new Date(newCO) <= new Date(currentCO)) {
      setAvailMsg("New checkout must be after current checkout."); return;
    }
    setChecking(true); setAvailMsg("");
    try {
      const params = new URLSearchParams({
        roomNo: String(reservation.roomNo),
        from: currentCO,
        to: newCO,
      });
      if (propertyCode.trim()) params.set("propertyCode", propertyCode.trim().toUpperCase());
      const res = await apiFetch(`/api/rooms/availability?${params.toString()}`, { auth: true });
      const ok = !!(res?.ok ?? true);
      if (ok) setAvailMsg("✅ Room is available for extension.");
      else setAvailMsg(`⚠️ Not available (${res?.conflicts ?? 1} conflict). Choose another date or room.`);
    } catch (e) {
      setAvailMsg("Could not check availability.");
    } finally {
      setChecking(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!newCO) return setErr("Choose a new checkout date.");
    if (currentCO && new Date(newCO) <= new Date(currentCO)) {
      return setErr("New checkout must be after current checkout.");
    }

    setSaving(true);
    try {
      const payload = { newCheckout: newCO, reason, propertyCode: propertyCode || undefined };
      const updated = await apiFetch(`/api/reservations/${id}/extend`, {
        method: "POST", auth: true, body: JSON.stringify(payload),
      });
      onExtended(updated);
    } catch (e2) {
      setErr(e2?.message || "Failed to extend stay.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Extend Checkout — ${reservation?.guestName || ""}`} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}

      <div className="small" style={{ marginBottom: 10, color: "var(--muted)" }}>
        Room <b>{reservation?.roomNo || "—"}</b> • Res# <b>{reservation?.reservationNo || "—"}</b><br />
        Check-in <b>{fmtDate(reservation?.checkIn)}</b> • Current CO <b>{fmtDate(reservation?.checkOut)}</b>
      </div>

      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(160px, 1fr))" }}>
          <Field label="Current Checkout">
            <input className="input" type="date" value={currentCO || ""} readOnly />
          </Field>
          <Field label="New Checkout" required>
            <input className="input" type="date" value={newCO} onChange={e => setNewCO(e.target.value)} />
          </Field>
          <Field label="Total Nights (after change)">
            <input className="input" value={Number.isFinite(nights) ? nights : ""} readOnly />
          </Field>
        </div>

        <div>
          <button className="btn" type="button" onClick={checkAvailability} disabled={checking}>
            {checking ? "Checking…" : "Check Availability"}
          </button>
          {availMsg && <div className="small" style={{ marginTop: 6 }}>{availMsg}</div>}
        </div>

        <Field label="Reason (optional)">
          <textarea className="input" rows={2} placeholder="Add a reason for audit trail…" value={reason} onChange={e => setReason(e.target.value)} />
        </Field>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? "Saving…" : "Extend Stay"}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Small UI ---------- */
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

/* ---------- Helpers ---------- */
function toISO(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(+dt)) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fmtDate(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(+dt) ? "—" : dt.toLocaleDateString(); }
function diffDays(from, to) {
  const a = new Date(toISO(from)), b = new Date(toISO(to));
  if (Number.isNaN(+a) || Number.isNaN(+b)) return NaN;
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

/* ---------- Styles ---------- */
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };

const backdropStyle = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
  display: "grid", placeItems: "center", zIndex: 1000
};
const modalStyle = {
  width: "min(760px, calc(100% - 24px))",
  background: "#fff",
  borderRadius: 16,
  boxShadow: "0 20px 60px rgba(0,0,0,.22)",
  overflow: "hidden"
};
const headerStyle = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff"
};
const xStyle = {
  border: "1px solid #e5e7eb", background: "#fff",
  color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer"
};
