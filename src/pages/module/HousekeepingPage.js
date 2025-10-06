// src/pages/HousekeepingPage.js
import { useNavigate } from "react-router-dom";
import "./ModuleBase.css";

// ✅ default export import (no braces)
import { HousekeepingSidebar } from "../../components/sidebar/HousekeepingSidebar";

export default function HousekeepingPage() {
  const navigate = useNavigate();

  return (
    <div className="page">
      {/* Sidebar */}
      <HousekeepingSidebar />

      {/* Main content */}
      <div className="res-wrap">
        <div className="res-topbar">
          <h2 className="page-title" style={{ margin: 0 }}>
            Housekeeping — Dashboard
          </h2>
          <div className="res-actions">
            <button className="btn" onClick={() => navigate("/dashboard")}>
              ← Dashboard
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon">🧹</div>
            <div>
              <div className="kpi-title">Rooms to Clean</div>
              <div className="kpi-number">0</div>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon">✅</div>
            <div>
              <div className="kpi-title">Cleaned</div>
              <div className="kpi-number">0</div>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon">🧴</div>
            <div>
              <div className="kpi-title">In-Progress</div>
              <div className="kpi-number">0</div>
            </div>
          </div>
        </div>

        {/* Example panel */}
        <div className="panel" style={{ marginTop: 12 }}>
          <div className="panel-h">Today’s Tasks</div>
          <div className="panel-b">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Room</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="no-rows">
                    <td colSpan="4">No tasks</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
