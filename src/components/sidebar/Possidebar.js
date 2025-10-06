// src/components/sidebar/possidebar.js
import { useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import "./Sidebar.css";

/**
 * POS Sidebar
 * Uses the same .rsb classes as your BackofficeSidebar.
 * Routes are namespaced under /dashboard/pos/...
 */
export function PosSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [openSet, setOpenSet] = useState(
    new Set(["orders", "tables", "kitchen", "billing", "inventory", "reports", "settings"])
  );
  const { pathname } = useLocation();

  const menus = useMemo(
    () => [
      { key: "dashboard", label: "POS Dashboard", icon: "🛒", to: "/dashboard/pos" },

      {
        key: "orders",
        label: "Orders",
        icon: "🧾",
        to: "/dashboard/pos/orders",
        children: [
          { label: "Order Entry",     to: "/dashboard/Pos/OrderEntry" },
          { label: "Running Orders",  to: "/dashboard/Pos/RunningOrders" },
          { label: "Hold / Unpaid",   to: "/dashboard/Pos/HoldUnpaid" },
          { label: "Cancelled",       to: "/dashboard/Pos/Cancelled"},
        ],
      },

      {
        key: "tables",
        label: "Tables",
        icon: "🪑",
        to: "/dashboard/pos/tables",
        children: [
          { label: "Table Status", to: "/dashboard/Pos/Tables/TableStatus" },
          { label: "Merge / Split", to: "/dashboard/Pos/Tables/MergeSplit" },
          { label: "Move Table",    to:"/dashboard/Pos/Tables/MoveTable" },
        ],
      },

      {
        key: "kitchen",
        label: "Kitchen (KOT/KDS)",
        icon: "👨‍🍳",
        to: "/dashboard/pos/kitchen",
        children: [
          { label: "KOT Board",   to: "/dashboard/Pos/Tables/KOTBoard" },
          { label: "Reprint KOT", to:"/dashboard/Pos/Tables/ReprintKOT" },
          { label: "KDS",         to: "/dashboard/Pos/Tables/KDS" },
        ],
      },

      {
        key: "billing",
        label: "Billing",
        icon: "💳",
        to: "/dashboard/pos/billing",
        children: [
          { label: "Generate Bill", to: "/dashboard/Pos/Billing/GenerateBill" },
          { label: "Reprint Bill",  to: "/dashboard/Pos/Billing/ReprintBill" },
          { label: "Void / Return", to: "/dashboard/Pos/Billing/VoidReturn" },
        ],
      },

      {
        key: "inventory",
        label: "Inventory",
        icon: "📦",
        to: "/dashboard/pos/inventory",
        children: [
          { label: "Items",         to: "/dashboard/Pos/Inventory/Items" },
          { label: "Stock In/Out",  to: "/dashboard/Pos/Inventory/StockInOut"},
          { label: "Out of Stock",  to: "/dashboard/Pos/Inventory/OutofStock" },
        ],
      },

      {
        key: "reports",
        label: "Reports",
        icon: "📊",
        to: "/dashboard/pos/reports",
        children: [
          { label: "Z Report",        to: "/dashboard/Pos/Reports/ZReport" },
          { label: "Sales Summary",   to: "/dashboard/Pos/Reports/SalesSummary" },
          { label: "Tax Summary",     to: "/dashboard/Pos/Reports/TaxSummary" },
          { label: "Discount Report", to: "/dashboard/Pos/Reports/DiscountReport"},
        ],
      },

      {
        key: "settings",
        label: "Settings",
        icon: "⚙️",
        to: "/dashboard/pos/settings",
        children: [
          { label: "Printers",       to:"/dashboard/Pos/Settings/Printers" },
          { label: "Counters",       to: "/dashboard/Pos/Settings/Counters" },
          { label: "Payment Modes",  to: "/dashboard/Pos/Settings/PaymentModes" },
          { label: "Service Charge", to: "/dashboard/Pos/Settings/ServiceCharge" },
        ],
      },
    ],
    []
  );

  const toggleSection = (key) => {
    const s = new Set(openSet);
    s.has(key) ? s.delete(key) : s.add(key);
    setOpenSet(s);
  };

  const isDashboardActive =
    pathname === "/dashboard/pos" || pathname.startsWith("/dashboard/pos/");

  return (
    <aside className={`rsb ${collapsed ? "rsb--mini" : ""}`}>
      <div className="rsb-top">
        <button
          className="rsb-burger"
          onClick={() => setCollapsed((v) => !v)}
          aria-label="Toggle sidebar"
        >
          <span /><span /><span />
        </button>
        {!collapsed && (
          <button
            className="rsb-close"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse"
          >
            ×
          </button>
        )}
      </div>

      <nav className="rsb-nav">
        {/* Top-level dashboard item */}
        <NavLink
          to="/dashboard/pos"
          className={"rsb-item" + (isDashboardActive ? " active" : "")}
        >
          <span className="rsb-ico">🛒</span>
          {!collapsed && <span className="rsb-lbl">POS Dashboard</span>}
        </NavLink>

        {/* Sections */}
        {menus.filter((m) => m.key !== "dashboard").map((m) => {
          const hasChildren = !!m.children?.length;
          const openNow = openSet.has(m.key);
          return (
            <div key={m.key} className="rsb-sec">
              <NavLink
                to={m.to}
                onClick={() => hasChildren && toggleSection(m.key)}
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

export default PosSidebar;
