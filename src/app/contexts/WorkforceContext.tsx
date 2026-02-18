import { createContext, useContext, useState, ReactNode } from "react";

/* ================= TYPES ================= */

/* Employee */
export type Employee = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "hr" | "employee";
};

/* Vendor */
export type Vendor = {
  id: string;
  name?: string;
  company: string;
  contact?: string;
  email: string;
  phone: string;
  category?: string;
  taxId?: string;
  address?: string;
};

/* Freelancer */
export type Freelancer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  skill: string;
  rate?: string;
  experience?: string;
  portfolio?: string;
};

/* ================= CONTEXT TYPE ================= */

type WorkforceContextType = {
  employees: Employee[];
  vendors: Vendor[];
  freelancers: Freelancer[];

  addEmployee: (emp: Employee) => void;
  addVendor: (vendor: Vendor) => void;
  addFreelancer: (freelancer: Freelancer) => void;

  deleteVendor: (id: string) => void;
  deleteFreelancer: (id: string) => void;
};

/* ================= CONTEXT ================= */

const WorkforceContext = createContext<WorkforceContextType | undefined>(
  undefined
);

/* ================= PROVIDER ================= */

export function WorkforceProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);

  /* Add Functions */
  const addEmployee = (emp: Employee) => {
    setEmployees((prev) => [...prev, emp]);
  };

  const addVendor = (vendor: Vendor) => {
    setVendors((prev) => [...prev, vendor]);
  };

  const addFreelancer = (freelancer: Freelancer) => {
    setFreelancers((prev) => [...prev, freelancer]);
  };

  /* Delete Functions */
  const deleteVendor = (id: string) => {
    setVendors((prev) => prev.filter((v) => v.id !== id));
  };

  const deleteFreelancer = (id: string) => {
    setFreelancers((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <WorkforceContext.Provider
      value={{
        employees,
        vendors,
        freelancers,
        addEmployee,
        addVendor,
        addFreelancer,
        deleteVendor,
        deleteFreelancer,
      }}
    >
      {children}
    </WorkforceContext.Provider>
  );
}

/* ================= HOOK ================= */

export function useWorkforce() {
  const ctx = useContext(WorkforceContext);
  if (!ctx) {
    throw new Error("useWorkforce must be used inside WorkforceProvider");
  }
  return ctx;
}
