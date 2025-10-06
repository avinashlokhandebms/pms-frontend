// src/components/Sidebar.js
import { useState, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import "./Sidebar.css";

/* ===========================
   Backoffice Sidebar
   =========================== */
export function BackofficeSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(new Set(["dashboard", "masters"]));
  const { pathname } = useLocation();

  const menus = useMemo(() => [
    { key: "dashboard", label: "Dashboard", icon: "🏠", to: "/dashboard/backoffice" },

  {
    key: "property", label: "Property", icon: "🏨", to: "/dashboard/backoffice",
    children: [
      { label: "Property details", to: "/dashboard/backoffice/masters/property" },
      { label: "Sales Person",     to: "/dashboard/backoffice/masters/salesperson" },
    ],
  },

  {
    key: "master", label: "Master", icon: "🧩", to: "/dashboard/backoffice",
    children: [
      { label: "Designation",                 to: "/dashboard/backoffice/masters/designation" },
      { label: "Kds Setting",                 to: "/dashboard/backoffice/masters/kds" },
      { label: "Ledger",                      to: "/dashboard/backoffice/masters/ledger" },
      { label: "Visit Purpose",               to: "/dashboard/backoffice/masters/visit-purpose" },
      { label: "Pick Drop Facility",          to: "/dashboard/backoffice/masters/pick-drop" },
      { label: "Billing Instruction Details", to: "/dashboard/backoffice/masters/billing-instruction" },
      { label: "Identity Details",            to: "/dashboard/backoffice/masters/identity" },
      { label: "Version",                     to: "/dashboard/backoffice/masters/version" },
      { label: "State",                       to: "/dashboard/backoffice/masters/state" },
      { label: "City",                        to: "/dashboard/backoffice/masters/city" },
      { label: "Area",                        to: "/dashboard/backoffice/master/area" },
      { label: "Zone",                        to: "/dashboard/backoffice/masters/zone" },
      { label: "Tax Rate Name",               to: "/dashboard/backoffice/masters/tax-rate-name"},
      { label: "Tax Slab",                    to: "/master/tax-slab" },
      { label: "Tax Process",                 to: "/master/tax-process" },
      { label: "Order cancel Time",           to: "/master/order-cancel-time" },
      { label: "Bill No. Setting",            to: "/master/billno-setting" },
      { label: "Reservation Settings",        to: "/master/reservation-settings" },
      { label: "Pincode",                     to: "/master/pincode" },
      { label: "Property Information",        to: "/master/property-information" },
      { label: "Property Information App",    to: "/master/property-information-app" },
      { label: "Image For App",               to: "/master/image-for-app" },
      { label: "Pick Up Time",                to: "/master/pickup-time" },
      { label: "Employee Type",               to: "/master/employee-type" },
      { label: "Employee",                    to: "/master/employee" },
      { label: "Bank Ledger",                 to: "/master/bank-ledger" },
      { label: "Member Card Master",          to: "/master/member-card" },
      { label: "Topup Bonus Master",          to: "/master/topup-bonus" },
    ],
  },

  {
    key: "setting", label: "Setting", icon: "⚙️", to: "/dashboard/backoffice",
    children: [
      { label: "Night Audit Setting",         to: "/dashboard/backoffice/setting/Night-audit"},
      { label: "Common Settings",             to: "/dashboard/backoffice/setting/Commonsetting"},
      { label: "Booking No Setting",          to: "/dashboard/backoffice/setting/Bookingnositting"},
      { label: "Copy Table Coloum CRM",       to: "/dashboard/backoffice/setting/Copytablecoloumcrm"},
      { label: "Copy Table Coloum List CRM",  to: "/dashboard/backoffice/setting/STableColumnListCRM"},
      { label: "Store Serial No Setting",     to: "/dashboard/backoffice/setting/StoreSerialNoSetting"},
    ]
  },

  {
    key: "common-master", label: "Common Master", icon: "📚", to: "/dashboard/backoffice",
    children: [
      { label: "Unit",                        to: "/dashboard/backoffice/CommonMaster/unit" },
      { label: "Sub Unit",                    to: "/dashboard/backoffice/CommonMaster/Subunit" },
      { label: "Fnb Billing Type",            to: "/dashboard/backoffice/CommonMaster/FnbBillingType" },
      { label: "Currency",                    to: "/dashboard/backoffice/CommonMaster/Currency" },
      { label: "Guest Type",                  to: "/dashboard/backoffice/CommonMaster/GuestType"},
      { label: "Brand",                       to: "/dashboard/backoffice/CommonMaster/Brand" },
      { label: "Deals (Booking Engine)",      to: "/dashboard/backoffice/CommonMaster/Deals" },
      { label: "Void Reasons",                to: "/dashboard/backoffice/CommonMaster/VoidReasons" },
      { label: "Kot Book Manual",             to: "/dashboard/backoffice/CommonMaster/KotBookManual" },
      { label: "Printer Set",                 to: "/dashboard/backoffice/CommonMaster/PrinterSet" },
      { label: "Veg Type",                    to: "/dashboard/backoffice/CommonMaster/VegType" },
      { label: "Emailer Creation",            to: "/dashboard/backoffice/CommonMaster/EmailerCreation" },
      { label: "Email Setting",               to: "/dashboard/backoffice/CommonMaster/EmailSetting" },
      { label: "Email Footer",                to: "/common-master/email-footer" },
      { label: "Reg doc Header Change",       to: "/common-master/reg-doc-header-change" },
      { label: "Printer Setting",             to: "/common-master/printer-setting" },
      { label: "Ledger Mapping",              to: "/common-master/ledger-mapping" },
      { label: "WhatsApp Setting",            to: "/common-master/whatsapp-setting" },
      { label: "Delete NIght Audit Date",     to: "/common-master/delete-night-audit-date" },
      { label: "Business Source",             to: "/common-master/business-source" },
      { label: "SMS Template",                to: "/common-master/sms-template" },
      { label: "Add Client WhatsApp",         to: "/common-master/add-client-whatsapp" },
      { label: "Submit Template",             to: "/common-master/submit-template" },
      { label: "Add WhatsApp Template",       to: "/common-master/add-whatsapp-template" },
    ],
  },

  {
    key: "qr", label: "QR Master", icon: "🔳", to: "/dashboard/backoffice",
    children: [{ label: "QR Menu Setting", to: "/dashboard/backoffice/QRMaster/QRMenuSetting" },

    ]
  },

  {
    key: "user-mgmt", label: "User Management", icon: "👥", to: "/dashboard/backoffice",
    children: [
      { label: "User Role",               to: "/user-management/user-role" },
      { label: "User Creation",           to: "/dashboard/backoffice/masters/user" },
      { label: "User Rights",             to: "/user-management/user-rights" },
      { label: "User Authorization",      to: "/user-management/user-authorization" },
      { label: "User Rights Front",       to: "/user-management/user-rights-front" },
      // { label: "User Module Rights",      to: "/user-management/user-module-rights" },
      // { label: "Notification User Rights",to: "/user-management/notification-rights" },
      { label: "Connect To Branch",       to: "/user-management/connect-to-branch" },
    ],
  },

  // Error Handling is a single external page; no children given
  
  {
    key: "fnb", label: "FNB", icon: "🍽️", to: "/dashboard/backoffice",
    children: [
      { label: "Add Pos Customer Setting", to: "/dashboard/backoffice/fnb/AddPosCustomerSetting" },
      { label: "Coupon Master",            to: "/dashboard/backoffice/fnb/CoponMaster" },
      { label: "Outlet",                   to: "/dashboard/backoffice/fnb/Outlet"},
      { label: "Table",                    to: "/dashboard/backoffice/fnb/Table" },
      { label: "Parent Category",          to: "/dashboard/backoffice/fnb/ParentCategoryPage" },
      { label: "Category",                 to: "/dashboard/backoffice/fnb/Category" },
      { label: "Menu Group",               to: "/dashboard/backoffice/fnb/MenuGroup" },
      { label: "Item",                     to: "/dashboard/backoffice/fnb/Item" },
      { label: "Add Item To Outlet",       to: "/dashboard/backoffice/fnb/AddItemToOutlet" },
      { label: "Out Of Stock",             to: "/dashboard/backoffice/fnb/OutOfStock" },
      { label: "Add kitchen",              to: "/dashboard/backoffice/fnb/AddKitchen" },
      { label: "kitchen Transfer Outlet",  to: "/dashboard/backoffice/fnb/KitchenTransferOutlet" },
      { label: "Banquet Group Selection",  to: "/dashboard/backoffice/fnb/BanquetGroup" },
      { label: "Item Recipe Report",       to: "/fnb/item-recipe-report" },
      { label: "Loyalty Point Setting",    to: "/fnb/loyalty-point-setting" },
    ],
  },

  {
    key: "room", label: "Room", icon: "🛏️", to: "/dashboard/backoffice",
    children: [
      { label: "Tax Range",                    to: "/dashboard/backoffice/room/TaxRange" },
      { label: "Reservation Cancel Setting",   to: "/dashboard/backoffice/room/ReservationCancelSetting"},
      { label: "Block Master",                 to: "/dashboard/backoffice/room/BlockMaster" },
      { label: "Floor Master",                 to: "/dashboard/backoffice/room/FloorMaster" },
      { label: "Room View Type",               to: "/dashboard/backoffice/room/RoomViewType" },
      { label: "Bed Size",                     to: "/dashboard/backoffice/room/BedSize" },
      { label: "Amenity Category Master",      to: "/dashboard/backoffice/room/AmenityCategory" },
      { label: "Amenity SubCategory Master",   to: "/dashboard/backoffice/room/AmenitySubCategory" },
      { label: "Room Category",                to: "/dashboard/backoffice/room/RoomCategory"},
      { label: "Room Plan Type",               to: "/dashboard/backoffice/room/RoomPlanType" },
      { label: "Room Type",                    to: "/dashboard/backoffice/room/RoomType" },
      { label: "Room No. Master",              to: "/dashboard/backoffice/room/RoomNoMaster" },
      { label: "Rack Rate Plan Master",        to: "/room/rack-rate-plan-master" },
      { label: "Room Service Type Master",     to: "/room/service-type-master" },
      { label: "Room Rate Plan",               to: "/room/rate-plan" },
      { label: "Room Rack Rate Plan",          to: "/room/rack-rate-plan" },
      { label: "Room Offfer",                  to: "/room/offer" },
      { label: "Channel Manager Setting Ota",  to: "/room/channel-manager-setting-ota" },
      { label: "Category Designation Map",     to: "/room/category-designation-map" },
      { label: "Channel Manager Code Setting", to: "/room/channel-manager-code-setting" },
    ],
  },

  {
    key: "currency", label: "Currency", icon: "💱", to: "/dashboard/backoffice",
    children: [
      { label: "Set Up",   to: "/dashboard/backoffice/currency/Setup" },
      { label: "Exchange", to: "/dashboard/backoffice/currency/Exchange" },
    ],
  },

  {
    key: "nc", label: "NC", icon: "📈", to: "/dashboard/backoffice",
    children: [
      { label: "NC & Costing", to: "/dashboard/backoffice/nc/NcCosting" },
      { label: "Department",   to: "/dashboard/backoffice/nc/Department" },
    ],
  },

  {
    key: "report", label: "Report", icon: "📊", to: "/dashboard/backoffice",
    children: [
      { label: "UserList",      to: "/dashboard/backoffice/report/UserList" },
      { label: "Feedback List", to: "/dashboard/backoffice/report/FeedbackList"},
    ],
  },

  {
    key: "complain", label: "Complain", icon: "📨", to: "/dashboard/backoffice",
    children: [
      { label: "Complain Type",      to: "/dashboard/backoffice/complain/ComplainType" },
      { label: "Complain User List", to: "/dashboard/backoffice/complain/ComplainUserList" },
    ],
  },

  {
    key: "production", label: "Production", icon: "🏭", to: "/dashboard/backoffice",
    children: [
      { label: "Production Finish", to: "/dashboard/backoffice/production/ProductionFinish" },
      { label: "Add Production",    to: "/dashboard/backoffice/production/AddProduction" },
      { label: "Production Process",to: "/dashboard/backoffice/production/ProductionProcess"},
    ],
  },

  {
    key: "accounts", label: "Accounts", icon: "🧾", to: "/dashboard/backoffice",
    children: [
      { label: "Ledger Export",  to:"/dashboard/backoffice/accounts/LedgerExport" },
      { label: "Voucher Export", to: "/dashboard/backoffice/accounts/VoucherExport" },
      { label: "Upload E-Invoice", to: "/dashboard/backoffice/accounts/UploadEinvoice" },
    ],
  },

  {
    key: "membership", label: "MemberShip", icon: "🎟️", to: "/dashboard/backoffice",
    children: [
      { label: "MemberShip Type",        to: "/dashboard/backoffice/membership/MemberShipType" },
      { label: "MemberShip Service",     to: "/dashboard/backoffice/membership/MemberShipService" },
      { label: "MemberShip Plan",        to: "/dashboard/backoffice/membership/MemberShipPlan" },
      { label: "MemberShip Setting",     to: "/dashboard/backoffice/membership/MemberShipSetting" },
      { label: "MemberShip Plan Details",to: "/dashboard/backoffice/membership/MemberShipPlanDetails" },
    ],
  
    },
  ], []);

  const [isOpen, setIsOpen] = useState(open);
  const toggleSection = (k) => {
    const s = new Set(isOpen);
    s.has(k) ? s.delete(k) : s.add(k);
    setIsOpen(s);
  };

  const isDashboardActive = pathname === "/backoffice" || pathname.startsWith("/backoffice/");

  return (
    <aside className={`rsb ${collapsed ? "rsb--mini" : ""}`}>
      <div className="rsb-top">
        <button className="rsb-burger" onClick={() => setCollapsed(v => !v)} aria-label="Toggle sidebar">
          <span /><span /><span />
        </button>
        {!collapsed && (
          <button className="rsb-close" onClick={() => setCollapsed(true)} aria-label="Collapse">×</button>
        )}
      </div>

      <nav className="rsb-nav">
        <NavLink to="/backoffice" className={"rsb-item" + (isDashboardActive ? " active" : "")}>
          <span className="rsb-ico">🏠</span>
          {!collapsed && <span className="rsb-lbl">Dashboard</span>}
        </NavLink>

        {menus.filter(m => m.key !== "dashboard").map(m => {
          const hasChildren = !!m.children?.length;
          const openNow = isOpen.has(m.key);
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
                  {m.children.map(c => (
                    <NavLink
                      key={c.to}
                      to={c.to}
                      className={({ isActive }) => "rsb-subitem" + (isActive ? " active" : "")}
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





