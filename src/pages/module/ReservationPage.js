import { useNavigate } from "react-router-dom";
// import "../module/ModuleBase.css";
import ReservationSidebar from "../../components/sidebar/ReservationSidebar";
// import { ReservationSidebar } from "../../../components/Sidebar";
import "../module/ModuleBase.css";
// import Topbar from "../components/layout/Topbar";

export default function ReservationPage() {
  const navigate = useNavigate();

  // demo data – replace with real API data later
  const kpis = [
    { key: "arrival", label: "Arrival", total: 0, a: 0, p: 0, icon: "🚶" },
    { key: "departure", label: "Departure", total: 0, a: 0, p: 0, icon: "📲" },
    { key: "totalBooking", label: "Total Booking", total: 0, icon: "🧾" },
    { key: "inHouse", label: "In House", total: 0, icon: "🏨" },
    { key: "availableRoom", label: "Available Room", total: 20, sub: "UnAlloted Room 0", icon: "🛏️" },
  ];

  const inventoryStats = [
    ["Sold Room", 0],
    ["Blocked Room", 0],
    ["Available Room", 20],
    ["Complimentary", 0],
    ["House Use", 0],
    ["Same Day Check Out", 0],
  ];

  const occupancyStats = [
    ["Today's Checking", 0],
    ["Continue Room", 0],
    ["Complimentary/House Use", 0],
    ["Total Occupancy", 0],
    ["Total CheckOut", 0],
    ["Today Expected Checkout", 0],
  ];

  // simple donut (SVG) – value is 0–100
  const donut = (value) => {
    const r = 28, c = 2 * Math.PI * r;
    const off = c * (1 - Math.min(100, Math.max(0, value)) / 100);
    return (
      <svg viewBox="0 0 80 80" className="donut">
        <circle className="donut-bg" cx="40" cy="40" r={r} />
        <circle
          className="donut-val"
          cx="40" cy="40" r={r}
          strokeDasharray={c}
          strokeDashoffset={off}
        />
        <text x="40" y="46" textAnchor="middle" className="donut-txt">{value}</text>
      </svg>
    );
  };

  return (
     
    <div className="res-wrap">
       <ReservationSidebar />
     
        {/* <div className="res-actions">
          <button className="btn" onClick={() => navigate("/dashboard")}>← Dashboard</button>
        </div> */}
      
      {/* KPIs */}
      <div className="kpi-grid">
        {kpis.map((k) => (
          <div key={k.key} className="kpi-card">
            <div className="kpi-left">
              <div className="kpi-icon" aria-hidden>{k.icon}</div>
            </div>
            <div className="kpi-right">
              <div className="kpi-title">{k.label}</div>
              {"total" in k && <div className="kpi-number">{k.total}</div>}
              {"a" in k && (
                <div className="kpi-sub">
                  <span>Arrived {k.a}</span>
                  <span>Pending {k.p}</span>
                </div>
              )}
              {k.sub && <div className="kpi-sub">{k.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* mid cards */}
      <div className="mid-grid">
        <div className="panel">
          <div className="panel-h">
            <span>Sales</span>
            <div className="tabs">
              <button className="tab active">Today</button>
              <button className="tab">Month</button>
            </div>
          </div>
          <div className="panel-b">
            <div className="stat-line">
              <span>₹0.00</span>
              <span>₹59,314.00</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-h">
            <span>OutStanding Amount</span>
            <div className="tabs">
              <button className="tab active">Today</button>
              <button className="tab">Month</button>
            </div>
          </div>
          <div className="panel-b">
            <div className="stat-line">
              <span>₹0.00</span>
              <span>₹493,761.00</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-h">
            <span>Total Bill</span>
            <div className="tabs">
              <button className="tab active">Today</button>
              <button className="tab">Month</button>
            </div>
          </div>
          <div className="panel-b">
            <div className="stat-line">
              <span>₹0.00</span>
              <span>₹42.00</span>
            </div>
          </div>
        </div>
      </div>

      {/* lower split */}
      <div className="split-grid">
        <div className="panel">
          <div className="panel-h"><span>Inventory Statistics</span><span className="pill">20</span></div>
          <div className="panel-b list">
            {inventoryStats.map(([name, v]) => (
              <div key={name} className="row">
                <span>{name}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-h"><span>Occupancy (%)</span></div>
          <div className="panel-b occ">
            <div className="list">
              {occupancyStats.map(([name, v]) => (
                <div key={name} className="row">
                  <span>{name}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
            <div className="chart">{donut(0)}</div>
          </div>
        </div>
      </div>

      {/* booking by channel + collection by mode */}
      <div className="panel">
        <div className="panel-h">
          <span>Booking by Channel</span>
          <div className="tabs">
            <button className="tab active">Today</button>
            <button className="tab">Month</button>
          </div>
        </div>
        <div className="panel-b empty">No Data</div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <span>Collection by Mode</span>
          <div className="tabs">
            <button className="tab active">Today</button>
            <button className="tab">Month</button>
          </div>
        </div>
        <div className="panel-b empty">No Data</div>
      </div>

      {/* check-in table */}
      <div className="panel">
        <div className="panel-h tabs-left">
          <div className="tabs">
            <button className="tab active">Check In Guest</button>
            <button className="tab">More Detail : Reservation</button>
            <button className="tab">More Detail :</button>
          </div>
        </div>
        <div className="panel-b">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Sr No.</th>
                  <th>Arrival No.</th>
                  <th>Guest Name</th>
                  <th>Room No</th>
                  <th>Plan</th>
                  <th>Check Out Date</th>
                  <th>Booked By</th>
                  <th>Company</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr className="no-rows">
                  <td colSpan="9">No Reservations Found</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
   
  );
}
