// src/pages/pos/OrderEntry.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import PosSidebar from "../../components/sidebar/Possidebar";
import "../../components/sidebar/Sidebar.css";
import "../../assets/css/commanPage.css";

export default function OrderEntry() {
  // filters
  const [q, setQ] = useState("");
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState("");
  // items
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [err, setErr] = useState("");

  // cart
  const [cart, setCart] = useState([]); // [{id, name, rate, qty}]
  const [discPct, setDiscPct] = useState(0);
  const [taxPct, setTaxPct] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  /* ---------- load categories (once) ---------- */
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        // Try FNB categories (adjust if your API differs)
        const res = await apiFetch("/api/fnb/categories?active=1", { auth: true });
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        if (!ignore) setCategories(list);
      } catch {
        // Fallback: minimal default
        if (!ignore) {
          setCategories([
            { _id: "all", name: "All" },
            { _id: "drinks", name: "Drinks" },
            { _id: "snacks", name: "Snacks" },
            { _id: "mains", name: "Mains" },
          ]);
        }
      }
    })();
    return () => { ignore = true; };
  }, []);

  /* ---------- load items on filters ---------- */
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoadingItems(true);
      setErr("");
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (activeCat && activeCat !== "all") params.set("category", activeCat);
        params.set("active", "1");

        // Try FNB items (adjust if your API differs)
        const res = await apiFetch(`/api/fnb/items?${params.toString()}`, { auth: true });
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

        if (!ignore) setItems(list);
      } catch (e) {
        if (!ignore) {
          setErr(e?.message || "Failed to load items.");
          // Tiny demo fallback
          setItems([
            { _id: "i1", name: "Cappuccino", rate: 160, category: "drinks" },
            { _id: "i2", name: "Cold Coffee", rate: 140, category: "drinks" },
            { _id: "i3", name: "French Fries", rate: 120, category: "snacks" },
            { _id: "i4", name: "Grilled Sandwich", rate: 180, category: "snacks" },
            { _id: "i5", name: "Pasta Arrabiata", rate: 260, category: "mains" },
          ]);
        }
      } finally {
        if (!ignore) setLoadingItems(false);
      }
    })();
    return () => { ignore = true; };
  }, [q, activeCat]);

  /* ---------- cart helpers ---------- */
  const addToCart = (it) => {
    setCart((prev) => {
      const id = it._id || it.id;
      const idx = prev.findIndex((p) => p.id === id);
      if (idx >= 0) {
        const next = prev.slice();
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { id, name: it.name, rate: Number(it.rate || 0), qty: 1 }];
    });
  };
  const inc = (id) => setCart((prev) => prev.map((r) => (r.id === id ? { ...r, qty: r.qty + 1 } : r)));
  const dec = (id) =>
    setCart((prev) =>
      prev
        .map((r) => (r.id === id ? { ...r, qty: Math.max(0, r.qty - 1) } : r))
        .filter((r) => r.qty > 0)
    );
  const rm = (id) => setCart((prev) => prev.filter((r) => r.id !== id));
  const clearCart = () => { setCart([]); setDiscPct(0); setTaxPct(0); setNote(""); };

  /* ---------- totals ---------- */
  const subTotal = useMemo(
    () => cart.reduce((s, r) => s + Number(r.rate || 0) * Number(r.qty || 0), 0),
    [cart]
  );
  const discountAmt = useMemo(() => (subTotal * Number(discPct || 0)) / 100, [subTotal, discPct]);
  const taxable = useMemo(() => Math.max(0, subTotal - discountAmt), [subTotal, discountAmt]);
  const taxAmt = useMemo(() => (taxable * Number(taxPct || 0)) / 100, [taxable, taxPct]);
  const grand = useMemo(() => Math.round(taxable + taxAmt), [taxable, taxAmt]);

  /* ---------- save / hold ---------- */
  const holdBill = async () => {
    if (cart.length === 0) return alert("Add items first.");
    setSaving(true);
    try {
      const payload = {
        status: "HELD",
        items: cart.map((r) => ({ itemId: r.id, name: r.name, qty: r.qty, rate: r.rate })),
        subTotal, discountPct: Number(discPct || 0), discountAmt, taxPct: Number(taxPct || 0), taxAmt,
        grandTotal: grand, note,
      };
      await apiFetch("/api/pos/orders", {
        method: "POST", auth: true, body: JSON.stringify(payload),
      });
      clearCart();
      alert("Bill held.");
    } catch (e) {
      alert(e?.message || "Failed to hold bill.");
    } finally { setSaving(false); }
  };

  const saveAndPrint = async () => {
    if (cart.length === 0) return alert("Add items first.");
    setSaving(true);
    try {
      const payload = {
        status: "CONFIRMED",
        items: cart.map((r) => ({ itemId: r.id, name: r.name, qty: r.qty, rate: r.rate })),
        subTotal, discountPct: Number(discPct || 0), discountAmt, taxPct: Number(taxPct || 0), taxAmt,
        grandTotal: grand, note,
      };
      const saved = await apiFetch("/api/pos/orders", {
        method: "POST", auth: true, body: JSON.stringify(payload),
      });
      // trigger print flow hook if you have one
      console.log("Saved order:", saved);
      clearCart();
      alert("Saved & sent to print.");
    } catch (e) {
      alert(e?.message || "Failed to save.");
    } finally { setSaving(false); }
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <PosSidebar />

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Order Entry</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="res-select"
              placeholder="Search items…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: 260 }}
            />
            <select
              className="res-select"
              value={activeCat}
              onChange={(e) => setActiveCat(e.target.value)}
              title="Category"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c._id || c.id} value={c._id || c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content: Items + Cart */}
        <div className="panel" style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 12 }}>
          {/* Items */}
          <div className="panel">
            <div className="panel-h">
              <span>Items</span>
              <span className="small" style={{ color: "var(--muted)" }}>
                {loadingItems ? "Loading…" : `${items.length} items`}
              </span>
            </div>
            <div className="panel-b">
              {err && <Banner type="err">{err}</Banner>}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: 10,
                }}
              >
                {items.map((it) => (
                  <button
                    key={it._id || it.id}
                    className="btn"
                    onClick={() => addToCart(it)}
                    style={{
                      height: 90,
                      textAlign: "left",
                      display: "grid",
                      alignContent: "space-between",
                      padding: "10px 12px",
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>{it.name}</div>
                    <div className="small" style={{ color: "var(--muted)" }}>
                      ₹ {Number(it.rate || 0).toFixed(2)}
                    </div>
                  </button>
                ))}

                {items.length === 0 && !loadingItems && (
                  <div className="small" style={{ color: "var(--muted)" }}>No items.</div>
                )}
              </div>
            </div>
          </div>

          {/* Cart */}
          <div className="panel">
            <div className="panel-h">
              <span>Cart</span>
              <button className="btn" onClick={clearCart}>Clear</button>
            </div>
            <div className="panel-b" style={{ display: "grid", gap: 10 }}>
              {/* Lines */}
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th style={{ width: 90, textAlign: "center" }}>Qty</th>
                      <th style={{ width: 80, textAlign: "right" }}>Rate</th>
                      <th style={{ width: 90, textAlign: "right" }}>Amount</th>
                      <th style={{ width: 40 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {cart.length === 0 && (
                      <tr className="no-rows"><td colSpan={5}>No items in cart</td></tr>
                    )}
                    {cart.map((r) => (
                      <tr key={r.id}>
                        <td>{r.name}</td>
                        <td style={{ textAlign: "center" }}>
                          <div style={{ display: "inline-flex", gap: 6 }}>
                            <button className="btn" style={btnSm} onClick={() => dec(r.id)}>-</button>
                            <div style={{ minWidth: 24, textAlign: "center" }}>{r.qty}</div>
                            <button className="btn" style={btnSm} onClick={() => inc(r.id)}>+</button>
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>{Number(r.rate).toFixed(2)}</td>
                        <td style={{ textAlign: "right" }}>{(r.rate * r.qty).toFixed(2)}</td>
                        <td>
                          <button className="btn" style={btnSm} onClick={() => rm(r.id)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Discount / Tax */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <label style={{ display: "grid", gap: 4 }}>
                  <span className="small" style={{ fontWeight: 700 }}>Discount %</span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.1"
                    value={discPct}
                    onChange={(e) => setDiscPct(Number(e.target.value || 0))}
                  />
                </label>
                <label style={{ display: "grid", gap: 4 }}>
                  <span className="small" style={{ fontWeight: 700 }}>Tax %</span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.1"
                    value={taxPct}
                    onChange={(e) => setTaxPct(Number(e.target.value || 0))}
                  />
                </label>
              </div>

              {/* Note */}
              <label style={{ display: "grid", gap: 4 }}>
                <span className="small" style={{ fontWeight: 700 }}>Note</span>
                <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
              </label>

              {/* Totals */}
              <div className="panel" style={{ padding: 10 }}>
                <div style={totalsRow}><span>Sub Total</span><b>₹ {subTotal.toFixed(2)}</b></div>
                <div style={totalsRow}><span>Discount</span><b>- ₹ {discountAmt.toFixed(2)}</b></div>
                <div style={totalsRow}><span>Tax</span><b>₹ {taxAmt.toFixed(2)}</b></div>
                <div style={{ ...totalsRow, borderTop: "1px dashed #e5e7eb", marginTop: 6, paddingTop: 6 }}>
                  <span style={{ fontSize: "1.05rem", fontWeight: 800 }}>Grand Total</span>
                  <span style={{ fontSize: "1.1rem", fontWeight: 900 }}>₹ {grand.toFixed(2)}</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn" disabled={saving || cart.length === 0} onClick={holdBill}>
                  {saving ? "Working…" : "Hold Bill"}
                </button>
                <button className="btn" disabled={saving || cart.length === 0} onClick={saveAndPrint}>
                  {saving ? "Working…" : "Save & Print"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- tiny UI atoms ---------- */
function Banner({ type = "ok", children }) {
  const style = type === "err"
    ? { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }
    : { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
  return (
    <div style={{ ...style, padding: "8px 10px", borderRadius: 10, fontWeight: 700, marginBottom: 10 }}>
      {children}
    </div>
  );
}

const btnSm = { padding: ".25rem .45rem", fontWeight: 700 };
const totalsRow = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 0" };
