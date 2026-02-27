export type Role = "admin" | "manager" | "hr" | "employee";

export const canManageVendors = (role?: Role) =>
  role === "admin" || role === "manager";

export const canManageFreelancers = (role?: Role) =>
  role === "admin" || role === "manager";

export const canManageFreelancerContracts = (role?: Role) =>
  role === "admin" || role === "hr";