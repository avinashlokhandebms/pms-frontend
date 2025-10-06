// src/pages/pos/ReprintBill.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import PosSidebar from "../../../components/sidebar/Possidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

/**
 * Reprint Bill
 * - Filters: outlet, date range, search box
 * - List bills (paginated)
 * - Actions: View (inline receipt), Print (PDF/HTML in new tab), Email receipt, Reprint log
 */

const PAGE_SIZE = 10;

export default function ReprintBill() {
  // filters
  const [outlets, setOutlets] = useState([]);
  const [outletId, setOutletId] = useState("");
  const [from, setFrom] = useState(() => isoDateNDaysAgo(7)); // last 7 days
  const [to, setTo] = useState(() => isoDateNDaysAgo(0));
  const [q, setQ] = useState("");

  // list
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);

  // ui
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // modal: receipt preview
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptHtml, setReceiptHtml] = useState("");
  const [receiptFor, setReceiptFor] = useState(null);

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

  /* ---------- load bills ---------- */
  const loadBills = async () => {
    setLoading(true); setErr(""); setOk("");
    try {
      const params = new URLSearchParams({
        outletId: outletId || "",
        from: from ? from + "T00:00:00" : "",
        to: to ? to + "T23:59:59" : "",
        q, page, limit,
      });
      const res = await apiFetch(`/api/pos/bills?${params.toString()}`, { auth: true });
      const data = res?.data || res?.items || res || [];
      const count = res?.total ?? data.length ?? 0;
      setRows(Array.isArray(data) ? data : []);
      setTotal(Number(count) || 0);
    } catch (e) {
      setErr(e?.message || "Failed to load bills. Showing demo data.");
      const demo = demoBills();
      setRows(demo);
      setTotal(demo.length);
    } finally {
      setLoading(false);
    }
  };

  // initial + when filters change (except q: user presses Search)
  useEffect(() => { loadBills(); /* eslint-disable-next-line */ }, [outletId, from, to, page, limit]);

  // client search fallback (when backend doesn't support 'q')
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [
        r.billNo, r.orderNo, r.table?.name || r.tableName, r.guestName,
        (r.userName || r.cashier), (r.paymentModes || []).join(","),
      ]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  const dataToRender = rows?.length && total > rows.length ? rows : filtered;

  /* ---------- actions ---------- */
  const openReceipt = async (bill) => {
    setShowReceipt(true);
    setReceiptHtml(""); setReceiptFor(bill);
    try {
      // Preferred: server returns { html } or raw HTML
      const res = await apiFetch(`/api/pos/bills/${bill._id || bill.id}/receipt?format=html`, { auth: true });
      const html = typeof res === "string" ? res : res?.html || "";
      setReceiptHtml(html || fallbackReceiptHtml(bill));
    } catch {
      setReceiptHtml(fallbackReceiptHtml(bill));
    }
  };

  const openPrint = (bill, copy = "duplicate", format = "pdf") => {
    const id = bill._id || bill.id;
    const url = `/api/pos/bills/${id}/receipt?format=${format}&copy=${copy}`;
    // fire and forget; optionally your backend can log reprint on GET or do:
    // apiFetch(`/api/pos/bills/${id}/reprint`, { method: "POST", auth: true }).catch(()=>{});
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const sendEmail = async (bill) => {
    try {
      await apiFetch(`/api/pos/bills/${bill._id || bill.id}/email`, { method: "POST", auth: true });
      setOk(`Email sent for bill ${bill.billNo || (bill._id || bill.id)}`);
    } catch (e) {
      setErr(e?.message || "Failed to send email.");
    }
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <PosSidebar />

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Reprint Bill</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select className="res-select" value={outletId} onChange={(e) => { setOutletId(e.target.value); setPage(1); }}>
              {outlets.map(o => <option key={o._id || o.id} value={o._id || o.id}>{o.name}</option>)}
            </select>

            <input className="res-select" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
            <input className="res-select" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />

            <input
              className="res-select"
              placeholder="Search (bill no / order / table / guest / cashier)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadBills()}
              style={{ minWidth: 280 }}
            />
            <select className="res-select" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
            <button className="btn" onClick={() => { setPage(1); loadBills(); }} disabled={loading}>
              {loading ? "Loading…" : "Search"}
            </button>
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
            <span>Bills</span>
            <span className="small" style={{ color: "var(--muted)" }}>
              {loading ? "Loading…" : `Total: ${total || dataToRender.length}`}
            </span>
          </div>
          <div className="panel-b">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 130 }}>Action</th>
                    <th>Bill No</th>
                    <th>Date/Time</th>
                    <th>Table</th>
                    <th>Guest</th>
                    <th>Cashier</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                    <th>Payment</th>
                    <th style={{ textAlign: "center" }}>Reprints</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={9}>No bills found</td></tr>
                  )}

                  {dataToRender?.map((b) => {
                    const id = b._id || b.id;
                    const pmodes = Array.isArray(b.paymentModes) ? b.paymentModes.join(", ") : (b.paymentSummary || "—");
                    return (
                      <tr key={id}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="btn" style={btnSm} onClick={() => openReceipt(b)}>View</button>
                          <button className="btn" style={btnSm} onClick={() => openPrint(b, "duplicate", "pdf")}>Print</button>
                          <button className="btn" style={btnSm} onClick={() => sendEmail(b)}>Email</button>
                        </td>
                        <td>{b.billNo || id}</td>
                        <td title={b.createdAt || ""}>{fmtDateTime(b.createdAt)}</td>
                        <td>{b.table?.name || b.tableName || "—"}</td>
                        <td>{b.guestName || "—"}</td>
                        <td>{b.userName || b.cashier || "—"}</td>
                        <td style={{ textAlign: "right" }}>{fmtAmount(b.grandTotal || b.total || b.amount || 0)}</td>
                        <td>{pmodes || "—"}</td>
                        <td style={{ textAlign: "center" }}>{b.reprintCount ?? "—"}</td>
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

      {/* Receipt Modal */}
      {showReceipt && (
        <Modal title={`Receipt — ${receiptFor?.billNo || receiptFor?._id || receiptFor?.id}`} onClose={() => setShowReceipt(false)}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, justifyContent: "flex-end" }}>
            <button className="btn" onClick={() => openPrint(receiptFor, "duplicate", "pdf")}>Print PDF</button>
            <button className="btn" onClick={() => openPrint(receiptFor, "duplicate", "html")}>Open HTML</button>
          </div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, height: "60vh", overflow: "hidden" }}>
            {receiptHtml
              ? <iframe title="Receipt" srcDoc={receiptHtml} style={{ width: "100%", height: "100%", border: 0 }} />
              : <div className="no-rows" style={{ height: "100%", display: "grid", placeItems: "center" }}>Loading…</div>}
          </div>
        </Modal>
      )}

      <Style />
    </div>
  );
}

/* ---------- atoms ---------- */
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

/* ---------- helpers ---------- */
function isoDateNDaysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function fmtAmount(n) { return (Number(n) || 0).toLocaleString(undefined, { style: "currency", currency: "INR", minimumFractionDigits: 2 }); }
function fmtDateTime(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt)) return "—";
  return dt.toLocaleString([], { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function fallbackReceiptHtml(b) {
  const amt = fmtAmount(b?.grandTotal || b?.total || 0);
  const dt = fmtDateTime(b?.createdAt);
  return `
    <html><head><meta charset="utf-8"/><style>
      body{font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding:12px}
      h2{margin:0 0 6px 0}
      table{width:100%; border-collapse:collapse; margin-top:10px}
      th,td{border:1px solid #e5e7eb; padding:6px; text-align:left}
      .right{text-align:right}
      .muted{color:#64748b; font-size:12px}
    </style></head>
    <body>
      <h2>Receipt ${b?.billNo ? `#${b.billNo}` : ""}</h2>
      <div class="muted">${dt} • ${b?.table?.name || b?.tableName || "—"} • Cashier: ${b?.userName || b?.cashier || "—"}</div>
      <table>
        <thead><tr><th>Item</th><th class="right">Qty</th><th class="right">Rate</th><th class="right">Amount</th></tr></thead>
        <tbody>
          ${(b?.items || []).map(it => {
            const qty = Number(it.qty || 1);
            const rate = Number(it.rate || it.price || 0);
            const line = (qty * rate).toFixed(2);
            return `<tr><td>${it.name || ""}</td><td class="right">${qty}</td><td class="right">${rate.toFixed(2)}</td><td class="right">${line}</td></tr>`;
          }).join("")}
        </tbody>
        <tfoot>
          <tr><td colspan="3" class="right"><b>Total</b></td><td class="right"><b>${amt}</b></td></tr>
        </tfoot>
      </table>
    </body></html>
  `;
}
function demoBills() {
  const now = Date.now();
  return [
    {
      _id: "b-2001", billNo: "B-2001", orderNo: "POS-101", createdAt: new Date(now - 2 * 3600000).toISOString(),
      tableName: "T-01", guestName: "Rahul", userName: "Sam", grandTotal: 480, paymentModes: ["CASH"],
      items: [{ name: "Paneer Tikka", qty: 1, rate: 260 }, { name: "Butter Naan", qty: 2, rate: 60 }],
      reprintCount: 1,
    },
    {
      _id: "b-2002", billNo: "B-2002", orderNo: "POS-102", createdAt: new Date(now - 1 * 3600000).toISOString(),
      tableName: "T-08", guestName: "Asha", userName: "Rita", grandTotal: 560, paymentModes: ["CARD"],
      items: [{ name: "Dal Makhani", qty: 1, rate: 220 }, { name: "Jeera Rice", qty: 1, rate: 160 }, { name: "Masala Papad", qty: 1, rate: 80 }],
      reprintCount: 0,
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
  const css = `
    .no-rows { color:#64748b; text-align:center; padding:16px; }
  `;
  if (typeof document !== "undefined" && !document.getElementById("reprint-bill-css")) {
    const el = document.createElement("style");
    el.id = "reprint-bill-css"; el.innerHTML = css; document.head.appendChild(el);
  }
  return null;
}
