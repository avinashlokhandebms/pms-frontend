// import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { login } from '../auth';

// export default function Login() {
//   const navigate = useNavigate();
//   const [form, setForm] = useState({ propertyCode: '', customerId: '', password: '' });
//   const [error, setError] = useState('');

//   const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
//   const onSubmit = (e) => {
//     e.preventDefault();
//     setError('');
//     try {
//       login(form);
//       navigate('/dashboard');
//     } catch (err) {
//       setError('Invalid credentials');
//     }
//   };


// src/pages/Login.js (snippet)
// src/pages/Login.js
import { login, getSession } from "../../auth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function Login() {
  const nav = useNavigate();
  const [propertyCode, setPropertyCode] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  // If already logged in, go to dashboard
  useEffect(() => {
    const s = getSession?.();
    if (s) nav("/dashboard");
  }, [nav]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login({ propertyCode: propertyCode.trim(), customerId: customerId.trim(), password });
      nav("/dashboard");
    } catch (e2) {
      setErr(e2.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-left">
        <div className="login-card">
          <h1 className="login-title">Hospitality Solution Expert</h1>

          {err && (
            <div
              role="alert"
              style={{
                background: "#fee2e2",
                color: "#991b1b",
                border: "1px solid #fecaca",
                borderRadius: 12,
                padding: "10px 12px",
                marginBottom: 12,
                fontSize: ".95rem",
              }}
            >
              {err}
            </div>
          )}

          <form onSubmit={onSubmit}>
            <label className="label" htmlFor="propertyCode">Property Code</label>
            <input
              className="input"
              id="propertyCode"
              name="propertyCode"
              placeholder="Property Code"
              value={propertyCode}
              onChange={(e) => setPropertyCode(e.target.value)}
              autoComplete="organization"
              required
            />

            <div style={{ height: ".75rem" }} />
            <label className="label" htmlFor="customerId">Customer Id</label>
            <input
              className="input"
              id="customerId"
              name="customerId"
              placeholder="Customer Id"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              autoComplete="username"
              required
            />

            <div style={{ height: ".75rem" }} />
            <label className="label" htmlFor="password">Password</label>
            <div style={{ position: "relative" }}>
              <input
                className="input"
                id="password"
                name="password"
                type={showPwd ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                aria-label="Toggle password visibility"
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 18,
                }}
              >
                {showPwd ? "🙈" : "👁️"}
              </button>
            </div>

            <button className="button" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>

           
          </form>
        </div>
      </div>

      {/* Right visual panel */}
      <div className="login-right" aria-hidden="true" />
    </div>
  );
}

