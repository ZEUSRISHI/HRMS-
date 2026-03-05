import { NavLink } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardList,
  Menu,
  X,
} from "lucide-react";

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  const navItem =
    "flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors";

  const active = "bg-indigo-50 text-indigo-600";
  const inactive = "text-gray-600 hover:bg-gray-100";

  return (
    <>
      {/* ================= MOBILE HEADER ================= */}
      {/* md:hidden → hide header in desktop */}
      <div className="md:hidden sticky top-0 z-50 flex items-center justify-between bg-gray-900 text-white p-4">
        <h1 className="text-lg font-bold">HRMS</h1>

        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-md hover:bg-gray-700"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* ================= SIDEBAR ================= */}
      <aside
        className={`
        fixed md:static
        top-0 left-0
        h-screen
        w-64
        bg-white border-r
        transform transition-transform duration-300 ease-in-out
        z-40
        
        ${open ? "translate-x-0" : "-translate-x-full"}
        
        md:translate-x-0
      `}
      >
        <div className="h-full flex flex-col">

          {/* ===== LOGO ===== */}
          <div className="h-16 flex items-center px-6 border-b">
            <h1 className="text-lg font-semibold">HRMS</h1>
          </div>

          {/* ===== NAVIGATION ===== */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">

            <NavLink
              to="/"
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `${navItem} ${isActive ? active : inactive}`
              }
            >
              <LayoutDashboard size={18} />
              Dashboard
            </NavLink>

            <NavLink
              to="/attendance"
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `${navItem} ${isActive ? active : inactive}`
              }
            >
              <CalendarDays size={18} />
              Attendance
            </NavLink>

            <NavLink
              to="/tasks"
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `${navItem} ${isActive ? active : inactive}`
              }
            >
              <ClipboardList size={18} />
              Tasks
            </NavLink>

            <NavLink
              to="/employees"
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `${navItem} ${isActive ? active : inactive}`
              }
            >
              <Users size={18} />
              Employees
            </NavLink>

            <NavLink
              to="/vendors"
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `${navItem} ${isActive ? active : inactive}`
              }
            >
              <Users size={18} />
              Vendors
            </NavLink>

            <NavLink
              to="/freelancers"
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `${navItem} ${isActive ? active : inactive}`
              }
            >
              <Users size={18} />
              Freelancers
            </NavLink>

            <NavLink
              to="/settings"
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `${navItem} ${isActive ? active : inactive}`
              }
            >
              <Users size={18} />
              Settings
            </NavLink>

          </nav>

          {/* ===== FOOTER ===== */}
          <div className="p-4 border-t text-xs text-gray-400">
            © {new Date().getFullYear()} HRMS
          </div>

        </div>
      </aside>

      {/* ================= MOBILE OVERLAY ================= */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm md:hidden z-30"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}