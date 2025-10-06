
// src/pages/BackofficePage.js
import { useNavigate } from "react-router-dom";
import  {BackofficeSidebar } from "../../components/sidebar/backofficesidebar";
import "./ModuleBase.css";

export default function BackofficePage() {
  const navigate = useNavigate();

  return (
    <div className="page">
      {/* Left side: Backoffice sidebar */}
      <BackofficeSidebar />

      {/* Right side: page content */}
      <div className="res-wrap">
        <div className="res-topbar">
          <div className="res-topbar-left">
            <h2 className="page-title">Back Office — Overview</h2>
          </div>
          <div className="res-actions">
            <button className="btn btn-dark" onClick={() => navigate("/dashboard")}>
              ← Dashboard
            </button>
          </div>
        </div>

        {/* Simple example content (replace with your backoffice widgets) */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon">🏨</div>
            <div>
              <div className="kpi-title">Properties</div>
              <div className="kpi-number">3</div>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon">🛏️</div>
            <div>
              <div className="kpi-title">Room Types</div>
              <div className="kpi-number">8</div>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon">🧾</div>
            <div>
              <div className="kpi-title">Rate Plans</div>
              <div className="kpi-number">12</div>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon">👤</div>
            <div>
              <div className="kpi-title">Users</div>
              <div className="kpi-number">24</div>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon">📊</div>
            <div>
              <div className="kpi-title">Pending Tasks</div>
              <div className="kpi-number">5</div>
            </div>
          </div>
        </div>

        <div className="panel" style={{ marginTop: 12 }}>
          <div className="panel-h">Getting Started</div>
          <div className="panel-b">
            <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
              <li>Set up <strong>Property Profile</strong></li>
              <li>Configure <strong>Room Types</strong> and <strong>Rooms</strong></li>
              <li>Create <strong>Rate Plans</strong> and <strong>Taxes</strong></li>
              <li>Add <strong>Users & Roles</strong></li>
              <li>Map <strong>Channels</strong> (OTAs) if applicable</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
