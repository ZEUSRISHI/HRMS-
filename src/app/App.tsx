import { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LoginPage } from "./components/login";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
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
  Menu,
  X,
  LogOut,
} from "lucide-react";

import { Dashboard } from "./components/Dashboard";
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
  | "analytics";

function AppContent() {
  const { currentUser, switchRole, logout } = useAuth();
  const [activeModule, setActiveModule] = useState<ModuleType>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { id: "dashboard", name: "Dashboard", icon: LayoutDashboard, roles: ["admin", "manager", "employee"] },
    { id: "attendance", name: "Attendance", icon: Clock, roles: ["admin", "manager", "employee"] },
    { id: "tasks", name: "Tasks", icon: CheckSquare, roles: ["admin", "manager", "employee"] },
    { id: "status", name: "Daily Status", icon: FileText, roles: ["admin", "manager", "employee"] },
    { id: "calendar", name: "Calendar", icon: Calendar, roles: ["admin", "manager", "employee"] },
    { id: "payroll", name: "Payroll", icon: DollarSign, roles: ["admin", "manager", "employee"] },
    { id: "clients", name: "Clients & Payments", icon: Building2, roles: ["admin", "manager"] },
    { id: "projects", name: "Projects", icon: FolderKanban, roles: ["admin", "manager", "employee"] },
    { id: "onboarding", name: "Onboarding", icon: UserPlus, roles: ["admin", "manager"] },
    { id: "time-tracking", name: "Time Tracking", icon: Timer, roles: ["admin", "manager", "employee"] },
    { id: "analytics", name: "Analytics", icon: BarChart3, roles: ["admin", "manager"] },
  ];

  const visibleMenuItems = menuItems.filter(item =>
    item.roles.includes(currentUser.role)
  );

  const renderModule = () => {
    switch (activeModule) {
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
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 bg-card border-r flex flex-col">
        <div className="p-4 border-b">
          <h1 className="font-semibold">HR & Ops System</h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {visibleMenuItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveModule(item.id as ModuleType)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted"
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t space-y-2">
          <Badge variant="outline" className="capitalize w-full text-center">
            {currentUser.role}
          </Badge>

          <Button variant="ghost" className="w-full" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">
        {renderModule()}
      </main>
    </div>
  );
}

function AppWrapper() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <AppContent /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppWrapper />
    </AuthProvider>
  );
}
