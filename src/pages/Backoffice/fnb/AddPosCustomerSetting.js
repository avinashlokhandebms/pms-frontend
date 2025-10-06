// src/pages/Backoffice/fnb/AddPosCustomerSetting.js
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { BackofficeSidebar } from "../../../components/sidebar/backofficesidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

/**
 * Add POS Customer Setting
 * - Single settings document (optionally scoped by propertyCode)
 * - Loads current settings and lets you update them
 *
 * Expected API (adjust if your backend differs):
 *   GET  /api/pos-customer-settings?propertyCode=ABC -> { ...settings } or 404/empty
 *   POST /api/pos-customer-settings  (to create new)
 *   PATCH /api/pos-customer-settings/:id (to update)
 */

const LS_PROP_KEY = "currentPropertyCode";

export default function AddPosCustomerSetting() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // property scope (optional)
  const [propertyCode, setPropertyCode] = useState(
    localStorage.getItem(LS_PROP_KEY) || ""
  );

  // backing doc (to know if we POST or PATCH)
  const [docId, setDocId] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  // fields
  const [autoCreateCustomer, setAutoCreateCustomer] = useState(true);
  const [requirePhone, setRequirePhone] = useState(true);
  const [requireEmail, setRequireEmail] = useState(false);
  const [duplicateCheckBy, setDuplicateCheckBy] = useState("PHONE"); // PHONE | EMAIL | BOTH | NONE
  const [defaultGroup, setDefaultGroup] = useState("WALKIN");
  const [capitalizeName, setCapitalizeName] = useState(true);
  const [welcomeSms, setWelcomeSms] = useState(false);
  const [welcomeEmail, setWelcomeEmail] = useState(false);
  const [tags, setTags] = useState(["POS", "WALKIN"]);
  const [notes, setNotes] = useState("");

  // Load settings
  useEffect(() => {
    let ignore = false;
    (async () => {
      setErr(""); setOk(""); setLoading(true);
      try {
        const params = new URLSearchParams();
        if (propertyCode) params.set("propertyCode", propertyCode.trim().toUpperCase());
        const res = await apiFetch(`/api/pos-customer-settings?${params}`, { auth: true });

        const data = res || {}; // assume backend returns an object or 404 handled upstream
        if (!ignore && data && Object.keys(data).length) {
          bindFromDoc(data);
          setDocId(data._id || data.id || null);
          setUpdatedAt(data.updatedAt || null);
        } else if (!ignore) {
          // no existing doc — apply defaults
          setDocId(null);
          setUpdatedAt(null);
          applyDefaults();
        }
      } catch (e) {
        if (!ignore) {
          // 404 -> defaults
          applyDefaults();
          setDocId(null);
          setUpdatedAt(null);
          setErr(e?.message || "Failed to load POS customer settings.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyCode]);

  function applyDefaults() {
    setAutoCreateCustomer(true);
    setRequirePhone(true);
    setRequireEmail(false);
    setDuplicateCheckBy("PHONE");
    setDefaultGroup("WALKIN");
    setCapitalizeName(true);
    setWelcomeSms(false);
    setWelcomeEmail(false);
    setTags(["POS", "WALKIN"]);
    setNotes("");
  }

  function bindFromDoc(d) {
    setAutoCreateCustomer(!!d.autoCreateCustomer);
    setRequirePhone(!!d.requirePhone);
    setRequireEmail(!!d.requireEmail);
    setDuplicateCheckBy(d.duplicateCheckBy || "PHONE");
    setDefaultGroup(d.defaultGroup || "WALKIN");
    setCapitalizeName(!!d.capitalizeName);
    setWelcomeSms(!!d.welcomeSms);
    setWelcomeEmail(!!d.welcomeEmail);
    setTags(Array.isArray(d.tags) ? d.tags : []);
    setNotes(d.notes || "");
  }

  const dedupeHint = useMemo(() => {
    switch (duplicateCheckBy) {
      case "PHONE": return "Duplicates matched by phone number.";
      case "EMAIL": return "Duplicates matched by email.";
      case "BOTH":  return "Duplicates matched when both phone AND email match.";
      default:      return "Duplicate check disabled.";
    }
  }, [duplicateCheckBy]);

  const onSave = async () => {
    setErr(""); setOk("");
    // simple validations
    if (!propertyCode.trim()) return setErr("Property code is required.");
    if (requirePhone === false && duplicateCheckBy === "PHONE") {
      return setErr("Cannot dedupe by PHONE when 'Require Phone' is disabled.");
    }
    if (requireEmail === false && duplicateCheckBy === "EMAIL") {
      return setErr("Cannot dedupe by EMAIL when 'Require Email' is disabled.");
    }

    const payload = {
      propertyCode: propertyCode.trim().toUpperCase(),
      autoCreateCustomer,
      requirePhone,
      requireEmail,
      duplicateCheckBy,
      defaultGroup: defaultGroup.trim().toUpperCase(),
      capitalizeName,
      welcomeSms,
      welcomeEmail,
      tags: (tags || []).map(t => String(t).trim()).filter(Boolean),
      notes: String(notes || "").trim(),
    };

    setLoading(true);
    try {
      let saved;
      if (docId) {
        saved = await apiFetch(`/api/pos-customer-settings/${docId}`, {
          method: "PATCH", auth: true, body: JSON.stringify(payload),
        });
      } else {
        saved = await apiFetch("/api/pos-customer-settings", {
          method: "POST", auth: true, body: JSON.stringify(payload),
        });
      }
      setOk("Saved.");
      setDocId(saved?._id || saved?.id || docId);
      setUpdatedAt(saved?.updatedAt || new Date().toISOString());
    } catch (e) {
      setErr(e?.message || "Failed to save settings.");
    } finally {
      setLoading(false);
      setTimeout(() => setOk(""), 1200);
    }
  };

  const onReset = () => {
    applyDefaults();
    setOk("Reset to defaults.");
    setTimeout(() => setOk(""), 1000);
  };

  const onTagsInput = (val) => {
    // comma or newline separated
    const arr = String(val || "")
      .split(/[,\n]/)
      .map(s => s.trim())
      .filter(Boolean);
    setTags(arr);
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <BackofficeSidebar />

      <div className="res-wrap">
        <div className="res-topbar">
          <h2 style={{ margin: 0 }}>Add POS Customer Setting</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="res-select"
              placeholder="Property Code (e.g. TREDGE01)"
              value={propertyCode}
              onChange={(e) => {
                const up = e.target.value.toUpperCase();
                setPropertyCode(up);
                localStorage.setItem(LS_PROP_KEY, up);
              }}
              style={{ minWidth: 220, textTransform: "uppercase" }}
            />
            <button className="btn" onClick={() => setPropertyCode((p) => p.trim())}>Load</button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-h">
            <span>Settings</span>
            <span className="small" style={{ color: "var(--muted)" }}>
              {updatedAt ? `Last updated: ${fmtDateTime(updatedAt)}` : "—"}
            </span>
          </div>

          <div className="panel-b" style={{ display: "grid", gap: 14 }}>
            {err && <Banner type="err">{err}</Banner>}
            {ok && <Banner type="ok">{ok}</Banner>}

            <Row>
              <Field label="Auto-create Customer">
                <Toggle value={autoCreateCustomer} onChange={setAutoCreateCustomer} />
              </Field>
              <Field label="Require Phone">
                <Toggle value={requirePhone} onChange={setRequirePhone} />
              </Field>
              <Field label="Require Email">
                <Toggle value={requireEmail} onChange={setRequireEmail} />
              </Field>
            </Row>

            <Row>
              <Field label="Duplicate Check By">
                <select
                  className="res-select"
                  value={duplicateCheckBy}
                  onChange={(e) => setDuplicateCheckBy(e.target.value)}
                >
                  <option value="PHONE">PHONE</option>
                  <option value="EMAIL">EMAIL</option>
                  <option value="BOTH">BOTH</option>
                  <option value="NONE">NONE</option>
                </select>
                <div className="small" style={{ color: "var(--muted)" }}>{dedupeHint}</div>
              </Field>

              <Field label="Default Group">
                <input
                  className="input"
                  placeholder="e.g. WALKIN"
                  value={defaultGroup}
                  onChange={(e) => setDefaultGroup(e.target.value)}
                />
                <div className="small" style={{ color: "var(--muted)" }}>
                  Used when auto-creating customers.
                </div>
              </Field>

              <Field label="Capitalize Name">
                <Toggle value={capitalizeName} onChange={setCapitalizeName} />
              </Field>
            </Row>

            <Row>
              <Field label="Welcome SMS">
                <Toggle value={welcomeSms} onChange={setWelcomeSms} />
              </Field>
              <Field label="Welcome Email">
                <Toggle value={welcomeEmail} onChange={setWelcomeEmail} />
              </Field>
              <Field label="Tags">
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Comma or newline separated (e.g. POS, WALKIN)"
                  value={tags.join(", ")}
                  onChange={(e) => onTagsInput(e.target.value)}
                />
              </Field>
            </Row>

            <Row>
              <Field label="Notes">
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Internal notes about POS customer creation rules…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>
            </Row>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
              <button className="btn" type="button" onClick={onReset} disabled={loading}>Reset Defaults</button>
              <button className="btn" type="button" onClick={onSave} disabled={loading}>
                {loading ? "Saving…" : (docId ? "Update" : "Create")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ——— Small UI helpers ——— */
function Row({ children }) {
  return (
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(220px, 1fr))" }}>
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
function Toggle({ value, onChange }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
      <span>{value ? "Yes" : "No"}</span>
    </label>
  );
}
function Banner({ type = "ok", children }) {
  const style = type === "err"
    ? { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }
    : { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
  return (
    <div style={{ ...style, padding: "8px 10px", borderRadius: 10, fontWeight: 700 }}>
      {children}
    </div>
  );
}
function fmtDateTime(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt)) return "—";
  return dt.toLocaleString();
}
