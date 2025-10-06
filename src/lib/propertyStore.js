//     // src/lib/propertyStore.js
// import { apiFetch } from "./api";

// const LS_KEY = "currentPropertyCode";
// const EVT = "property:changed";

// export function getCurrentPropertyCode() {
//   return (localStorage.getItem(LS_KEY) || "").toUpperCase();
// }

// export function setCurrentPropertyCode(code = "") {
//   const upper = String(code || "").toUpperCase();
//   if (upper) localStorage.setItem(LS_KEY, upper);
//   else localStorage.removeItem(LS_KEY);
//   window.dispatchEvent(new CustomEvent(EVT, { detail: upper }));
// }

// export function onPropertyChange(cb) {
//   const handler = (e) => cb(e.detail || "");
//   window.addEventListener(EVT, handler);
//   return () => window.removeEventListener(EVT, handler);
// }

// export async function listMyProperties() {
//   const res = await apiFetch("/api/properties?limit=500", { auth: true });
//   const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
//   return list.map(p => ({ code: (p.code || "").toUpperCase(), name: p.name || p.code }));
// }
