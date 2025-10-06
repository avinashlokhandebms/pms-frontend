// src/components/Sidebar.js
import { useState, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import "./Sidebar.css";

/* ---------------------------------------------
   HOUSEKEEPING SIDEBAR
----------------------------------------------*/
export function HousekeepingSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(new Set(["hkOps", "hkReports"]));
  const { pathname } = useLocation();

  const menus = useMemo(
    () => [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: "🏠",
        to: "/dashboard/housekeeping",
      },
      {
        key: "hkOps",
        label: "Operations",
        icon: "🧹",
        to: "/housekeeping", // header also routes to overview
        children: [
          { label: "Room Status Board", to:"/dashboard/Housekeeping/RoomStatusBoard" },
          { label: "Assign Tasks", to: "/dashboard/Housekeeping/AssignTasks" },
          { label: "Cleaning Schedule", to:"/dashboard/Housekeeping/CleaningSchedule" },
          { label: "Room Inspection", to: "/dashboard/Housekeeping/RoomInspection" },
          { label: "Turn Down Service", to: "/dashboard/Housekeeping/TurnDownService" },
          { label: "Deep Cleaning Planner", to: "/dashboard/Housekeeping/DeepCleaningPlanner" },
          { label: "Lost & Found", to: "/dashboard/Housekeeping/LostAndFound" },
          { label: "Maintenance Requests", to: "/dashboard/Housekeeping/MaintenanceRequests" },
          { label: "Linen Inventory", to: "/dashboard/Housekeeping/LinenInventory" },
          { label: "Minibar Refill", to: "/dashboard/Housekeeping/MinibarRefill" },
        ],
      },
      {
        key: "hkReports",
        label: "Reports",
        icon: "📊",
        to: "/housekeeping/reports",
        children: [
          { label: "Productivity", to: "/dashboard/Housekeeping/Reports/Productivity" },
          { label: "Status History", to: "/dashboard/Housekeeping/Reports/StatusHistory" },
          { label: "Lost & Found Log", to:"/dashboard/Housekeeping/Reports/LostFoundLog" },
          { label: "Materials Usage", to: "/dashboard/Housekeeping/Reports/MaterialsUsage" },
        ],
      },
      {
        key: "settings",
        label: "Settings",
        icon: "⚙️",
        to: "/housekeeping/settings",
        children: [
          { label: "Task Types", to: "/housekeeping/settings/task-types" },
          { label: "HK Statuses", to: "/housekeeping/settings/statuses" },
          { label: "Checklists", to: "/housekeeping/settings/checklists" },
          { label: "Staff & Teams", to: "/housekeeping/settings/staff" },
        ],
      },
    ],
    []
  );

  const isOpen = (k) => open.has(k);
  const toggle = (k) => {
    const s = new Set(open);
    s.has(k) ? s.delete(k) : s.add(k);
    setOpen(s);
  };

  const isDashboardActive =
    pathname === "/housekeeping" || pathname.startsWith("/housekeeping/");

  return (
    <aside className={`rsb ${collapsed ? "rsb--mini" : ""}`}>
      <div className="rsb-top">
        <button
          className="rsb-burger"
          onClick={() => setCollapsed((v) => !v)}
          aria-label="Toggle sidebar"
        >
          <span />
          <span />
          <span />
        </button>
        {!collapsed && (
          <button className="rsb-close" onClick={() => setCollapsed(true)} aria-label="Collapse">
            ×
          </button>
        )}
      </div>

      <nav className="rsb-nav">
        {/* Dashboard */}
        <NavLink
          to="/housekeeping"
          className={"rsb-item" + (isDashboardActive ? " active" : "")}
        >
          <span className="rsb-ico">🏠</span>
          {!collapsed && <span className="rsb-lbl">Dashboard</span>}
        </NavLink>

        {/* Sections */}
        {menus
          .filter((m) => m.key !== "dashboard")
          .map((m) => {
            const hasChildren = !!m.children?.length;
            const openNow = isOpen(m.key);

            return (
              <div key={m.key} className="rsb-sec">
                <NavLink
                  to={m.to}
                  onClick={() => hasChildren && toggle(m.key)}
                  className={({ isActive }) =>
                    "rsb-item rsb-parent" +
                    (isActive ? " active" : "") +
                    (collapsed ? " no-caret" : "")
                  }
                >
                  <span className="rsb-ico">{m.icon}</span>
                  {!collapsed && <span className="rsb-lbl">{m.label}</span>}
                  {hasChildren && !collapsed && (
                    <span className={`rsb-caret ${openNow ? "open" : ""}`}>▾</span>
                  )}
                </NavLink>

                {hasChildren && !collapsed && openNow && (
                  <div className="rsb-sub">
                    {m.children.map((c) => (
                      <NavLink
                        key={c.to}
                        to={c.to}
                        className={({ isActive }) =>
                          "rsb-subitem" + (isActive ? " active" : "")
                        }
                      >
                        {c.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </nav>
    </aside>
  );
}
