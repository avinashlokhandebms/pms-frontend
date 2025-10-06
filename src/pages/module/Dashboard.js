// // src/pages/Dashboard.js
// import { useEffect, useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { getSession, logout } from "../../auth";
// import ChangePasswordModal from "../../components/ChangePasswordModal";

// // ---- assets (from src/assets/…)
// import Logo from "../../assets/logo/Logo.png";
// import icBooking from "../../assets/icons/booking.png";
// import icReservation from "../../assets/icons/reservation.png";
// import icBackoffice from "../../assets/icons/backoffice.png";
// import icFrontdesk from "../../assets/icons/frontdesk.png";
// import icPos from "../../assets/icons/pos.png";
// import icHousekeeping from "../../assets/icons/housekeeping.png";
// import icKds from "../../assets/icons/kds.png";
// import icReport from "../../assets/icons/report.png";
// import icInventory from "../../assets/icons/inventory.png";

// // Per-role modules (extend others later if needed)
// const ROLE_MODULES = {
//   superadmin: [
//     { id: "bookingEngine", title: "BOOKING ENGINE", icon: icBooking },
//     { id: "reservation",   title: "RESERVATION",    icon: icReservation },
//     { id: "backoffice",    title: "BACK OFFICE",    icon: icBackoffice },
//     { id: "frontdesk",     title: "FRONT DESK",     icon: icFrontdesk },
//     { id: "pos",           title: "POS",            icon: icPos },
//     { id: "housekeeping",  title: "HOUSE KEEPING",  icon: icHousekeeping },
//     { id: "kds",           title: "KDS",            icon: icKds },
//     { id: "report",        title: "REPORT",         icon: icReport },
//     { id: "inventory",     title: "BOOKING INVENTORY", icon: icInventory },
//   ],
// };

// // Map module ids to routes
// const ROUTE_BY_ID = {
//   // bookingEngine: "/booking-engine",
//   // reservation:   "/dashboard/reservation",
//   // backoffice:    "/backoffice",
//   // frontdesk:     "/frontdesk",
//   // pos:           "/pos",
//   // housekeeping:  "/housekeeping",
//   // kds:           "/kds",
//   // report:        "/report",
//   // inventory:     "/inventory",

//   bookingEngine:     "/dashboard/booking-engine",
//   reservation:       "/dashboard/reservation",
//   backoffice:        "/dashboard/backoffice",
//   frontdesk:         "/dashboard/frontdesk",
//   pos:               "/dashboard/pos",
//   ousekeeping:       "/dashboard/housekeeping",
//   kds:               "/dashboard/kds",
//   report:            "/dashboard/report",
//   inventory:         "/dashboard/inventory"
// };

// export default function Dashboard() {
//   const navigate = useNavigate();
//   const [session, setSession] = useState(null);
//   const [menuOpen, setMenuOpen] = useState(false);
//   const [pwOpen, setPwOpen] = useState(false);

//   useEffect(() => {
//     const s = getSession();
//     if (!s) return navigate("/login");
//     setSession(s);
//   }, [navigate]);

//   // If you later store `modules` in session, filter here.
//   const modules = useMemo(() => {
//     if (!session) return [];
//     const list = ROLE_MODULES[session.role] || [];
//     // Example to filter by allowed modules if present:
//     // if (session.modules?.length) {
//     //   return list.filter(m => session.modules.includes(m.id));
//     // }
//     return list;
//   }, [session]);

//   if (!session) return null;

//   const openModule = (id) => {
//     const path = ROUTE_BY_ID[id] || `/module/${id}`;
//     navigate(path);
//   };

//   // Close the menu when clicking outside (optional nicety)
//   const closeMenus = () => setMenuOpen(false);

//   return (
//     <div className="board" onClick={closeMenus}>
//       {/* top bar */}
//       <header className="topbar" onClick={(e) => e.stopPropagation()}>
//         <div className="brandbar">
//           <img src={Logo} alt="Trustify" className="logo" />
//         </div>
//         <div className="usercluster">
//           <span className="prop">
//             {session.propertyCode}_{session.name?.replace(/\s+/g, "").toUpperCase()}
//           </span>
//           <div className="avatarWrap">
//             <button
//               className="avatarBtn"
//               aria-haspopup="menu"
//               aria-expanded={menuOpen}
//               onClick={(e) => {
//                 e.stopPropagation();
//                 setMenuOpen((v) => !v);
//               }}
//             >
//               <span className="avatarIcon">👤</span>
//             </button>
//             {menuOpen && (
//               <div className="menu" role="menu">
//                 <button
//                   className="menuItem"
//                   onClick={() => {
//                     setPwOpen(true);
//                     setMenuOpen(false);
//                   }}
//                 >
//                   Change Password
//                 </button>
//                 <button
//                   className="menuItem danger"
//                   onClick={() => {
//                     logout();
//                     navigate("/login");
//                   }}
//                 >
//                   Logout
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       </header>

//       {/* tiles */}
//       <div className="dashwrap" onClick={(e) => e.stopPropagation()}>
//         <section className="tilesCol">
//           <div className="tilesGrid">
//             {modules.map((m) => (
//               <button
//                 key={m.id}
//                 className="tile"
//                 onClick={() => openModule(m.id)}
//               >
//                 <div className="tileIconWrap">
//                   <img src={m.icon} alt="" className="tileIcon" />
//                 </div>
//                 <div className="tileTitle">{m.title}</div>
//               </button>
//             ))}
//           </div>
//         </section>
//       </div>

//       {/* Change Password Modal */}
//       <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
//     </div>
//   );
// }


// src/pages/Dashboard.js
// import { useEffect, useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { getSession, logout } from "../../auth";
// import ChangePasswordModal from "../../components/ChangePasswordModal";

// import Logo from "../../assets/logo/Logo.png";
// import icBooking from "../../assets/icons/booking.png";
// import icReservation from "../../assets/icons/reservation.png";
// import icBackoffice from "../../assets/icons/backoffice.png";
// import icFrontdesk from "../../assets/icons/frontdesk.png";
// import icPos from "../../assets/icons/pos.png";
// import icHousekeeping from "../../assets/icons/housekeeping.png";
// import icKds from "../../assets/icons/kds.png";
// import icReport from "../../assets/icons/report.png";
// import icInventory from "../../assets/icons/inventory.png";

// // Base module catalog (what the app can show)
// const CATALOG = [
//   { id: "bookingEngine", title: "BOOKING ENGINE", icon: icBooking },
//   { id: "reservation",   title: "RESERVATION",    icon: icReservation },
//   { id: "backoffice",    title: "BACK OFFICE",    icon: icBackoffice },
//   { id: "frontdesk",     title: "FRONT DESK",     icon: icFrontdesk },
//   { id: "pos",           title: "POS",            icon: icPos },
//   { id: "housekeeping",  title: "HOUSE KEEPING",  icon: icHousekeeping },
//   { id: "kds",           title: "KDS",            icon: icKds },
//   { id: "report",        title: "REPORT",         icon: icReport },
//   { id: "inventory",     title: "BOOKING INVENTORY", icon: icInventory },
// ];

// // Per-role visibility (superadmin sees all, others as needed)
// const ROLE_VISIBLE = {
//   superadmin: CATALOG.map(m => m.id),
//   admin:      ["bookingEngine","reservation","frontdesk","pos","housekeeping","kds","report","inventory"],
//   employee:   ["reservation","frontdesk","housekeeping"],
// };

// // Route map
// const ROUTE_BY_ID = {
//   bookingEngine: "/dashboard/booking-engine",
//   reservation:   "/dashboard/reservation",
//   backoffice:    "/dashboard/backoffice",
//   frontdesk:     "/dashboard/frontdesk",
//   pos:           "/dashboard/pos",
//   housekeeping:  "/dashboard/housekeeping", // fixed typo
//   kds:           "/dashboard/kds",
//   report:        "/dashboard/report",
//   inventory:     "/dashboard/inventory",
// };

// // Helper: final allow check
// function canAccessModule(session, id) {
//   if (!session) return false;
//   // role-based allowlist
//   const roleList = ROLE_VISIBLE[session.role] || [];
//   let allowed = roleList.includes(id);

//   // optional: further narrow using user’s granted modules in session (if present)
//   if (allowed && Array.isArray(session.modules) && session.modules.length) {
//     allowed = session.modules.includes(id);
//   }

//   // Enforce backoffice = superadmin only:
//   if (id === "backoffice" && session.role !== "superadmin") return false;

//   return allowed;
// }

// export default function Dashboard() {
//   const navigate = useNavigate();
//   const [session, setSession] = useState(null);
//   const [menuOpen, setMenuOpen] = useState(false);
//   const [pwOpen, setPwOpen] = useState(false);

//   useEffect(() => {
//     const s = getSession();
//     if (!s) return navigate("/login");
//     setSession(s);
//   }, [navigate]);

//   const modules = useMemo(() => {
//     if (!session) return [];
//     const base = CATALOG.filter(m => canAccessModule(session, m.id));
//     return base;
//   }, [session]);

//   if (!session) return null;

//   const openModule = (id) => {
//     if (!canAccessModule(session, id)) {
//       alert("You don’t have access to this module.");
//       return;
//     }
//     const path = ROUTE_BY_ID[id] || `/module/${id}`;
//     navigate(path);
//   };

//   const closeMenus = () => setMenuOpen(false);

//   return (
//     <div className="board" onClick={closeMenus}>
//       {/* top bar */}
//       <header className="topbar" onClick={(e) => e.stopPropagation()}>
//         <div className="brandbar">
//           <img src={Logo} alt="Trustify" className="logo" />
//         </div>
//         <div className="usercluster">
//           <span className="prop">
//             {session.propertyCode}_{session.name?.replace(/\s+/g, "").toUpperCase()}
//           </span>
//           <div className="avatarWrap">
//             <button
//               className="avatarBtn"
//               aria-haspopup="menu"
//               aria-expanded={menuOpen}
//               onClick={(e) => {
//                 e.stopPropagation();
//                 setMenuOpen((v) => !v);
//               }}
//             >
//               <span className="avatarIcon">👤</span>
//             </button>
//             {menuOpen && (
//               <div className="menu" role="menu">
//                 <button
//                   className="menuItem"
//                   onClick={() => { setPwOpen(true); setMenuOpen(false); }}
//                 >
//                   Change Password
//                 </button>
//                 <button
//                   className="menuItem danger"
//                   onClick={() => { logout(); navigate("/login"); }}
//                 >
//                   Logout
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       </header>

//       {/* tiles */}
//       <div className="dashwrap" onClick={(e) => e.stopPropagation()}>
//         <section className="tilesCol">
//           <div className="tilesGrid">
//             {modules.map((m) => (
//               <button
//                 key={m.id}
//                 className="tile"
//                 onClick={() => openModule(m.id)}
//                 title={m.title}
//               >
//                 <div className="tileIconWrap">
//                   <img src={m.icon} alt="" className="tileIcon" />
//                 </div>
//                 <div className="tileTitle">{m.title}</div>
//               </button>
//             ))}
//           </div>
//         </section>
//       </div>

//       <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
//     </div>
//   );
// }


// src/pages/Dashboard.js
// import { useEffect, useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { getSession, logout } from "../../auth";
// import ChangePasswordModal from "../../components/ChangePasswordModal";

// import Logo from "../../assets/logo/Logo.png";
// import icBooking from "../../assets/icons/booking.png";
// import icReservation from "../../assets/icons/reservation.png";
// import icBackoffice from "../../assets/icons/backoffice.png";
// import icFrontdesk from "../../assets/icons/frontdesk.png";
// import icPos from "../../assets/icons/pos.png";
// import icHousekeeping from "../../assets/icons/housekeeping.png";
// import icKds from "../../assets/icons/kds.png";
// import icReport from "../../assets/icons/report.png";
// import icInventory from "../../assets/icons/inventory.png";

// /* -------- Catalog: all modules your app can show -------- */
// const CATALOG = [
//   { id: "bookingEngine", title: "BOOKING ENGINE",    icon: icBooking },
//   { id: "reservation",   title: "RESERVATION",       icon: icReservation },
//   { id: "backoffice",    title: "BACK OFFICE",       icon: icBackoffice },
//   { id: "frontdesk",     title: "FRONT DESK",        icon: icFrontdesk },
//   { id: "pos",           title: "POS",               icon: icPos },
//   { id: "housekeeping",  title: "HOUSE KEEPING",     icon: icHousekeeping },
//   { id: "kds",           title: "KDS",               icon: icKds },
//   { id: "report",        title: "REPORT",            icon: icReport },
//   { id: "inventory",     title: "BOOKING INVENTORY", icon: icInventory },
// ];

// /* -------- Route map -------- */
// const ROUTE_BY_ID = {
//   bookingEngine: "/dashboard/booking-engine",
//   reservation:   "/dashboard/reservation",
//   backoffice:    "/dashboard/backoffice",
//   frontdesk:     "/dashboard/frontdesk",
//   pos:           "/dashboard/pos",
//   housekeeping:  "/dashboard/housekeeping",
//   kds:           "/dashboard/kds",
//   report:        "/dashboard/report",
//   inventory:     "/dashboard/inventory",
// };

// /* ---------------- Helpers (dynamic permissions) ---------------- */

// /** Returns array of allowed module ids for this session. */
// function getAllowedModules(session) {
//   if (!session) return [];

//   // 1) Superadmin = everything
//   if (session.role === "superadmin") {
//     return CATALOG.map(m => m.id);
//   }

//   // 2) Others: read from session.modules OR from memberships for the current property
//   let assigned = [];

//   if (Array.isArray(session.modules) && session.modules.length) {
//     assigned = session.modules;
//   } else if (Array.isArray(session.memberships) && session.propertyCode) {
//     const currentProp = String(session.propertyCode || "").toUpperCase();
//     const mem = session.memberships.find(
//       m => (m.propertyCode || "").toUpperCase() === currentProp
//     );
//     if (mem?.modules?.length) assigned = mem.modules;
//   }

//   // 3) Backoffice is superadmin-only
//   return assigned.filter(id => id !== "backoffice");
// }

// /** Single check, used before navigating. */
// function canAccessModule(session, id) {
//   if (!session) return false;
//   if (session.role === "superadmin") return true; // all allowed
//   if (id === "backoffice") return false;          // block for non-superadmin
//   const allowed = getAllowedModules(session);
//   return allowed.includes(id);
// }

// /* ---------------- Component ---------------- */

// export default function Dashboard() {
//   const navigate = useNavigate();
//   const [session, setSession] = useState(null);
//   const [menuOpen, setMenuOpen] = useState(false);
//   const [pwOpen, setPwOpen] = useState(false);

//   useEffect(() => {
//     const s = getSession();
//     if (!s) return navigate("/login");
//     setSession(s);
//   }, [navigate]);

//   const modules = useMemo(() => {
//     if (!session) return [];
//     const allowedIds = getAllowedModules(session);
//     return CATALOG.filter(m => allowedIds.includes(m.id));
//   }, [session]);

//   if (!session) return null;

//   const openModule = (id) => {
//     if (!canAccessModule(session, id)) {
//       alert("You don’t have access to this module.");
//       return;
//     }
//     navigate(ROUTE_BY_ID[id] || `/module/${id}`);
//   };

//   const closeMenus = () => setMenuOpen(false);

//   return (
//     <div className="board" onClick={closeMenus}>
//       {/* Top bar */}
//       <header className="topbar" onClick={(e) => e.stopPropagation()}>
//         <div className="brandbar">
//           <img src={Logo} alt="Trustify" className="logo" />
//         </div>
//         <div className="usercluster">
//           <span className="prop">
//             {session.propertyCode}_{session.name?.replace(/\s+/g, "").toUpperCase()}
//           </span>
//           <div className="avatarWrap">
//             <button
//               className="avatarBtn"
//               aria-haspopup="menu"
//               aria-expanded={menuOpen}
//               onClick={(e) => {
//                 e.stopPropagation();
//                 setMenuOpen(v => !v);
//               }}
//             >
//               <span className="avatarIcon">👤</span>
//             </button>
//             {menuOpen && (
//               <div className="menu" role="menu">
//                 <button className="menuItem" onClick={() => { setPwOpen(true); setMenuOpen(false); }}>
//                   Change Password
//                 </button>
//                 <button className="menuItem danger" onClick={() => { logout(); navigate("/login"); }}>
//                   Logout
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       </header>

//       {/* Tiles */}
//       <div className="dashwrap" onClick={(e) => e.stopPropagation()}>
//         <section className="tilesCol">
//           <div className="tilesGrid">
//             {modules.map((m) => (
//               <button
//                 key={m.id}
//                 className="tile"
//                 onClick={() => openModule(m.id)}
//                 title={m.title}
//               >
//                 <div className="tileIconWrap">
//                   <img src={m.icon} alt="" className="tileIcon" />
//                 </div>
//                 <div className="tileTitle">{m.title}</div>
//               </button>
//             ))}
//           </div>
//         </section>
//       </div>

//       <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
//     </div>
//   );
// }


// // src/pages/Dashboard.js
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession, logout } from "../../auth";
import ChangePasswordModal from "../../components/ChangePasswordModal";

import Logo from "../../assets/logo/Logo.png";
import icBooking from "../../assets/icons/booking.png";
import icReservation from "../../assets/icons/reservation.png";
import icBackoffice from "../../assets/icons/backoffice.png";
import icFrontdesk from "../../assets/icons/frontdesk.png";
import icPos from "../../assets/icons/pos.png";
import icHousekeeping from "../../assets/icons/housekeeping.png";
import icKds from "../../assets/icons/kds.png";
import icReport from "../../assets/icons/report.png";
import icInventory from "../../assets/icons/inventory.png";

/* ---------- Catalog (what the app can show) ---------- */
const CATALOG = [
  { id: "bookingEngine", title: "BOOKING ENGINE", icon: icBooking },
  { id: "reservation",   title: "RESERVATION",    icon: icReservation },
  { id: "backoffice",    title: "BACK OFFICE",    icon: icBackoffice },
  { id: "frontdesk",     title: "FRONT DESK",     icon: icFrontdesk },
  { id: "pos",           title: "POS",            icon: icPos },
  { id: "housekeeping",  title: "HOUSE KEEPING",  icon: icHousekeeping },
  { id: "kds",           title: "KDS",            icon: icKds },
  { id: "report",        title: "REPORT",         icon: icReport },
  { id: "inventory",     title: "BOOKING INVENTORY", icon: icInventory },
];

/* ---------- Routes for modules ---------- */
const ROUTE_BY_ID = {
  bookingEngine: "/dashboard/booking-engine",
  reservation:   "/dashboard/reservation",
  backoffice:    "/dashboard/backoffice",
  frontdesk:     "/dashboard/frontdesk",
  pos:           "/dashboard/pos",
  housekeeping:  "/dashboard/housekeeping",
  kds:           "/dashboard/kds",
  report:        "/dashboard/report",
  inventory:     "/dashboard/inventory",
};

/* ---------- Grants resolver (NO ROLE DEFAULTS) ---------- */
function getGrantedModules(session) {
  if (!session) return [];

  // 1) Prefer active property's membership.modules
  const activeCode = session.propertyCode;
  const mem = session.memberships?.find((m) => m.propertyCode === activeCode);
  const membershipGrants =
    Array.isArray(mem?.modules) && mem.modules.length ? mem.modules : null;
  if (membershipGrants) return membershipGrants;

  // 2) Fallback to top-level session.modules (if you store it)
  const topGrants =
    Array.isArray(session.modules) && session.modules.length
      ? session.modules
      : null;
  if (topGrants) return topGrants;

  // 3) Nothing granted
  return [];
}

/* ---------- Access check (Backoffice = superadmin-only) ---------- */
function canAccessModule(session, id) {
  const grants = getGrantedModules(session);
  let allowed = grants.includes(id);
  if (id === "backoffice" && session.role !== "superadmin") return false;
  return allowed;
}

/* ===================================================== */

export default function Dashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s) return navigate("/login");
    setSession(s);
  }, [navigate]);

  // Build tiles strictly from granted modules
  const modules = useMemo(() => {
    if (!session) return [];
    const grants = getGrantedModules(session);
    return CATALOG.filter(
      (m) => grants.includes(m.id) && (m.id !== "backoffice" || session.role === "superadmin")
    );
  }, [session]);

  if (!session) return null;

  const openModule = (id) => {
    if (!canAccessModule(session, id)) {
      alert("You don’t have access to this module.");
      return;
    }
    const path = ROUTE_BY_ID[id] || `/module/${id}`;
    navigate(path);
  };

  const closeMenus = () => setMenuOpen(false);

  return (
    <div className="board" onClick={closeMenus}>
      {/* Top bar */}
      <header className="topbar" onClick={(e) => e.stopPropagation()}>
        <div className="brandbar">
          <img src={Logo} alt="Trustify" className="logo" />
        </div>
        <div className="usercluster">
          <span className="prop">
            {session.propertyCode}_{session.name?.replace(/\s+/g, "").toUpperCase()}
          </span>
          <div className="avatarWrap">
            <button
              className="avatarBtn"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
            >
              <span className="avatarIcon">👤</span>
            </button>
            {menuOpen && (
              <div className="menu" role="menu">
                <button
                  className="menuItem"
                  onClick={() => {
                    setPwOpen(true);
                    setMenuOpen(false);
                  }}
                >
                  Change Password
                </button>
                <button
                  className="menuItem danger"
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tiles */}
      <div className="dashwrap" onClick={(e) => e.stopPropagation()}>
        <section className="tilesCol">
          <div className="tilesGrid">
            {modules.map((m) => (
              <button
                key={m.id}
                className="tile"
                onClick={() => openModule(m.id)}
                title={m.title}
              >
                <div className="tileIconWrap">
                  <img src={m.icon} alt="" className="tileIcon" />
                </div>
                <div className="tileTitle">{m.title}</div>
              </button>
            ))}
            {/* If nothing is granted, you can show a hint */}
            {modules.length === 0 && (
              <div style={{ padding: 24, color: "#6b7280", fontWeight: 700 }}>
                No modules granted for this property. Contact your administrator.
              </div>
            )}
          </div>
        </section>
      </div>

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}

//src/pages/Dashboard.js
// import { useEffect, useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { getSession, logout } from "../../auth";
// import ChangePasswordModal from "../../components/ChangePasswordModal";

// import Logo from "../../assets/logo/Logo.png";
// import icBooking from "../../assets/icons/booking.png";
// import icReservation from "../../assets/icons/reservation.png";
// import icBackoffice from "../../assets/icons/backoffice.png";
// import icFrontdesk from "../../assets/icons/frontdesk.png";
// import icPos from "../../assets/icons/pos.png";
// import icHousekeeping from "../../assets/icons/housekeeping.png";
// import icKds from "../../assets/icons/kds.png";
// import icReport from "../../assets/icons/report.png";
// import icInventory from "../../assets/icons/inventory.png";

// // Full catalog: id -> { meta }
// const CATALOG = [
//   { id: "bookingEngine", title: "BOOKING ENGINE", icon: icBooking },
//   { id: "reservation",   title: "RESERVATION",    icon: icReservation },
//   { id: "backoffice",    title: "BACK OFFICE",    icon: icBackoffice },
//   { id: "frontdesk",     title: "FRONT DESK",     icon: icFrontdesk },
//   { id: "pos",           title: "POS",            icon: icPos },
//   { id: "housekeeping",  title: "HOUSE KEEPING",  icon: icHousekeeping },
//   { id: "kds",           title: "KDS",            icon: icKds },
//   { id: "report",        title: "REPORT",         icon: icReport },
//   { id: "inventory",     title: "BOOKING INVENTORY", icon: icInventory },
// ];

// const ROLE_DEFAULTS = {
//   superadmin: CATALOG.map((m) => m.id),
//   admin: ["bookingEngine","reservation","frontdesk","pos","housekeeping","kds","report","inventory"],
//   employee: ["reservation","frontdesk","housekeeping"],
// };

// const ROUTE_BY_ID = {
//   bookingEngine: "/dashboard/booking-engine",
//   reservation:   "/dashboard/reservation",
//   backoffice:    "/dashboard/backoffice",
//   frontdesk:     "/dashboard/frontdesk",
//   pos:           "/dashboard/pos",
//   housekeeping:  "/dashboard/housekeeping",
//   kds:           "/dashboard/kds",
//   report:        "/dashboard/report",
//   inventory:     "/dashboard/inventory",
// };

// export default function Dashboard() {
//   const navigate = useNavigate();
//   const [session, setSession] = useState(null);
//   const [menuOpen, setMenuOpen] = useState(false);
//   const [pwOpen, setPwOpen] = useState(false);

//   useEffect(() => {
//     const s = getSession();
//     if (!s) { navigate("/login"); return; }
//     setSession(s);
//   }, [navigate]);

//   const allowedIds = useMemo(() => {
//     if (!session) return [];
//     // Prefer the server-provided modules for the selected property
//     let ids = Array.isArray(session.activeModules) ? session.activeModules : [];
//     // Safety fallback
//     if (!ids.length) ids = ROLE_DEFAULTS[session.role] || [];
//     // Enforce: Back Office is superadmin only
//     if (session.role !== "superadmin") {
//       ids = ids.filter((id) => id !== "backoffice");
//     }
//     return ids;
//   }, [session]);

//   const tiles = useMemo(
//     () => CATALOG.filter((m) => allowedIds.includes(m.id)),
//     [allowedIds]
//   );

//   if (!session) return null;

//   const openModule = (id) => {
//     if (!allowedIds.includes(id)) {
//       alert("You don’t have access to this module.");
//       return;
//     }
//     navigate(ROUTE_BY_ID[id] || `/module/${id}`);
//   };

//   return (
//     <div className="board" onClick={() => setMenuOpen(false)}>
//       <header className="topbar" onClick={(e) => e.stopPropagation()}>
//         <div className="brandbar">
//           <img src={Logo} alt="Trustify" className="logo" />
//         </div>
//         <div className="usercluster">
//           <span className="prop">
//             {session.propertyCode}_{session.name?.replace(/\s+/g, "").toUpperCase()}
//           </span>
//           <div className="avatarWrap">
//             <button className="avatarBtn" onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}>
//               <span className="avatarIcon">👤</span>
//             </button>
//             {menuOpen && (
//               <div className="menu" role="menu">
//                 <button className="menuItem" onClick={() => { setPwOpen(true); setMenuOpen(false); }}>
//                   Change Password
//                 </button>
//                 <button className="menuItem danger" onClick={() => { logout(); navigate("/login"); }}>
//                   Logout
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       </header>

//       <div className="dashwrap" onClick={(e) => e.stopPropagation()}>
//         <section className="tilesCol">
//           <div className="tilesGrid">
//             {tiles.length ? (
//               tiles.map((m) => (
//                 <button key={m.id} className="tile" onClick={() => openModule(m.id)} title={m.title}>
//                   <div className="tileIconWrap"><img src={m.icon} alt="" className="tileIcon" /></div>
//                   <div className="tileTitle">{m.title}</div>
//                 </button>
//               ))
//             ) : (
//               <div style={{ padding: 24, color: "#6b7280" }}>
//                 No modules granted for this property. Contact your administrator.
//               </div>
//             )}
//           </div>
//         </section>
//       </div>

//       <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
//     </div>
//   );
// }
