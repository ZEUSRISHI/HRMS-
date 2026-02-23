import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Freelancer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  skill: string;
  rate: string;
  experience: string;
  portfolio: string;
  createdAt: string;
};

export type Vendor = {
  id: string;
  name: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  category: string;
  taxId: string;
  address: string;
  createdAt: string;
};

type WorkforceContextType = {
  freelancers: Freelancer[];
  vendors: Vendor[];
  addFreelancer: (f: Freelancer) => void;
  updateFreelancer: (f: Freelancer) => void;
  deleteFreelancer: (id: string) => void;
  addVendor: (v: Vendor) => void;
  updateVendor: (v: Vendor) => void;
  deleteVendor: (id: string) => void;
};

const WorkforceContext = createContext<WorkforceContextType | null>(null);

export const WorkforceProvider = ({ children }: { children: ReactNode }) => {
  const [freelancers, setFreelancers] = useState<Freelancer[]>(() => {
    const data = localStorage.getItem("freelancers");
    return data ? JSON.parse(data) : [];
  });

  const [vendors, setVendors] = useState<Vendor[]>(() => {
    const data = localStorage.getItem("vendors");
    return data ? JSON.parse(data) : [];
  });

  useEffect(() => {
    localStorage.setItem("freelancers", JSON.stringify(freelancers));
  }, [freelancers]);

  useEffect(() => {
    localStorage.setItem("vendors", JSON.stringify(vendors));
  }, [vendors]);

  const value: WorkforceContextType = {
    freelancers,
    vendors,
    addFreelancer: (f) => setFreelancers((prev) => [...prev, f]),
    updateFreelancer: (f) =>
      setFreelancers((prev) => prev.map((x) => (x.id === f.id ? f : x))),
    deleteFreelancer: (id) =>
      setFreelancers((prev) => prev.filter((x) => x.id !== id)),

    addVendor: (v) => setVendors((prev) => [...prev, v]),
    updateVendor: (v) =>
      setVendors((prev) => prev.map((x) => (x.id === v.id ? v : x))),
    deleteVendor: (id) =>
      setVendors((prev) => prev.filter((x) => x.id !== id)),
  };

  return (
    <WorkforceContext.Provider value={value}>
      {children}
    </WorkforceContext.Provider>
  );
};

export const useWorkforce = () => {
  const ctx = useContext(WorkforceContext);
  if (!ctx) throw new Error("useWorkforce must be used inside WorkforceProvider");
  return ctx;
};