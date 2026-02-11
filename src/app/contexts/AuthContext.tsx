import { createContext, useContext, useState } from "react";

export type Role = "admin" | "manager" | "employee";

interface User {
  name: string;
  role: Role;
}

interface AuthContextType {
  currentUser: User;
  isAuthenticated: boolean;
  login: (role: Role) => void;
  logout: () => void;
  switchRole: (role: Role) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>({
    name: "",
    role: "employee",
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = (role: Role) => {
    const names = {
      admin: "Admin User",
      manager: "HR Manager",
      employee: "Employee User",
    };

    setCurrentUser({
      name: names[role],
      role,
    });

    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser({
      name: "",
      role: "employee",
    });
  };

  const switchRole = (role: Role) => {
    setCurrentUser((prev) => ({
      ...prev,
      role,
    }));
  };

  return (
    <AuthContext.Provider
      value={{ currentUser, isAuthenticated, login, logout, switchRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
