// src/pages/Backoffice/fnb/Item.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { BackofficeSidebar } from "../../../components/sidebar/backofficesidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

const PAGE_SIZE = 10;
const LS_PROP_KEY = "currentPropertyCode";
const VEG_TYPES = ["VEG", "NONVEG", "EGG"];

export default function ItemPage() {
  const [rows, setRows] = useState([]);

  const [categories, setCategories] = useState([]);
  const [catMap, setCatMap] = useState({});
  const [groups, setGroups] = useState([]);
  const [grpMap, setGrpMap] = useState({});

  const [units, setUnits] = useState([]);

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [propertyCode, setPropertyCode] = useState(
    localStorage.getItem(LS_PROP_KEY) || ""
  );

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  // Load categories
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const params = new URLSearchParams({ limit: 500 });
        const pc = propertyCode.trim().toUpperCase();
        if (pc) params.set("propertyCode", pc);
        const res = await apiFetch(`/api/fnb/categories?${params.toString()}`, { auth: true });
        const list = res?.data || res || [];
        if (!ignore) {
          setCategories(Array.isArray(list) ? list : []);
          const m = {};
          list.forEach(c => { m[c._id || c.id] = c; });
          setCatMap(m);
        }
      } catch {
        if (!ignore) { setCategories([]); setCatMap({}); }
      }
    })();
    return () => { ignore = true; };
  }, [propertyCode]);

  // Load menu groups
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const params = new URLSearchParams({ limit: 500 });
        const pc = propertyCode.trim().toUpperCase();
        if (pc) params.set("propertyCode", pc);
        const res = await apiFetch(`/api/fnb/menu-groups?${params.toString()}`, { auth: true });
        const list = res?.data || res || [];
        if (!ignore) {
          setGroups(Array.isArray(list) ? list : []);
          const m = {};
          list.forEach(g => { m[g._id || g.id] = g; });
          setGrpMap(m);
        }
      } catch {
        if (!ignore) { setGroups([]); setGrpMap({}); }
      }
    })();
    return () => { ignore = true; };
  }, [propertyCode]);

  // Load units (optional)
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await apiFetch(`/api/common/units?limit=500`, { auth: true });
        const list = res?.data || res || [];
        if (!ignore) setUnits(Array.isArray(list) ? list : []);
      } catch {
        if (!ignore) setUnits([]);
      }
    })();
    return () => { ignore = true; };
  }, []);

  // Load items
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true); setErr("");
      try {
        const params = new URLSearchParams({ q, page, limit });
        const pc = propertyCode.trim().toUpperCase();
        if (pc) params.set("propertyCode", pc);
        const res = await apiFetch(`/api/fnb/items?${params.toString()}`, { auth: true });
        const data = res?.data || res || [];
        const count = res?.total ?? data.length ?? 0;
        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number(count) || 0);
        }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load items."); setRows([]); setTotal(0); }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [q, page, limit, propertyCode]);

  // Client search fallback
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [r.code, r.name, r.description, r.vegType, r.unit]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  const dataToRender = rows?.length && total > rows.length ? rows : filtered;

  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit   = (row) => { setEditing(row); setShowForm(true); };
  const askDelete  = (row) => { setToDelete(row); setShowDelete(true); };

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
          <h2 style={{ margin: 0 }}>FNB — Items</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="res-select"
              placeholder="Search (code / name / desc / veg / unit)"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              style={{ minWidth: 320 }}
            />
            <input
              className="res-select"
              placeholder="Property Code (optional)"
              value={propertyCode}
              onChange={(e) => {
                const up = e.target.value.toUpperCase();
                setPropertyCode(up);
                localStorage.setItem(LS_PROP_KEY, up);
                setPage(1);
              }}
              style={{ width: 180, textTransform: "uppercase" }}
              title="Scope to a property (optional)"
            />
            <select
              className="res-select"
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            >
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
                    <th style={{ width: 90 }}>Action</th>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Group</th>
                    <th>Veg</th>
                    <th>Unit</th>
                    <th>Price</th>
                    <th>Active</th>
                    <th>Property</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={11}>No items found</td></tr>
                  )}

                  {dataToRender?.map(r => {
                    const id = r._id || r.id;
                    const catId = r.categoryId || r.category?._id || r.category?.id;
                    const grpId = r.groupId || r.group?._id || r.group?.id;
                    const cat = catMap[catId] || r.category;
                    const grp = grpMap[grpId] || r.group;
                    return (
                      <tr key={id}>
                        <td>
                          <button className="btn" style={btnSm} onClick={() => openEdit(r)}>✏️</button>
                          <button className="btn" style={btnSm} onClick={() => askDelete(r)}>🗑️</button>
                        </td>
                        <td>{r.code}</td>
                        <td>{r.name}</td>
                        <td>{cat?.name || r.categoryName || "—"}</td>
                        <td>{grp?.name || r.groupName || "—"}</td>
                        <td>{r.vegType || "—"}</td>
                        <td>{r.unit || "—"}</td>
                        <td>{formatMoney(r.basePrice)}</td>
                        <td><OnOff value={r.isActive} /></td>
                        <td>{r.propertyCode || "—"}</td>
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
        <ItemFormModal
          initial={editing}
          defaultPropertyCode={propertyCode}
          categories={categories}
          groups={groups}
          units={units}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={afterSave}
        />
      )}

      {showDelete && (
        <ConfirmModal
          title="Delete Item?"
          message={`Delete "${toDelete?.name}" (${toDelete?.code})? This cannot be undone.`}
          confirmText="Delete"
          onClose={() => { setShowDelete(false); setToDelete(null); }}
          onConfirm={async () => {
            const id = toDelete?._id || toDelete?.id;
            await apiFetch(`/api/fnb/items/${id}`, { method: "DELETE", auth: true });
            afterDelete(id);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Form Modal ---------- */
function ItemFormModal({ initial, defaultPropertyCode, categories, groups, units, onClose, onSaved }) {
  const isEdit = !!initial;
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [propertyCode, setPropertyCode] = useState(initial?.propertyCode || defaultPropertyCode || "");
  const [code, setCode] = useState(initial?.code || "");
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [vegType, setVegType] = useState(initial?.vegType || "VEG");
  const [unit, setUnit] = useState(initial?.unit || (units[0]?.code || ""));
  const [basePrice, setBasePrice] = useState(initial?.basePrice ?? 0);
  const [taxPct, setTaxPct] = useState(initial?.taxPct ?? 0);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [categoryId, setCategoryId] = useState(initial?.categoryId || initial?.category?._id || initial?.category?.id || "");
  const [groupId, setGroupId] = useState(initial?.groupId || initial?.group?._id || initial?.group?.id || "");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");

    if (!code.trim()) return setErr("Code is required.");
    if (!name.trim()) return setErr("Name is required.");

    const payload = {
      propertyCode: String(propertyCode || "").toUpperCase(),
      code: String(code || "").trim().toUpperCase(),
      name: String(name || "").trim(),
      description: String(description || "").trim(),
      vegType: vegType || "VEG",
      unit: unit || "",
      basePrice: Number(basePrice || 0),
      taxPct: Number(taxPct || 0),
      isActive: !!isActive,
      categoryId: categoryId || null,
      groupId: groupId || null,
    };

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const id = initial._id || initial.id;
        saved = await apiFetch(`/api/fnb/items/${id}`, {
          method: "PATCH", auth: true, body: JSON.stringify(payload),
        });
      } else {
        saved = await apiFetch("/api/fnb/items", {
          method: "POST", auth: true, body: JSON.stringify(payload),
        });
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
    <Modal title={isEdit ? "Edit Item" : "Create Item"} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      {ok && <Banner type="ok">{ok}</Banner>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <Row>
          <Field label="Property Code">
            <input
              className="input"
              placeholder="Optional scope"
              value={propertyCode}
              onChange={e => setPropertyCode(e.target.value.toUpperCase())}
              style={{ textTransform: "uppercase" }}
            />
          </Field>
          <Field label="Code" required>
            <input
              className="input"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              style={{ textTransform: "uppercase" }}
            />
          </Field>
          <Field label="Name" required>
            <input className="input" value={name} onChange={e => setName(e.target.value)} />
          </Field>
        </Row>

        <Row>
          <Field label="Category">
            <select className="res-select" value={categoryId || ""} onChange={e => setCategoryId(e.target.value || "")}>
              <option value="">— None —</option>
              {categories.map(c => (
                <option key={c._id || c.id} value={c._id || c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Group">
            <select className="res-select" value={groupId || ""} onChange={e => setGroupId(e.target.value || "")}>
              <option value="">— None —</option>
              {groups.map(g => (
                <option key={g._id || g.id} value={g._id || g.id}>
                  {g.name} ({g.code})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Veg Type">
            <select className="res-select" value={vegType} onChange={e => setVegType(e.target.value)}>
              {VEG_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
        </Row>

        <Row>
          <Field label="Unit">
            {units?.length ? (
              <select className="res-select" value={unit} onChange={e => setUnit(e.target.value)}>
                <option value="">— Select —</option>
                {units.map(u => (
                  <option key={u._id || u.id || u.code} value={u.code || u.name}>
                    {(u.code || u.name) + (u.name && u.code ? ` — ${u.name}` : "")}
                  </option>
                ))}
              </select>
            ) : (
              <input className="input" value={unit} onChange={e => setUnit(e.target.value)} placeholder="e.g. PCS / PLATE" />
            )}
          </Field>
          <Field label="Base Price">
            <input className="input" type="number" step="0.01" min="0" value={basePrice} onChange={e => setBasePrice(e.target.value)} />
          </Field>
          <Field label="Tax %">
            <input className="input" type="number" step="0.01" min="0" value={taxPct} onChange={e => setTaxPct(e.target.value)} />
          </Field>
        </Row>

        <Row>
          <Field label="Description">
            <input className="input" value={description} onChange={e => setDescription(e.target.value)} />
          </Field>
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

/* ---------- Small UI helpers ---------- */
function Row({ children }) {
  return <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(180px, 1fr))" }}>{children}</div>;
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
function ConfirmModal({ title, message, confirmText = "OK", onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={onClose}>
      <p style={{ marginTop: 0 }}>{message}</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn" type="button" onClick={onClose}>Cancel</button>
        <button className="btn" type="button" disabled={busy}
          onClick={async () => { setBusy(true); try { await onConfirm?.(); onClose(); } finally { setBusy(false); } }}>
          {busy ? "Working…" : confirmText}
        </button>
      </div>
    </Modal>
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
      {on ? "Yes" : "No"}
    </span>
  );
}
function fmtDate(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(dt) ? "—" : dt.toLocaleDateString(); }
function formatMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(900px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const  xStyle = {border: "1px solid #e5e7eb",background: "#fff",color: "#111827",borderRadius: 10,width: 36,height: 36,cursor: "pointer",lineHeight: "1",display: "inline-flex",alignItems: "center",justifyContent: "center",
  };
