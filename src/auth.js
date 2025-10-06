// src/auth.js
import { apiFetch } from "./lib/api";

const USER_KEY = "session:user";
const TOKEN_KEY = "session:token";

/**
 * Login
 * @param {object} param0
 * @returns {Promise<object>} user or chooseProperty response
 */
export async function login({ customerId, password, propertyCode }) {
  const data = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ customerId, password, propertyCode }),
  });

  // Case: user has multiple properties → UI should handle
  if (data.chooseProperty) {
    return data; // { chooseProperty:true, properties:[{propertyCode,role}], user:{name,customerId} }
  }

  // Normal case
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  localStorage.setItem(TOKEN_KEY, data.token);
  return data.user;
}

/**
 * Get current session (user object)
 */
export function getSession() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Get auth token
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

/**
 * Logout (clear storage)
 */
export function logout() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Change password
 * @param {object} param0
 * @returns {Promise<object>} { ok:true } or { ok:false, message:"..." }
 */
export async function changePassword({ currentPassword, newPassword }) {
  const data = await apiFetch("/api/auth/change-password", {
    method: "POST",
    auth: true, // apiFetch should add Authorization header when auth:true
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return data;
}
