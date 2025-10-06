import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { BackofficeSidebar } from "../../../components/sidebar/backofficesidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";

const PAGE_SIZE = 10;
const LS_KEY = "currentPropertyCode";

export default function UserList() {
  const propertyCode = (localStorage.getItem(LS_KEY) || "").toUpperCase();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // query state
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");        // e.g. ADMIN/STAFF/MANAGER
  const [active, setActive] = useState("");    // "", "true", "false"
  const [from, setFrom] = useState("");        // createdAt >=
  const [to, setTo] = useState("");            // createdAt <=
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);

  // load list from API
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const params = new URLSearchParams({
          q, page, limit, propertyCode,
        });
        if (role) params.set("role", role);
        if (active) params.set("isActive", active);
        if (from) params.set("from", from);
        if (to) params.set("to", to);

        const res = await apiFetch(`/api/users?${params.toString()}`, { auth: true });
        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;
        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number(count) || 0);
        }
      } catch (e) {
        if (!ignore) {
          setErr(e?.message || "Failed to load users.");
          setRows([]); setTotal(0);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [q, role, active, from, to, page, limit, propertyCode]);

  // client fallback search (if server didn’t paginate)
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      [r.name, r.email, r.phone, r.role]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  const dataToRender = rows?.length && total > rows.length ? rows : filtered;

  const resetFilters = () => {
    setQ(""); setRole(""); setActive(""); setFrom(""); setTo("");
    setPage(1); setLimit(PAGE_SIZE);
  };

  const exportCsv = async () => {
    try {
      const params = new URLSearchParams({ q, propertyCode, limit: 10000 });
      if (role) params.set("role", role);
      if (active) params.set("isActive", active);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await apiFetch(`/api/users?${params.toString()}`, { auth: true });
      const all = res?.data || res?.items || res || [];
      const rowsCsv = [
        ["Name", "Email", "Phone", "Role", "Active", "Last Login", "Created At", "Property"].join(","),
        ...all.map(u => [
          csv(u.name),
          csv(u.email),
          csv(u.phone),
          csv(u.role),
          csv(u.isActive ? "Yes" : "No"),
          csv(u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : ""),
          csv(u.createdAt ? new Date(u.createdAt).toLocaleString() : ""),
          csv(u.propertyCode || ""),
        ].join(",")),
      ].join("\n");

      const blob = new Blob([rowsCsv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users_${propertyCode || "ALL"}_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e?.message || "Export failed.");
    }
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <BackofficeSidebar />

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <div>
            <h2 style={{ margin: 0 }}>Report — User List</h2>
            <div className="small" style={{ color: "var(--muted)" }}>
              {propertyCode ? `Property: ${propertyCode}` : "Global"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <input
              className="res-select"
              placeholder="Search name / email / phone / role"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              style={{ minWidth: 280 }}
            />
            <select className="res-select" value={role} onChange={e => { setRole(e.target.value); setPage(1); }}>
              <option value="">All Roles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="MANAGER">MANAGER</option>
              <option value="STAFF">STAFF</option>
              <option value="AUDITOR">AUDITOR</option>
            </select>
            <select className="res-select" value={active} onChange={e => { setActive(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <input className="res-select" type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} title="Created From" />
            <input className="res-select" type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} title="Created To" />
            <select className="res-select" value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}>
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
            <button className="btn" onClick={resetFilters}>Reset</button>
            <button className="btn" onClick={exportCsv}>Export CSV</button>
          </div>
        </div>

        {/* Table */}
        <div className="panel">
          <div className="panel-h">
            <span>Users</span>
            <span className="small" style={{ color: "var(--muted)" }}>
              {loading ? "Loading…" : `Total: ${total || dataToRender.length}`}
            </span>
          </div>

          <div className="panel-b">
            {err && <Banner type="err">{err}</Banner>}

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Created</th>
                    <th>Property</th>
                  </tr>
                </thead>
                <tbody>
                  {(!dataToRender || dataToRender.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={8}>No users found</td></tr>
                  )}

                  {dataToRender?.map(u => (
                    <tr key={u._id || u.id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.phone || "—"}</td>
                      <td>{u.role || "—"}</td>
                      <td><OnOff value={u.isActive} /></td>
                      <td title={u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : ""}>
                        {u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : "—"}
                      </td>
                      <td>{fmtDate(u.createdAt)}</td>
                      <td>{u.propertyCode || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
              <button className="btn" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>
                ‹ Prev
              </button>
              <span className="small" style={{ alignSelf: "center", color: "var(--muted)" }}>Page {page}</span>
              <button
                className="btn"
                disabled={loading || (!total ? dataToRender.length < limit : page * limit >= total)}
                onClick={() => setPage(p => p + 1)}
              >
                Next ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Small UI helpers ---------- */
function Banner({ type = "ok", children }) {
  const style = type === "err"
    ? { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }
    : { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
  return <div style={{ ...style, padding: "8px 10px", borderRadius: 10, fontWeight: 700, marginBottom: 10 }}>{children}</div>;
}
function OnOff({ value }) {
  const on = !!value;
  return (
    <span style={{
      display: "inline-block", padding: ".15rem .5rem",
      borderRadius: 999, background: on ? "#ecfdf5" : "#f3f4f6",
      border: `1px solid ${on ? "#a7f3d0" : "#e5e7eb"}`,
      color: on ? "#15803d" : "#334155", fontSize: ".75rem", fontWeight: 700
    }}>
      {on ? "Active" : "Inactive"}
    </span>
  );
}

/* ---------- utils ---------- */
function csv(v) {
  const s = (v == null ? "" : String(v));
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function fmtDate(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(dt) ? "—" : dt.toLocaleDateString(); }
function fmtDateTime(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(dt) ? "—" : dt.toLocaleString(); }
