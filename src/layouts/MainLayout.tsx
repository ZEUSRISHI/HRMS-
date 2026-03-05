import { ReactNode, useState } from "react";
import { Menu, User, LogOut, Settings, X } from "lucide-react";
import { useAuth, Role } from "../app/contexts/AuthContext";
import { ModuleType } from "../app/App";
import { LucideIcon } from "lucide-react";

/* MENU ITEM TYPE */

interface MenuItem {
  id: ModuleType;
  name: string;
  icon: LucideIcon;
  roles: Role[];
}

/* PROPS */

interface Props {
  children: ReactNode;
  active: ModuleType;
  setActive: (module: ModuleType) => void;
  role: Role;
  menuItems: MenuItem[];
}

export default function MainLayout({
  children,
  active,
  setActive,
  role,
  menuItems,
}: Props) {
  const { currentUser, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100">

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}

      <aside
        className={`
        fixed md:static z-40
        top-0 left-0 h-full
        w-64 bg-white border-r
        transform transition-transform
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0
      `}
      >
        <div className="flex items-center justify-between p-4 border-b">

          <h2 className="font-bold text-orange-500">
            Quibo Tech HRMS
          </h2>

          <button
            className="md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X />
          </button>
        </div>

        <nav className="p-4 space-y-2">

          {menuItems.map((item) => {

            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActive(item.id);
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg
                  transition text-left
                  ${active === item.id
                    ? "bg-gray-200"
                    : "hover:bg-gray-100"}
                `}
              >
                <Icon size={18} />
                {item.name}
              </button>
            );
          })}

        </nav>
      </aside>

      {/* MAIN AREA */}

      <div className="flex flex-col flex-1">

        {/* HEADER */}

        <header className="h-16 bg-white border-b flex items-center justify-between px-4">

          <div className="flex items-center gap-3">

            {/* MOBILE MENU BUTTON */}

            <button
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu />
            </button>

            <h1 className="text-lg font-semibold text-orange-500">
              Quibo Tech HRMS
            </h1>
          </div>

          {/* USER MENU */}

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

        {/* CONTENT */}

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>

      </div>
    </div>
  );
}