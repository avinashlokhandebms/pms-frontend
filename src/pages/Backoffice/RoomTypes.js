// // src/pages/Backoffice/RoomTypes.js
// import { useEffect, useState, useMemo } from "react";
// import { apiFetch } from "../../lib/api";
// import { BackofficeSidebar } from "../../components/sidebar/backofficesidebar";
// import "../../components/sidebar/Sidebar.css";
// import "../../assets/css/commanPage.css";

// const PAGE_SIZE = 10;

// export default function RoomTypes() {
//   const [rows, setRows] = useState([]);
//   const [q, setQ] = useState("");
//   const [page, setPage] = useState(1);
//   const [limit, setLimit] = useState(PAGE_SIZE);
//   const [total, setTotal] = useState(0);
//   const [loading, setLoading] = useState(false);
//   const [err, setErr] = useState("");

//   // modals
//   const [showForm, setShowForm] = useState(false);
//   const [editing, setEditing] = useState(null);
//   const [showDelete, setShowDelete] = useState(false);
//   const [toDelete, setToDelete] = useState(null);

//   // load list
//   useEffect(() => {
//     let ignore = false;
//     (async () => {
//       setLoading(true);
//       setErr("");
//       try {
//         const params = new URLSearchParams({ q, page, limit });
//         const res = await apiFetch(`/api/roomtypes?${params.toString()}`, { auth: true });
//         const data = res?.data || res?.items || res || [];
//         const count = res?.total ?? data.length ?? 0;
//         if (!ignore) {
//           setRows(Array.isArray(data) ? data : []);
//           setTotal(Number(count) || 0);
//         }
//       } catch (e) {
//         if (!ignore) { setErr(e?.message || "Failed to load room types."); setRows([]); setTotal(0); }
//       } finally {
//         if (!ignore) setLoading(false);
//       }
//     })();
//     return () => { ignore = true; };
//   }, [q, page, limit]);

//   const filtered = useMemo(() => {
//     const term = q.trim().toLowerCase();
//     if (!term) return rows;
//     return rows.filter(rt =>
//       [rt.code, rt.name, rt.description].filter(Boolean)
//         .some(v => String(v).toLowerCase().includes(term))
//     );
//   }, [rows, q]);

//   const dataToRender = rows?.length && total > rows.length ? rows : filtered;

//   // row ops
//   const openCreate = () => { setEditing(null); setShowForm(true); };
//   const openEdit = (row) => { setEditing(row); setShowForm(true); };
//   const askDelete = (row) => { setToDelete(row); setShowDelete(true); };

//   const afterSave = (saved) => {
//     setShowForm(false); setEditing(null);
//     setRows(prev => {
//       const id = saved._id || saved.id;
//       const idx = prev.findIndex(p => (p._id || p.id) === id);
//       if (idx === -1) return [saved, ...prev];
//       const next = prev.slice(); next[idx] = saved; return next;
//     });
//   };
//   const afterDelete = (id) => {
//     setShowDelete(false); setToDelete(null);
//     setRows(prev => prev.filter(r => (r._id || r.id) !== id));
//     setTotal(t => Math.max(0, t - 1));
//   };

//   return (
//     <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
//       <BackofficeSidebar />

//       <div className="res-wrap">
//         {/* Topbar */}
//         <div className="res-topbar">
//           <h2 style={{ margin: 0 }}>Room Types</h2>
//           <div style={{ display: "flex", gap: 8 }}>
//             <input
//               className="res-select"
//               placeholder="Search (code / name / description)"
//               value={q}
//               onChange={(e) => { setQ(e.target.value); setPage(1); }}
//               style={{ minWidth: 320 }}
//             />
//             <select
//               className="res-select"
//               value={limit}
//               onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
//             >
//               {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
//             </select>
//             <button className="btn" onClick={openCreate}>+ Add Room Type</button>
//           </div>
//         </div>

//         {/* Table */}
//         <div className="panel">
//           <div className="panel-h">
//             <span>Room Types</span>
//             <span className="small" style={{ color: "var(--muted)" }}>
//               {loading ? "Loading…" : `Total: ${total || dataToRender.length}`}
//             </span>
//           </div>
//           <div className="panel-b">
//             {err && <Banner type="err">{err}</Banner>}

//             <div className="table-wrap">
//               <table className="table">
//                 <thead>
//                   <tr>
//                     <th style={{ width: 90 }}>Action</th>
//                     <th>Code</th>
//                     <th>Name</th>
//                     <th>Description</th>
//                     <th>Capacity</th>
//                     <th>Created</th>
//                     <th>Updated</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {(!dataToRender || dataToRender.length === 0) && !loading && (
//                     <tr className="no-rows">
//                       <td colSpan={7}>No room types found</td>
//                     </tr>
//                   )}

//                   {dataToRender?.map(rt => {
//                     const id = rt._id || rt.id;
//                     return (
//                       <tr key={id}>
//                         <td>
//                           <button className="btn" style={btnSm} onClick={() => openEdit(rt)}>✏️</button>
//                           <button className="btn" style={btnSm} onClick={() => askDelete(rt)}>🗑️</button>
//                         </td>
//                         <td>{rt.code}</td>
//                         <td>{rt.name}</td>
//                         <td>{rt.description || "—"}</td>
//                         <td>{rt.capacity || "—"}</td>
//                         <td>{fmtDate(rt.createdAt)}</td>
//                         <td>{fmtDate(rt.updatedAt)}</td>
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         </div>
//       </div>

//       {showForm && (
//         <RoomTypeFormModal
//           initial={editing}
//           onClose={() => { setShowForm(false); setEditing(null); }}
//           onSaved={afterSave}
//         />
//       )}

//       {showDelete && (
//         <ConfirmModal
//           title="Delete Room Type?"
//           message={`Delete room type "${toDelete?.name}" (${toDelete?.code})? This cannot be undone.`}
//           confirmText="Delete"
//           onClose={() => { setShowDelete(false); setToDelete(null); }}
//           onConfirm={async () => {
//             const id = toDelete?._id || toDelete?.id;
//             await apiFetch(`/api/roomtypes/${id}`, { method: "DELETE", auth: true });
//             afterDelete(id);
//           }}
//         />
//       )}
//     </div>
//   );
// }

// /* Form Modal */
// function RoomTypeFormModal({ initial, onClose, onSaved }) {
//   const isEdit = !!initial;
//   const [saving, setSaving] = useState(false);
//   const [err, setErr] = useState("");
//   const [ok, setOk] = useState("");

//   const [code, setCode] = useState(initial?.code || "");
//   const [name, setName] = useState(initial?.name || "");
//   const [description, setDescription] = useState(initial?.description || "");
//   const [capacity, setCapacity] = useState(initial?.capacity || 1);

//   const onSubmit = async (e) => {
//     e.preventDefault();
//     setErr(""); setOk("");

//     if (!code.trim()) return setErr("Code required");
//     if (!name.trim()) return setErr("Name required");

//     const payload = { code: code.trim(), name: name.trim(), description, capacity };

//     setSaving(true);
//     try {
//       let saved;
//       if (isEdit) {
//         const id = initial._id || initial.id;
//         saved = await apiFetch(`/api/roomtypes/${id}`, { method: "PATCH", auth: true, body: payload });
//       } else {
//         saved = await apiFetch("/api/roomtypes", { method: "POST", auth: true, body: payload });
//       }
//       setOk("Saved.");
//       onSaved(saved);
//     } catch (e2) {
//       setErr(e2?.message || "Failed to save room type.");
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <Modal title={isEdit ? "Edit Room Type" : "Create Room Type"} onClose={onClose}>
//       {err && <Banner type="err">{err}</Banner>}
//       {ok && <Banner type="ok">{ok}</Banner>}

//       <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
//         <Field label="Code" required>
//           <input className="input" value={code} onChange={e => setCode(e.target.value)} />
//         </Field>
//         <Field label="Name" required>
//           <input className="input" value={name} onChange={e => setName(e.target.value)} />
//         </Field>
//         <Field label="Description">
//           <input className="input" value={description} onChange={e => setDescription(e.target.value)} />
//         </Field>
//         <Field label="Capacity">
//           <input className="input" type="number" min="1" value={capacity} onChange={e => setCapacity(Number(e.target.value))} />
//         </Field>

//         <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
//           <button type="button" className="btn" onClick={onClose}>Cancel</button>
//           <button type="submit" className="btn" disabled={saving}>{saving ? "Saving…" : (isEdit ? "Update" : "Create")}</button>
//         </div>
//       </form>
//     </Modal>
//   );
// }

// /* UI helpers */
// function Banner({ type = "ok", children }) {
//   const style = type === "err"
//     ? { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }
//     : { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
//   return <div style={{ ...style, padding: "8px 10px", borderRadius: 10, fontWeight: 700, marginBottom: 10 }}>{children}</div>;
// }
// function Field({ label, required, children }) {
//   return (
//     <label style={{ display: "grid", gap: 6 }}>
//       <span className="label" style={{ fontWeight: 700 }}>{label}{required && <span style={{ color: "#b91c1c" }}>*</span>}</span>
//       {children}
//     </label>
//   );
// }
// function Modal({ title, onClose, children }) {
//   return (
//     <div style={backdropStyle}>
//       <div style={modalStyle}>
//         <div style={headerStyle}>
//           <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>{title}</h3>
//           <button onClick={onClose} aria-label="Close" style={xStyle}>×</button>
//         </div>
//         <div style={{ padding: 16 }}>{children}</div>
//       </div>
//     </div>
//   );
// }
// function ConfirmModal({ title, message, confirmText = "OK", onConfirm, onClose }) {
//   const [busy, setBusy] = useState(false);
//   return (
//     <Modal title={title} onClose={onClose}>
//       <p>{message}</p>
//       <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
//         <button className="btn" onClick={onClose}>Cancel</button>
//         <button className="btn" disabled={busy} onClick={async () => { setBusy(true); try { await onConfirm?.(); onClose(); } finally { setBusy(false); } }}>
//           {busy ? "Working…" : confirmText}
//         </button>
//       </div>
//     </Modal>
//   );
// }

// const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
// const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
// const modalStyle = { width: "min(700px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
// const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb" };
// const xStyle = { border: "1px solid #e5e7eb", background: "#fff", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };
// function fmtDate(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(dt) ? "—" : dt.toLocaleDateString(); }


// src/pages/Backoffice/RoomTypes.js
import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "../../lib/api";
import { BackofficeSidebar } from "../../components/sidebar/backofficesidebar";
import "../../components/sidebar/Sidebar.css";
import "../../assets/css/commanPage.css";

const PAGE_SIZE = 10;

export default function RoomTypes() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // properties for dropdown
  const [propCodes, setPropCodes] = useState([]);
  const [propErr, setPropErr] = useState("");

  // modals
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  // load property codes (for dropdown)
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await apiFetch(`/api/properties?limit=200`, { auth: true });
        const items = res?.data || res || [];
        const codes = items.map(p => p.code).filter(Boolean).sort();
        if (!ignore) setPropCodes(codes);
      } catch (e) {
        if (!ignore) setPropErr(e?.message || "Failed to load properties.");
      }
    })();
    return () => { ignore = true; };
  }, []);

  // load room types
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const params = new URLSearchParams({ q, page, limit });
        const res = await apiFetch(`/api/roomtypes?${params.toString()}`, { auth: true });
        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;
        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number(count) || 0);
        }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load room types."); setRows([]); setTotal(0); }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [q, page, limit]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(rt =>
      [rt.propertyCode, rt.code, rt.name, rt.description].filter(Boolean)
        .some(v => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  const dataToRender = rows?.length && total > rows.length ? rows : filtered;

  // row ops
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
          <h2 style={{ margin: 0 }}>Room Types</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="res-select"
              placeholder="Search (property / code / name / description)"
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
            <button className="btn" onClick={openCreate}>+ Add Room Type</button>
          </div>
        </div>

        {/* Table */}
        <div className="panel">
          <div className="panel-h">
            <span>Room Types</span>
            <span className="small" style={{ color: "var(--muted)" }}>
              {loading ? "Loading…" : `Total: ${total || dataToRender.length}`}
            </span>
          </div>
          <div className="panel-b">
            {propErr && <Banner type="err">{propErr}</Banner>}
            {err && <Banner type="err">{err}</Banner>}

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 90 }}>Action</th>
                    <th>Property</th>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Capacity</th>
                    <th>Created</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows">
                      <td colSpan={8}>No room types found</td>
                    </tr>
                  )}

                  {dataToRender?.map(rt => {
                    const id = rt._id || rt.id;
                    return (
                      <tr key={id}>
                        <td>
                          <button className="btn" style={btnSm} onClick={() => openEdit(rt)}>✏️</button>
                          <button className="btn" style={btnSm} onClick={() => askDelete(rt)}>🗑️</button>
                        </td>
                        <td>{rt.propertyCode || "—"}</td>
                        <td>{rt.code}</td>
                        <td>{rt.name}</td>
                        <td>{rt.description || "—"}</td>
                        <td>{rt.capacity || "—"}</td>
                        <td>{fmtDate(rt.createdAt)}</td>
                        <td>{fmtDate(rt.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <RoomTypeFormModal
          initial={editing}
          propCodes={propCodes}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={afterSave}
        />
      )}

      {showDelete && (
        <ConfirmModal
          title="Delete Room Type?"
          message={`Delete room type "${toDelete?.name}" (${toDelete?.code})? This cannot be undone.`}
          confirmText="Delete"
          onClose={() => { setShowDelete(false); setToDelete(null); }}
          onConfirm={async () => {
            const id = toDelete?._id || toDelete?.id;
            await apiFetch(`/api/roomtypes/${id}`, { method: "DELETE", auth: true });
            afterDelete(id);
          }}
        />
      )}
    </div>
  );
}

/* Form Modal */
function RoomTypeFormModal({ initial, onClose, onSaved, propCodes }) {
  const isEdit = !!initial;
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [propertyCode, setPropertyCode] = useState(initial?.propertyCode || (propCodes[0] || ""));
  const [code, setCode] = useState(initial?.code || "");
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [capacity, setCapacity] = useState(initial?.capacity || 1);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");

    if (!propertyCode.trim()) return setErr("Property Code is required");
    if (!code.trim()) return setErr("Code is required");
    if (!name.trim()) return setErr("Name is required");

    const payload = {
      propertyCode: propertyCode.trim().toUpperCase(),
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description,
      capacity: Number(capacity || 1),
    };

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const id = initial._id || initial.id;
        saved = await apiFetch(`/api/roomtypes/${id}`, {
          method: "PATCH",
          auth: true,
          body: JSON.stringify(payload),
        });
      } else {
        saved = await apiFetch("/api/roomtypes", {
          method: "POST",
          auth: true,
          body: JSON.stringify(payload),
        });
      }
      setOk("Saved.");
      onSaved(saved);
    } catch (e2) {
      setErr(e2?.message || "Failed to save room type.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Room Type" : "Create Room Type"} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      {ok && <Banner type="ok">{ok}</Banner>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <Field label="Property Code" required>
          <select
            className="res-select"
            value={propertyCode}
            onChange={(e) => setPropertyCode(e.target.value)}
          >
            <option value="">-- Select Property --</option>
            {propCodes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        <Field label="Code" required>
          <input className="input" value={code} onChange={e => setCode(e.target.value)} />
        </Field>
        <Field label="Name" required>
          <input className="input" value={name} onChange={e => setName(e.target.value)} />
        </Field>
        <Field label="Description">
          <input className="input" value={description} onChange={e => setDescription(e.target.value)} />
        </Field>
        <Field label="Capacity">
          <input className="input" type="number" min="1" value={capacity} onChange={e => setCapacity(Number(e.target.value))} />
        </Field>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? "Saving…" : (isEdit ? "Update" : "Create")}</button>
        </div>
      </form>
    </Modal>
  );
}

/* UI helpers */
function Banner({ type = "ok", children }) {
  const style = type === "err"
    ? { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }
    : { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
  return <div style={{ ...style, padding: "8px 10px", borderRadius: 10, fontWeight: 700, marginBottom: 10 }}>{children}</div>;
}
function Field({ label, required, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span className="label" style={{ fontWeight: 700 }}>{label}{required && <span style={{ color: "#b91c1c" }}>*</span>}</span>
      {children}
    </label>
  );
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
        <button className="btn" disabled={busy} onClick={async () => { setBusy(true); try { await onConfirm?.(); onClose(); } finally { setBusy(false); } }}>
          {busy ? "Working…" : confirmText}
        </button>
      </div>
    </Modal>
  );
}

const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(700px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };
function fmtDate(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(dt) ? "—" : dt.toLocaleDateString(); }
