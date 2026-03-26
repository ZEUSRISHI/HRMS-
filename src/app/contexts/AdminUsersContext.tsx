import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Role = "HR" | "Manager";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
};

type AdminUsersContextType = {
  users: AdminUser[];
  addUser: (user: AdminUser) => void;
  updateUser: (id: string, data: Partial<AdminUser>) => void;
  deleteUser: (id: string) => void;
};

const AdminUsersContext = createContext<AdminUsersContextType | undefined>(undefined);

const STORAGE_KEY = "hrms_admin_users";

export function AdminUsersProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<AdminUser[]>([]);

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setUsers(JSON.parse(stored));
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  const addUser = (user: AdminUser) => setUsers(prev => [...prev, user]);

  const updateUser = (id: string, data: Partial<AdminUser>) => {
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...data } : u)));
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  return (
    <AdminUsersContext.Provider value={{ users, addUser, updateUser, deleteUser }}>
      {children}
    </AdminUsersContext.Provider>
  );
}

export const useAdminUsers = () => {
  const ctx = useContext(AdminUsersContext);
  if (!ctx) throw new Error("useAdminUsers must be used within provider");
  return ctx;
};