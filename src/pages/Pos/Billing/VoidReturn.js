// src/pages/pos/VoidReturn.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import PosSidebar from "../../../components/sidebar/Possidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

/**
 * Void / Return
 * - Filters: outlet, type (ALL/VOID/RETURN), date range, search
 * - List records (paginated)
 * - Actions: View, Approve, Reject, Print
 * - New record modal (optional, simple free-text ref/item for now)
 */

const PAGE_SIZE = 10;

export default function VoidReturn() {
  // filters
  const [outlets, setOutlets] = useState([]);
  const [outletId, setOutletId] = useState("");
  const [type, setType] = useState("ALL"); // ALL | VOID | RETURN
  const [from, setFrom] = useState(() => isoDateNDaysAgo(7));
  const [to, setTo] = useState(() => isoDateNDaysAgo(0));
  const [q, setQ] = useState("");

  // data
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);

  // ui
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // modals
  const [showDetail, setShowDetail] = useState(false);
  const [detailFor, setDetailFor] = useState(null);

  const [showForm, setShowForm] = useState(false);

  /* ---------- load outlets ---------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/api/pos/outlets", { auth: true });
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setOutlets(list);
        if (list.length && !outletId) setOutletId(list[0]._id || list[0].id || "");
      } catch {
        const demo = [{ _id: "o1", name: "Main Restaurant" }, { _id: "o2", name: "Rooftop" }];
        setOutlets(demo);
        if (!outletId) setOutletId("o1");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- load records ---------- */
  const loadRows = async () => {
    setLoading(true); setErr(""); setOk("");
    try {
      const params = new URLSearchParams({
        outletId: outletId || "",
        type: type === "ALL" ? "" : type,
        from: from ? from + "T00:00:00" : "",
        to: to ? to + "T23:59:59" : "",
        q, page, limit,
      });
      const res = await apiFetch(`/api/pos/voids-returns?${params.toString()}`, { auth: true });
      const data = res?.data || res?.items || res || [];
      const count = res?.total ?? data.length ?? 0;
      setRows(Array.isArray(data) ? data : []);
      setTotal(Number(count) || 0);
    } catch (e) {
      setErr(e?.message || "Failed to load records. Showing demo data.");
      const demo = demoRows();
      setRows(demo);
      setTotal(demo.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRows(); /* eslint-disable-next-line */ }, [outletId, type, from, to, page, limit]);

  /* ---------- client search fallback ---------- */
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [
        r.type, r.refType, r.refNo, r.itemName, r.reason,
        r.requestedByName, r.status, r.tableName, r.billNo,
      ]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  const dataToRender = rows?.length && total > rows.length ? rows : filtered;

  /* ---------- actions ---------- */
  const openDetail = (row) => { setDetailFor(row); setShowDetail(true); };

  const approve = async (row) => {
    const id = row._id || row.id;
    try {
      await apiFetch(`/api/pos/voids-returns/${id}/approve`, { method: "POST", auth: true });
      setOk("Approved.");
      setRows(prev => prev.map(x => (x._id || x.id) === id ? { ...x, status: "APPROVED" } : x));
    } catch (e) { setErr(e?.message || "Approve failed."); }
  };
  const reject = async (row) => {
    const id = row._id || row.id;
    try {
      await apiFetch(`/api/pos/voids-returns/${id}/reject`, { method: "POST", auth: true });
      setOk("Rejected.");
      setRows(prev => prev.map(x => (x._id || x.id) === id ? { ...x, status: "REJECTED" } : x));
    } catch (e) { setErr(e?.message || "Reject failed."); }
  };
  const print = (row) => {
    const id = row._id || row.id;
    const url = `/api/pos/voids-returns/${id}/print`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <PosSidebar />

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Void / Return</h2>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select className="res-select" value={outletId} onChange={(e) => { setOutletId(e.target.value); setPage(1); }}>
              {outlets.map(o => <option key={o._id || o.id} value={o._id || o.id}>{o.name}</option>)}
            </select>

            <select className="res-select" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
              {["ALL", "VOID", "RETURN"].map(t => <option key={t}>{t}</option>)}
            </select>

            <input className="res-select" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
            <input className="res-select" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />

            <input
              className="res-select"
              placeholder="Search (bill / item / reason / user)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadRows()}
              style={{ minWidth: 280 }}
            />
            <select className="res-select" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>

            <button className="btn" onClick={() => { setPage(1); loadRows(); }} disabled={loading}>
              {loading ? "Loading…" : "Search"}
            </button>

            <button className="btn" onClick={() => setShowForm(true)}>+ New</button>
          </div>
        </div>

        {(err || ok) && (
          <div style={{ marginBottom: 10 }}>
            {err && <Banner type="err">{err}</Banner>}
            {ok && <Banner type="ok">{ok}</Banner>}
          </div>
        )}

        {/* Table */}
        <div className="panel">
          <div className="panel-h">
            <span>Void / Return Records</span>
            <span className="small" style={{ color: "var(--muted)" }}>
              {loading ? "Loading…" : `Total: ${total || dataToRender.length}`}
            </span>
          </div>
          <div className="panel-b">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 210 }}>Action</th>
                    <th>Type</th>
                    <th>Ref</th>
                    <th>Item</th>
                    <th style={{ textAlign: "right" }}>Qty</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                    <th>Reason</th>
                    <th>Requested By</th>
                    <th>Status</th>
                    <th>Date/Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={10}>No records found</td></tr>
                  )}

                  {dataToRender?.map(r => {
                    const id = r._id || r.id;
                    const ref = (r.refType || "BILL") + " " + (r.refNo || r.billNo || id);
                    return (
                      <tr key={id}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="btn" style={btnSm} onClick={() => openDetail(r)}>View</button>
                          <button className="btn" style={btnSm} onClick={() => print(r)}>Print</button>
                          <button className="btn" style={btnSm} onClick={() => approve(r)} disabled={r.status === "APPROVED"}>Approve</button>
                          <button className="btn" style={btnSm} onClick={() => reject(r)} disabled={r.status === "REJECTED"}>Reject</button>
                        </td>
                        <td>{r.type}</td>
                        <td title={`Table: ${r.tableName || "—"}`}>{ref}</td>
                        <td>{r.itemName || "—"}</td>
                        <td style={{ textAlign: "right" }}>{fmtQty(r.qty)}</td>
                        <td style={{ textAlign: "right" }}>{fmtAmount(r.amount)}</td>
                        <td title={r.reason || ""}>{truncate(r.reason, 40) || "—"}</td>
                        <td>{r.requestedByName || r.requestedBy || "—"}</td>
                        <td><StatusBadge value={r.status} /></td>
                        <td title={r.createdAt || ""}>{fmtDateTime(r.createdAt)}</td>
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
              <button className="btn" disabled={loading || (total ? page * limit >= total : dataToRender.length < limit)} onClick={() => setPage(p => p + 1)}>Next ›</button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {showDetail && (
        <Modal title={`Record — ${(detailFor?.refType || "BILL")} ${detailFor?.refNo || detailFor?.billNo || (detailFor?._id || detailFor?.id)}`} onClose={() => setShowDetail(false)}>
          <DetailCard row={detailFor} />
        </Modal>
      )}

      {/* Create modal */}
      {showForm && (
        <CreateModal
          outletId={outletId}
          onClose={() => setShowForm(false)}
          onCreated={(rec) => {
            setShowForm(false);
            setRows(prev => [rec, ...prev]);
            setOk("Created.");
          }}
        />
      )}

      <Style />
    </div>
  );
}

/* ---------- Create modal ---------- */
function CreateModal({ outletId, onClose, onCreated }) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [type, setType] = useState("VOID");
  const [refType, setRefType] = useState("BILL"); // BILL | KOT
  const [refNo, setRefNo] = useState("");
  const [itemName, setItemName] = useState("");
  const [qty, setQty] = useState(1);
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");

  const submit = async (e) => {
    e.preventDefault(); setErr("");
    if (!refNo.trim()) return setErr("Reference no is required");
    if (!reason.trim()) return setErr("Reason is required");

    const payload = {
      outletId, type, refType, refNo: refNo.trim(),
      itemName: itemName.trim(), qty: Number(qty || 0),
      amount: Number(amount || 0), reason: reason.trim(),
    };

    setSaving(true);
    try {
      const saved = await apiFetch("/api/pos/voids-returns", {
        method: "POST", auth: true, body: JSON.stringify(payload),
      });
      onCreated?.(saved);
    } catch (e2) {
      setErr(e2?.message || "Failed to create record.");
    } finally { setSaving(false); }
  };

  return (
    <Modal title="New Void / Return" onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(160px, 1fr))" }}>
          <Field label="Type">
            <select className="res-select" value={type} onChange={e => setType(e.target.value)}>
              <option>VOID</option>
              <option>RETURN</option>
            </select>
          </Field>
          <Field label="Ref Type">
            <select className="res-select" value={refType} onChange={e => setRefType(e.target.value)}>
              <option>BILL</option>
              <option>KOT</option>
            </select>
          </Field>
          <Field label="Ref No">
            <input className="input" value={refNo} onChange={e => setRefNo(e.target.value)} placeholder="e.g. B-2031" />
          </Field>
        </div>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(160px, 1fr))" }}>
          <Field label="Item (optional)">
            <input className="input" value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Item name" />
          </Field>
          <Field label="Qty">
            <input className="input" type="number" min="0" step="1" value={qty} onChange={e => setQty(e.target.value)} />
          </Field>
          <Field label="Amount">
            <input className="input" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
          </Field>
        </div>

        <Field label="Reason">
          <textarea className="input" rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is it being voided/returned?" />
        </Field>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? "Saving…" : "Create"}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- detail card ---------- */
function DetailCard({ row }) {
  const lines = [
    ["Type", row?.type],
    ["Status", row?.status],
    ["Outlet", row?.outletName || row?.outletId || "—"],
    ["Ref", `${row?.refType || "BILL"} ${row?.refNo || row?.billNo || row?._id || row?.id}`],
    ["Table", row?.tableName || "—"],
    ["Item", row?.itemName || "—"],
    ["Qty", fmtQty(row?.qty)],
    ["Amount", fmtAmount(row?.amount)],
    ["Reason", row?.reason || "—"],
    ["Requested By", row?.requestedByName || row?.requestedBy || "—"],
    ["Approved By", row?.approvedByName || row?.approvedBy || "—"],
    ["Created", fmtDateTime(row?.createdAt)],
    ["Updated", fmtDateTime(row?.updatedAt)],
  ];
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div className="table-wrap">
        <table className="table">
          <tbody>
            {lines.map(([k, v]) => (
              <tr key={k}>
                <th style={{ width: 180, textAlign: "left" }}>{k}</th>
                <td>{String(v ?? "—")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- atoms ---------- */
function StatusBadge({ value }) {
  const v = (value || "PENDING").toUpperCase();
  const style = {
    PENDING:  { bg: "#fef9c3", bd: "#fde68a", fg: "#854d0e" },
    APPROVED: { bg: "#dcfce7", bd: "#bbf7d0", fg: "#166534" },
    REJECTED: { bg: "#fee2e2", bd: "#fecaca", fg: "#991b1b" },
  }[v] || { bg: "#e5e7eb", bd: "#d1d5db", fg: "#374151" };
  return (
    <span style={{
      display: "inline-block", padding: ".15rem .5rem",
      borderRadius: 999, background: style.bg, border: `1px solid ${style.bd}`,
      color: style.fg, fontSize: ".75rem", fontWeight: 800
    }}>
      {v}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span className="label" style={{ fontWeight: 700 }}>{label}</span>
      {children}
    </label>
  );
}
function Banner({ type = "ok", children }) {
  const style = type === "err"
    ? { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }
    : { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
  return <div style={{ ...style, padding: "8px 10px", borderRadius: 10, fontWeight: 700 }}>{children}</div>;
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

/* ---------- utils ---------- */
function isoDateNDaysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function fmtQty(q) { const n = Number(q || 0); return Number.isFinite(n) ? n : 0; }
function fmtAmount(n) { return (Number(n) || 0).toLocaleString(undefined, { style: "currency", currency: "INR", minimumFractionDigits: 2 }); }
function fmtDateTime(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt)) return "—";
  return dt.toLocaleString([], { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function truncate(s, n) { if (!s) return ""; const str = String(s); return str.length > n ? str.slice(0, n - 1) + "…" : str; }
function demoRows() {
  const now = Date.now();
  return [
    {
      _id: "vr-101", outletId: "o1", type: "VOID", refType: "BILL", refNo: "B-2009",
      billNo: "B-2009", tableName: "T-01", itemName: "Paneer Tikka", qty: 1, amount: 260,
      reason: "Wrong item punched", requestedByName: "Sam", status: "PENDING",
      createdAt: new Date(now - 3600e3).toISOString(),
    },
    {
      _id: "vr-102", outletId: "o1", type: "RETURN", refType: "BILL", refNo: "B-2013",
      billNo: "B-2013", tableName: "T-03", itemName: "Masala Papad", qty: 1, amount: 80,
      reason: "Customer returned (too spicy)", requestedByName: "Rita", status: "APPROVED",
      createdAt: new Date(now - 2 * 3600e3).toISOString(),
    },
  ];
}

/* ---------- styles ---------- */
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(900px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };

function Style() {
  const css = `.no-rows { color:#64748b; text-align:center; padding:16px; }`;
  if (typeof document !== "undefined" && !document.getElementById("void-return-css")) {
    const el = document.createElement("style");
    el.id = "void-return-css"; el.innerHTML = css; document.head.appendChild(el);
  }
  return null;
}
