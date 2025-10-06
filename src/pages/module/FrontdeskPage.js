// src/pages/FrontdeskPage.js
// import { useNavigate } from "react-router-dom";
// import "./ModuleBase.css";
// import { FrontdeskSidebar } from "../../components/sidebar/FrontdeskSidebar";
// export default function FrontdeskPage() {
//   const navigate = useNavigate();
//   return (
//     <div className="page">
//           <FrontdeskPage/>
//           </div>
//   );
// }


// src/pages/FrontdeskPage.js
import { useNavigate } from "react-router-dom";
import "./ModuleBase.css";

// ✅ If your component is exported as default:
// import FrontdeskSidebar from "../../components/sidebar/FrontdeskSidebar";
import { FrontdeskSidebar } from "../../components/sidebar/FrontdeskSidebar";
export default function FrontdeskPage() {
  const navigate = useNavigate();

  return (
    <div className="page">
      {/* Sidebar */}
      <FrontdeskSidebar />

      {/* Main content */}
      <div className="res-wrap">
        <div className="res-topbar">
          <h2 className="page-title">Front Desk — Dashboard</h2>
          <div className="res-actions">
            <button className="btn" onClick={() => navigate("/dashboard")}>
              ← Dashboard
            </button>
          </div>
        </div>

        {/* Example KPIs */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon">🛎️</div>
            <div>
              <div className="kpi-title">Today's Check-ins</div>
              <div className="kpi-number">0</div>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon">🚪</div>
            <div>
              <div className="kpi-title">Today's Check-outs</div>
              <div className="kpi-number">0</div>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon">🏨</div>
            <div>
              <div className="kpi-title">In-house Guests</div>
              <div className="kpi-number">0</div>
            </div>
          </div>
        </div>

        {/* Example Panel */}
        <div className="panel" style={{ marginTop: 12 }}>
          <div className="panel-h">Quick Actions</div>
          <div className="panel-b" style={{ display: "flex", gap: 10 }}>
            <button className="btn">New Reservation</button>
            <button className="btn">Check In</button>
            <button className="btn">Check Out</button>
          </div>
        </div>
      </div>
    </div>
  );
}
