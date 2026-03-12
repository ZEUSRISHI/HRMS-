import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { authApi, tokenStorage } from "../../services/api";

/* ============================================================
   TYPES — matches your existing Role and User interface exactly
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

  /* Actions — same signatures as your old localStorage version */
  login: (email: string, password: string, role: Role) => Promise<boolean>;
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
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /* ===== REHYDRATE SESSION ON APP LOAD ===== */
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

  /* ============================================================
     LOGIN
     Same signature as old: login(email, password, role) → boolean
     ============================================================ */
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
     SIGNUP
     Same signature as old: signup(name, email, password, role) → boolean
     ============================================================ */
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

  /* ============================================================
     LOGOUT
     ============================================================ */
  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } finally {
      setCurrentUser(null);
      setUsers([]);
      tokenStorage.clear();
    }
  };

  /* ============================================================
     ADD USER
     Old AdminUserModule uses addUser() — keep for compatibility
     ============================================================ */
  const addUser = (u: User) => {
    setUsers((prev) => [...prev, u]);
  };

  /* ============================================================
     CHANGE PASSWORD
     Same signature: changePassword(email, oldPass, newPass) → boolean
     ============================================================ */
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

  /* ============================================================
     RESET PASSWORD (Forgot Password)
     Same signature: resetPassword(email, newPassword) → boolean
     ============================================================ */
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

  /* ============================================================
     LOADING SCREEN
     ============================================================ */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm font-medium">Loading SmartHR...</p>
        </div>
      </div>
    );
  }

  /* ============================================================
     PROVIDER
     ============================================================ */
  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isAuthenticated: !!currentUser,
        isLoading,
        login,
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