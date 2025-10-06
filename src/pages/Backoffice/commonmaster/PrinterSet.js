// src/pages/Backoffice/common-master/PrinterSet.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { BackofficeSidebar } from "../../../components/sidebar/backofficesidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

const PAGE_SIZE = 10;

export default function PrinterSetPage() {
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

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true); setErr("");
      try {
        const params = new URLSearchParams({ q, page, limit });
        const res = await apiFetch(`/api/printers?${params.toString()}`, { auth: true });
        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;
        if (!ignore) { setRows(Array.isArray(data) ? data : []); setTotal(Number(count) || 0); }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load printers."); setRows([]); setTotal(0); }
      } finally { if (!ignore) setLoading(false); }
    })();
    return () => { ignore = true; };
  }, [q, page, limit]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [
        r.propertyCode, r.code, r.name, r.printerType, r.interfaceType,
        r.ip, r.usbDevice, r.btAddress, r.outlet, r.location, r.driver, r.prefix
      ]
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
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Printer Set</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="res-select"
              placeholder="Search (property / code / name / type / interface / address)"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              style={{ minWidth: 340 }}
            />
            <select
              className="res-select"
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            >
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
            <button className="btn" onClick={openCreate}>+ Add Printer</button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-h">
            <span>Printers</span>
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
                    <th>Code</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Interface</th>
                    <th>Address</th>
                    <th>Outlet</th>
                    <th>Default</th>
                    <th>Active</th>
                    <th>Created</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={12}>No printers found</td></tr>
                  )}

                  {dataToRender?.map(r => {
                    const id = r._id || r.id;
                    const addr =
                      r.interfaceType === "NETWORK" ? `${r.ip || "—"}:${r.port || "9100"}` :
                      r.interfaceType === "USB" ? (r.usbDevice || "—") :
                      r.interfaceType === "BT" ? (r.btAddress || "—") :
                      r.interfaceType === "OS" ? (r.osName || "—") :
                      "—";
                    return (
                      <tr key={id}>
                        <td>
                          <button className="btn" style={btnSm} onClick={() => openEdit(r)}>✏️</button>
                          <button className="btn" style={btnSm} onClick={() => askDelete(r)}>🗑️</button>
                        </td>
                        <td>{r.propertyCode || "—"}</td>
                        <td>{r.code}</td>
                        <td title={r.description || ""}>{r.name}</td>
                        <td>{r.printerType}</td>
                        <td>{r.interfaceType}</td>
                        <td>{addr}</td>
                        <td>{r.outlet || r.location || "—"}</td>
                        <td><OnOff value={r.isDefault} /></td>
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
        <PrinterFormModal
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={afterSave}
        />
      )}

      {showDelete && (
        <ConfirmModal
          title="Delete Printer?"
          message={`Delete "${toDelete?.name}" (${toDelete?.code})? This cannot be undone.`}
          confirmText="Delete"
          onClose={() => { setShowDelete(false); setToDelete(null); }}
          onConfirm={async () => {
            const id = toDelete?._id || toDelete?.id;
            await apiFetch(`/api/printers/${id}`, { method: "DELETE", auth: true });
            afterDelete(id);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Form Modal ---------- */
function PrinterFormModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [propertyCode, setPropertyCode] = useState(initial?.propertyCode || "");
  const [code, setCode] = useState(initial?.code || "");
  const [name, setName] = useState(initial?.name || "");
  const [printerType, setPrinterType] = useState(initial?.printerType || "RECEIPT"); // RECEIPT/KOT/BILL/REPORT/OTHER
  const [interfaceType, setInterfaceType] = useState(initial?.interfaceType || "NETWORK"); // NETWORK/USB/BT/OS

  // Addresses by interface
  const [ip, setIp] = useState(initial?.ip || "");
  const [port, setPort] = useState(initial?.port ?? 9100);
  const [usbDevice, setUsbDevice] = useState(initial?.usbDevice || "");
  const [btAddress, setBtAddress] = useState(initial?.btAddress || "");
  const [osName, setOsName] = useState(initial?.osName || "");

  // Formatting & metadata
  const [prefix, setPrefix] = useState(initial?.prefix || "");
  const [paperWidthMm, setPaperWidthMm] = useState(initial?.paperWidthMm ?? 80);
  const [charsPerLine, setCharsPerLine] = useState(initial?.charsPerLine ?? 42);
  const [driver, setDriver] = useState(initial?.driver || "ESC/POS");
  const [outlet, setOutlet] = useState(initial?.outlet || "");
  const [location, setLocation] = useState(initial?.location || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");

    if (!code.trim()) return setErr("Code is required");
    if (!name.trim()) return setErr("Name is required");

    const payload = {
      propertyCode: (propertyCode || "").trim().toUpperCase(),
      code: code.trim().toUpperCase(),
      name: name.trim(),
      printerType,
      interfaceType,
      ip: interfaceType === "NETWORK" ? ip.trim() : "",
      port: interfaceType === "NETWORK" ? Number(port || 9100) : undefined,
      usbDevice: interfaceType === "USB" ? usbDevice.trim() : "",
      btAddress: interfaceType === "BT" ? btAddress.trim() : "",
      osName: interfaceType === "OS" ? osName.trim() : "",
      prefix: prefix.trim(),
      paperWidthMm: Number(paperWidthMm || 80),
      charsPerLine: Number(charsPerLine || 42),
      driver: driver.trim(),
      outlet: outlet.trim(),
      location: location.trim(),
      description: description.trim(),
      isDefault,
      isActive,
    };

    // Remove undefined keys
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const id = initial._id || initial.id;
        saved = await apiFetch(`/api/printers/${id}`, {
          method: "PATCH", auth: true, body: JSON.stringify(payload),
        });
      } else {
        saved = await apiFetch("/api/printers", {
          method: "POST", auth: true, body: JSON.stringify(payload),
        });
      }
      setOk("Saved.");
      onSaved(saved);
    } catch (e2) {
      setErr(e2?.message || "Failed to save printer.");
    } finally { setSaving(false); }
  };

  return (
    <Modal title={isEdit ? "Edit Printer" : "Add Printer"} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      {ok && <Banner type="ok">{ok}</Banner>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <Row>
          <Field label="Property Code">
            <input className="input" value={propertyCode} onChange={e => setPropertyCode(e.target.value)} placeholder="(optional) e.g. TRUSTJAIPUR" />
          </Field>
          <Field label="Code" required>
            <input className="input" value={code} onChange={e => setCode(e.target.value)} />
          </Field>
          <Field label="Name" required>
            <input className="input" value={name} onChange={e => setName(e.target.value)} />
          </Field>
        </Row>

        <Row>
          <Field label="Printer Type">
            <select className="res-select" value={printerType} onChange={e => setPrinterType(e.target.value)}>
              {["RECEIPT", "KOT", "BILL", "REPORT", "OTHER"].map(k => <option key={k}>{k}</option>)}
            </select>
          </Field>
          <Field label="Interface">
            <select className="res-select" value={interfaceType} onChange={e => setInterfaceType(e.target.value)}>
              {["NETWORK", "USB", "BT", "OS"].map(k => <option key={k}>{k}</option>)}
            </select>
          </Field>
          <Field label="Driver">
            <select className="res-select" value={driver} onChange={e => setDriver(e.target.value)}>
              {["ESC/POS", "STAR", "CUSTOM", "OS"].map(k => <option key={k}>{k}</option>)}
            </select>
          </Field>
        </Row>

        {/* Interface-specific inputs */}
        {interfaceType === "NETWORK" && (
          <Row>
            <Field label="IP / Host">
              <input className="input" value={ip} onChange={e => setIp(e.target.value)} placeholder="192.168.1.50" />
            </Field>
            <Field label="Port">
              <input className="input" type="number" min="1" value={port} onChange={e => setPort(e.target.value)} />
            </Field>
          </Row>
        )}
        {interfaceType === "USB" && (
          <Row>
            <Field label="USB Device">
              <input className="input" value={usbDevice} onChange={e => setUsbDevice(e.target.value)} placeholder="e.g. /dev/usb/lp0 or WIN printer share" />
            </Field>
          </Row>
        )}
        {interfaceType === "BT" && (
          <Row>
            <Field label="Bluetooth MAC">
              <input className="input" value={btAddress} onChange={e => setBtAddress(e.target.value)} placeholder="e.g. 00:11:22:33:AA:BB" />
            </Field>
          </Row>
        )}
        {interfaceType === "OS" && (
          <Row>
            <Field label="OS Printer Name">
              <input className="input" value={osName} onChange={e => setOsName(e.target.value)} placeholder="System printer (CUPS/Windows)" />
            </Field>
          </Row>
        )}

        <Row>
          <Field label="Prefix">
            <input className="input" value={prefix} onChange={e => setPrefix(e.target.value)} placeholder="Optional e.g. BILL-" />
          </Field>
          <Field label="Paper Width (mm)">
            <input className="input" type="number" min="40" max="210" value={paperWidthMm} onChange={e => setPaperWidthMm(e.target.value)} />
          </Field>
          <Field label="Chars / Line">
            <input className="input" type="number" min="20" max="96" value={charsPerLine} onChange={e => setCharsPerLine(e.target.value)} />
          </Field>
        </Row>

        <Row>
          <Field label="Outlet">
            <input className="input" value={outlet} onChange={e => setOutlet(e.target.value)} placeholder="e.g. Restaurant 1" />
          </Field>
          <Field label="Location">
            <input className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Kitchen" />
          </Field>
          <Field label="Default / Active">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} />
                Default
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                Active
              </label>
            </div>
          </Field>
        </Row>

        <Row>
          <Field label="Description">
            <textarea className="input" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
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
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(900px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };
function fmtDate(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(dt) ? "—" : dt.toLocaleDateString(); }
