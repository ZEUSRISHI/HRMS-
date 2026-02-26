import { createContext, useContext, useEffect, useState, ReactNode } from "react";

/* ================= TYPES ================= */

export type Vendor = {
  id: string;
  company: string;
  contactPerson: string;
  email: string;
  phone: string;
  category: string;
  taxId: string;
  address: string;
  createdAt: string;
};

export type Freelancer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  skill: string;
  rate: string;
  contractStart: string;
  contractEnd: string;
  status: "active" | "expired";
  createdAt: string;
};

type WorkforceContextType = {
  vendors: Vendor[];
  freelancers: Freelancer[];
  addVendor: (vendor: Vendor) => void;
  updateVendor: (vendor: Vendor) => void;
  deleteVendor: (id: string) => void;
  addFreelancer: (freelancer: Freelancer) => void;
  updateFreelancer: (freelancer: Freelancer) => void;
  deleteFreelancer: (id: string) => void;
};

/* ================= CONTEXT ================= */

const WorkforceContext = createContext<WorkforceContextType | undefined>(
  undefined
);

/* ================= PROVIDER ================= */

export function WorkforceProvider({ children }: { children: ReactNode }) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);

  /* LOAD FROM STORAGE */
  useEffect(() => {
    try {
      const storedVendors = localStorage.getItem("vendors");
      const storedFreelancers = localStorage.getItem("freelancers");

      if (storedVendors) setVendors(JSON.parse(storedVendors));
      if (storedFreelancers) setFreelancers(JSON.parse(storedFreelancers));
    } catch {
      console.warn("Failed to parse workforce data");
    }
  }, []);

  /* SAVE TO STORAGE */
  useEffect(() => {
    localStorage.setItem("vendors", JSON.stringify(vendors));
  }, [vendors]);

  useEffect(() => {
    localStorage.setItem("freelancers", JSON.stringify(freelancers));
  }, [freelancers]);

  /* CRUD METHODS */

  const addVendor = (vendor: Vendor) =>
    setVendors((prev) => [...prev, vendor]);

  const updateVendor = (vendor: Vendor) =>
    setVendors((prev) => prev.map((v) => (v.id === vendor.id ? vendor : v)));

  const deleteVendor = (id: string) =>
    setVendors((prev) => prev.filter((v) => v.id !== id));

  const addFreelancer = (freelancer: Freelancer) =>
    setFreelancers((prev) => [...prev, freelancer]);

  const updateFreelancer = (freelancer: Freelancer) =>
    setFreelancers((prev) =>
      prev.map((f) => (f.id === freelancer.id ? freelancer : f))
    );

  const deleteFreelancer = (id: string) =>
    setFreelancers((prev) => prev.filter((f) => f.id !== id));

  return (
    <WorkforceContext.Provider
      value={{
        vendors,
        freelancers,
        addVendor,
        updateVendor,
        deleteVendor,
        addFreelancer,
        updateFreelancer,
        deleteFreelancer,
      }}
    >
      {children}
    </WorkforceContext.Provider>
  );
}

/* ================= HOOK ================= */

export function useWorkforce() {
  const context = useContext(WorkforceContext);
  if (!context) throw new Error("useWorkforce must be used inside WorkforceProvider");
  return context;
}