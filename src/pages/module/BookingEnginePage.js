// src/pages/BookingEnginePage.js
import { useNavigate } from "react-router-dom";
import "./ModuleBase.css";

export default function BookingEnginePage() {
  const navigate = useNavigate();
  return (
    <div className="module-wrap">
      <div className="module-head">
        <h2 className="module-title">Booking Engine</h2>
        <div className="module-actions">
          <button className="btn" onClick={() => navigate("/dashboard")}>← Dashboard</button>
        </div>
      </div>
      <div className="grid">
        <div className="card">Conversion</div>
        <div className="card">Campaigns</div>
        <div className="card">Promotions</div>
      </div>
    </div>
  );
}
