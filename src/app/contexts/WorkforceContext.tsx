import { createContext, useContext, useEffect, useState } from "react";

/* ================= TYPES ================= */

export interface Vendor {
  id: string;
  createdAt: string;
  company: string;
  contactPerson: string;
  email: string;
  phone: string;
  category: string;
  taxId: string;
  address: string;
}

export interface Freelancer {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  phone: string;
  skill: string;
  rate: string;
  contractStart: string;
  contractEnd: string;
  status: "active" | "expired";
}

interface WorkforceContextType {
  vendors: Vendor[];
  freelancers: Freelancer[];

  addVendor: (vendor: Vendor) => void;
  updateVendor: (vendor: Vendor) => void;
  deleteVendor: (id: string) => void;

  addFreelancer: (freelancer: Freelancer) => void;
  updateFreelancer: (freelancer: Freelancer) => void;
  deleteFreelancer: (id: string) => void;
}

/* ================= CONTEXT ================= */

const WorkforceContext = createContext<WorkforceContextType | null>(null);

export const WorkforceProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);

  useEffect(() => {
    const v = localStorage.getItem("vendors");
    const f = localStorage.getItem("freelancers");

    if (v) setVendors(JSON.parse(v));
    if (f) setFreelancers(JSON.parse(f));
  }, []);

  useEffect(() => {
    localStorage.setItem("vendors", JSON.stringify(vendors));
  }, [vendors]);

  useEffect(() => {
    localStorage.setItem("freelancers", JSON.stringify(freelancers));
  }, [freelancers]);

  /* ========= VENDOR CRUD ========= */

  const addVendor = (vendor: Vendor) =>
    setVendors((prev) => [vendor, ...prev]);

  const updateVendor = (vendor: Vendor) =>
    setVendors((prev) =>
      prev.map((v) => (v.id === vendor.id ? vendor : v))
    );

  const deleteVendor = (id: string) =>
    setVendors((prev) => prev.filter((v) => v.id !== id));

  /* ========= FREELANCER CRUD ========= */

  const addFreelancer = (freelancer: Freelancer) =>
    setFreelancers((prev) => [freelancer, ...prev]);

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
};

export const useWorkforce = () => {
  const context = useContext(WorkforceContext);
  if (!context) throw new Error("WorkforceContext missing");
  return context;
};