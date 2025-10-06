import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import ReservationSidebar, { BackofficeSidebar } from "../../components/sidebar/ReservationSidebar";
import "../../components/sidebar/Sidebar.css";
import "../../assets/css/commanPage.css";

const PAGE_SIZE = 10;
const METHODS = ["CASH", "CARD", "UPI", "BANK", "CHEQUE", "TRANSFER", "OTHER"];

export default function AdvanceDeposit() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState(""); // YYYY-MM-DD
  const [to, setTo] = useState("");     // YYYY-MM-DD
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
        const params = new URLSearchParams({ page, limit });
        if (q.trim()) params.set("q", q.trim());
        if (from) params.set("from", from);
        if (to) params.set("to", to);

        const res = await apiFetch(`/api/advance-deposits?${params.toString()}`, { auth: true });
        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;

        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number(count) || 0);
        }
      } catch (e) {
        if (!ignore) { setErr(e?.message || "Failed to load advance deposits."); setRows([]); setTotal(0); }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [q, from, to, page, limit]);

  // Client-side fallback search if server didn't paginate
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [r.bookingCode, r.guestName, r.mobile, r.method, r.reference, r.notes]
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

  // KPIs
  const kpis = useMemo(() => {
    const list = dataToRender || [];
    const sum = list.reduce((n, x) => n + (Number(x.amount) || 0), 0);
    const refunded = list.filter(x => !!x.isRefunded).length;
    return { count: list.length, totalAmt: sum, refunded };
  }, [dataToRender]);

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <ReservationSidebar/>

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Advance Deposits</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="res-select"
              placeholder="Search (guest / booking / method / ref / note)"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              style={{ minWidth: 320 }}
            />
            <input className="res-select" type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} title="From date" />
            <input className="res-select" type="date" value={to}   onChange={e => { setTo(e.target.value); setPage(1); }} title="To date" />
            <select className="res-select" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
            <button className="btn" onClick={openCreate}>+ Add Deposit</button>
          </div>
        </div>

        {/* KPIs */}
        <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <KPI label="Records" value={kpis.count} icon="🧾" />
          <KPI label="Total Amount" value={fmtMoney(kpis.totalAmt)} icon="💰" />
          <KPI label="Refunded (count)" value={kpis.refunded} icon="↩️" />
        </div>

        {/* Table */}
        <div className="panel" style={{ marginTop: 12 }}>
          <div className="panel-h">
            <span>Advance Deposit List</span>
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
                    <th>Date</th>
                    <th>Booking #</th>
                    <th>Guest</th>
                    <th>Mobile</th>
                    <th>Method</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                    <th>Reference</th>
                    <th>Refunded</th>
                    <th>Created</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={11}>No advance deposits found</td></tr>
                  )}

                  {dataToRender?.map(r => {
                    const id = r._id || r.id;
                    return (
                      <tr key={id}>
                        <td>
                          <button className="btn" style={btnSm} onClick={() => openEdit(r)}>✏️</button>
                          <button className="btn" style={btnSm} onClick={() => askDelete(r)}>🗑️</button>
                        </td>
                        <td>{fmtDate(r.date || r.createdAt)}</td>
                        <td>{r.bookingCode || "—"}</td>
                        <td title={r.notes || ""}>{r.guestName || "—"}</td>
                        <td>{r.mobile || "—"}</td>
                        <td>{r.method || "—"}</td>
                        <td style={{ textAlign: "right", fontWeight: 800 }}>{fmtMoney(r.amount)}</td>
                        <td>{r.reference || "—"}</td>
                        <td><OnOff value={r.isRefunded} /></td>
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

      {/* Create/Edit modal */}
      {showForm && (
        <DepositFormModal
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={afterSave}
        />
      )}

      {/* Delete modal */}
      {showDelete && (
        <ConfirmModal
          title="Delete Advance Deposit?"
          message={`Delete deposit for "${toDelete?.guestName || "Guest"}" (₹${Number(toDelete?.amount || 0).toFixed(2)})? This cannot be undone.`}
          confirmText="Delete"
          onClose={() => { setShowDelete(false); setToDelete(null); }}
          onConfirm={async () => {
            const id = toDelete?._id || toDelete?.id;
            await apiFetch(`/api/advance-deposits/${id}`, { method: "DELETE", auth: true });
            afterDelete(id);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Form Modal ---------- */
function DepositFormModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [date, setDate] = useState(toYMD(initial?.date || new Date()));
  const [bookingCode, setBookingCode] = useState(initial?.bookingCode || "");
  const [guestName, setGuestName] = useState(initial?.guestName || "");
  const [mobile, setMobile] = useState(initial?.mobile || "");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [currency, setCurrency] = useState(initial?.currency || "INR");
  const [method, setMethod] = useState(initial?.method || "CASH");
  const [reference, setReference] = useState(initial?.reference || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [isRefunded, setIsRefunded] = useState(initial?.isRefunded ?? false);
  const [propertyCode, setPropertyCode] = useState(initial?.propertyCode || ""); // optional

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");

    if (!amount || Number(amount) <= 0) return setErr("Amount must be greater than 0");
    if (!date) return setErr("Date is required");

    const payload = {
      date,
      bookingCode: bookingCode.trim().toUpperCase() || undefined,
      guestName: guestName.trim() || undefined,
      mobile: mobile.trim() || undefined,
      amount: Number(amount),
      currency: currency.trim().toUpperCase(),
      method,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
      isRefunded: !!isRefunded,
      propertyCode: (propertyCode || "").trim().toUpperCase() || undefined,
    };

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const id = initial._id || initial.id;
        saved = await apiFetch(`/api/advance-deposits/${id}`, {
          method: "PATCH", auth: true, body: JSON.stringify(payload),
        });
      } else {
        saved = await apiFetch("/api/advance-deposits", {
          method: "POST", auth: true, body: JSON.stringify(payload),
        });
      }
      setOk("Saved.");
      onSaved(saved);
    } catch (e2) {
      setErr(e2?.message || "Failed to save deposit.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Advance Deposit" : "Add Advance Deposit"} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      {ok && <Banner type="ok">{ok}</Banner>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <Row>
          <Field label="Date" required>
            <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </Field>
          <Field label="Amount (₹)" required>
            <input className="input" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
          </Field>
          <Field label="Currency">
            <input className="input" value={currency} onChange={e => setCurrency(e.target.value)} />
          </Field>
        </Row>

        <Row>
          <Field label="Method">
            <select className="res-select" value={method} onChange={e => setMethod(e.target.value)}>
              {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Reference">
            <input className="input" placeholder="Txn / Ref / UTR / Cheque no." value={reference} onChange={e => setReference(e.target.value)} />
          </Field>
          <Field label="Property Code (optional)">
            <input className="input" placeholder="If you use property scope" value={propertyCode} onChange={e => setPropertyCode(e.target.value)} />
          </Field>
        </Row>

        <Row>
          <Field label="Booking #">
            <input className="input" value={bookingCode} onChange={e => setBookingCode(e.target.value)} />
          </Field>
          <Field label="Guest Name">
            <input className="input" value={guestName} onChange={e => setGuestName(e.target.value)} />
          </Field>
          <Field label="Mobile">
            <input className="input" value={mobile} onChange={e => setMobile(e.target.value)} />
          </Field>
        </Row>

        <Row>
          <Field label="Notes">
            <textarea className="input" rows={2} placeholder="Optional" value={notes} onChange={e => setNotes(e.target.value)} />
          </Field>
          <Field label="Refunded?">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={isRefunded} onChange={e => setIsRefunded(e.target.checked)} />
              <span>{isRefunded ? "Yes" : "No"}</span>
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

/* ---------- Tiny UI helpers ---------- */
function KPI({ label, value, icon = "📌" }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon">{icon}</div>
      <div>
        <div className="kpi-title">{label}</div>
        <div className="kpi-number">{value ?? 0}</div>
      </div>
    </div>
  );
}
function Row({ children }) {
  return <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(160px, 1fr))" }}>{children}</div>;
}
function Field({ label, children, required }) {
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

/* ---------- date/money helpers & styles ---------- */
function toYMD(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt)) return "";
  const m = `${dt.getMonth() + 1}`.padStart(2, "0");
  const day = `${dt.getDate()}`.padStart(2, "0");
  return `${dt.getFullYear()}-${m}-${day}`;
}
function fmtDate(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(dt) ? "—" : dt.toLocaleDateString(); }
function fmtMoney(n) {
  const v = Number(n || 0);
  return v.toLocaleString(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(900px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };
