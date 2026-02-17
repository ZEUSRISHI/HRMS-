import { createContext, useContext, useState, ReactNode } from "react";

/* ================= TYPES ================= */

export type Vendor = {
  id: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  category: string;
  taxId: string;
  address: string;
};

export type Freelancer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  skill: string;
  rate: string;
  experience: string;
  portfolio: string;
};

type WorkforceContextType = {
  vendors: Vendor[];
  freelancers: Freelancer[];
  addVendor: (vendor: Vendor) => void;
  addFreelancer: (freelancer: Freelancer) => void;
  deleteVendor: (id: string) => void;
  deleteFreelancer: (id: string) => void;
};

/* ================= CONTEXT ================= */

const WorkforceContext = createContext<WorkforceContextType | undefined>(
  undefined
);

export function WorkforceProvider({ children }: { children: ReactNode }) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);

  const addVendor = (vendor: Vendor) =>
    setVendors((prev) => [...prev, vendor]);

  const addFreelancer = (freelancer: Freelancer) =>
    setFreelancers((prev) => [...prev, freelancer]);

  const deleteVendor = (id: string) =>
    setVendors((prev) => prev.filter((v) => v.id !== id));

  const deleteFreelancer = (id: string) =>
    setFreelancers((prev) => prev.filter((f) => f.id !== id));

  return (
    <WorkforceContext.Provider
      value={{
        vendors,
        freelancers,
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

export function useWorkforce() {
  const ctx = useContext(WorkforceContext);
  if (!ctx) throw new Error("useWorkforce must be used inside provider");
  return ctx;
}
