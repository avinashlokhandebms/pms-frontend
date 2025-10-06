// src/pages/Backoffice/masters/Area.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { BackofficeSidebar } from "../../../components/sidebar/backofficesidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

const PAGE_SIZE = 10;
const getPropCode = () => (localStorage.getItem("currentPropertyCode") || "").toUpperCase();

export default function AreaMaster() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const [cities, setCities] = useState([]);

  // load cities for dropdowns (scoped to property)
  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams({ limit: 500, isActive: true, propertyCode: getPropCode() });
        const res = await apiFetch(`/api/cities?${params.toString()}`, { auth: true });
        const data = res?.data || res || [];
        setCities(Array.isArray(data) ? data : []);
      } catch {/* ignore */}
    })();
  }, []);

  // load areas
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true); setErr("");
      try {
        const params = new URLSearchParams({ q, page, limit, propertyCode: getPropCode() });
        if (cityFilter) params.set("cityCode", cityFilter);
        const res = await apiFetch(`/api/areas?${params.toString()}`, { auth: true });
        const data = res?.data || res || [];
        const count = res?.total ?? data.length ?? 0;
        if (!ignore) { setRows(Array.isArray(data) ? data : []); setTotal(Number(count) || 0); }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load areas."); setRows([]); setTotal(0); }
      } finally { if (!ignore) setLoading(false); }
    })();
    return () => { ignore = true; };
  }, [q, page, limit, cityFilter]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [r.code, r.name, r.cityCode, r.stateCode, r.pincode, r.description]
        .filter(Boolean).some(v => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  const dataToRender = rows?.length && total > rows.length ? rows : filtered;

  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit = (row) => { setEditing(row); setShowForm(true); };

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
    setRows(prev => prev.filter(r => (r._id || r.id) !== id));
    setTotal(t => Math.max(0, t - 1));
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <BackofficeSidebar />

      <div className="res-wrap">
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Area Master</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="res-select"
              placeholder="Search (code / name / city / pincode / description)"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              style={{ minWidth: 320 }}
            />
            <select
              className="res-select"
              value={cityFilter}
              onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
              title="Filter by City"
            >
              <option value="">All Cities</option>
              {cities.map(c => <option key={c._id || c.code} value={c.code}>{c.code} — {c.name}</option>)}
            </select>
            <select
              className="res-select"
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            >
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
            <button className="btn" onClick={openCreate}>+ Add Area</button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-h">
            <span>Areas</span>
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
                    <th>Code</th>
                    <th>Name</th>
                    <th>City</th>
                    <th>Pincode</th>
                    <th>Description</th>
                    <th>Active</th>
                    <th>Created</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={9}>No areas found</td></tr>
                  )}
                  {dataToRender?.map(r => {
                    const id = r._id || r.id;
                    return (
                      <tr key={id}>
                        <td>
                          <button className="btn" style={btnSm} onClick={() => openEdit(r)}>✏️</button>
                          <button
                            className="btn" style={btnSm}
                            onClick={async () => {
                              await apiFetch(`/api/areas/${id}`, { method: "DELETE", auth: true });
                              afterDelete(id);
                            }}
                          >🗑️</button>
                        </td>
                        <td>{r.code}</td>
                        <td>{r.name}</td>
                        <td>{r.cityCode}</td>
                        <td>{r.pincode || "—"}</td>
                        <td title={r.description || ""}>{r.description || "—"}</td>
                        <td><OnOff value={r.isActive} /></td>
                        <td>{fmtDate(r.createdAt)}</td>
                        <td>{fmtDate(r.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
              <button className="btn" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>‹ Prev</button>
              <span className="small" style={{ alignSelf: "center", color: "var(--muted)" }}>Page {page}</span>
              <button className="btn" disabled={loading || (!total ? dataToRender.length < limit : page * limit >= total)} onClick={() => setPage(p => p + 1)}>Next ›</button>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <AreaFormModal
          initial={editing}
          cities={cities}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={afterSave}
        />
      )}
    </div>
  );
}

/* ---------- Modal ---------- */
function AreaFormModal({ initial, onClose, onSaved, cities }) {
  const isEdit = !!initial;
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [code, setCode] = useState(initial?.code || "");
  const [name, setName] = useState(initial?.name || "");
  const [cityCode, setCityCode] = useState(initial?.cityCode || "");
  const [stateCode, setStateCode] = useState(initial?.stateCode || "");
  const [pincode, setPincode] = useState(initial?.pincode || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  // auto-fill stateCode when city selected (if your City page stores stateCode)
  useEffect(() => {
    if (!cityCode) return;
    const city = cities.find(c => (c.code || "").toUpperCase() === cityCode.toUpperCase());
    if (city?.stateCode && !stateCode) setStateCode(city.stateCode);
  }, [cityCode, cities, stateCode]);

  const onSubmit = async (e) => {
    e.preventDefault(); setErr(""); setOk("");
    if (!code.trim())  return setErr("Code is required");
    if (!name.trim())  return setErr("Name is required");
    if (!cityCode.trim()) return setErr("City is required");

    const payload = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      cityCode: cityCode.trim().toUpperCase(),
      stateCode: (stateCode || "").trim().toUpperCase(),
      pincode,
      description,
      isActive,
      propertyCode: getPropCode(),
    };

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const id = initial._id || initial.id;
        saved = await apiFetch(`/api/areas/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(payload) });
      } else {
        saved = await apiFetch("/api/areas", { method: "POST", auth: true, body: JSON.stringify(payload) });
      }
      setOk("Saved."); onSaved(saved);
    } catch (e2) {
      setErr(e2?.message || "Failed to save area.");
    } finally { setSaving(false); }
  };

  return (
    <Modal title={isEdit ? "Edit Area" : "Create Area"} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      {ok && <Banner type="ok">{ok}</Banner>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <Row>
          <Field label="Code" required><input className="input" value={code} onChange={e => setCode(e.target.value)} /></Field>
          <Field label="Name" required><input className="input" value={name} onChange={e => setName(e.target.value)} /></Field>
          <Field label="City" required>
            <select className="res-select" value={cityCode} onChange={e => setCityCode(e.target.value)}>
              <option value="">Select City</option>
              {cities.map(c => <option key={c._id || c.code} value={c.code}>{c.code} — {c.name}</option>)}
            </select>
          </Field>
        </Row>

        <Row>
          <Field label="State (optional)">
            <input className="input" value={stateCode} onChange={e => setStateCode(e.target.value)} placeholder="Auto-fill when city picked" />
          </Field>
          <Field label="Pincode">
            <input className="input" value={pincode} onChange={e => setPincode(e.target.value)} />
          </Field>
          <Field label="Active">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              <span>{isActive ? "Yes" : "No"}</span>
            </label>
          </Field>
        </Row>

        <Row>
          <Field label="Description">
            <textarea className="input" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
          </Field>
        </Row>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? "Saving…" : (isEdit ? "Update" : "Create")}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- tiny UI helpers ---------- */
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
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(900px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };
function fmtDate(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(dt) ? "—" : dt.toLocaleDateString(); }
