import { createContext, useContext, useEffect, useState, ReactNode } from "react";

/* ================= TYPES ================= */

export interface Vendor {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  service: string;
}

export interface Freelancer {
  id: string;
  name: string;
  skill: string;
  email: string;
  phone: string;
  rate: string;
}

interface WorkforceContextType {
  vendors: Vendor[];
  freelancers: Freelancer[];

  addVendor: (vendor: Vendor) => void;
  addFreelancer: (freelancer: Freelancer) => void;

  deleteVendor: (id: string) => void;
  deleteFreelancer: (id: string) => void;
}

const WorkforceContext = createContext<WorkforceContextType | undefined>(undefined);

/* ================= PROVIDER ================= */

export function WorkforceProvider({ children }: { children: ReactNode }) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);

  useEffect(() => {
    const storedVendors = localStorage.getItem("hrms_vendors");
    const storedFreelancers = localStorage.getItem("hrms_freelancers");

    if (storedVendors) setVendors(JSON.parse(storedVendors));
    if (storedFreelancers) setFreelancers(JSON.parse(storedFreelancers));
  }, []);

  useEffect(() => {
    localStorage.setItem("hrms_vendors", JSON.stringify(vendors));
  }, [vendors]);

  useEffect(() => {
    localStorage.setItem("hrms_freelancers", JSON.stringify(freelancers));
  }, [freelancers]);

  const addVendor = (vendor: Vendor) => {
    setVendors((prev) => [...prev, vendor]);
  };

  const addFreelancer = (freelancer: Freelancer) => {
    setFreelancers((prev) => [...prev, freelancer]);
  };

  const deleteVendor = (id: string) => {
    setVendors((prev) => prev.filter((v) => v.id !== id));
  };

  const deleteFreelancer = (id: string) => {
    setFreelancers((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <WorkforceContext.Provider
      value={{ vendors, freelancers, addVendor, addFreelancer, deleteVendor, deleteFreelancer }}
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
