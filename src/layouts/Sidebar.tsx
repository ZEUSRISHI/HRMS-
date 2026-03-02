import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, CalendarDays, ClipboardList } from "lucide-react";

export default function Sidebar() {
  const navItem =
    "flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors";

  const active =
    "bg-indigo-50 text-indigo-600";

  const inactive =
    "text-gray-600 hover:bg-gray-100";

  return (
    <div className="h-full flex flex-col">

      {/* Logo / Header */}
      <div className="h-16 flex items-center px-6 border-b">
        <h1 className="text-lg font-semibold">HRMS</h1>
      </div>

      {/* Scrollable Menu */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">

        <NavLink
          to="/"
          className={({ isActive }) =>
            `${navItem} ${isActive ? active : inactive}`
          }
        >
          <LayoutDashboard size={18} />
          Dashboard
        </NavLink>

        <NavLink
          to="/attendance"
          className={({ isActive }) =>
            `${navItem} ${isActive ? active : inactive}`
          }
        >
          <CalendarDays size={18} />
          Attendance
        </NavLink>

        <NavLink
          to="/tasks"
          className={({ isActive }) =>
            `${navItem} ${isActive ? active : inactive}`
          }
        >
          <ClipboardList size={18} />
          Tasks
        </NavLink>

        <NavLink
          to="/employees"
          className={({ isActive }) =>
            `${navItem} ${isActive ? active : inactive}`
          }
        >
          <Users size={18} />
          Employees
        </NavLink>

      </nav>

      {/* Footer */}
      <div className="p-4 border-t text-xs text-gray-400">
        © {new Date().getFullYear()} HRMS
      </div>

    </div>
  );
}