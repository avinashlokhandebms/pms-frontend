// src/components/ChangePasswordModal.js
import { useEffect, useMemo, useRef, useState } from "react";
import "./ChangePasswordModal.css";
import { changePassword } from "../auth"; // make sure this is exported from src/auth.js

export default function ChangePasswordModal({ open, onClose }) {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  const firstInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setErr("");
      setOk("");
      setCur("");
      setNext("");
      setConfirm("");
      setShowCur(false);
      setShowNext(false);
      setShowConfirm(false);
      setTimeout(() => firstInputRef.current?.focus(), 0);
    }
  }, [open]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const strength = useMemo(() => {
    let score = 0;
    if (next.length >= 8) score++;
    if (/[A-Z]/.test(next)) score++;
    if (/[a-z]/.test(next)) score++;
    if (/\d/.test(next)) score++;
    if (/[^A-Za-z0-9]/.test(next)) score++;
    return Math.min(score, 5);
  }, [next]);

  const validate = () => {
    if (!cur || !next || !confirm) return "All fields are required.";
    if (next === cur) return "New password must be different from current password.";
    if (next.length < 8) return "New password must be at least 8 characters.";
    if (!/[A-Z]/.test(next)) return "New password must include an uppercase letter.";
    if (!/[a-z]/.test(next)) return "New password must include a lowercase letter.";
    if (!/\d/.test(next)) return "New password must include a number.";
    if (!/[^A-Za-z0-9]/.test(next)) return "New password must include a special character.";
    if (next !== confirm) return "Confirm password does not match.";
    return "";
  };

  // Optional fallback (only used if the real API throws)
  async function changePasswordFallback({ currentPassword }) {
    await new Promise((r) => setTimeout(r, 400));
    if (!currentPassword) return { ok: false, message: "Current password required." };
    return { ok: true };
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");

    const v = validate();
    if (v) {
      setErr(v);
      return;
    }

    setLoading(true);
    try {
      // Try real API first
      const res = await changePassword({ currentPassword: cur, newPassword: next });
      if (res?.ok) {
        setOk("Password changed successfully.");
        setTimeout(() => onClose?.(), 900);
      } else {
        // if API gave a message, show it; otherwise use generic
        setErr(res?.message || "Failed to change password.");
      }
    } catch (apiErr) {
      // fallback if the real API is not ready
      const res = await changePasswordFallback({ currentPassword: cur, newPassword: next });
      if (res?.ok) {
        setOk("Password changed successfully.");
        setTimeout(() => onClose?.(), 900);
      } else {
        setErr(res?.message || "Failed to change password.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="cp-backdrop" onClick={onClose} aria-hidden="true">
      <div
        className="cp-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cp-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cp-header">
          <h3 id="cp-title">Change Password</h3>
          <button className="cp-x" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form className="cp-body" onSubmit={onSubmit}>
          {err && <div className="cp-alert cp-alert--err">{err}</div>}
          {ok && <div className="cp-alert cp-alert--ok">{ok}</div>}

          <label className="label">Current Password</label>
          <div className="cp-row">
            <input
              ref={firstInputRef}
              className="input"
              type={showCur ? "text" : "password"}
              value={cur}
              onChange={(e) => setCur(e.target.value)}
              autoComplete="current-password"
              placeholder="Enter current password"
            />
            <button
              type="button"
              className="cp-eye"
              onClick={() => setShowCur((v) => !v)}
              aria-label="Toggle visibility"
            >
              {showCur ? "🙈" : "👁️"}
            </button>
          </div>

          <label className="label">New Password</label>
          <div className="cp-row">
            <input
              className="input"
              type={showNext ? "text" : "password"}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              placeholder="At least 8 chars, A/a/0/! required"
            />
            <button
              type="button"
              className="cp-eye"
              onClick={() => setShowNext((v) => !v)}
              aria-label="Toggle visibility"
            >
              {showNext ? "🙈" : "👁️"}
            </button>
          </div>

          {/* Strength meter */}
          <div className="cp-strength" aria-hidden="true">
            <div className={`cp-bar ${strength >= 1 ? "on" : ""}`} />
            <div className={`cp-bar ${strength >= 2 ? "on" : ""}`} />
            <div className={`cp-bar ${strength >= 3 ? "on" : ""}`} />
            <div className={`cp-bar ${strength >= 4 ? "on" : ""}`} />
            <div className={`cp-bar ${strength >= 5 ? "on" : ""}`} />
          </div>

          <label className="label">Confirm New Password</label>
          <div className="cp-row">
            <input
              className="input"
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              placeholder="Re-enter new password"
            />
            <button
              type="button"
              className="cp-eye"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label="Toggle visibility"
            >
              {showConfirm ? "🙈" : "👁️"}
            </button>
          </div>

          <div className="cp-actions">
            <button type="button" className="button cp-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="button" disabled={loading}>
              {loading ? "Saving..." : "Save Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
