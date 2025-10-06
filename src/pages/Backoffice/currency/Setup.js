import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { BackofficeSidebar } from "../../../components/sidebar/backofficesidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

const LS_KEY = "currentPropertyCode";

export default function CurrencySetup() {
  const propertyCode = (localStorage.getItem(LS_KEY) || "").toUpperCase();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // one settings record per property
  const [docId, setDocId] = useState(null);
  const [baseCurrency, setBaseCurrency] = useState("INR");
  const [currencySymbol, setCurrencySymbol] = useState("₹");
  const [thousandSep, setThousandSep] = useState(",");
  const [decimalSep, setDecimalSep] = useState(".");
  const [decimalPlaces, setDecimalPlaces] = useState(2);
  const [rounding, setRounding] = useState("NONE"); // NONE, HALF_UP, UP, DOWN
  const [symbolBefore, setSymbolBefore] = useState(true);
  const [spaceBetween, setSpaceBetween] = useState(false);

  const [enableAutoFX, setEnableAutoFX] = useState(false);
  const [fxProvider, setFxProvider] = useState("MANUAL"); // MANUAL, ECB, FIXER, CURRENCYAPI
  const [fxRefreshHours, setFxRefreshHours] = useState(24);
  const [isActive, setIsActive] = useState(true);

  // load existing
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true); setErr(""); setOk("");
      try {
        const params = new URLSearchParams({ propertyCode });
        const res = await apiFetch(`/api/currency/setup?${params.toString()}`, { auth: true });
        const obj = res?.data || res || null;
        if (!ignore && obj && typeof obj === "object") {
          setDocId(obj._id || obj.id || null);
          setBaseCurrency(obj.baseCurrency || "INR");
          setCurrencySymbol(obj.currencySymbol ?? (obj.baseCurrency === "USD" ? "$" : "₹"));
          setThousandSep(obj.thousandSep || ",");
          setDecimalSep(obj.decimalSep || ".");
          setDecimalPlaces(toIntInRange(obj.decimalPlaces, 0, 4, 2));
          setRounding(obj.rounding || "NONE");
          setSymbolBefore(!!obj.symbolBefore);
          setSpaceBetween(!!obj.spaceBetween);
          setEnableAutoFX(!!obj.enableAutoFX);
          setFxProvider(obj.fxProvider || "MANUAL");
          setFxRefreshHours(toIntInRange(obj.fxRefreshHours, 1, 168, 24));
          setIsActive(obj.isActive !== false);
        } else if (!ignore) {
          // defaults already set
          setDocId(null);
        }
      } catch (e) {
        if (!ignore) setErr(e?.message || "Failed to load currency setup.");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [propertyCode]);

  const preview = useMemo(() => {
    const n = 1234567.89;
    const rounded = roundNumber(n, decimalPlaces, rounding);
    const parts = rounded.toFixed(decimalPlaces).split(".");
    let int = parts[0];
    let frac = parts[1] || "";
    int = groupThousands(int, thousandSep);
    const joined = decimalPlaces > 0 ? `${int}${decimalSep}${frac}` : int;
    const sym = currencySymbol || "";
    const sp = spaceBetween ? " " : "";
    return symbolBefore ? `${sym}${sp}${joined}` : `${joined}${sp}${sym}`;
  }, [currencySymbol, symbolBefore, spaceBetween, thousandSep, decimalSep, decimalPlaces, rounding]);

  const onSave = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");
    if (!baseCurrency.trim()) return setErr("Base currency is required.");

    const payload = {
      baseCurrency: baseCurrency.trim().toUpperCase(),
      currencySymbol: currencySymbol || "",
      thousandSep: thousandSep || ",",
      decimalSep: decimalSep || ".",
      decimalPlaces: toIntInRange(decimalPlaces, 0, 4, 2),
      rounding,
      symbolBefore: !!symbolBefore,
      spaceBetween: !!spaceBetween,
      enableAutoFX: !!enableAutoFX,
      fxProvider,
      fxRefreshHours: toIntInRange(fxRefreshHours, 1, 168, 24),
      isActive: !!isActive,
      propertyCode,
    };

    setSaving(true);
    try {
      let saved;
      if (docId) {
        saved = await apiFetch(`/api/currency/setup/${docId}`, {
          method: "PATCH", auth: true, body: JSON.stringify(payload),
        });
      } else {
        saved = await apiFetch(`/api/currency/setup`, {
          method: "POST", auth: true, body: JSON.stringify(payload),
        });
      }
      setDocId(saved?._id || saved?.id || docId);
      setOk("Saved.");
    } catch (e2) {
      setErr(e2?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <BackofficeSidebar />

      <div className="res-wrap">
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Currency — Setup</h2>
          <div className="small" style={{ color: "var(--muted)" }}>
            {propertyCode ? `Property: ${propertyCode}` : "Global"}
          </div>
        </div>

        <div className="panel">
          <div className="panel-h">Format & Display</div>
          <div className="panel-b">
            {err && <Banner type="err">{err}</Banner>}
            {ok && <Banner type="ok">{ok}</Banner>}

            <form onSubmit={onSave} style={{ display: "grid", gap: 12 }}>
              <Row>
                <Field label="Base Currency" required>
                  <input className="input" value={baseCurrency} onChange={(e) => setBaseCurrency(e.target.value)} placeholder="e.g. INR / USD / EUR" />
                </Field>
                <Field label="Currency Symbol">
                  <input className="input" value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)} placeholder="e.g. ₹ / $ / €" />
                </Field>
                <Field label="Symbol Position">
                  <label className="small" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" checked={symbolBefore} onChange={(e) => setSymbolBefore(e.target.checked)} />
                    Before amount
                  </label>
                </Field>
              </Row>

              <Row>
                <Field label="Thousand Separator">
                  <select className="res-select" value={thousandSep} onChange={(e) => setThousandSep(e.target.value)}>
                    <option value=",">Comma (,)</option>
                    <option value=".">Dot (.)</option>
                    <option value=" ">Space ( )</option>
                    <option value="">None</option>
                  </select>
                </Field>
                <Field label="Decimal Separator">
                  <select className="res-select" value={decimalSep} onChange={(e) => setDecimalSep(e.target.value)}>
                    <option value=".">Dot (.)</option>
                    <option value=",">Comma (,)</option>
                  </select>
                </Field>
                <Field label="Decimal Places">
                  <input className="input" type="number" min="0" max="4" value={decimalPlaces} onChange={(e) => setDecimalPlaces(toIntInRange(e.target.value, 0, 4, 2))} />
                </Field>
              </Row>

              <Row>
                <Field label="Rounding">
                  <select className="res-select" value={rounding} onChange={(e) => setRounding(e.target.value)}>
                    <option value="NONE">None</option>
                    <option value="HALF_UP">Round Half Up</option>
                    <option value="UP">Round Up</option>
                    <option value="DOWN">Round Down</option>
                  </select>
                </Field>
                <Field label="Spacing">
                  <label className="small" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" checked={spaceBetween} onChange={(e) => setSpaceBetween(e.target.checked)} />
                    Space between symbol & amount
                  </label>
                </Field>
                <Field label="Active">
                  <label className="small" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                    {isActive ? "Yes" : "No"}
                  </label>
                </Field>
              </Row>

              <div className="panel" style={{ marginTop: 8 }}>
                <div className="panel-h">Exchange Rates</div>
                <div className="panel-b" style={{ display: "grid", gap: 12 }}>
                  <Row>
                    <Field label="Enable Auto FX">
                      <label className="small" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="checkbox" checked={enableAutoFX} onChange={(e) => setEnableAutoFX(e.target.checked)} />
                        Automatically fetch exchange rates
                      </label>
                    </Field>
                    <Field label="Provider">
                      <select className="res-select" value={fxProvider} onChange={(e) => setFxProvider(e.target.value)} disabled={!enableAutoFX}>
                        <option value="MANUAL">MANUAL</option>
                        <option value="ECB">ECB</option>
                        <option value="FIXER">FIXER</option>
                        <option value="CURRENCYAPI">CURRENCYAPI</option>
                      </select>
                    </Field>
                    <Field label="Refresh (hours)">
                      <input className="input" type="number" min="1" max="168" value={fxRefreshHours} onChange={(e) => setFxRefreshHours(toIntInRange(e.target.value, 1, 168, 24))} disabled={!enableAutoFX} />
                    </Field>
                  </Row>
                </div>
              </div>

              <div className="panel" style={{ marginTop: 8 }}>
                <div className="panel-h">Preview</div>
                <div className="panel-b">
                  <div className="small" style={{ color: "var(--muted)" }}>
                    Example for <code>1,234,567.89</code>
                  </div>
                  <div style={{
                    fontWeight: 800, fontSize: "1.1rem",
                    marginTop: 6, padding: "8px 10px", borderRadius: 10,
                    border: "1px solid #e5e7eb", background: "#f9fafb"
                  }}>
                    {preview}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn" type="submit" disabled={saving || loading}>
                  {saving ? "Saving…" : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------ tiny UI helpers ------------ */
function Row({ children }) {
  return (
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(160px, 1fr))" }}>
      {children}
    </div>
  );
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
  return (
    <div style={{ ...style, padding: "8px 10px", borderRadius: 10, fontWeight: 700, marginBottom: 10 }}>
      {children}
    </div>
  );
}

/* ------------ number helpers ------------ */
function toIntInRange(v, min, max, def) {
  const n = Number(v);
  if (Number.isNaN(n)) return def;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}
function groupThousands(intStr, sep) {
  if (!sep) return intStr;
  // standard 3-digit grouping
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}
function roundNumber(n, dp, mode) {
  const f = Math.pow(10, dp);
  if (mode === "UP") return Math.ceil(n * f) / f;
  if (mode === "DOWN") return Math.floor(n * f) / f;
  if (mode === "HALF_UP") return Math.round(n * f) / f;
  return Number(n.toFixed(dp)); // NONE
}
