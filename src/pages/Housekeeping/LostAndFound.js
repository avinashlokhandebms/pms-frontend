// src/pages/Housekeeping/LostAndFound.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { BackofficeSidebar, HousekeepingSidebar } from "../../components/sidebar/HousekeepingSidebar";
import "../../components/sidebar/Sidebar.css";
import "../../assets/css/commanPage.css";

/**
 * Lost & Found
 *
 * Suggested API (adapt to your backend):
 *  GET    /api/lost-found?q=&status=&dateFrom=&dateTo=&room=&propertyCode=&page=&limit=  -> { data, total }
 *  POST   /api/lost-found
 *  PATCH  /api/lost-found/:id
 *  DELETE /api/lost-found/:id
 */

const PAGE_SIZE = 10;
const STATUSES = ["FOUND", "STORED", "CLAIMED", "RETURNED", "DISCARDED"];
const CATEGORIES = ["DOCUMENT", "ELECTRONICS", "CLOTHING", "JEWELLERY", "CASH", "TOILETRIES", "OTHER"];

export default function LostAndFound() {
  // list state
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [room, setRoom] = useState("");
  const [propertyCode, setPropertyCode] = useState("");

  // paging
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);

  // modals
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  // load list
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const params = new URLSearchParams({ page, limit });
        if (q.trim()) params.set("q", q.trim());
        if (status) params.set("status", status);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
        if (room.trim()) params.set("room", room.trim());
        if (propertyCode.trim()) params.set("propertyCode", propertyCode.trim().toUpperCase());

        const res = await apiFetch(`/api/lost-found?${params.toString()}`, { auth: true });
        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;

        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number(count) || 0);
        }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load lost & found items."); setRows([]); setTotal(0); }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [q, status, dateFrom, dateTo, room, propertyCode, page, limit]);

  // client fallback quick search
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [
        r.refNo, r.itemName, r.category, r.roomNumber, r.locationFound,
        r.foundByName, r.guestName, r.notes, r.status,
      ]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  const dataToRender = rows?.length && total > rows.length ? rows : filtered;

  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit = (row) => { setEditing(row); setShowForm(true); };
  const askDelete = (row) => { setToDelete(row); setShowDelete(true); };

  const afterSave = (saved) => {
    setShowForm(false); setEditing(null);
    setRows(prev => {
      const id = saved._id || saved.id;
      const idx = prev.findIndex(p => (p._id || p.id) === id);
      if (idx === -1) return [saved, ...prev];
      const next = prev.slice(); next[idx] = saved; return next;
    });
  };
  const afterDelete = (id) => {
    setShowDelete(false); setToDelete(null);
    setRows(prev => prev.filter(r => (r._id || r.id) !== id));
    setTotal(t => Math.max(0, t - 1));
  };

  const quickUpdateStatus = async (row, next) => {
    const id = row._id || row.id;
    try {
      const res = await apiFetch(`/api/lost-found/${id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ status: next }),
      });
      afterSave(res || { ...row, status: next });
    } catch (e) {
      alert(e?.message || "Failed to update status");
    }
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <HousekeepingSidebar />

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Lost &amp; Found</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="res-select"
              placeholder="Search (ref / item / room / guest)"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              style={{ minWidth: 240 }}
            />
            <select className="res-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input className="res-select" type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} title="From" />
            <input className="res-select" type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} title="To" />
            <input className="res-select" placeholder="Room #" value={room} onChange={(e) => { setRoom(e.target.value); setPage(1); }} style={{ width: 120 }} />
            <input className="res-select" placeholder="Property Code" value={propertyCode} onChange={(e) => { setPropertyCode(e.target.value); setPage(1); }} style={{ textTransform: "uppercase", width: 140 }} />
            <select className="res-select" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
            <button className="btn" onClick={openCreate}>+ Add Item</button>
          </div>
        </div>

        {/* Table */}
        <div className="panel">
          <div className="panel-h">
            <span>Items</span>
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
                    <th style={{ width: 120 }}>Action</th>
                    <th>Ref #</th>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Room</th>
                    <th>Found @</th>
                    <th>Found By</th>
                    <th>Status</th>
                    <th>Stored @</th>
                    <th>Guest</th>
                    <th>Contact</th>
                    <th>Found On</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={13}>No lost &amp; found items</td></tr>
                  )}

                  {dataToRender?.map(r => {
                    const id = r._id || r.id;
                    return (
                      <tr key={id}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="btn" style={btnSm} onClick={() => openEdit(r)}>✏️</button>
                          <button className="btn" style={btnSm} onClick={() => askDelete(r)}>🗑️</button>
                        </td>
                        <td>{r.refNo || "—"}</td>
                        <td title={r.itemName || ""}>{truncate(r.itemName || "—", 24)}</td>
                        <td><Chip value={r.category || "OTHER"} palette="cat" /></td>
                        <td>{r.roomNumber || "—"}</td>
                        <td title={r.locationFound || ""}>{truncate(r.locationFound || "—", 18)}</td>
                        <td>{r.foundByName || "—"}</td>
                        <td>
                          <Chip value={r.status || "FOUND"} palette="status" />
                          <div style={{ marginTop: 4 }}>
                            <select
                              className="res-select"
                              value={(r.status || "FOUND")}
                              onChange={(e) => quickUpdateStatus(r, e.target.value)}
                            >
                              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        </td>
                        <td title={r.storageLocation || ""}>{truncate(r.storageLocation || "—", 18)}</td>
                        <td>{r.guestName || "—"}</td>
                        <td>{r.guestContact || "—"}</td>
                        <td>{fmtDate(r.foundOn)}</td>
                        <td>{fmtDateTime(r.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
              <button className="btn" disabled={page <= 1 || loading}
                onClick={() => setPage(p => Math.max(1, p - 1))}>
                ‹ Prev
              </button>
              <span className="small" style={{ alignSelf: "center", color: "var(--muted)" }}>Page {page}</span>
              <button
                className="btn"
                disabled={loading || (!total ? dataToRender.length < limit : page * limit >= total)}
                onClick={() => setPage(p => p + 1)}>
                Next ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <LFFormModal
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={afterSave}
        />
      )}

      {showDelete && (
        <ConfirmModal
          title="Delete Lost & Found Item?"
          message={`Delete item "${toDelete?.itemName}" (Ref: ${toDelete?.refNo || "—"})? This cannot be undone.`}
          confirmText="Delete"
          onClose={() => { setShowDelete(false); setToDelete(null); }}
          onConfirm={async () => {
            const id = toDelete?._id || toDelete?.id;
            await apiFetch(`/api/lost-found/${id}`, { method: "DELETE", auth: true });
            afterDelete(id);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Form Modal ---------- */
function LFFormModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial;

  const [refNo, setRefNo] = useState(initial?.refNo || "");
  const [itemName, setItemName] = useState(initial?.itemName || "");
  const [category, setCategory] = useState(initial?.category || "OTHER");
  const [roomNumber, setRoomNumber] = useState(initial?.roomNumber || "");
  const [locationFound, setLocationFound] = useState(initial?.locationFound || "");
  const [foundByName, setFoundByName] = useState(initial?.foundByName || "");
  const [foundOn, setFoundOn] = useState(initial?.foundOn ? toLocalDate(initial.foundOn) : toLocalDate(new Date()));
  const [storageLocation, setStorageLocation] = useState(initial?.storageLocation || "");
  const [status, setStatus] = useState(initial?.status || "FOUND");
  const [guestName, setGuestName] = useState(initial?.guestName || "");
  const [guestContact, setGuestContact] = useState(initial?.guestContact || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [propertyCode, setPropertyCode] = useState(initial?.propertyCode || "");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");

    if (!itemName.trim()) return setErr("Item name is required");
    if (!foundOn) return setErr("Found date is required");

    const payload = {
      refNo: refNo?.trim() || undefined,
      itemName: itemName.trim(),
      category,
      roomNumber: roomNumber?.trim() || undefined,
      locationFound: locationFound?.trim() || undefined,
      foundByName: foundByName?.trim() || undefined,
      foundOn,
      storageLocation: storageLocation?.trim() || undefined,
      status,
      guestName: guestName?.trim() || undefined,
      guestContact: guestContact?.trim() || undefined,
      notes: notes?.trim() || undefined,
      propertyCode: propertyCode ? propertyCode.trim().toUpperCase() : undefined,
    };

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const id = initial._id || initial.id;
        saved = await apiFetch(`/api/lost-found/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(payload) });
      } else {
        saved = await apiFetch(`/api/lost-found`, { method: "POST", auth: true, body: JSON.stringify(payload) });
      }
      setOk("Saved.");
      onSaved(saved);
    } catch (e2) {
      setErr(e2?.message || "Failed to save item.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Lost & Found" : "Create Lost & Found"} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      {ok && <Banner type="ok">{ok}</Banner>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <Row>
          <Field label="Ref #" >
            <input className="input" value={refNo} onChange={(e) => setRefNo(e.target.value)} />
          </Field>
          <Field label="Item Name" required>
            <input className="input" value={itemName} onChange={(e) => setItemName(e.target.value)} />
          </Field>
          <Field label="Category">
            <select className="res-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </Row>

        <Row>
          <Field label="Room #">
            <input className="input" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
          </Field>
          <Field label="Location Found">
            <input className="input" value={locationFound} onChange={(e) => setLocationFound(e.target.value)} />
          </Field>
          <Field label="Found By">
            <input className="input" value={foundByName} onChange={(e) => setFoundByName(e.target.value)} />
          </Field>
        </Row>

        <Row>
          <Field label="Found On" required>
            <input className="input" type="date" value={foundOn} onChange={(e) => setFoundOn(e.target.value)} />
          </Field>
          <Field label="Storage Location">
            <input className="input" value={storageLocation} onChange={(e) => setStorageLocation(e.target.value)} />
          </Field>
          <Field label="Status">
            <select className="res-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </Row>

        <Row>
          <Field label="Guest Name">
            <input className="input" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
          </Field>
          <Field label="Guest Contact">
            <input className="input" value={guestContact} onChange={(e) => setGuestContact(e.target.value)} />
          </Field>
          <Field label="Property Code">
            <input className="input" style={{ textTransform: "uppercase" }} value={propertyCode} onChange={(e) => setPropertyCode(e.target.value)} />
          </Field>
        </Row>

        <Row>
          <Field label="Notes">
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </Row>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? "Saving…" : (isEdit ? "Update" : "Create")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- UI atoms ---------- */
function Row({ children }) {
  return <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(160px, 1fr))" }}>{children}</div>;
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
          onClick={async () => { setBusy(true); try { await onConfirm?.(); onClose(); } finally { setBusy(false); } }}
        >
          {busy ? "Working…" : confirmText}
        </button>
      </div>
    </Modal>
  );
}
function Chip({ value, palette = "status" }) {
  const v = (value || "").toString().toUpperCase();
  let bg = "#f3f4f6", bd = "#e5e7eb", fg = "#334155";
  if (palette === "status") {
    if (v === "FOUND")     { bg="#eff6ff"; bd="#bfdbfe"; fg="#1d4ed8"; }
    if (v === "STORED")    { bg="#e0f2fe"; bd="#bae6fd"; fg="#075985"; }
    if (v === "CLAIMED")   { bg="#fef3c7"; bd="#fde68a"; fg="#92400e"; }
    if (v === "RETURNED")  { bg="#f0fdf4"; bd="#bbf7d0"; fg="#166534"; }
    if (v === "DISCARDED") { bg="#fee2e2"; bd="#fecaca"; fg="#991b1b"; }
  }
  if (palette === "cat") {
    if (v === "DOCUMENT")    { bg="#f5f3ff"; bd="#ddd6fe"; fg="#5b21b6"; }
    if (v === "ELECTRONICS") { bg="#e2e8f0"; bd="#cbd5e1"; fg="#0f172a"; }
    if (v === "CLOTHING")    { bg="#ecfccb"; bd="#bef264"; fg="#3f6212"; }
    if (v === "JEWELLERY")   { bg="#fef9c3"; bd="#fde68a"; fg="#a16207"; }
    if (v === "CASH")        { bg="#dcfce7"; bd="#bbf7d0"; fg="#166534"; }
    if (v === "TOILETRIES")  { bg="#e0f2fe"; bd="#bae6fd"; fg="#075985"; }
    if (v === "OTHER")       { bg="#f3f4f6"; bd="#e5e7eb"; fg="#334155"; }
  }
  return (
    <span style={{
      display: "inline-block", padding: ".15rem .5rem",
      borderRadius: 999, background: bg, border: `1px solid ${bd}`,
      color: fg, fontSize: ".75rem", fontWeight: 700, whiteSpace: "nowrap"
    }}>
      {v}
    </span>
  );
}

/* ---------- helpers ---------- */
function truncate(s, n = 30) { if (!s) return ""; return s.length > n ? s.slice(0, n - 1) + "…" : s; }
function toLocalDate(d) {
  const dt = new Date(d);
  if (Number.isNaN(+dt)) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fmtDate(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(+dt) ? "—" : dt.toLocaleDateString(); }
function fmtDateTime(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(+dt) ? "—" : dt.toLocaleString(); }

/* ---------- inline styles ---------- */
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(980px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };
