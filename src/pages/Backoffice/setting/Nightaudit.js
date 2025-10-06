// src/pages/Backoffice/setting/NightAuditSetting.js
import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { BackofficeSidebar } from "../../../components/sidebar/backofficesidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

const getPropCode = () => (localStorage.getItem("currentPropertyCode") || "").toUpperCase();

export default function NightAuditSetting() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // existing doc id if present (for PATCH)
  const [docId, setDocId] = useState(null);

  // fields
  const [isActive, setIsActive] = useState(true);
  const [auditTime, setAuditTime] = useState("03:00"); // 24h HH:mm
  const [lockAfterAudit, setLockAfterAudit] = useState(true);
  const [allowBackdateDays, setAllowBackdateDays] = useState(0);
  const [autoCloseDay, setAutoCloseDay] = useState(true);
  const [carryForwardNoShows, setCarryForwardNoShows] = useState(true);
  const [defaultCheckInTime, setDefaultCheckInTime] = useState("12:00");
  const [defaultCheckOutTime, setDefaultCheckOutTime] = useState("10:00");
  const [sendSummaryEmail, setSendSummaryEmail] = useState(false);
  const [summaryEmailTo, setSummaryEmailTo] = useState("");

  // load setting for current property
  const load = async () => {
    setLoading(true);
    setErr(""); setOk("");
    try {
      const params = new URLSearchParams({
        propertyCode: getPropCode(),
        page: 1,
        limit: 1,
      });
      const res = await apiFetch(`/api/night-audit-settings?${params.toString()}`, { auth: true });
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      const first = list[0];

      if (first) {
        setDocId(first._id || first.id || null);
        setIsActive(!!first.isActive);
        setAuditTime(first.auditTime || "03:00");
        setLockAfterAudit(!!first.lockAfterAudit);
        setAllowBackdateDays(Number(first.allowBackdateDays || 0));
        setAutoCloseDay(!!first.autoCloseDay);
        setCarryForwardNoShows(!!first.carryForwardNoShows);
        setDefaultCheckInTime(first.defaultCheckInTime || "12:00");
        setDefaultCheckOutTime(first.defaultCheckOutTime || "10:00");
        setSendSummaryEmail(!!first.sendSummaryEmail);
        setSummaryEmailTo(first.summaryEmailTo || "");
      } else {
        // keep defaults for a fresh create
        setDocId(null);
      }
    } catch (e) {
      setErr(e?.message || "Failed to load Night Audit Setting.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // if your app dispatches property:changed events, reload on change
    const onPropChange = () => load();
    window.addEventListener("property:changed", onPropChange);
    return () => window.removeEventListener("property:changed", onPropChange);
  }, []);

  const onSave = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");

    const payload = {
      propertyCode: getPropCode(),
      isActive,
      auditTime,
      lockAfterAudit,
      allowBackdateDays: Number(allowBackdateDays || 0),
      autoCloseDay,
      carryForwardNoShows,
      defaultCheckInTime,
      defaultCheckOutTime,
      sendSummaryEmail,
      summaryEmailTo: String(summaryEmailTo || "").trim(),
    };

    try {
      let saved;
      if (docId) {
        saved = await apiFetch(`/api/night-audit-settings/${docId}`, {
          method: "PATCH", auth: true, body: JSON.stringify(payload),
        });
      } else {
        saved = await apiFetch(`/api/night-audit-settings`, {
          method: "POST", auth: true, body: JSON.stringify(payload),
        });
      }
      setOk("Saved.");
      // ensure we track id after first create
      setDocId(saved?._id || saved?.id || docId);
    } catch (e2) {
      setErr(e2?.message || "Failed to save Night Audit Setting.");
    }
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <BackofficeSidebar />

      <div className="res-wrap">
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Night Audit Setting</h2>
          <div className="small" style={{ color: "var(--muted)" }}>
            Property: {getPropCode() || "—"}
          </div>
        </div>

        <div className="panel">
          <div className="panel-h">
            <span>Configure Night Audit</span>
            <span className="small" style={{ color: "var(--muted)" }}>
              {loading ? "Loading…" : docId ? "Editing existing setting" : "New setting"}
            </span>
          </div>

          <div className="panel-b">
            {err && <Banner type="err">{err}</Banner>}
            {ok && <Banner type="ok">{ok}</Banner>}

            <form onSubmit={onSave} style={{ display: "grid", gap: 16 }}>
              <Row>
                <Field label="Active">
                  <Toggle checked={isActive} onChange={setIsActive} />
                </Field>

                <Field label="Audit Time (24h)">
                  <input
                    className="input" type="time"
                    value={auditTime} onChange={e => setAuditTime(e.target.value)}
                  />
                </Field>

                <Field label="Lock After Audit">
                  <Toggle checked={lockAfterAudit} onChange={setLockAfterAudit} />
                </Field>
              </Row>

              <Row>
                <Field label="Allow Backdate (days)">
                  <input
                    className="input" type="number" min="0" max="30"
                    value={allowBackdateDays}
                    onChange={e => setAllowBackdateDays(e.target.value)}
                  />
                </Field>

                <Field label="Auto Close Day">
                  <Toggle checked={autoCloseDay} onChange={setAutoCloseDay} />
                </Field>

                <Field label="Carry Forward No-Shows">
                  <Toggle checked={carryForwardNoShows} onChange={setCarryForwardNoShows} />
                </Field>
              </Row>

              <Row>
                <Field label="Default Check-in Time">
                  <input
                    className="input" type="time"
                    value={defaultCheckInTime}
                    onChange={e => setDefaultCheckInTime(e.target.value)}
                  />
                </Field>

                <Field label="Default Check-out Time">
                  <input
                    className="input" type="time"
                    value={defaultCheckOutTime}
                    onChange={e => setDefaultCheckOutTime(e.target.value)}
                  />
                </Field>

                <Field label="Send Summary Email">
                  <Toggle checked={sendSummaryEmail} onChange={setSendSummaryEmail} />
                </Field>
              </Row>

              <Row>
                <Field label="Summary Email To (comma separated)">
                  <input
                    className="input" placeholder="ops@hotel.com, gm@hotel.com"
                    value={summaryEmailTo}
                    onChange={e => setSummaryEmailTo(e.target.value)}
                  />
                </Field>
              </Row>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button className="btn" type="submit" disabled={loading}>
                  {loading ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <Hints />
      </div>
    </div>
  );
}

/* ---------- Small UI bits (same pattern as others) ---------- */
function Row({ children }) {
  return (
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(160px, 1fr))" }}>
      {children}
    </div>
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
function Toggle({ checked, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} />
      <span>{checked ? "Yes" : "No"}</span>
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
function Hints() {
  return (
    <div className="panel" style={{ marginTop: 12 }}>
      <div className="panel-h">Hints</div>
      <div className="panel-b">
        <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
          <li><strong>Audit Time</strong> is when the business day rolls over (e.g. 03:00).</li>
          <li><strong>Lock After Audit</strong> prevents back-dated edits once the audit is posted.</li>
          <li><strong>Allow Backdate</strong> lets you edit a limited number of past days if needed.</li>
        </ul>
      </div>
    </div>
  );
}
