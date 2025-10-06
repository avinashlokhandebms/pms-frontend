// src/pages/Backoffice/Rooms.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { BackofficeSidebar } from "../../components/sidebar/backofficesidebar";
import "../../components/sidebar/Sidebar.css";
import "../../assets/css/commanPage.css";

const PAGE_SIZE = 10;
const STATUS = ["vacant", "occupied", "ooo", "oos", "reserved"];
const HOUSE_STATUS = ["clean", "dirty", "inspect"];

export default function Rooms() {
  const [rows, setRows] = useState([]);
  const [propsList, setPropsList] = useState([]);
  const [typesList, setTypesList] = useState([]);
  const [filterProp, setFilterProp] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  // Load dropdown data
  useEffect(() => {
    (async () => {
      try {
        const [propsRes, typesRes] = await Promise.all([
          apiFetch("/api/properties?limit=200", { auth: true }),
          apiFetch("/api/roomtypes?limit=200", { auth: true }),
        ]);
        const props = (propsRes?.data || propsRes || []).map(p => ({ code: p.code, name: p.name }));
        const types = (typesRes?.data || typesRes || []).map(t => ({ code: t.code, name: t.name }));
        setPropsList(props);
        setTypesList(types);
      } catch {
        // ignore
      }
    })();
  }, []);

  // Load list
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const params = new URLSearchParams({
          q, page, limit,
          ...(filterProp ? { propertyCode: filterProp } : {}),
        });
        const res = await apiFetch(`/api/rooms?${params.toString()}`, { auth: true });
        const data = res?.data || res || [];
        const count = res?.total ?? data.length ?? 0;
        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number(count) || 0);
        }
      } catch (e) {
        if (!ignore) {
          setErr(e?.message || "Failed to load rooms.");
          setRows([]);
          setTotal(0);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [q, page, limit, filterProp]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [r.propertyCode, r.roomNo, r.roomTypeCode, r.status, r.houseStatus, r.floor]
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

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <BackofficeSidebar />

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Rooms</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              className="res-select"
              value={filterProp}
              onChange={(e) => { setFilterProp(e.target.value); setPage(1); }}
              title="Property"
            >
              <option value="">All Properties</option>
              {propsList.map(p => (
                <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
              ))}
            </select>
            <input
              className="res-select"
              placeholder="Search (room no / type / status / property)"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              style={{ minWidth: 320 }}
            />
            <select
              className="res-select"
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            >
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
            <button className="btn" onClick={openCreate}>+ Add Room</button>
          </div>
        </div>

        {/* Table */}
        <div className="panel">
          <div className="panel-h">
            <span>Rooms</span>
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
                    <th>Property</th>
                    <th>Room No</th>
                    <th>Room Type</th>
                    <th>Status</th>
                    <th>House Status</th>
                    <th>Floor</th>
                    <th>Active</th>
                    <th>Created</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={10}>No rooms found</td></tr>
                  )}

                  {dataToRender?.map(r => {
                    const id = r._id || r.id;
                    return (
                      <tr key={id}>
                        <td>
                          <button className="btn" style={btnSm} onClick={() => openEdit(r)}>✏️</button>
                          <button className="btn" style={btnSm} onClick={() => askDelete(r)}>🗑️</button>
                        </td>
                        <td>{r.propertyCode}</td>
                        <td>{r.roomNo}</td>
                        <td>{r.roomTypeCode}</td>
                        <td>{r.status}</td>
                        <td>{r.houseStatus}</td>
                        <td>{r.floor || "—"}</td>
                        <td><OnOff value={r.isActive} /></td>
                        <td>{fmtDate(r.createdAt)}</td>
                        <td>{fmtDate(r.updatedAt)}</td>
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
              <button className="btn"
                disabled={loading || (!total ? dataToRender.length < limit : page * limit >= total)}
                onClick={() => setPage(p => p + 1)}>
                Next ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <RoomFormModal
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={afterSave}
          propsList={propsList}
          typesList={typesList}
        />
      )}

      {showDelete && (
        <ConfirmModal
          title="Delete Room?"
          message={`Delete room "${toDelete?.roomNo}" (${toDelete?.propertyCode})? This cannot be undone.`}
          confirmText="Delete"
          onClose={() => { setShowDelete(false); setToDelete(null); }}
          onConfirm={async () => {
            const id = toDelete?._id || toDelete?.id;
            await apiFetch(`/api/rooms/${id}`, { method: "DELETE", auth: true });
            afterDelete(id);
          }}
        />
      )}
    </div>
  );
}

/* Room Form */
function RoomFormModal({ initial, onClose, onSaved, propsList, typesList }) {
  const isEdit = !!initial;
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [propertyCode, setPropertyCode] = useState(initial?.propertyCode || (propsList[0]?.code || ""));
  const [roomNo, setRoomNo] = useState(initial?.roomNo || "");
  const [roomTypeCode, setRoomTypeCode] = useState(initial?.roomTypeCode || (typesList[0]?.code || ""));
  const [floor, setFloor] = useState(initial?.floor || "");
  const [status, setStatus] = useState(initial?.status || "vacant");
  const [houseStatus, setHouseStatus] = useState(initial?.houseStatus || "clean");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");

    if (!propertyCode.trim()) return setErr("Property is required");
    if (!roomNo.trim()) return setErr("Room No is required");
    if (!roomTypeCode.trim()) return setErr("Room Type is required");

    const payload = {
      propertyCode: propertyCode.trim().toUpperCase(),
      roomNo: roomNo.trim(),
      roomTypeCode: roomTypeCode.trim().toUpperCase(),
      floor,
      status,
      houseStatus,
      isActive,
    };

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const id = initial._id || initial.id;
        saved = await apiFetch(`/api/rooms/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(payload) });
      } else {
        saved = await apiFetch("/api/rooms", { method: "POST", auth: true, body: JSON.stringify(payload) });
      }
      setOk("Saved.");
      onSaved(saved);
    } catch (e2) {
      setErr(e2?.message || "Failed to save room.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Room" : "Create Room"} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      {ok && <Banner type="ok">{ok}</Banner>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <Row>
          <Field label="Property" required>
            <select className="res-select" value={propertyCode} onChange={e => setPropertyCode(e.target.value)}>
              <option value="">— Select Property —</option>
              {propsList.map(p => <option key={p.code} value={p.code}>{p.code} — {p.name}</option>)}
            </select>
          </Field>
          <Field label="Room No" required>
            <input className="input" value={roomNo} onChange={e => setRoomNo(e.target.value)} />
          </Field>
          <Field label="Room Type" required>
            <select className="res-select" value={roomTypeCode} onChange={e => setRoomTypeCode(e.target.value)}>
              {typesList.map(t => <option key={t.code} value={t.code}>{t.code} — {t.name}</option>)}
            </select>
          </Field>
        </Row>

        <Row>
          <Field label="Floor">
            <input className="input" value={floor} onChange={e => setFloor(e.target.value)} />
          </Field>
          <Field label="Status">
            <select className="res-select" value={status} onChange={e => setStatus(e.target.value)}>
              {STATUS.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Housekeeping">
            <select className="res-select" value={houseStatus} onChange={e => setHouseStatus(e.target.value)}>
              {HOUSE_STATUS.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </Row>

        <Row>
          <Field label="Active">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              <span>{isActive ? "Yes" : "No"}</span>
            </label>
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

/* UI Helpers */
function Row({ children }) {
  return (
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(160px, 1fr))" }}>
      {children}
    </div>
  );
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
      <p>{message}</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn" disabled={busy} onClick={async () => {
          setBusy(true);
          try { await onConfirm?.(); onClose(); } finally { setBusy(false); }
        }}>
          {busy ? "Working…" : confirmText}
        </button>
      </div>
    </Modal>
  );
}
function OnOff({ value }) {
  const on = !!value;
  const borderColor = on ? "#a7f3d0" : "#e5e7eb";
  const bg = on ? "#ecfdf5" : "#f3f4f6";
  const color = on ? "#15803d" : "#334155";
  return (
    <span style={{
      display: "inline-block",
      padding: ".15rem .5rem",
      borderRadius: 999,
      background: bg,
      border: "1px solid " + borderColor,
      color,
      fontSize: ".75rem",
      fontWeight: 700
    }}>
      {on ? "Active" : "Inactive"}
    </span>
  );
}


const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.45)",
  display: "grid",
  placeItems: "center",
  zIndex: 1000
};
const modalStyle = {
  width: "min(900px, calc(100% - 24px))",
  background: "#fff",
  borderRadius: 16,
  boxShadow: "0 20px 60px rgba(0,0,0,.22)",
  overflow: "hidden"
};
const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 16px",
  borderBottom: "1px solid #e5e7eb",
  background: "#fff"
};
const xStyle = {
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#111827",
  borderRadius: 10,
  width: 36,
  height: 36,
  cursor: "pointer"
};
function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return Number.isNaN(dt) ? "—" : dt.toLocaleDateString();
}
