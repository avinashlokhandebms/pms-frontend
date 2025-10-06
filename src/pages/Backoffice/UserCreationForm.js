// src/pages/Backoffice/UserManagement.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { BackofficeSidebar } from "../../components/sidebar/backofficesidebar";
import "../../components/sidebar/Sidebar.css";
import "../../assets/css/commanPage.css";

const PAGE_SIZE = 10;

export default function UserManagement() {
  // list state
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

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
        const params = new URLSearchParams({ q, page, limit });
        const res = await apiFetch(`/api/users?${params.toString()}`);
        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;
        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number(count) || 0);
        }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load users."); setRows([]); setTotal(0); }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [q, page, limit]);

  // client fallback search
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((u) =>
      [
        u.customerId, u.name, u.email, u.mobileNo,
        ...(u.memberships || []).map(m => m.propertyCode),
        ...(u.memberships || []).map(m => m.role),
      ]
        .filter(Boolean)
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
          <h2 style={{ margin: 0 }}>User Management</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="res-select"
              placeholder="Search (id / name / email / mobile / property / role)"
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
            <button className="btn" onClick={openCreate}>+ Create User</button>
          </div>
        </div>

        {/* Table */}
        <div className="panel">
          <div className="panel-h">
            <span>Users</span>
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
                    <th style={{ width: 70 }}>S. No.</th>
                    <th style={{ width: 110 }}>Action</th>
                    <th>Customer ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>Memberships</th>
                    <th>Active</th>
                    <th>Created</th>
                    <th>Updated</th>
                  </tr>
                </thead>

                <tbody>
                  {loading && (
                    <tr className="no-rows">
                      <td colSpan={10}>Loading…</td>
                    </tr>
                  )}

                  {!loading && (!dataToRender || dataToRender.length === 0) && (
                    <tr className="no-rows">
                      <td colSpan={10}>No users found</td>
                    </tr>
                  )}

                  {!loading && dataToRender?.map((u, i) => {
                    const id = u._id || u.id;
                    const sno = (page - 1) * limit + i + 1;
                    return (
                      <tr key={id}>
                        <td>{sno}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="btn" style={btnSm} onClick={() => openEdit(u)}>✏️</button>
                          <button className="btn" style={btnSm} onClick={() => askDelete(u)}>🗑️</button>
                        </td>
                        <td title={u.customerId}>{u.customerId}</td>
                        <td title={u.name}>{u.name}</td>
                        <td title={u.email || ""}>{u.email || "—"}</td>
                        <td title={u.mobileNo || ""}>{u.mobileNo || "—"}</td>
                        <td><MemList memberships={u.memberships} /></td>
                        <td><OnOff value={u.isActive ?? true} /></td>
                        <td>{fmtDate(u.createdAt)}</td>
                        <td>{fmtDate(u.updatedAt)}</td>
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

      {/* Create/Edit */}
      {showForm && (
        <UserFormModal
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={afterSave}
        />
      )}

      {/* Delete */}
      {showDelete && (
        <ConfirmModal
          title="Delete User?"
          message={`Delete user "${toDelete?.name}" (${toDelete?.customerId})? This cannot be undone.`
          }
          confirmText="Delete"
          onClose={() => { setShowDelete(false); setToDelete(null); }}
          onConfirm={async () => {
            const id = toDelete?._id || toDelete?.id;
            await apiFetch(`/api/users/${id}`, { method: "DELETE" });
            afterDelete(id);
          }}
        />
      )}
    </div>
  );
}

/* ============ Form Modal ============ */
function UserFormModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // base fields
  const [customerId, setCustomerId] = useState(initial?.customerId || "");
  const [name, setName] = useState(initial?.name || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [mobileNo, setMobileNo] = useState(initial?.mobileNo || "");
  const [password, setPassword] = useState(""); // only for create or change
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  // memberships (multi)
  const [memberships, setMemberships] = useState(
    initial?.memberships?.length
      ? initial.memberships
      : [{ propertyCode: "", role: "employee", modules: ["reservation"] }]
  );

  const addMembership = () =>
    setMemberships([...memberships, { propertyCode: "", role: "employee", modules: ["reservation"] }]);

  const setMem = (idx, next) => {
    const arr = memberships.slice();
    arr[idx] = next;
    setMemberships(arr);
  };

  const removeMem = (idx) => setMemberships(memberships.filter((_, i) => i !== idx));

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");

    if (!customerId.trim()) return setErr("Customer ID required");
    if (!name.trim()) return setErr("Name required");
    if (!isEdit && !password.trim()) return setErr("Password required for new user");
    if (!memberships.length || !memberships.every(m => m.propertyCode.trim()))
      return setErr("At least one membership with Property Code is required");

    const payload = {
      customerId: customerId.trim(),
      name: name.trim(),
      email,
      mobileNo,
      isActive,
      memberships: memberships.map(m => ({
        propertyCode: m.propertyCode.trim().toUpperCase(),
        role: m.role,
        modules: m.modules?.length ? m.modules : ["reservation"],
      })),
    };
    if (password.trim()) payload.password = password; // optional in PATCH

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const id = initial._id || initial.id;
        saved = await apiFetch(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        saved = await apiFetch("/api/users", { method: "POST", body: JSON.stringify(payload) });
      }
      setOk("Saved.");
      onSaved(saved);
    } catch (e2) {
      setErr(e2?.message || "Failed to save user.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit User" : "Create User"} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      {ok && <Banner type="ok">{ok}</Banner>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <Row>
          <Field label="Customer ID" required>
            <input className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
          </Field>
          <Field label="Name" required>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email">
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </Row>

        <Row>
          <Field label="Mobile No">
            <input className="input" value={mobileNo} onChange={(e) => setMobileNo(e.target.value)} />
          </Field>
          <Field label={isEdit ? "New Password (optional)" : "Password"} required={!isEdit}>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="Active">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <span>{isActive ? "Yes" : "No"}</span>
            </label>
          </Field>
        </Row>

        {/* Memberships */}
        <div className="panel" style={{ marginTop: 8 }}>
          <div className="panel-h">Memberships</div>
          <div className="panel-b" style={{ display: "grid", gap: 10 }}>
            {memberships.map((m, idx) => (
              <div key={idx} style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 160px 1fr auto" }}>
                <input
                  className="input"
                  placeholder="Property Code (e.g., HSE001)"
                  value={m.propertyCode}
                  onChange={(e) => setMem(idx, { ...m, propertyCode: e.target.value })}
                />
                <select
                  className="res-select"
                  value={m.role}
                  onChange={(e) => setMem(idx, { ...m, role: e.target.value })}
                >
                  <option value="superadmin">Superadmin</option>
                  <option value="admin">Admin</option>
                  <option value="employee">Employee</option>
                </select>
                <input
                  className="input"
                  placeholder="Modules (comma separated)"
                  value={(m.modules || []).join(",")}
                  onChange={(e) => setMem(idx, { ...m, modules: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                />
                <div style={{ textAlign: "right" }}>
                  <button type="button" className="btn" style={btnSm} onClick={() => removeMem(idx)}>Remove</button>
                </div>
              </div>
            ))}
            <div>
              <button type="button" className="btn" onClick={addMembership}>+ Add Membership</button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? "Saving…" : (isEdit ? "Update" : "Create")}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ============ Confirm Modal ============ */
function ConfirmModal({ title, message, confirmText = "OK", onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={onClose}>
      <p style={{ marginTop: 0 }}>{message}</p>
      <div className="cp-actions">
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

/* ============ Small UI ============ */
function Row({ children }) { return <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(160px, 1fr))" }}>{children}</div>; }
function Field({ label, required, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span className="label" style={{ fontWeight: 700 }}>{label} {required && <span style={{ color: "#b91c1c" }}>*</span>}</span>
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
function Pill({ children }) {
  return (
    <span style={{
      display: "inline-block",
      padding: ".1rem .4rem",
      margin: "0 .25rem .25rem 0",
      fontSize: ".72rem",
      fontWeight: 700,
      borderRadius: 999,
      background: "#f1f5f9",
      border: "1px solid #e2e8f0",
      color: "#334155",
      whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}
function MemList({ memberships }) {
  const list = Array.isArray(memberships) ? memberships : [];
  if (!list.length) return <span>—</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap" }}>
      {list.map((m, idx) => {
        const mods = (m.modules || []).join(", ");
        return (
          <div key={idx} style={{ marginRight: 8, marginBottom: 6 }}>
            <Pill>{m.propertyCode || "—"}</Pill>
            <Pill>{(m.role || "—")}</Pill>
            {mods && <Pill title={mods}>Modules: {mods}</Pill>}
          </div>
        );
      })}
    </div>
  );
}

/* helpers */
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(900px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };
function fmtDate(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(dt) ? "—" : dt.toLocaleDateString(); }
function OnOff({ value }) {
  const on = !!value;
  return (
    <span style={{
      display: "inline-block", padding: ".15rem .5rem",
      borderRadius: 999, background: on ? "#ecfdf5" : "#f3f4f6",
      border: `1px solid ${on ? "#a7f3d0" : "#e5e7eb"}`,
      color: on ? "#15803d" : "#334155", fontSize: ".75rem", fontWeight: 700
    }}>
      {on ? "Active" : "Inactive"}
    </span>
  );
}
    