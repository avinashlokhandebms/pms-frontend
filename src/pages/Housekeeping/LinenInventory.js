// src/pages/Housekeeping/LinenInventory.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { BackofficeSidebar, HousekeepingSidebar } from "../../components/sidebar/HousekeepingSidebar";
import "../../components/sidebar/Sidebar.css";
import "../../assets/css/commanPage.css";

/**
 * Linen Inventory
 *
 * Suggested backend endpoints (adjust to your API):
 *  GET    /api/linen-items?q=&category=&location=&status=&propertyCode=&page=&limit=
 *  POST   /api/linen-items
 *  PATCH  /api/linen-items/:id
 *  DELETE /api/linen-items/:id
 */

const PAGE_SIZE = 10;
const CATEGORIES = ["SHEET", "TOWEL", "PILLOWCASE", "DUVET", "BLANKET", "BATHROBE", "NAPKIN", "CURTAIN", "OTHER"];
const UNITS = ["PC", "SET", "KG"];
const LOCATIONS = ["STORE", "HOUSEKEEPING", "LAUNDRY", "FLOOR"];
const STATUSES = ["ACTIVE", "INACTIVE"];

export default function LinenInventory() {
  // list state
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("");
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
        if (category) params.set("category", category);
        if (location) params.set("location", location);
        if (status) params.set("status", status);
        if (propertyCode.trim()) params.set("propertyCode", propertyCode.trim().toUpperCase());

        const res = await apiFetch(`/api/linen-items?${params.toString()}`, { auth: true });
        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;

        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number(count) || 0);
        }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load linen items."); setRows([]); setTotal(0); }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [q, category, location, status, propertyCode, page, limit]);

  // client fallback search
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [
        r.code, r.name, r.category, r.unit, r.location,
        r.propertyCode, r.note
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

  const quickAdjust = async (row) => {
    const s = window.prompt("Enter adjustment for On Hand (e.g. +5 or -2):", "");
    if (s == null) return;
    const n = Number(s);
    if (!Number.isFinite(n) || Number.isNaN(n)) return alert("Invalid number.");
    const id = row._id || row.id;
    try {
      const payload = { qtyOnHand: Number(row.qtyOnHand || 0) + n };
      const res = await apiFetch(`/api/linen-items/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(payload) });
      afterSave(res || { ...row, ...payload });
    } catch (e) {
      alert(e?.message || "Failed to adjust quantity.");
    }
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <HousekeepingSidebar />

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Linen Inventory</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="res-select"
              placeholder="Search (code / name / note)"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              style={{ minWidth: 240 }}
            />
            <select className="res-select" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="res-select" value={location} onChange={(e) => { setLocation(e.target.value); setPage(1); }}>
              <option value="">All Locations</option>
              {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select className="res-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input
              className="res-select"
              placeholder="Property Code"
              style={{ textTransform: "uppercase", width: 150 }}
              value={propertyCode}
              onChange={(e) => { setPropertyCode(e.target.value); setPage(1); }}
            />
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
                    <th style={{ width: 140 }}>Action</th>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Unit</th>
                    <th>Location</th>
                    <th title="Par Level">Par</th>
                    <th title="Quantity On Hand">On Hand</th>
                    <th>In Laundry</th>
                    <th>Damaged</th>
                    <th>Lost</th>
                    <th>Status</th>
                    <th>Property</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={14}>No linen items</td></tr>
                  )}

                  {dataToRender?.map(r => {
                    const id = r._id || r.id;
                    const belowPar = Number(r.qtyOnHand || 0) < Number(r.parLevel || 0);
                    return (
                      <tr key={id}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="btn" style={btnSm} onClick={() => openEdit(r)}>✏️</button>
                          <button className="btn" style={btnSm} onClick={() => quickAdjust(r)}>±</button>
                          <button className="btn" style={btnSm} onClick={() => askDelete(r)}>🗑️</button>
                        </td>
                        <td>{r.code}</td>
                        <td title={r.note || ""}>{r.name}</td>
                        <td><Chip value={r.category || "OTHER"} palette="cat" /></td>
                        <td>{r.unit || "PC"}</td>
                        <td>{r.location || "STORE"}</td>
                        <td>{num(r.parLevel)}</td>
                        <td>
                          {num(r.qtyOnHand)}{" "}
                          {belowPar && <span title="Below par" style={{ color: "#b45309", fontWeight: 800 }}>⚠</span>}
                        </td>
                        <td>{num(r.inLaundry)}</td>
                        <td>{num(r.damaged)}</td>
                        <td>{num(r.lost)}</td>
                        <td><Chip value={r.isActive ? "ACTIVE" : "INACTIVE"} palette="status" /></td>
                        <td>{r.propertyCode || "—"}</td>
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
        <LinenFormModal
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={afterSave}
        />
      )}

      {showDelete && (
        <ConfirmModal
          title="Delete Linen Item?"
          message={`Delete "${toDelete?.name}" (${toDelete?.code})? This cannot be undone.`}
          confirmText="Delete"
          onClose={() => { setShowDelete(false); setToDelete(null); }}
          onConfirm={async () => {
            const id = toDelete?._id || toDelete?.id;
            await apiFetch(`/api/linen-items/${id}`, { method: "DELETE", auth: true });
            afterDelete(id);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Form Modal ---------- */
function LinenFormModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial;

  const [code, setCode] = useState(initial?.code || "");
  const [name, setName] = useState(initial?.name || "");
  const [category, setCategory] = useState(initial?.category || "OTHER");
  const [unit, setUnit] = useState(initial?.unit || "PC");
  const [location, setLocation] = useState(initial?.location || "STORE");
  const [parLevel, setParLevel] = useState(initial?.parLevel ?? "");
  const [qtyOnHand, setQtyOnHand] = useState(initial?.qtyOnHand ?? "");
  const [inLaundry, setInLaundry] = useState(initial?.inLaundry ?? "");
  const [damaged, setDamaged] = useState(initial?.damaged ?? "");
  const [lost, setLost] = useState(initial?.lost ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [propertyCode, setPropertyCode] = useState(initial?.propertyCode || "");
  const [note, setNote] = useState(initial?.note || "");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");

    if (!code.trim()) return setErr("Item code is required.");
    if (!name.trim()) return setErr("Item name is required.");

    const payload = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      category,
      unit,
      location,
      parLevel: parLevel === "" ? undefined : Number(parLevel),
      qtyOnHand: qtyOnHand === "" ? undefined : Number(qtyOnHand),
      inLaundry: inLaundry === "" ? undefined : Number(inLaundry),
      damaged: damaged === "" ? undefined : Number(damaged),
      lost: lost === "" ? undefined : Number(lost),
      isActive: !!isActive,
      propertyCode: propertyCode ? propertyCode.trim().toUpperCase() : undefined,
      note: note?.trim() || undefined,
    };

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const id = initial._id || initial.id;
        saved = await apiFetch(`/api/linen-items/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(payload) });
      } else {
        saved = await apiFetch(`/api/linen-items`, { method: "POST", auth: true, body: JSON.stringify(payload) });
      }
      setOk("Saved.");
      onSaved(saved);
    } catch (e2) {
      setErr(e2?.message || "Failed to save linen item.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Linen Item" : "Add Linen Item"} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      {ok && <Banner type="ok">{ok}</Banner>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <Row>
          <Field label="Code" required>
            <input className="input" style={{ textTransform: "uppercase" }} value={code} onChange={e => setCode(e.target.value)} />
          </Field>
          <Field label="Name" required>
            <input className="input" value={name} onChange={e => setName(e.target.value)} />
          </Field>
          <Field label="Category">
            <select className="res-select" value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </Row>

        <Row>
          <Field label="Unit">
            <select className="res-select" value={unit} onChange={e => setUnit(e.target.value)}>
              {UNITS.map(u => <option key={u}>{u}</option>)}
            </select>
          </Field>
          <Field label="Location">
            <select className="res-select" value={location} onChange={e => setLocation(e.target.value)}>
              {LOCATIONS.map(l => <option key={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="Property Code">
            <input className="input" style={{ textTransform: "uppercase" }} value={propertyCode} onChange={e => setPropertyCode(e.target.value)} />
          </Field>
        </Row>

        <Row>
          <Field label="Par Level">
            <input className="input" type="number" step="1" value={parLevel} onChange={e => setParLevel(e.target.value)} />
          </Field>
          <Field label="Qty On Hand">
            <input className="input" type="number" step="1" value={qtyOnHand} onChange={e => setQtyOnHand(e.target.value)} />
          </Field>
          <Field label="In Laundry">
            <input className="input" type="number" step="1" value={inLaundry} onChange={e => setInLaundry(e.target.value)} />
          </Field>
        </Row>

        <Row>
          <Field label="Damaged">
            <input className="input" type="number" step="1" value={damaged} onChange={e => setDamaged(e.target.value)} />
          </Field>
          <Field label="Lost">
            <input className="input" type="number" step="1" value={lost} onChange={e => setLost(e.target.value)} />
          </Field>
          <Field label="Active">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              <span>{isActive ? "Yes" : "No"}</span>
            </label>
          </Field>
        </Row>

        <Row>
          <Field label="Note">
            <textarea className="input" rows={2} value={note} onChange={e => setNote(e.target.value)} />
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
    if (v === "ACTIVE")   { bg="#f0fdf4"; bd="#bbf7d0"; fg="#166534"; }
    if (v === "INACTIVE") { bg="#f3f4f6"; bd="#e5e7eb"; fg="#334155"; }
  }
  if (palette === "cat") {
    if (v === "SHEET")       { bg="#e0f2fe"; bd="#bae6fd"; fg="#075985"; }
    if (v === "TOWEL")       { bg="#ecfccb"; bd="#bef264"; fg="#3f6212"; }
    if (v === "PILLOWCASE")  { bg="#f5f3ff"; bd="#ddd6fe"; fg="#5b21b6"; }
    if (v === "DUVET")       { bg="#fee2e2"; bd="#fecaca"; fg="#991b1b"; }
    if (v === "BLANKET")     { bg="#fef3c7"; bd="#fde68a"; fg="#92400e"; }
    if (v === "BATHROBE")    { bg="#cffafe"; bd="#a5f3fc"; fg="#155e75"; }
    if (v === "NAPKIN")      { bg="#dcfce7"; bd="#bbf7d0"; fg="#166534"; }
    if (v === "CURTAIN")     { bg="#e2e8f0"; bd="#cbd5e1"; fg="#0f172a"; }
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
function num(v) { const n = Number(v ?? 0); return Number.isFinite(n) ? n : 0; }
function fmtDateTime(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(+dt) ? "—" : dt.toLocaleString(); }

/* ---------- inline styles ---------- */
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(980px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };
