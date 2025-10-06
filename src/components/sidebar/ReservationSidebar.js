import { useState, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import "./Sidebar.css"; // reuse the same styles

export default function ReservationSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  // open Reservation + Front Office by default
  const [open, setOpen] = useState(new Set(["reservation", "frontoffice"]));
  const { pathname } = useLocation();

  const menus = useMemo(
    () => [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: "🏠",
        to: "/reservation",
      },
      {
        key: "reservation",
        label: "Reservation",
        icon: "🗂️",
        to: "/dashboard/reservation",
        children: [
          { label: "New Reservation", to: "/reservation/new" },
          { label: "Reservation Booking Details", to: "/reservation/booking-details" },
          { label: "Reservation Status View", to: "/reservation/StatusView"},
          { label: "Cancel Reservation List", to:"/reservation/CancelReservationList" },
          { label: "Reservation Calendar", to:"/reservation/ReservationCalendar"},
          { label: "Advanced Deposit", to: "/reservation/AdvanceDeposit" },
          { label: "Return / Paidup", to: "/reservation/ReturnPaidup" },
          { label: "No Show Room Report", to: "/reservation/NoShowRoomReport" },
          { label: "Booking Sheet Accounts", to: "/reservation/BookingSheetAccounts" },
        ],
      },
      // ✅ NEW: Front Office with dropdown items
      {
        key: "frontoffice",
        label: "Front Office",
        icon: "💼",
        to: "/dashboard/reservation", // parent header can take you to a frontdesk overview
        children: [
          { label: "Pre Reg Card", to:  "/Reservation/frontoffice/PreRegCard" },
          { label: "Check In Guest", to: "/Reservation/frontoffice/CheckInGuest"  },
          { label: "Direct Check In Guest", to: "/Reservation/frontoffice/DirectCheckInGuest" },
          { label: "Check In Guest Details", to: "/Reservation/frontoffice/CheckInGuestDetails" },
          { label: "Pax Checkin", to:"/Reservation/frontoffice/PaxCheckin" },
          { label: "Cancel Booking Details", to: "/Reservation/frontoffice/CancelBookingDetails" },
          { label: "Room Calendar", to: "/Reservation/frontoffice/RoomCalendar" },
          { label: "Linked/UnLinked Report", to: "/Reservation/frontoffice/LinkedUnlinkedReport"},
          { label: "Check Out Guest", to: "/Reservation/frontoffice/CheckOutGuest" },
          { label: "Calendar", to: "/Reservation/frontoffice/Calendar" },
          { label: "Guest Checkout Date Extend", to: "/Reservation/frontoffice/GuestCheckoutExtend" },
          { label: "Paidup (Refund) Amount", to: "/frontdesk/paidup-refund" },
          { label: "Post Room/Mic Charges", to: "/frontdesk/post-charges" },
          { label: "Check Out Details", to: "/frontdesk/checkout-details" },
          { label: "Booking Linked/Unlinked", to: "/frontdesk/booking-linked-unlinked" },
          { label: "Settlement", to: "/frontdesk/settlement" },
        ],
      },
      // { key: "housekeeping", label: "House Keeping", icon: "🧹", to: "/housekeeping" },
      // { key: "petty",        label: "Petty Cash",    icon: "💸", to: "/petty-cash" },
      // { key: "accounting",   label: "Accounting",    icon: "📒", to: "/accounting" },
      // { key: "other",        label: "Other Hotel",   icon: "🏨", to: "/other-hotel" },
      // { key: "club",         label: "Club",          icon: "🎟️", to: "/club" },
    ],
    []
  );

  const isSectionOpen = (k) => open.has(k);
  const toggleSection = (k) => {
    const s = new Set(open);
    s.has(k) ? s.delete(k) : s.add(k);
    setOpen(s);
  };

  // Active for both /reservation and /reservation/*
  const isDashboardActive = pathname === "/reservation" || pathname.startsWith("/reservation/");

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
        {/* Dashboard (Reservation overview) */}
        <NavLink
          to="/reservation"
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
            const openNow = isSectionOpen(m.key);

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
