export type Role = "admin" | "manager" | "hr" | "employee";

/* ADMIN = VIEW ONLY */

export const canViewWorkforce = (role?: Role) =>
  role === "admin" || role === "manager" || role === "hr";

export const canManageVendors = (role?: Role) =>
  role === "manager"; // ❌ admin removed

export const canManageFreelancers = (role?: Role) =>
  role === "manager"; // ❌ admin removed

export const canManageFreelancerContracts = (role?: Role) =>
  role === "manager" || role === "hr";