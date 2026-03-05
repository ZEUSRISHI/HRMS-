import { ReactNode, useState } from "react";
import {
  Menu,
  User,
  LogOut,
  Settings,
  X,
  ChevronLeft,
  LucideIcon,
} from "lucide-react";

import { useAuth, Role } from "../app/contexts/AuthContext";
import { ModuleType } from "../app/App";

/* ================= MENU TYPE ================= */

interface MenuItem {
  id: ModuleType;
  name: string;
  icon: LucideIcon;
  roles: Role[];
}

/* ================= PROPS ================= */

interface Props {
  children: ReactNode;
  active: ModuleType;
  setActive: (module: ModuleType) => void;
  role: Role;
  menuItems: MenuItem[];
}

/* ================= COMPONENT ================= */

export default function MainLayout({
  children,
  active,
  setActive,
  menuItems,
}: Props) {
  const { currentUser, logout } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-gray-100 flex overflow-hidden">

      {/* ================= MOBILE OVERLAY ================= */}

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ================= SIDEBAR ================= */}

      <aside
        className={`
        fixed lg:static top-0 left-0 z-50 h-full
        bg-white border-r shadow-sm
        transition-all duration-300
        ${collapsed ? "w-20" : "w-64"}
        ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        {/* HEADER */}

        <div className="flex items-center justify-between p-4 border-b">

          {!collapsed && (
            <h2 className="font-bold text-orange-500 text-lg">
              Quibo Tech HRMS
            </h2>
          )}

          {/* DESKTOP COLLAPSE BUTTON */}

          <button
            className="hidden lg:block"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft
              className={`transition ${collapsed ? "rotate-180" : ""}`}
            />
          </button>

          {/* MOBILE CLOSE */}

          <button
            className="lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X />
          </button>
        </div>

        {/* MENU */}

        <nav className="p-3 space-y-2">

          {menuItems.map((item) => {

            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActive(item.id);
                  setMobileOpen(false);
                }}
                className={`
                flex items-center gap-3 w-full p-3 rounded-lg
                transition text-left
                ${active === item.id
                    ? "bg-orange-100 text-orange-600"
                    : "hover:bg-gray-100"}
              `}
              >
                <Icon size={20} />

                {!collapsed && (
                  <span className="text-sm font-medium">
                    {item.name}
                  </span>
                )}

              </button>
            );
          })}

        </nav>

      </aside>

      {/* ================= MAIN AREA ================= */}

      <div className="flex flex-col flex-1 w-0">

        {/* ================= HEADER ================= */}

        <header className="h-16 bg-white border-b flex items-center justify-between px-4">

          <div className="flex items-center gap-3">

            {/* MOBILE MENU BUTTON */}

            <button
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu />
            </button>

            <h1 className="text-lg font-semibold text-orange-500">
              Quibo Tech HRMS
            </h1>

          </div>

          {/* ================= USER MENU ================= */}

          <div className="relative">

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-lg"
            >
              <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center">
                {currentUser?.name?.charAt(0)}
              </div>

              <div className="hidden md:block text-left">

                <p className="text-sm font-medium">
                  {currentUser?.name}
                </p>

                <p className="text-xs text-gray-500">
                  {currentUser?.email}
                </p>

              </div>

            </button>

            {/* DROPDOWN */}

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg">

                <button
                  onClick={() => {
                    setActive("profile");
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 w-full hover:bg-gray-100"
                >
                  <User size={16} />
                  Profile
                </button>

                <button
                  onClick={() => {
                    setActive("account");
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 w-full hover:bg-gray-100"
                >
                  <Settings size={16} />
                  Account
                </button>

                <button
                  onClick={() => logout()}
                  className="flex items-center gap-2 px-4 py-2 w-full hover:bg-red-100 text-red-600"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>

              </div>
            )}

          </div>

        </header>

        {/* ================= CONTENT ================= */}

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-100">
          {children}
        </main>

      </div>

    </div>
  );
}