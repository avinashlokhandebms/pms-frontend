// src/pages/Housekeeping/MinibarRefill.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { BackofficeSidebar, HousekeepingSidebar } from "../../components/sidebar/HousekeepingSidebar";
import "../../components/sidebar/Sidebar.css";
import "../../assets/css/commanPage.css";

/**
 * Minibar Refill
 *
 * Suggested backend endpoints (adjust to your API):
 *  GET    /api/minibar-refills?q=&roomNo=&status=&from=&to=&propertyCode=&page=&limit=
 *  POST   /api/minibar-refills
 *  PATCH  /api/minibar-refills/:id
 *  DELETE /api/minibar-refills/:id
 *
 * A refill record example:
 *  {
 *    _id, date, roomNo, guestName, propertyCode,
 *    lines: [{ itemCode, itemName, qty, unitPrice }],
 *    totalQty, totalAmount, posted, note, createdAt, updatedAt, createdBy
 *  }
 */

const PAGE_SIZE = 10;

export default function MinibarRefill() {
  // list state
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [roomNo, setRoomNo] = useState("");
  const [status, setStatus] = useState(""); // "", "POSTED", "DRAFT"
  const [from, setFrom] = useState("");     // YYYY-MM-DD
  const [to, setTo] = useState("");         // YYYY-MM-DD
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
        if (roomNo.trim()) params.set("roomNo", roomNo.trim());
        if (status) params.set("status", status);
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        if (propertyCode.trim()) params.set("propertyCode", propertyCode.trim().toUpperCase());

        const res = await apiFetch(`/api/minibar-refills?${params.toString()}`, { auth: true });
        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;

        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number(count) || 0);
        }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load minibar refills."); setRows([]); setTotal(0); }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [q, roomNo, status, from, to, propertyCode, page, limit]);

  // client fallback search
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [
        r.roomNo, r.guestName, r.propertyCode, r.createdBy, r.note,
        ...(Array.isArray(r.lines) ? r.lines.flatMap(l => [l.itemCode, l.itemName]) : [])
      ]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  const dataToRender = rows?.length && total > rows.length ? rows : filtered;

  // actions
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

  const togglePosted = async (row) => {
    const id = row._id || row.id;
    try {
      const res = await apiFetch(`/api/minibar-refills/${id}`, {
        method: "PATCH", auth: true, body: JSON.stringify({ posted: !row.posted })
      });
      afterSave(res || { ...row, posted: !row.posted });
    } catch (e) {
      alert(e?.message || "Failed to change status.");
    }
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <HousekeepingSidebar />

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Minibar Refill</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input className="res-select" placeholder="Search (room / guest / item)" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} style={{ minWidth: 220 }} />
            <input className="res-select" placeholder="Room No" value={roomNo} onChange={(e) => { setRoomNo(e.target.value); setPage(1); }} style={{ width: 120 }} />
            <select className="res-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} style={{ width: 140 }}>
              <option value="">All Status</option>
              <option value="POSTED">POSTED</option>
              <option value="DRAFT">DRAFT</option>
            </select>
            <input className="res-select" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
            <input className="res-select" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
            <input className="res-select" placeholder="Property Code" value={propertyCode} onChange={(e) => { setPropertyCode(e.target.value); setPage(1); }} style={{ textTransform: "uppercase", width: 160 }} />
            <select className="res-select" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
            <button className="btn" onClick={openCreate}>+ Add Refill</button>
          </div>
        </div>

        {/* Table */}
        <div className="panel">
          <div className="panel-h">
            <span>Refill Logs</span>
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
                    <th style={{ width: 160 }}>Action</th>
                    <th>Date</th>
                    <th>Room</th>
                    <th>Guest</th>
                    <th>Lines</th>
                    <th>Total Qty</th>
                    <th>Total Amount</th>
                    <th>Status</th>
                    <th>Property</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={10}>No refill records</td></tr>
                  )}

                  {dataToRender?.map(r => {
                    const id = r._id || r.id;
                    return (
                      <tr key={id}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="btn" style={btnSm} onClick={() => openEdit(r)}>✏️</button>
                          <button className="btn" style={btnSm} onClick={() => togglePosted(r)}>
                            {r.posted ? "Unpost" : "Post"}
                          </button>
                          <button className="btn" style={btnSm} onClick={() => { setToDelete(r); setShowDelete(true); }}>🗑️</button>
                        </td>
                        <td>{fmtDate(r.date) || fmtDate(r.createdAt)}</td>
                        <td>{r.roomNo}</td>
                        <td title={r.guestName || ""}>{r.guestName || "—"}</td>
                        <td>{Array.isArray(r.lines) ? r.lines.length : 0}</td>
                        <td>{num(r.totalQty)}</td>
                        <td>{fmtMoney(r.totalAmount)}</td>
                        <td><Chip value={r.posted ? "POSTED" : "DRAFT"} /></td>
                        <td>{r.propertyCode || "—"}</td>
                        <td>{fmtDateTime(r.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
              <button className="btn" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>‹ Prev</button>
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

      {showForm && (
        <RefillFormModal
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={afterSave}
        />
      )}

      {showDelete && (
        <ConfirmModal
          title="Delete Refill?"
          message={`Delete minibar refill for Room ${toDelete?.roomNo} on ${fmtDate(toDelete?.date)}? This cannot be undone.`}
          confirmText="Delete"
          onClose={() => { setShowDelete(false); setToDelete(null); }}
          onConfirm={async () => {
            const id = toDelete?._id || toDelete?.id;
            await apiFetch(`/api/minibar-refills/${id}`, { method: "DELETE", auth: true });
            afterDelete(id);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Create/Edit Modal ---------- */
function RefillFormModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial;

  const [date, setDate] = useState(initial?.date ? toDateValue(initial.date) : toDateValue(new Date()));
  const [roomNo, setRoomNo] = useState(initial?.roomNo || "");
  const [guestName, setGuestName] = useState(initial?.guestName || "");
  const [propertyCode, setPropertyCode] = useState(initial?.propertyCode || "");
  const [posted, setPosted] = useState(initial?.posted ?? false);
  const [note, setNote] = useState(initial?.note || "");

  const [lines, setLines] = useState(
    Array.isArray(initial?.lines) && initial.lines.length
      ? initial.lines
      : [{ itemCode: "", itemName: "", qty: 1, unitPrice: 0 }]
  );

  const totalQty = useMemo(() => lines.reduce((s, l) => s + (Number(l.qty) || 0), 0), [lines]);
  const totalAmount = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0), 0),
    [lines]
  );

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");

    if (!roomNo.trim()) return setErr("Room No is required.");
    if (!date) return setErr("Date is required.");
    if (!lines.length) return setErr("At least one line is required.");
    if (lines.some(l => !String(l.itemCode || l.itemName).trim())) return setErr("Each line needs an item.");
    if (lines.some(l => !Number.isFinite(Number(l.qty)) || Number(l.qty) <= 0)) return setErr("Qty must be > 0.");
    if (lines.some(l => !Number.isFinite(Number(l.unitPrice)) || Number(l.unitPrice) < 0)) return setErr("Unit price must be ≥ 0.");

    const payload = {
      date,
      roomNo: roomNo.trim(),
      guestName: guestName?.trim() || undefined,
      propertyCode: propertyCode?.trim().toUpperCase() || undefined,
      posted: !!posted,
      note: note?.trim() || undefined,
      lines: lines.map(l => ({
        itemCode: (l.itemCode || "").trim().toUpperCase(),
        itemName: (l.itemName || "").trim(),
        qty: Number(l.qty),
        unitPrice: Number(l.unitPrice),
      })),
      totalQty,
      totalAmount,
    };

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const id = initial._id || initial.id;
        saved = await apiFetch(`/api/minibar-refills/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(payload) });
      } else {
        saved = await apiFetch(`/api/minibar-refills`, { method: "POST", auth: true, body: JSON.stringify(payload) });
      }
      setOk("Saved.");
      onSaved(saved);
    } catch (e2) {
      setErr(e2?.message || "Failed to save refill.");
    } finally {
      setSaving(false);
    }
  };

  const addLine = () => setLines([...lines, { itemCode: "", itemName: "", qty: 1, unitPrice: 0 }]);
  const updateLine = (idx, patch) => setLines(editIdx(lines, idx, { ...lines[idx], ...patch }));
  const removeLine = (idx) => setLines(removeIdx(lines, idx));

  return (
    <Modal title={isEdit ? "Edit Minibar Refill" : "Add Minibar Refill"} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      {ok && <Banner type="ok">{ok}</Banner>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <Row>
          <Field label="Date" required>
            <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </Field>
          <Field label="Room No" required>
            <input className="input" value={roomNo} onChange={e => setRoomNo(e.target.value)} />
          </Field>
          <Field label="Guest Name">
            <input className="input" value={guestName} onChange={e => setGuestName(e.target.value)} />
          </Field>
        </Row>

        <Row>
          <Field label="Property Code">
            <input className="input" style={{ textTransform: "uppercase" }} value={propertyCode} onChange={e => setPropertyCode(e.target.value)} />
          </Field>
          <Field label="Posted">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={posted} onChange={e => setPosted(e.target.checked)} />
              <span>{posted ? "Yes" : "No"}</span>
            </label>
          </Field>
          <Field label="Note">
            <input className="input" value={note} onChange={e => setNote(e.target.value)} />
          </Field>
        </Row>

        <div className="panel">
          <div className="panel-h">Lines</div>
          <div className="panel-b" style={{ display: "grid", gap: 8 }}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>#</th>
                    <th style={{ width: 160 }}>Item Code</th>
                    <th>Item Name</th>
                    <th style={{ width: 120 }}>Qty</th>
                    <th style={{ width: 160 }}>Unit Price</th>
                    <th style={{ width: 160 }}>Line Total</th>
                    <th style={{ width: 90 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, idx) => {
                    const lineTotal = (Number(l.qty) || 0) * (Number(l.unitPrice) || 0);
                    return (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>
                          <input
                            className="input"
                            style={{ textTransform: "uppercase" }}
                            value={l.itemCode || ""}
                            onChange={e => updateLine(idx, { itemCode: e.target.value })}
                            placeholder="e.g. COKE"
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            value={l.itemName || ""}
                            onChange={e => updateLine(idx, { itemName: e.target.value })}
                            placeholder="e.g. Coca Cola 330ml"
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            type="number"
                            min="0"
                            step="1"
                            value={l.qty}
                            onChange={e => updateLine(idx, { qty: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={l.unitPrice}
                            onChange={e => updateLine(idx, { unitPrice: e.target.value })}
                          />
                        </td>
                        <td>{fmtMoney(lineTotal)}</td>
                        <td>
                          <button type="button" className="btn" style={btnSm} onClick={() => removeLine(idx)}>Remove</button>
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td colSpan={7}>
                      <button type="button" className="btn" onClick={addLine}>+ Add Line</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, fontWeight: 800 }}>
              <div>Total Qty: {totalQty}</div>
              <div>Total Amount: {fmtMoney(totalAmount)}</div>
            </div>
          </div>
        </div>

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

/* ---------- Small UI pieces ---------- */
function Row({ children }) { return <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(160px, 1fr))" }}>{children}</div>; }
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
        <button className="btn" type="button" disabled={busy} onClick={async () => { setBusy(true); try { await onConfirm?.(); onClose(); } finally { setBusy(false); } }}>
          {busy ? "Working…" : confirmText}
        </button>
      </div>
    </Modal>
  );
}
function Chip({ value }) {
  const v = (value || "").toString().toUpperCase();
  const posted = v === "POSTED";
  return (
    <span style={{
      display: "inline-block", padding: ".15rem .5rem",
      borderRadius: 999, background: posted ? "#f0fdf4" : "#fefce8",
      border: `1px solid ${posted ? "#bbf7d0" : "#fde68a"}`,
      color: posted ? "#166534" : "#92400e", fontSize: ".75rem", fontWeight: 700
    }}>
      {posted ? "POSTED" : "DRAFT"}
    </span>
  );
}

/* ---------- helpers ---------- */
function num(v) { const n = Number(v ?? 0); return Number.isFinite(n) ? n : 0; }
function fmtMoney(n) { const v = Number(n || 0); return v.toLocaleString(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 2 }); }
function fmtDate(d) { if (!d) return ""; const dt = new Date(d); return Number.isNaN(+dt) ? "" : dt.toLocaleDateString(); }
function fmtDateTime(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(+dt) ? "—" : dt.toLocaleString(); }
function toDateValue(d) { const dt = new Date(d); if (Number.isNaN(+dt)) return ""; const y=dt.getFullYear(), m=String(dt.getMonth()+1).padStart(2,"0"), da=String(dt.getDate()).padStart(2,"0"); return `${y}-${m}-${da}`; }
function editIdx(arr, idx, val) { const next = arr.slice(); next[idx] = val; return next; }
function removeIdx(arr, idx) { return arr.filter((_, i) => i !== idx); }

/* ---------- inline styles ---------- */
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(980px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };
