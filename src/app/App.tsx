import { useState } from "react";

import { AuthProvider, useAuth, Role } from "./contexts/AuthContext";
import { WorkforceProvider } from "./contexts/WorkforceContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { TaskProvider } from "./contexts/TaskContext";
import { TimesheetProvider } from "./contexts/TimesheetContext";
import { PerformanceProvider } from "./contexts/PerformanceContext";
import { ProjectProvider } from "./contexts/ProjectContext";
import { AdminUsersProvider } from "./contexts/AdminUsersContext";
import { UnreadCountsProvider, useUnreadCounts } from "./contexts/UnreadCountsContext";

import MainLayout from "../layouts/MainLayout";

import { canManageVendors } from "../utils/permissions";

import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignUpPage";
import ForgotPassword from "./components/ForgotPassword";

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
  TicketCheck,
  UserCog,
  MessageSquare,
  Mail, // ✅ added Mail icon
  LucideIcon,
} from "lucide-react";

// ✅ REPLACED: Dashboard + EmployeeDashboard → RoleBasedDashboard
import RoleBasedDashboard from "./components/modules/RoleBasedDashboard";
import { DashboardStats } from "./components/Dashboard";
import { AttendanceModule } from "./components/modules/AttendanceModule";
import { LeaveModule } from "./components/modules/LeaveModule";
import { TaskManagement } from "./components/modules/TaskManagement";
import { DailyStatusModule } from "./components/modules/DailyStatusModule";
import { CalendarModule } from "./components/modules/CalendarModule";
import { PayrollModule } from "./components/modules/PayrollModule";
import { ClientManagement } from "./components/modules/ClientManagement";
import { ProjectManagement } from "./components/modules/ProjectManagement";
import { OnboardingModule } from "./components/modules/OnboardingModule";
import { TimeTracking } from "./components/modules/TimeTracking";
import { AnalyticsReports } from "./components/modules/AnalyticsReports";
import { HelpdeskModule } from "./components/modules/HelpdeskModule";
import { UserManagementModule } from "./components/modules/UserManagementModule";

// ✅ NEW IMPORTS
import { MessagingModule } from "./components/modules/MessagingModule";
import { EmailCommunicationModule } from "./components/modules/EmailCommunicationModule"; // ✅ ADDED

import EmployeeRecordsModule from "./components/modules/hr/EmployeeRecordsModule";
import AttendanceLeaveModule from "./components/modules/hr/AttendanceLeaveModule";

import ProfilePage from "../pages/ProfilePage";
import AccountPage from "../pages/AccountPage";

import VendorModule from "./components/modules/VendorModule";
import FreelancerModule from "./components/modules/FreelancerModule";

export type ModuleType =
  | "dashboard"
  | "attendance"
  | "leave"
  | "tasks"
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
  | "helpdesk"
  | "user-management"
  | "messaging"
  | "email-comm" // ✅ ADDED
  | "profile"
  | "account";

interface MenuItem {
  id: ModuleType;
  name: string;
  icon: LucideIcon;
  roles: Role[];
  badge?: number;
}

function AppContent() {
  const { currentUser } = useAuth();
  const { counts, markSeen } = useUnreadCounts(); // ✅ unread badge counts

  const [activeModule, setActiveModuleRaw] =
    useState<ModuleType>("dashboard");

  // ✅ wrap setActiveModule so opening a module clears its badge
  const setActiveModule = (m: ModuleType) => {
    setActiveModuleRaw(m);
    if (m === "messaging") markSeen("messages");
    if (m === "tasks") markSeen("tasks");
    if (m === "calendar") markSeen("calendar");
    if (m === "helpdesk") markSeen("helpdesk");
    if (m === "projects") markSeen("projects");
  };

  if (!currentUser) return null;

  if (canManageVendors(currentUser.role)) {
    console.log("Vendor management allowed");
  }

  const menuItems: MenuItem[] = [
    {
      id: "dashboard",
      name: "Dashboard",
      icon: LayoutDashboard,
      roles: ["admin", "manager", "employee", "hr"],
    },
    {
      id: "attendance",
      name: "Attendance",
      icon: Clock,
      roles: ["admin", "manager", "employee", "hr"],
    },
    {
      id: "leave",
      name: "Leave",
      icon: FileText,
      roles: ["admin", "manager", "employee", "hr"],
    },
    {
      id: "tasks",
      name: "Tasks",
      icon: CheckSquare,
      roles: ["admin", "manager", "employee", "hr"],
      badge: counts.tasks,
    },
    {
      id: "status",
      name: "Daily Status",
      icon: FileText,
      roles: ["admin", "manager", "employee", "hr"],
    },
    {
      id: "calendar",
      name: "Calendar",
      icon: Calendar,
      roles: ["admin", "manager", "employee", "hr"],
      badge: counts.calendar,
    },
    {
      id: "payroll",
      name: "Payroll",
      icon: DollarSign,
      roles: ["admin", "hr"],
    },
    {
      id: "clients",
      name: "Clients",
      icon: Building2,
      roles: ["admin", "manager"],
    },
    {
      id: "projects",
      name: "Projects",
      icon: FolderKanban,
      roles: ["admin", "manager", "employee"],
      badge: counts.projects,
    },
    {
      id: "onboarding",
      name: "Onboarding",
      icon: UserPlus,
      roles: ["admin", "hr"],
    },
    {
      id: "time-tracking",
      name: "Time Tracking",
      icon: Timer,
      roles: ["admin", "manager", "employee"],
    },
    {
      id: "analytics",
      name: "Analytics",
      icon: BarChart3,
      roles: ["admin", "manager"],
    },
    {
      id: "workforce-overview",
      name: "Workforce",
      icon: Briefcase,
      roles: ["admin", "manager", "hr"],
    },
    {
      id: "hr-employees",
      name: "Employee Records",
      icon: UsersIcon,
      roles: ["hr"],
    },
    {
      id: "hr-attendance-leave",
      name: "Attendance & Leave",
      icon: Clock,
      roles: ["hr"],
    },
    {
      id: "helpdesk",
      name: "Helpdesk",
      icon: TicketCheck,
      roles: ["admin", "manager", "employee", "hr"],
      badge: counts.helpdesk,
    },
    {
      id: "user-management",
      name: "User Management",
      icon: UserCog,
      roles: ["admin"],
    },
    {
      id: "messaging",
      name: "Messages",
      icon: MessageSquare,
      roles: ["admin", "manager", "employee", "hr"],
      badge: counts.messages,
    },

    // ✅ EMAIL COMMUNICATION MENU
    {
      id: "email-comm",
      name: "Email Comm",
      icon: Mail,
      roles: ["admin", "manager", "hr", "employee"],
    },
  ];

  const visibleMenuItems = menuItems.filter((item) =>
    item.roles.includes(currentUser.role)
  );

  const renderModule = () => {
    switch (activeModule) {
      case "dashboard":
        return <RoleBasedDashboard onNavigate={setActiveModule} />;

      case "attendance":
        return <AttendanceModule />;

      case "leave":
        return <LeaveModule />;

      case "tasks":
        return <TaskManagement />;

      case "status":
        return <DailyStatusModule />;

      case "calendar":
        return <CalendarModule />;

      case "payroll":
        return <PayrollModule />;

      case "clients":
        return <ClientManagement />;

      case "projects":
        return <ProjectManagement />;

      case "onboarding":
        return <OnboardingModule />;

      case "time-tracking":
        return <TimeTracking />;

      case "analytics":
        return <AnalyticsReports />;

      case "helpdesk":
        return <HelpdeskModule />;

      case "user-management":
        return <UserManagementModule />;

      case "messaging":
        return <MessagingModule />;

      // ✅ EMAIL MODULE RENDER
      case "email-comm":
        return <EmailCommunicationModule />;

      case "workforce-overview":
        return (
          <div className="space-y-6">
            <DashboardStats />
            <VendorModule />
            <FreelancerModule />
          </div>
        );

      case "hr-employees":
        return <EmployeeRecordsModule />;

      case "hr-attendance-leave":
        return <AttendanceLeaveModule />;

      case "profile":
        return <ProfilePage />;

      case "account":
        return <AccountPage />;

      default:
        return <RoleBasedDashboard onNavigate={setActiveModule} />;
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

function AppWrapper() {
  const { isAuthenticated } = useAuth();

  const [view, setView] = useState<
    "login" | "signup" | "forgot"
  >("login");

  if (!isAuthenticated) {
    if (view === "signup") {
      return (
        <SignupPage onBack={() => setView("login")} />
      );
    }

    if (view === "forgot") {
      return (
        <ForgotPassword onBack={() => setView("login")} />
      );
    }

    return (
      <LoginPage onReset={() => setView("forgot")} />
    );
  }

  return <AppContent />;
}

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
                    <UnreadCountsProvider>
                      <AppWrapper />
                    </UnreadCountsProvider>
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
