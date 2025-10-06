import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { BackofficeSidebar } from "../../../components/sidebar/backofficesidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

const PAGE_SIZE = 10;
const LS_KEY = "currentPropertyCode";

export default function AddProduction() {
  const propertyCode = (localStorage.getItem(LS_KEY) || "").toUpperCase();

  const [rows, setRows] = useState([]);
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

  // Load list
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const params = new URLSearchParams({ q, page, limit });
        if (propertyCode) params.set("propertyCode", propertyCode);
        const res = await apiFetch(`/api/productions?${params.toString()}`, { auth: true });
        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;
        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number(count) || 0);
        }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load production orders."); setRows([]); setTotal(0); }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [q, page, limit, propertyCode]);

  // Client fallback search
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [r.docNo, r.product, r.status, r.notes]
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
          <div>
            <h2 style={{ margin: 0 }}>Add Production</h2>
            <div className="small" style={{ color: "var(--muted)" }}>
              {propertyCode ? `Property: ${propertyCode}` : "Global"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="res-select"
              placeholder="Search (doc no / product / status / notes)"
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
            <button className="btn" onClick={openCreate}>+ Add</button>
          </div>
        </div>

        {/* Table */}
        <div className="panel">
          <div className="panel-h">
            <span>Production Orders</span>
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
                    <th>Doc No</th>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Output Qty</th>
                    <th>Unit</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={9}>No records found</td></tr>
                  )}

                  {dataToRender?.map((r) => {
                    const id = r._id || r.id;
                    return (
                      <tr key={id}>
                        <td>
                          <button className="btn" style={btnSm} onClick={() => openEdit(r)}>✏️</button>
                          <button className="btn" style={btnSm} onClick={() => askDelete(r)}>🗑️</button>
                        </td>
                        <td>{r.docNo}</td>
                        <td>{fmtDate(r.docDate)}</td>
                        <td title={r.notes || ""}>{r.product}</td>
                        <td>{r.outputQty}</td>
                        <td>{r.unit || "—"}</td>
                        <td><StatusPill value={r.status} /></td>
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

      {showForm && (
        <ProductionFormModal
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={afterSave}
          propertyCode={propertyCode}
        />
      )}

      {showDelete && (
        <ConfirmModal
          title="Delete record?"
          message={`Delete production "${toDelete?.docNo}"? This cannot be undone.`}
          confirmText="Delete"
          onClose={() => { setShowDelete(false); setToDelete(null); }}
          onConfirm={async () => {
            const id = toDelete?._id || toDelete?.id;
            await apiFetch(`/api/productions/${id}`, { method: "DELETE", auth: true });
            afterDelete(id);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Form Modal ---------- */
function ProductionFormModal({ initial, onClose, onSaved, propertyCode }) {
  const isEdit = !!initial;
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [docNo, setDocNo] = useState(initial?.docNo || "");
  const [docDate, setDocDate] = useState(initial?.docDate ? initial.docDate.substring(0, 10) : new Date().toISOString().substring(0, 10));
  const [product, setProduct] = useState(initial?.product || "");
  const [outputQty, setOutputQty] = useState(initial?.outputQty ?? 0);
  const [unit, setUnit] = useState(initial?.unit || "");
  const [status, setStatus] = useState(initial?.status || "DRAFT");
  const [notes, setNotes] = useState(initial?.notes || "");

  const [components, setComponents] = useState(
    initial?.components?.length
      ? initial.components
      : [{ item: "", qty: 0, unit: "" }]
  );

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");

    if (!docNo.trim()) return setErr("Doc No is required");
    if (!product.trim()) return setErr("Product is required");
    if (!outputQty || Number(outputQty) <= 0) return setErr("Output quantity must be > 0");

    const cleanComponents = components
      .map(c => ({ item: String(c.item || "").trim(), qty: Number(c.qty || 0), unit: String(c.unit || "").trim() }))
      .filter(c => c.item && c.qty > 0);

    if (cleanComponents.length === 0) return setErr("Add at least one component with qty > 0");

    const payload = {
      docNo: docNo.trim().toUpperCase(),
      docDate: new Date(docDate).toISOString(),
      product: product.trim(),
      outputQty: Number(outputQty || 0),
      unit: unit.trim(),
      status: status || "DRAFT",
      notes: notes.trim(),
      components: cleanComponents,
      propertyCode: propertyCode || "",
    };

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const id = initial._id || initial.id;
        saved = await apiFetch(`/api/productions/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(payload) });
      } else {
        saved = await apiFetch("/api/productions", { method: "POST", auth: true, body: JSON.stringify(payload) });
      }
      setOk("Saved.");
      onSaved(saved);
    } catch (e2) {
      setErr(e2?.message || "Failed to save record.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Production" : "Add Production"} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      {ok && <Banner type="ok">{ok}</Banner>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <Row>
          <Field label="Doc No" required>
            <input className="input" value={docNo} onChange={e => setDocNo(e.target.value)} />
          </Field>
          <Field label="Date">
            <input className="input" type="date" value={docDate} onChange={e => setDocDate(e.target.value)} />
          </Field>
          <Field label="Status">
            <select className="res-select" value={status} onChange={e => setStatus(e.target.value)}>
              {["DRAFT", "CONFIRMED", "CANCELLED"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </Row>

        <Row>
          <Field label="Product" required>
            <input className="input" value={product} onChange={e => setProduct(e.target.value)} />
          </Field>
          <Field label="Output Qty" required>
            <input className="input" type="number" min="0" step="0.01" value={outputQty} onChange={e => setOutputQty(e.target.value)} />
          </Field>
          <Field label="Unit">
            <input className="input" value={unit} onChange={e => setUnit(e.target.value)} placeholder="e.g., PCS / KG / LTR" />
          </Field>
        </Row>

        {/* Components (BOM) */}
        <div className="panel" style={{ marginTop: 8 }}>
          <div className="panel-h">Components (BOM)</div>
          <div className="panel-b" style={{ display: "grid", gap: 8 }}>
            {components.map((c, idx) => (
              <div key={idx} style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 140px 140px auto" }}>
                <input className="input" placeholder="Item name" value={c.item} onChange={e => setComponents(editIdx(components, idx, { ...c, item: e.target.value }))} />
                <input className="input" type="number" min="0" step="0.01" placeholder="Qty" value={c.qty ?? 0} onChange={e => setComponents(editIdx(components, idx, { ...c, qty: Number(e.target.value || 0) }))} />
                <input className="input" placeholder="Unit" value={c.unit || ""} onChange={e => setComponents(editIdx(components, idx, { ...c, unit: e.target.value }))} />
                <div style={{ textAlign: "right" }}>
                  <button type="button" className="btn" style={btnSm} onClick={() => setComponents(removeIdx(components, idx))}>Remove</button>
                </div>
              </div>
            ))}
            <div>
              <button type="button" className="btn" onClick={() => setComponents([...components, { item: "", qty: 0, unit: "" }])}>
                + Add Component
              </button>
            </div>
          </div>
        </div>

        <Row>
          <Field label="Notes">
            <input className="input" value={notes} onChange={e => setNotes(e.target.value)} />
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

/* ---------- Tiny UI helpers ---------- */
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
function ConfirmModal({ title, message, confirmText = "OK", onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={onClose}>
      <p style={{ marginTop: 0 }}>{message}</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn" type="button" onClick={onClose}>Cancel</button>
        <button className="btn" type="button" disabled={busy} onClick={async () => {
          setBusy(true);
          try { await onConfirm?.(); onClose(); } finally { setBusy(false); }
        }}>
          {busy ? "Working…" : confirmText}
        </button>
      </div>
    </Modal>
  );
}
function StatusPill({ value }) {
  const v = String(value || "").toUpperCase();
  const map = {
    DRAFT:     { bg: "#eef2ff", bd: "#c7d2fe", fg: "#3730a3", txt: "Draft" },
    CONFIRMED: { bg: "#ecfdf5", bd: "#a7f3d0", fg: "#065f46", txt: "Confirmed" },
    CANCELLED: { bg: "#fef2f2", bd: "#fecaca", fg: "#991b1b", txt: "Cancelled" },
  };
  const s = map[v] || map.DRAFT;
  return (
    <span style={{
      display: "inline-block", padding: ".15rem .5rem", borderRadius: 999,
      background: s.bg, border: `1px solid ${s.bd}`, color: s.fg, fontSize: ".75rem", fontWeight: 700
    }}>{s.txt}</span>
  );
}

/* ---------- utilities ---------- */
function editIdx(arr, idx, val) { const next = arr.slice(); next[idx] = val; return next; }
function removeIdx(arr, idx) { return arr.filter((_, i) => i !== idx); }
function fmtDate(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(dt) ? "—" : dt.toLocaleDateString(); }

/* ---------- styles ---------- */
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(900px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };
