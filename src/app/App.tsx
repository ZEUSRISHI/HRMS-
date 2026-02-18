import { useState } from "react";
import { AuthProvider, useAuth, Role } from "./contexts/AuthContext";
import { WorkforceProvider } from "./contexts/WorkforceContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { TaskProvider } from "./contexts/TaskContext";
import { TimesheetProvider } from "./contexts/TimesheetContext";
import { PerformanceProvider } from "./contexts/PerformanceContext";

import MainLayout from "../layouts/MainLayout";

/* ===== AUTH PAGES ===== */
import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignUpPage";
import ForgotPassword from "./components/ForgotPassword";

/* ===== ICONS ===== */
import {
  LayoutDashboard,
  Clock,
  CheckSquare,
  FileText,
  Calendar,
  DollarSign,
  Building2,
  FolderKanban,
  UserPlus,
  Timer,
  BarChart3,
  Briefcase,
} from "lucide-react";

/* ===== MODULES ===== */
import { Dashboard } from "./components/Dashboard";
import { EmployeeDashboard } from "./components/modules/EmployeeDashboard";
import { AttendanceModule } from "./components/modules/AttendanceModule";
import { TaskManagement } from "./components/modules/TaskManagement";
import { DailyStatusModule } from "./components/modules/DailyStatusModule";
import { CalendarModule } from "./components/modules/CalendarModule";
import { PayrollModule } from "./components/modules/PayrollModule";
import { ClientManagement } from "./components/modules/ClientManagement";
import { ProjectManagement } from "./components/modules/ProjectManagement";
import { OnboardingModule } from "./components/modules/OnboardingModule";
import { TimeTracking } from "./components/modules/TimeTracking";
import { AnalyticsReports } from "./components/modules/AnalyticsReports";
import { WorkforceModule } from "./components/modules/WorkforceModule";

/* ===== PROFILE ===== */
import ProfilePage from "../pages/ProfilePage";
import AccountPage from "../pages/AccountPage";

/* ================= TYPES ================= */

type ModuleType =
  | "dashboard"
  | "attendance"
  | "tasks"
  | "status"
  | "calendar"
  | "payroll"
  | "clients"
  | "projects"
  | "onboarding"
  | "time-tracking"
  | "analytics"
  | "workforce"
  | "profile"
  | "account";

/* ================= APP CONTENT ================= */

function AppContent() {
  const { currentUser } = useAuth();
  const [activeModule, setActiveModule] =
    useState<ModuleType>("dashboard");

  if (!currentUser) return null;

  const menuItems: {
    id: ModuleType;
    name: string;
    icon: any;
    roles: Role[];
  }[] = [
    { id: "dashboard", name: "Dashboard", icon: LayoutDashboard, roles: ["admin","manager","employee","hr"] },
    { id: "attendance", name: "Attendance", icon: Clock, roles: ["admin","manager","employee","hr"] },
    { id: "tasks", name: "Tasks", icon: CheckSquare, roles: ["admin","manager","employee","hr"] },
    { id: "status", name: "Daily Status", icon: FileText, roles: ["admin","manager","employee","hr"] },
    { id: "calendar", name: "Calendar", icon: Calendar, roles: ["admin","manager","employee","hr"] },
    { id: "payroll", name: "Payroll", icon: DollarSign, roles: ["admin","hr"] },
    { id: "clients", name: "Clients & Payments", icon: Building2, roles: ["admin","manager"] },
    { id: "projects", name: "Projects", icon: FolderKanban, roles: ["admin","manager","employee"] },
    { id: "onboarding", name: "Onboarding", icon: UserPlus, roles: ["admin","hr"] },
    { id: "time-tracking", name: "Time Tracking", icon: Timer, roles: ["admin","manager","employee"] },
    { id: "analytics", name: "Analytics", icon: BarChart3, roles: ["admin","manager"] },
    { id: "workforce", name: "Vendors & Freelancers", icon: Briefcase, roles: ["admin","manager","hr"] },
  ];

  const visibleMenuItems = menuItems.filter((item) =>
    item.roles.includes(currentUser.role)
  );

  const renderModule = () => {
    switch (activeModule) {
      case "dashboard":
        return currentUser.role === "employee"
          ? <EmployeeDashboard />
          : <Dashboard />;
      case "attendance": return <AttendanceModule />;
      case "tasks": return <TaskManagement />;
      case "status": return <DailyStatusModule />;
      case "calendar": return <CalendarModule />;
      case "payroll": return <PayrollModule />;
      case "clients": return <ClientManagement />;
      case "projects": return <ProjectManagement />;
      case "onboarding": return <OnboardingModule />;
      case "time-tracking": return <TimeTracking />;
      case "analytics": return <AnalyticsReports />;
      case "workforce": return <WorkforceModule />;
      case "profile": return <ProfilePage />;
      case "account": return <AccountPage />;
      default: return <Dashboard />;
    }
  };

  return (
    <MainLayout onNavigate={setActiveModule}>
      <div className="flex h-[calc(100vh-64px)]">
        <aside className="w-64 bg-white border-r p-4 space-y-2">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveModule(item.id)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100"
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </button>
            );
          })}
        </aside>

        <main className="flex-1 p-6 overflow-y-auto">
          {renderModule()}
        </main>
      </div>
    </MainLayout>
  );
}

/* ================= AUTH SWITCH ================= */

function AppWrapper() {
  const { isAuthenticated } = useAuth();
  const [view, setView] = useState<"login" | "signup" | "forgot">("login");

  if (!isAuthenticated) {
    if (view === "signup")
      return <SignupPage onBack={() => setView("login")} />;

    if (view === "forgot")
      return <ForgotPassword onBack={() => setView("login")} />;

    return (
      <LoginPage
        onSignup={() => setView("signup")}
        onReset={() => setView("forgot")}
      />
    );
  }

  return <AppContent />;
}

/* ================= ROOT ================= */

export default function App() {
  return (
    <AuthProvider>
      <TimesheetProvider>
        <PerformanceProvider>
          <TaskProvider>
            <WorkforceProvider>
              <NotificationProvider>
                <AppWrapper />
              </NotificationProvider>
            </WorkforceProvider>
          </TaskProvider>
        </PerformanceProvider>
      </TimesheetProvider>
    </AuthProvider>
  );
}
