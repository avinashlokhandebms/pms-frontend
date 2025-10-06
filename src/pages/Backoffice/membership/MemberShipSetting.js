import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "../../../lib/api";
import { BackofficeSidebar } from "../../../components/sidebar/backofficesidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

const LS_PROPERTY = "currentPropertyCode";

export default function MemberShipSetting() {
  const [propertyCode, setPropertyCode] = useState(
    (localStorage.getItem(LS_PROPERTY) || "").toUpperCase()
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // the single settings doc (per property)
  const [doc, setDoc] = useState(null);

  // Form fields
  const [enabled, setEnabled] = useState(true);
  const [enrollmentFee, setEnrollmentFee] = useState(0);
  const [renewalFee, setRenewalFee] = useState(0);
  const [defaultValidityDays, setDefaultValidityDays] = useState(365);
  const [defaultMaxVisits, setDefaultMaxVisits] = useState(0); // 0 = unlimited
  const [defaultTaxPct, setDefaultTaxPct] = useState(0);
  const [welcomeBonusPoints, setWelcomeBonusPoints] = useState(0);
  const [discountPctOnRoom, setDiscountPctOnRoom] = useState(0);
  const [discountPctOnFnb, setDiscountPctOnFnb] = useState(0);
  const [carryForwardUnusedVisits, setCarryForwardUnusedVisits] = useState(true);
  const [autoRenew, setAutoRenew] = useState(false);
  const [notes, setNotes] = useState("");

  const headerSubtitle = useMemo(
    () => (propertyCode ? `Property: ${propertyCode}` : "Global"),
    [propertyCode]
  );

  // Refresh property when someone switches it elsewhere
  useEffect(() => {
    const onPropChange = () => {
      const next = (localStorage.getItem(LS_PROPERTY) || "").toUpperCase();
      setPropertyCode(next);
    };
    window.addEventListener("property:changed", onPropChange);
    return () => window.removeEventListener("property:changed", onPropChange);
  }, []);

  // Load current setting
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setErr(""); setOk("");
      try {
        const params = new URLSearchParams();
        if (propertyCode) params.set("propertyCode", propertyCode);
        const res = await apiFetch(`/api/membership-settings?${params.toString()}`, { auth: true });
        // backend may return object directly or {data: {...}}
        const data = res?.data ?? res ?? null;

        if (!ignore) {
          setDoc(data);
          if (data) {
            setEnabled(!!data.enabled);
            setEnrollmentFee(Number(data.enrollmentFee ?? 0));
            setRenewalFee(Number(data.renewalFee ?? 0));
            setDefaultValidityDays(Number(data.defaultValidityDays ?? 365));
            setDefaultMaxVisits(Number(data.defaultMaxVisits ?? 0));
            setDefaultTaxPct(Number(data.defaultTaxPct ?? 0));
            setWelcomeBonusPoints(Number(data.welcomeBonusPoints ?? 0));
            setDiscountPctOnRoom(Number(data.discountPctOnRoom ?? 0));
            setDiscountPctOnFnb(Number(data.discountPctOnFnb ?? 0));
            setCarryForwardUnusedVisits(!!data.carryForwardUnusedVisits);
            setAutoRenew(!!data.autoRenew);
            setNotes(String(data.notes ?? ""));
          } else {
            // reset to defaults if no doc yet
            setEnabled(true);
            setEnrollmentFee(0);
            setRenewalFee(0);
            setDefaultValidityDays(365);
            setDefaultMaxVisits(0);
            setDefaultTaxPct(0);
            setWelcomeBonusPoints(0);
            setDiscountPctOnRoom(0);
            setDiscountPctOnFnb(0);
            setCarryForwardUnusedVisits(true);
            setAutoRenew(false);
            setNotes("");
          }
        }
      } catch (e) {
        if (!ignore) setErr(e?.message || "Failed to load membership settings.");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [propertyCode]);

  const onSave = async (e) => {
    e?.preventDefault?.();
    setErr(""); setOk("");
    setSaving(true);
    try {
      const payload = {
        enabled: !!enabled,
        enrollmentFee: Number(enrollmentFee || 0),
        renewalFee: Number(renewalFee || 0),
        defaultValidityDays: Number(defaultValidityDays || 0),
        defaultMaxVisits: Number(defaultMaxVisits || 0),
        defaultTaxPct: Number(defaultTaxPct || 0),
        welcomeBonusPoints: Number(welcomeBonusPoints || 0),
        discountPctOnRoom: Number(discountPctOnRoom || 0),
        discountPctOnFnb: Number(discountPctOnFnb || 0),
        carryForwardUnusedVisits: !!carryForwardUnusedVisits,
        autoRenew: !!autoRenew,
        notes: String(notes || "").trim(),
        propertyCode: (propertyCode || "").toUpperCase(),
      };

      let saved;
      if (doc?._id || doc?.id) {
        const id = doc._id || doc.id;
        saved = await apiFetch(`/api/membership-settings/${id}`, {
          method: "PATCH", auth: true, body: JSON.stringify(payload),
        });
      } else {
        saved = await apiFetch(`/api/membership-settings`, {
          method: "POST", auth: true, body: JSON.stringify(payload),
        });
      }

      setDoc(saved?.data ?? saved ?? null);
      setOk("Settings saved.");
    } catch (e2) {
      setErr(e2?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <BackofficeSidebar />
      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <div>
            <h2 style={{ margin: 0 }}>MemberShip Setting</h2>
            <div className="small" style={{ color: "var(--muted)" }}>{headerSubtitle}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={() => setPropertyCode((localStorage.getItem(LS_PROPERTY) || "").toUpperCase())}>
              Refresh
            </button>
            <button className="btn" onClick={onSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="panel">
          <div className="panel-h">Configuration</div>
          <div className="panel-b" style={{ display: "grid", gap: 12 }}>
            {loading && <Banner>Loading…</Banner>}
            {err && <Banner type="err">{err}</Banner>}
            {ok && <Banner type="ok">{ok}</Banner>}

            <form onSubmit={onSave} style={{ display: "grid", gap: 16 }}>
              {/* Row 1 */}
              <Row>
                <Field label="Enabled">
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
                    <span>{enabled ? "Yes" : "No"}</span>
                  </label>
                </Field>
                <Field label="Enrollment Fee">
                  <input className="input" type="number" min="0" step="0.01"
                         value={enrollmentFee} onChange={e => setEnrollmentFee(e.target.value)} />
                </Field>
                <Field label="Renewal Fee">
                  <input className="input" type="number" min="0" step="0.01"
                         value={renewalFee} onChange={e => setRenewalFee(e.target.value)} />
                </Field>
              </Row>

              {/* Row 2 */}
              <Row>
                <Field label="Default Validity (days)">
                  <input className="input" type="number" min="0" step="1"
                         value={defaultValidityDays} onChange={e => setDefaultValidityDays(e.target.value)} />
                </Field>
                <Field label="Default Max Visits (0 = unlimited)">
                  <input className="input" type="number" min="0" step="1"
                         value={defaultMaxVisits} onChange={e => setDefaultMaxVisits(e.target.value)} />
                </Field>
                <Field label="Default Tax %">
                  <input className="input" type="number" min="0" step="0.01"
                         value={defaultTaxPct} onChange={e => setDefaultTaxPct(e.target.value)} />
                </Field>
              </Row>

              {/* Row 3 */}
              <Row>
                <Field label="Welcome Bonus Points">
                  <input className="input" type="number" min="0" step="1"
                         value={welcomeBonusPoints} onChange={e => setWelcomeBonusPoints(e.target.value)} />
                </Field>
                <Field label="Discount % on Room">
                  <input className="input" type="number" min="0" step="0.1"
                         value={discountPctOnRoom} onChange={e => setDiscountPctOnRoom(e.target.value)} />
                </Field>
                <Field label="Discount % on F&B">
                  <input className="input" type="number" min="0" step="0.1"
                         value={discountPctOnFnb} onChange={e => setDiscountPctOnFnb(e.target.value)} />
                </Field>
              </Row>

              {/* Row 4 */}
              <Row>
                <Field label="Carry Forward Unused Visits">
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" checked={carryForwardUnusedVisits}
                           onChange={e => setCarryForwardUnusedVisits(e.target.checked)} />
                    <span>{carryForwardUnusedVisits ? "Yes" : "No"}</span>
                  </label>
                </Field>
                <Field label="Auto Renew">
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" checked={autoRenew}
                           onChange={e => setAutoRenew(e.target.checked)} />
                    <span>{autoRenew ? "Yes" : "No"}</span>
                  </label>
                </Field>
                <div />
              </Row>

              {/* Row 5 */}
              <RowSingle>
                <Field label="Notes">
                  <textarea className="input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
                </Field>
              </RowSingle>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn" onClick={() => window.history.back()}>Cancel</button>
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? "Saving…" : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Meta */}
        {doc && (
          <div className="panel" style={{ marginTop: 10 }}>
            <div className="panel-h">Meta</div>
            <div className="panel-b small" style={{ color: "var(--muted)" }}>
              <div>Created: {fmtDate(doc.createdAt)} &nbsp; | &nbsp; Updated: {fmtDate(doc.updatedAt)}</div>
              <div>ID: <code>{doc._id || doc.id}</code></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- tiny UI helpers ---------- */
function Row({ children }) {
  return (
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(160px, 1fr))" }}>
      {children}
    </div>
  );
}
function RowSingle({ children }) {
  return <div style={{ display: "grid", gap: 12 }}>{children}</div>;
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
  const style =
    type === "err"
      ? { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }
      : { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
  return (
    <div style={{ ...style, padding: "8px 10px", borderRadius: 10, fontWeight: 700 }}>
      {children}
    </div>
  );
}
function fmtDate(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(dt) ? "—" : dt.toLocaleDateString(); }
