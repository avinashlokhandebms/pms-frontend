import { useEffect, useMemo, useRef, useState } from "react";
import { BackofficeSidebar } from "../../../components/sidebar/backofficesidebar";
import "../../../components/sidebar/Sidebar.css";
import "../../../assets/css/commanPage.css";
import { apiFetch } from "../../../lib/api";
import { getSession } from "../../../auth";

const PAGE_SIZE = 20;
const LS_PROPERTY = "currentPropertyCode";

export default function UploadEinvoicePage() {
  const propertyCode = (localStorage.getItem(LS_PROPERTY) || "").toUpperCase();

  // filters
  const [fromDate, setFromDate] = useState(() => isoDateNDaysAgo(30));
  const [toDate, setToDate] = useState(() => isoDateNDaysAgo(0));
  const [status, setStatus] = useState(""); // "", PENDING, SUBMITTED, FAILED
  const [q, setQ] = useState("");

  // paging
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);

  // data
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // selection
  const [selected, setSelected] = useState(new Set());
  const [onlyErrors, setOnlyErrors] = useState(false);

  // upload
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  // load list
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true); setErr(""); setOk("");
      try {
        const params = new URLSearchParams({
          page, limit, fromDate, toDate,
        });
        if (status) params.set("status", status);
        if (q) params.set("q", q);
        if (propertyCode) params.set("propertyCode", propertyCode);

        const res = await apiFetch(`/api/accounts/einvoice/uploads?${params.toString()}`, { auth: true });
        const data = res?.data || res?.items || res || [];
        const count = res?.total ?? data.length ?? 0;
        if (!ignore) {
          setRows(Array.isArray(data) ? data : []);
          setTotal(Number(count) || 0);
          setSelected(new Set());
        }
      } catch (e) {
        if (!ignore) {
          setErr(e?.message || "Failed to load uploads.");
          setRows([]); setTotal(0);
        }
      } finally { if (!ignore) setLoading(false); }
    })();
    return () => { ignore = true; };
  }, [page, limit, fromDate, toDate, q, status, propertyCode]);

  const visibleRows = useMemo(() => {
    if (!onlyErrors) return rows;
    return rows.filter(r => r.status === "FAILED" || !!r.errorMessage);
  }, [rows, onlyErrors]);

  const allVisibleSelected = useMemo(() => {
    if (!visibleRows.length) return false;
    return visibleRows.every(r => selected.has(r._id || r.id));
  }, [visibleRows, selected]);

  /* ---------- handlers ---------- */
  const toggleOne = (id) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };
  const toggleAllVisible = () => {
    const s = new Set(selected);
    const ids = visibleRows.map(r => r._id || r.id);
    const every = ids.every(id => s.has(id));
    if (every) ids.forEach(id => s.delete(id));
    else ids.forEach(id => s.add(id));
    setSelected(s);
  };

  async function uploadFile(file) {
    if (!file) return;
    setUploading(true); setErr(""); setOk("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (propertyCode) fd.append("propertyCode", propertyCode);

      // You can also include "format" (csv/xlsx/json) if your API needs it
      // fd.append("format", guessFormat(file.name));

      const session = getSession?.();
      const res = await fetch(`/api/accounts/einvoice/uploads`, {
        method: "POST",
        headers: {
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        },
        body: fd,
      });
      if (!res.ok) {
        const msg = await safeText(res);
        throw new Error(msg || `Upload failed (${res.status})`);
      }
      setOk("Upload successful.");
      // refresh first page
      setPage(1);
    } catch (e) {
      setErr(e?.message || "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submitSelected(ids) {
    if (!ids?.length) { setErr("No rows selected."); return; }
    setErr(""); setOk("");
    try {
      const payload = { ids };
      if (propertyCode) payload.propertyCode = propertyCode;
      await apiFetch(`/api/accounts/einvoice/submit`, {
        method: "POST", auth: true, body: JSON.stringify(payload),
      });
      setOk(`Submitted ${ids.length} record(s).`);
      setPage(1);
    } catch (e) {
      setErr(e?.message || "Submit failed.");
    }
  }

  async function retryFailed() {
    const ids = rows.filter(r => r.status === "FAILED").map(r => r._id || r.id);
    await submitSelected(ids);
  }

  async function deleteSelected(ids) {
    if (!ids?.length) return;
    if (!window.confirm(`Delete ${ids.length} record(s)? This cannot be undone.`)) return;
    setErr(""); setOk("");
    try {
      await apiFetch(`/api/accounts/einvoice/uploads`, {
        method: "DELETE",
        auth: true,
        body: JSON.stringify({ ids, propertyCode }),
      });
      setOk(`Deleted ${ids.length} record(s).`);
      setPage(1);
    } catch (e) {
      setErr(e?.message || "Delete failed.");
    }
  }

  const downloadTemplate = async (format = "csv") => {
    try {
      const params = new URLSearchParams({ format });
      if (propertyCode) params.set("propertyCode", propertyCode);
      const session = getSession?.();
      const res = await fetch(`/api/accounts/einvoice/template?${params.toString()}`, {
        headers: {
          "Accept": "application/octet-stream",
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        },
      });
      if (!res.ok) throw new Error(`Template download failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `einvoice-upload-template.${format === "xlsx" ? "xlsx" : "csv"}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e?.message || "Template download failed.");
    }
  };

  /* ---------- UI ---------- */
  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
      <BackofficeSidebar />

      <div className="res-wrap">
        {/* Topbar */}
        <div className="res-topbar">
          <div>
            <h2 style={{ margin: 0 }}>Upload E-Invoice</h2>
            <div className="small" style={{ color: "var(--muted)" }}>
              {propertyCode ? `Property: ${propertyCode}` : "Global"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input type="date" className="res-select" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} />
            <span className="small" style={{ color: "var(--muted)" }}>to</span>
            <input type="date" className="res-select" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} />

            <select className="res-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="PENDING">PENDING</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="FAILED">FAILED</option>
            </select>

            <input
              className="res-select"
              placeholder="Search (IRN / Inv No / GSTIN / error)"
              value={q}
              onChange={e => { setQ(e.target.value); setPage(1); }}
              style={{ minWidth: 260 }}
            />

            <label className="small" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={onlyErrors} onChange={e => setOnlyErrors(e.target.checked)} />
              Errors only
            </label>

            <select className="res-select" value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}>
              {[20, 50, 100, 200].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
          </div>
        </div>

        {/* Upload zone */}
        <div
          className="panel"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault(); setDragOver(false);
            const file = e.dataTransfer?.files?.[0]; if (file) uploadFile(file);
          }}
          style={{ borderColor: dragOver ? "#60a5fa" : undefined }}
        >
          <div className="panel-h">Upload</div>
          <div className="panel-b" style={{ display: "grid", gap: 10 }}>
            {err && <Banner type="err">{err}</Banner>}
            {ok && <Banner type="ok">{ok}</Banner>}

            <div style={{
              padding: "16px", border: "1px dashed #cbd5e1", borderRadius: 12,
              background: dragOver ? "#eff6ff" : "#f8fafc",
              display: "grid", justifyItems: "center", gap: 8
            }}>
              <div className="small" style={{ fontWeight: 800 }}>
                Drag & drop CSV / XLSX / JSON here
              </div>
              <div className="small" style={{ color: "var(--muted)" }}>or</div>
              <div>
                <input
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/json"
                  ref={fileRef}
                  onChange={(e) => uploadFile(e.target.files?.[0])}
                  disabled={uploading}
                />
              </div>
              <div className="small" style={{ color: "var(--muted)" }}>
                Tip: Include columns like <code>InvoiceNo</code>, <code>InvoiceDate</code>, <code>BuyerGSTIN</code>, <code>Total</code>, etc.
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button className="btn" onClick={() => downloadTemplate("csv")}>⬇ CSV Template</button>
                <button className="btn" onClick={() => downloadTemplate("xlsx")}>⬇ XLSX Template</button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn" onClick={() => setPage(1)}>Refresh</button>
              <button className="btn" disabled={!selected.size} onClick={() => submitSelected([...selected])}>
                Submit Selected ({selected.size})
              </button>
              <button className="btn" onClick={retryFailed}>Retry Failed</button>
              <button className="btn" disabled={!selected.size} onClick={() => deleteSelected([...selected])}>
                Delete Selected
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="panel">
          <div className="panel-h">
            <span>Uploaded Records</span>
            <span className="small" style={{ color: "var(--muted)" }}>
              {loading ? "Loading…" : `Total: ${total || visibleRows.length}`}
            </span>
          </div>

          <div className="panel-b">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} />
                    </th>
                    <th>Date</th>
                    <th>Invoice No</th>
                    <th>Buyer GSTIN</th>
                    <th style={{ textAlign: "right" }}>Total</th>
                    <th>IRN</th>
                    <th>Status</th>
                    <th>Error</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(!visibleRows || visibleRows.length === 0) && !loading && (
                    <tr className="no-rows"><td colSpan={9}>No records</td></tr>
                  )}

                  {visibleRows?.map(r => {
                    const id = r._id || r.id;
                    return (
                      <tr key={id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selected.has(id)}
                            onChange={() => toggleOne(id)}
                          />
                        </td>
                        <td>{fmtDate(r.invoiceDate || r.date)}</td>
                        <td>{r.invoiceNo || r.docNo || "—"}</td>
                        <td>{r.buyerGstin || r.gstin || "—"}</td>
                        <td style={{ textAlign: "right" }}>{fmtMoney(r.total || r.totalAmount)}</td>
                        <td title={r.irn || ""}>{r.irn || "—"}</td>
                        <td>
                          <StatusPill status={r.status} />
                        </td>
                        <td title={r.errorMessage || ""} style={{ color: r.errorMessage ? "#b91c1c" : undefined }}>
                          {r.errorMessage || "—"}
                        </td>
                        <td>{fmtDate(r.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
              <button className="btn" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>
                ‹ Prev
              </button>
              <span className="small" style={{ alignSelf: "center", color: "var(--muted)" }}>
                Page {page}
              </span>
              <button
                className="btn"
                disabled={loading || (!total ? visibleRows.length < limit : page * limit >= total)}
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

/* ---------- little atoms ---------- */
function StatusPill({ status }) {
  const s = (status || "").toUpperCase();
  const map = {
    PENDING: { bg: "#fefce8", bd: "#fde68a", fg: "#92400e", text: "Pending" },
    SUBMITTED: { bg: "#ecfdf5", bd: "#a7f3d0", fg: "#065f46", text: "Submitted" },
    FAILED: { bg: "#fef2f2", bd: "#fecaca", fg: "#991b1b", text: "Failed" },
  }[s] || { bg: "#f3f4f6", bd: "#e5e7eb", fg: "#334155", text: s || "—" };

  return (
    <span style={{
      display: "inline-block", padding: ".15rem .5rem", borderRadius: 999,
      background: map.bg, border: `1px solid ${map.bd}`, color: map.fg,
      fontSize: ".75rem", fontWeight: 700
    }}>
      {map.text}
    </span>
  );
}

function Banner({ type = "ok", children }) {
  const style = type === "err"
    ? { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }
    : { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
  return <div style={{ ...style, padding: "8px 10px", borderRadius: 10, fontWeight: 700 }}>{children}</div>;
}

/* ---------- utils ---------- */
function fmtDate(d) { if (!d) return "—"; const dt = new Date(d); return Number.isNaN(dt) ? "—" : dt.toLocaleDateString(); }
function fmtMoney(n) { const x = Number(n || 0); return x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function isoDateNDaysAgo(n) { const dt = new Date(); dt.setDate(dt.getDate() - n); return dt.toISOString().slice(0,10); }
async function safeText(res) { try { return await res.text(); } catch { return ""; } }
