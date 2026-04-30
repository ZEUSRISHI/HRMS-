// src/app/contexts/AuthContext.tsx

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { authApi, tokenStorage } from "../../services/api";

/* ============================================================
   TYPES
   ============================================================ */
export type Role = "admin" | "hr" | "manager" | "employee";

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  avatar?: string;
  department?: string;
  phone?: string;
}

interface AuthContextType {
  /* State */
  currentUser: User | null;
  users: User[];
  isAuthenticated: boolean;
  isLoading: boolean;

  /* Actions */
  login: (email: string, password: string, role: Role) => Promise<boolean>;
  loginWithGoogle: (email: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string, role: Role) => Promise<boolean>;
  logout: () => Promise<void>;
  addUser: (u: User) => void;
  changePassword: (email: string, oldPass: string, newPass: string) => Promise<boolean>;
  resetPassword: (email: string, newPassword: string) => Promise<boolean>;
}

/* ============================================================
   CONTEXT
   ============================================================ */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* ============================================================
   MAP API USER → FRONTEND USER
   ============================================================ */
function mapUser(apiUser: any): User {
  return {
    id: apiUser.id || apiUser._id,
    name: apiUser.name,
    email: apiUser.email,
    role: apiUser.role,
    avatar: apiUser.avatar || "",
    department: apiUser.department || "",
    phone: apiUser.phone || "",
  };
}

/* ============================================================
   PROVIDER
   ============================================================ */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers]             = useState<User[]>([]);
  const [isLoading, setIsLoading]     = useState(true);

  /* ── Rehydrate session on app load ── */
  useEffect(() => {
    const rehydrate = async () => {
      const token = tokenStorage.getAccess();

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await authApi.getMe();
        const user = mapUser(data.user);
        setCurrentUser(user);
        setUsers([user]);
      } catch {
        tokenStorage.clear();
      } finally {
        setIsLoading(false);
      }
    };

    rehydrate();
  }, []);

  /* ── Normal email/password login ── */
  const login = async (
    email: string,
    password: string,
    role: Role
  ): Promise<boolean> => {
    try {
      const data = await authApi.login(email, password, role);
      const user = mapUser(data.user);
      setCurrentUser(user);
      setUsers([user]);
      return true;
    } catch (error: any) {
      console.error("Login error:", error.message);
      return false;
    }
  };

  /* ============================================================
     GOOGLE LOGIN
     Receives decoded email from Google JWT.
     Looks up the user by email in your backend.
     If found  → sets currentUser → navigates to home.
     If not found → throws error → shown in LoginPage.
  ============================================================ */
  const loginWithGoogle = async (email: string): Promise<boolean> => {
    try {
      const data = await authApi.googleLogin(email);
      const user = mapUser(data.user);
      setCurrentUser(user);
      setUsers([user]);
      return true;
    } catch (error: any) {
      console.error("Google login error:", error.message);
      throw new Error(
        error.message ||
        "This Google account is not registered. Please contact your admin."
      );
    }
  };

  /* ── Signup ── */
  const signup = async (
    name: string,
    email: string,
    password: string,
    role: Role
  ): Promise<boolean> => {
    try {
      const data = await authApi.signup(name, email, password, role);
      const user = mapUser(data.user);
      setCurrentUser(user);
      setUsers([user]);
      return true;
    } catch (error: any) {
      console.error("Signup error:", error.message);
      return false;
    }
  };

  /* ── Logout ── */
  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } finally {
      setCurrentUser(null);
      setUsers([]);
      tokenStorage.clear();
    }
  };

  /* ── Add user (kept for AdminUserModule compatibility) ── */
  const addUser = (u: User) => setUsers((prev) => [...prev, u]);

  /* ── Change password ── */
  const changePassword = async (
    _email: string,
    oldPass: string,
    newPass: string
  ): Promise<boolean> => {
    try {
      await authApi.changePassword(oldPass, newPass);
      return true;
    } catch {
      return false;
    }
  };

  /* ── Reset / Forgot password ── */
  const resetPassword = async (
    email: string,
    newPassword: string
  ): Promise<boolean> => {
    try {
      await authApi.resetPassword(email, newPassword);
      return true;
    } catch {
      return false;
    }
  };

  /* ── Loading screen ── */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-sm font-medium">Loading SmartHR...</p>
        </div>
      </div>
    );
  }

  /* ── Provider ── */
  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isAuthenticated: !!currentUser,
        isLoading,
        login,
        loginWithGoogle,
        signup,
        logout,
        addUser,
        changePassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/* ============================================================
   HOOK
   ============================================================ */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};
