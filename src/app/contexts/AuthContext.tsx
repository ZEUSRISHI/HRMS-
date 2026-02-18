import { createContext, useContext, useEffect, useState, ReactNode } from "react";

/* ================= TYPES ================= */

export type Role = "admin" | "hr" | "manager" | "employee";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
}

interface AuthContextType {
  users: User[];
  currentUser: User | null;
  isAuthenticated: boolean;

  login: (email: string, password: string, role: Role) => boolean;
  signup: (name: string, email: string, password: string, role: Role) => boolean;
  changePassword: (email: string, oldPass: string, newPass: string) => boolean;
  resetPassword: (email: string, newPassword: string) => boolean;
  logout: () => void;
}

/* ================= CONTEXT ================= */

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* ================= PROVIDER ================= */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  /* ===== INITIAL LOAD ===== */

  useEffect(() => {
    const storedUsers = localStorage.getItem("hrms_users");
    const storedCurrent = localStorage.getItem("hrms_current");

    const defaultUsers: User[] = [
      { id: "1", name: "Admin", email: "admin@quibotech.com", password: "admin123", role: "admin" },
      { id: "2", name: "HR", email: "hr@quibotech.com", password: "hr123", role: "hr" },
      { id: "3", name: "Manager", email: "manager@quibotech.com", password: "manager123", role: "manager" },
      { id: "4", name: "Employee", email: "employee@quibotech.com", password: "employee123", role: "employee" },
    ];

    if (storedUsers) {
      const parsedUsers: User[] = JSON.parse(storedUsers);

      const mergedUsers = [...defaultUsers];
      parsedUsers.forEach((u) => {
        if (!mergedUsers.find((d) => d.email === u.email)) {
          mergedUsers.push(u);
        }
      });

      setUsers(mergedUsers);
      localStorage.setItem("hrms_users", JSON.stringify(mergedUsers));
    } else {
      setUsers(defaultUsers);
      localStorage.setItem("hrms_users", JSON.stringify(defaultUsers));
    }

    if (storedCurrent) {
      setCurrentUser(JSON.parse(storedCurrent));
    }
  }, []);

  /* ===== SAVE USERS ===== */

  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem("hrms_users", JSON.stringify(users));
    }
  }, [users]);

  /* ===== LOGIN ===== */

  const login = (email: string, password: string, role: Role) => {
    const user = users.find(
      (u) =>
        u.email.toLowerCase() === email.toLowerCase().trim() &&
        u.password === password.trim() &&
        u.role === role
    );

    if (!user) return false;

    setCurrentUser(user);
    localStorage.setItem("hrms_current", JSON.stringify(user));
    return true;
  };

  /* ===== SIGNUP ===== */

  const signup = (name: string, email: string, password: string, role: Role) => {
    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return false;
    }

    const newUser: User = {
      id: Date.now().toString(),
      name,
      email,
      password,
      role,
    };

    setUsers((prev) => [...prev, newUser]);
    return true;
  };

  /* ===== CHANGE PASSWORD ===== */

  const changePassword = (email: string, oldPass: string, newPass: string) => {
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user || user.password !== oldPass) return false;

    const updatedUsers = users.map((u) =>
      u.email === email ? { ...u, password: newPass } : u
    );

    setUsers(updatedUsers);
    return true;
  };

  /* ===== RESET PASSWORD ===== */

  const resetPassword = (email: string, newPassword: string) => {
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) return false;

    const updatedUsers = users.map((u) =>
      u.email === email ? { ...u, password: newPassword } : u
    );

    setUsers(updatedUsers);
    return true;
  };

  /* ===== LOGOUT ===== */

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("hrms_current");
  };

  /* ===== PROVIDER ===== */

  return (
    <AuthContext.Provider
      value={{
        users,
        currentUser,
        isAuthenticated: !!currentUser,
        login,
        signup,
        changePassword,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ================= HOOK ================= */

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
