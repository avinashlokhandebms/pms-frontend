// src/pages/ReportPage.js
import { useNavigate } from "react-router-dom";
import "./ModuleBase.css";

export default function ReportPage() {
  const navigate = useNavigate();
  return (
    <div className="module-wrap">
      <div className="module-head">
        <h2 className="module-title">Report</h2>
        <div className="module-actions">
          <button className="btn" onClick={() => navigate("/dashboard")}>← Dashboard</button>
        </div>
      </div>
      <div className="grid">
        <div className="card">Occupancy Report</div>
        <div className="card">Revenue Report</div>
        <div className="card">Audit Trail</div>
      </div>
    </div>
  );
}
