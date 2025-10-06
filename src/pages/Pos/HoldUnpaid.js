// src/pages/pos/HoldUnpaid.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import PosSidebar from "../../components/sidebar/Possidebar";
import "../../components/sidebar/Sidebar.css";
import "../../assets/css/commanPage.css";

export default function HoldUnpaid() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL"); // ALL | HOLD | BILLED
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState("");

  const [paying, setPaying] = useState(null); // order being paid

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams();
      // ask backend for only HOLD/BILLED; then refine locally
      if (status !== "ALL") params.set("status", status);
      const res = await apiFetch(`/api/pos/orders?scope=hold-unpaid&${params.toString()}`, { auth: true });
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

      // Fallback: ensure only HOLD/BILLED show up
      const onlyHU = list.filter((o) => ["HOLD", "BILLED"].includes((o.status || "").toUpperCase()));
      setRows(onlyHU);
    } catch (e) {
      setErr(e?.message || "Failed to load Hold/Unpaid orders.");
      // demo fallback
      setRows([
        {
          _id: "h1",
          orderNo: "POS-00118",
          table: "T-02",
          customer: { name: "Walk-in" },
          items: [{ name: "Soup", qty: 2, rate: 120 }],
          subTotal: 240,
          taxPct: 5,
          taxAmt: 12,
          grandTotal: 252,
          paidTotal: 0,
          status: "HOLD",
          updatedAt: new Date().toISOString(),
        },
        {
          _id: "u1",
          orderNo: "POS-00119",
          table: "T-03",
          customer: { name: "Elena" },
          items: [{ name: "Pizza", qty: 1, rate: 390 }],
          subTotal: 390,
          taxPct: 5,
          taxAmt: 19.5,
          grandTotal: 409.5,
          paidTotal: 0,
          status: "BILLED",
          updatedAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const data = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [
        r.orderNo,
        r.table,
        r?.customer?.name,
        ...(r.items || []).map((i) => i.name),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  /* -------- actions -------- */
  const patchOrder = async (id, body) => {
    setBusyId(id);
    try {
      const updated = await apiFetch(`/api/pos/orders/${id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify(body),
      });
      setRows((prev) => prev.map((r) => (r._id === id ? { ...r, ...updated } : r)));
      return updated;
    } catch (e) {
      alert(e?.message || "Action failed.");
    } finally {
      setBusyId("");
    }
  };

  const resumeOrder = async (id) => {
    const upd = await patchOrder(id, { status: "OPEN" });
    if (upd) setRows((prev) => prev.filter((r) => r._id !== id)); // drop from HU list
  };

  const printBill = async (id) => {
    setBusyId(id);
    try {
      await apiFetch(`/api/pos/orders/${id}/print-bill`, { method: "POST", auth: true });
      alert("Bill sent to printer.");
    } catch (e) {
      alert(e?.message || "Failed to print bill.");
    } finally { setBusyId(""); }
  };

  const cancelOrder = async (id) => {
    const reason = prompt("Cancel reason?");
    if (!reason) return;
    const upd = await patchOrder(id, { status: "CANCELLED", cancelReason: reason });
    if (upd) setRows((prev) => prev.filter((r) => r._id !== id));
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <PosSidebar />
      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Hold / Unpaid</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="res-select"
              placeholder="Search order / table / guest / item…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: 280 }}
            />
            <select
              className="res-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              title="Status filter"
            >
              {["ALL", "HOLD", "BILLED"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button className="btn" onClick={load} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="panel">
          <div className="panel-h">
            <span>Orders on Hold / Unpaid</span>
            <span className="small" style={{ color: "var(--muted)" }}>
              {loading ? "Loading…" : `${data.length} orders`}
            </span>
          </div>

          <div className="panel-b">
            {err && <Banner type="err">{err}</Banner>}

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 240 }}>Action</th>
                    <th>Order #</th>
                    <th>Table</th>
                    <th>Guest</th>
                    <th style={{ textAlign: "right" }}>Items</th>
                    <th style={{ textAlign: "right" }}>Total</th>
                    <th style={{ textAlign: "right" }}>Paid</th>
                    <th style={{ textAlign: "right" }}>Due</th>
                    <th>Status</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 && !loading && (
                    <tr className="no-rows"><td colSpan={10}>No orders</td></tr>
                  )}

                  {data.map((r) => {
                    const id = r._id || r.id;
                    const itemsCnt = (r.items || []).reduce((s, i) => s + Number(i.qty || 0), 0);
                    const total = Number(r.grandTotal ?? r.subTotal ?? 0);
                    const paid = Number(r.paidTotal ?? 0);
                    const due = Math.max(0, total - paid);
                    return (
                      <tr key={id}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="btn" style={btnSm} disabled={busyId === id} onClick={() => resumeOrder(id)}>
                            Resume
                          </button>
                          <button className="btn" style={btnSm} disabled={busyId === id} onClick={() => printBill(id)}>
                            Print Bill
                          </button>
                          <button className="btn" style={btnSm} onClick={() => setPaying(r)}>
                            Collect
                          </button>
                          <button className="btn" style={btnSm} disabled={busyId === id} onClick={() => cancelOrder(id)}>
                            Cancel
                          </button>
                        </td>
                        <td>{r.orderNo || id.slice(-6).toUpperCase()}</td>
                        <td>{r.table || "—"}</td>
                        <td>{r?.customer?.name || "Walk-in"}</td>
                        <td style={{ textAlign: "right" }}>{itemsCnt}</td>
                        <td style={{ textAlign: "right" }}>₹ {total.toFixed(2)}</td>
                        <td style={{ textAlign: "right" }}>₹ {paid.toFixed(2)}</td>
                        <td style={{ textAlign: "right", fontWeight: 800 }}>₹ {due.toFixed(2)}</td>
                        <td><StatusPill value={r.status} /></td>
                        <td>{fmtDateTime(r.updatedAt || r.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="small" style={{ color: "var(--muted)", marginTop: 6 }}>
              Tip: Use <b>Resume</b> to move a held order back to running.
            </div>
          </div>
        </div>
      </div>

      {paying && (
        <CollectPaymentModal
          order={paying}
          onClose={() => setPaying(null)}
          onCollected={async (payload) => {
            const id = paying._id || paying.id;
            setBusyId(id);
            try {
              // Prefer a dedicated endpoint if you have one:
              // await apiFetch(`/api/pos/orders/${id}/collect-payment`, { method: "POST", auth: true, body: JSON.stringify(payload) });
              // Mark as SETTLED (or whatever your final state is)
              const updated = await apiFetch(`/api/pos/orders/${id}`, {
                method: "PATCH",
                auth: true,
                body: JSON.stringify({ status: "SETTLED", payment: payload }),
              });
              // remove from this list
              setRows((prev) => prev.filter((r) => (r._id || r.id) !== id));
            } catch (e) {
              alert(e?.message || "Failed to collect payment.");
            } finally { setBusyId(""); setPaying(null); }
          }}
        />
      )}
    </div>
  );
}

/* ---------- Collect Payment Modal ---------- */
function CollectPaymentModal({ order, onClose, onCollected }) {
  const total = Number(order?.grandTotal ?? order?.subTotal ?? 0);
  const alreadyPaid = Number(order?.paidTotal ?? 0);
  const due = Math.max(0, total - alreadyPaid);

  const [amount, setAmount] = useState(due.toFixed(2));
  const [mode, setMode] = useState("CASH");
  const [ref, setRef] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    const amt = Number(amount);
    if (!(amt > 0)) return setErr("Enter a valid amount.");
    if (amt > due + 0.001) return setErr("Amount cannot exceed due.");
    setSaving(true);
    try {
      await onCollected?.({ amount: amt, mode, reference: ref });
    } catch (e2) {
      setErr(e2?.message || "Payment failed.");
    } finally { setSaving(false); }
  };

  return (
    <Modal title={`Collect Payment — ${order?.orderNo || order?._id?.slice(-6)}`} onClose={onClose}>
      {err && <Banner type="err">{err}</Banner>}
      <div className="panel" style={{ marginBottom: 10 }}>
        <div className="panel-b" style={{ display: "grid", gap: 8 }}>
          <KV label="Total" value={`₹ ${total.toFixed(2)}`} />
          <KV label="Already Paid" value={`₹ ${alreadyPaid.toFixed(2)}`} />
          <KV strong label="Due" value={`₹ ${due.toFixed(2)}`} />
        </div>
      </div>

      <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr 1fr" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span className="label" style={{ fontWeight: 700 }}>Amount</span>
            <input className="input" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span className="label" style={{ fontWeight: 700 }}>Mode</span>
            <select className="res-select" value={mode} onChange={(e) => setMode(e.target.value)}>
              {["CASH", "CARD", "UPI", "BANK", "WALLET"].map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span className="label" style={{ fontWeight: 700 }}>Ref / Txn ID (optional)</span>
            <input className="input" value={ref} onChange={(e) => setRef(e.target.value)} />
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? "Collecting…" : "Collect & Close"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- shared atoms ---------- */
function KV({ label, value, strong }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 0",
      fontWeight: strong ? 800 : 600
    }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function StatusPill({ value }) {
  const v = (value || "").toUpperCase();
  const map = {
    HOLD: { bg: "#f3f4f6", bd: "#e5e7eb", fg: "#374151", text: "Hold" },
    BILLED: { bg: "#f5f3ff", bd: "#ddd6fe", fg: "#6d28d9", text: "Billed (Unpaid)" },
    SETTLED: { bg: "#f0fdf4", bd: "#bbf7d0", fg: "#166534", text: "Settled" },
  };
  const s = map[v] || { bg: "#eff6ff", bd: "#bfdbfe", fg: "#1d4ed8", text: v || "—" };
  return (
    <span style={{
      display: "inline-block", padding: ".15rem .5rem", borderRadius: 999,
      background: s.bg, border: `1px solid ${s.bd}`, color: s.fg, fontSize: ".75rem", fontWeight: 800
    }}>
      {s.text}
    </span>
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

/* ---------- styles ---------- */
const btnSm = { padding: ".3rem .5rem", marginRight: 4, fontWeight: 700 };
const backdropStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalStyle = { width: "min(720px, calc(100% - 24px))", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.22)", overflow: "hidden" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" };
const xStyle = { border: "1px solid #e5e7eb", background: "#fff", color: "#111827", borderRadius: 10, width: 36, height: 36, cursor: "pointer" };

function fmtDateTime(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "—" : `${dt.toLocaleDateString()} ${dt.toLocaleTimeString()}`;
}
