import { useState } from "react";

import { AuthProvider, useAuth, Role } from "./contexts/AuthContext";
import { WorkforceProvider } from "./contexts/WorkforceContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { TaskProvider } from "./contexts/TaskContext";
import { TimesheetProvider } from "./contexts/TimesheetContext";
import { PerformanceProvider } from "./contexts/PerformanceContext";
import { ProjectProvider } from "./contexts/ProjectContext";
import { AdminUsersProvider } from "./contexts/AdminUsersContext";

import MainLayout from "../layouts/MainLayout";

/* PERMISSIONS */
import { canManageVendors } from "../utils/permissions";

/* AUTH */
import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignUpPage";
import ForgotPassword from "./components/ForgotPassword";

/* ICONS */
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
  Users as UsersIcon,
  LucideIcon,
} from "lucide-react";

/* MODULES */
import { Dashboard, DashboardStats } from "./components/Dashboard";
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
import EmployeeTaskStatusModule from "./components/modules/EmployeeTaskStatusModule";

/* HR */
import EmployeeRecordsModule from "./components/modules/hr/EmployeeRecordsModule";
import AttendanceLeaveModule from "./components/modules/hr/AttendanceLeaveModule";

/* PROFILE */
import ProfilePage from "../pages/ProfilePage";
import AccountPage from "../pages/AccountPage";

/* WORKFORCE */
import VendorModule from "./components/modules/VendorModule";
import FreelancerModule from "./components/modules/FreelancerModule";

/* ================= TYPES ================= */

export type ModuleType =
  | "dashboard"
  | "attendance"
  | "tasks"
  | "employee-task-status"
  | "status"
  | "calendar"
  | "payroll"
  | "clients"
  | "projects"
  | "onboarding"
  | "time-tracking"
  | "analytics"
  | "workforce-overview"
  | "hr-employees"
  | "hr-attendance-leave"
  | "profile"
  | "account";

interface MenuItem {
  id: ModuleType;
  name: string;
  icon: LucideIcon;
  roles: Role[];
}

/* ================= APP CONTENT ================= */

function AppContent() {

  const { currentUser } = useAuth();

  const [activeModule, setActiveModule] =
    useState<ModuleType>("dashboard");

  if (!currentUser) return null;

  if (canManageVendors(currentUser.role)) {
    console.log("Vendor management allowed");
  }

  /* MENU */

  const menuItems: MenuItem[] = [

    { id: "dashboard",            name: "Dashboard",          icon: LayoutDashboard, roles: ["admin","manager","employee","hr"] },

    { id: "attendance",           name: "Attendance",         icon: Clock,           roles: ["admin","manager","employee","hr"] },

    { id: "tasks",                name: "Tasks",              icon: CheckSquare,     roles: ["admin","manager","employee","hr"] },

    { id: "employee-task-status", name: "My Task Status",     icon: CheckSquare,     roles: ["employee"] },

    { id: "status",               name: "Daily Status",       icon: FileText,        roles: ["admin","manager","employee","hr"] },

    { id: "calendar",             name: "Calendar",           icon: Calendar,        roles: ["admin","manager","employee","hr"] },

    { id: "payroll",              name: "Payroll",            icon: DollarSign,      roles: ["admin","hr"] },

    { id: "clients",              name: "Clients",            icon: Building2,       roles: ["admin","manager"] },

    { id: "projects",             name: "Projects",           icon: FolderKanban,    roles: ["admin","manager","employee"] },

    { id: "onboarding",           name: "Onboarding",         icon: UserPlus,        roles: ["admin","hr"] },

    { id: "time-tracking",        name: "Time Tracking",      icon: Timer,           roles: ["admin","manager","employee"] },

    { id: "analytics",            name: "Analytics",          icon: BarChart3,       roles: ["admin","manager"] },

    { id: "workforce-overview",   name: "Workforce",          icon: Briefcase,       roles: ["admin","manager","hr"] },

    { id: "hr-employees",         name: "Employee Records",   icon: UsersIcon,       roles: ["hr"] },

    { id: "hr-attendance-leave",  name: "Attendance & Leave", icon: Clock,           roles: ["hr"] },

  ];

  const visibleMenuItems =
    menuItems.filter(item =>
      item.roles.includes(currentUser.role)
    );

  /* MODULE RENDER */

  const renderModule = () => {

    switch (activeModule) {

      case "dashboard":
        return currentUser.role === "employee"
          ? <EmployeeDashboard />
          : <Dashboard />;

      case "attendance":           return <AttendanceModule />;
      case "tasks":                return <TaskManagement />;
      case "employee-task-status": return <EmployeeTaskStatusModule />;
      case "status":               return <DailyStatusModule />;
      case "calendar":             return <CalendarModule />;
      case "payroll":              return <PayrollModule />;
      case "clients":              return <ClientManagement />;
      case "projects":             return <ProjectManagement />;
      case "onboarding":           return <OnboardingModule />;
      case "time-tracking":        return <TimeTracking />;
      case "analytics":            return <AnalyticsReports />;

      case "workforce-overview":
        return (
          <div className="space-y-6">
            <DashboardStats />
            <VendorModule />
            <FreelancerModule />
          </div>
        );

      case "hr-employees":         return <EmployeeRecordsModule />;
      case "hr-attendance-leave":  return <AttendanceLeaveModule />;

      case "profile":              return <ProfilePage />;
      case "account":              return <AccountPage />;

      default:
        return <Dashboard />;
    }
  };

  return (
    <MainLayout
      active={activeModule}
      setActive={setActiveModule}
      role={currentUser.role}
      menuItems={visibleMenuItems}
    >
      {renderModule()}
    </MainLayout>
  );
}

/* ================= AUTH SWITCH ================= */

function AppWrapper() {

  const { isAuthenticated } = useAuth();

  const [view, setView] =
    useState<"login" | "signup" | "forgot">("login");

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

      <AdminUsersProvider>

        <ProjectProvider>

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

        </ProjectProvider>

      </AdminUsersProvider>

    </AuthProvider>
  );
}
