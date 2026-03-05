import { useState } from "react";
import { Menu, Bell, MessageSquare, LogOut } from "lucide-react";
import { useNotification } from "../contexts/NotificationContext";
import { useAuth } from "../contexts/AuthContext";

type Props = {
  toggleSidebar?: () => void;
  onNavigate?: (module: "profile" | "account") => void;
};

export default function Header({ toggleSidebar, onNavigate }: Props) {
  const { notifications } = useNotification();
  const { currentUser, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (!currentUser) return null;

  return (
    <header className="bg-white border-b px-4 md:px-6 h-16 flex items-center justify-between shadow-sm">

      {/* ===== LEFT SIDE ===== */}
      <div className="flex items-center gap-3">

        {/* MOBILE SIDEBAR BUTTON */}
        <button
          onClick={toggleSidebar}
          className="md:hidden p-1 hover:bg-gray-100 rounded"
        >
          <Menu size={22} />
        </button>

        {/* APP TITLE */}
        <h1 className="text-orange-600 font-semibold text-lg">
          Quibo Tech HRMS
        </h1>

      </div>

      {/* ===== RIGHT SIDE ===== */}
      <div className="flex items-center gap-5">

        {/* MESSAGE ICON */}
        <button className="relative hover:text-orange-600 transition">
          <MessageSquare size={20} />
        </button>

        {/* NOTIFICATION ICON */}
        <button className="relative hover:text-orange-600 transition">
          <Bell size={20} />

          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs px-1.5 rounded-full">
              {notifications.length}
            </span>
          )}
        </button>

        {/* ===== PROFILE DROPDOWN ===== */}
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-3 hover:bg-gray-100 px-3 py-2 rounded-lg transition"
          >
            {/* Avatar */}
            <div className="h-8 w-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-semibold">
              {currentUser.name.charAt(0)}
            </div>

            {/* USER INFO */}
            <div className="hidden sm:block text-left leading-tight">
              <p className="text-sm font-medium">{currentUser.name}</p>
              <p className="text-xs text-gray-500">{currentUser.email}</p>
            </div>
          </button>

          {/* ===== DROPDOWN ===== */}
          {open && (
            <div className="absolute right-0 mt-2 w-56 bg-white border rounded-lg shadow-lg z-50">

              <MenuItem
                label="My Profile"
                onClick={() => {
                  onNavigate?.("profile");
                  setOpen(false);
                }}
              />

              <MenuItem
                label="My Account"
                onClick={() => {
                  onNavigate?.("account");
                  setOpen(false);
                }}
              />

              <MenuItem label="Knowledge Base" />

              <div className="border-t my-1" />

              <button
                onClick={logout}
                className="flex items-center gap-2 w-full px-4 py-2 text-red-600 hover:bg-red-50"
              >
                <LogOut size={16} />
                Logout
              </button>

            </div>
          )}
        </div>

      </div>
    </header>
  );
}

/* ===== MENU ITEM COMPONENT ===== */

type MenuItemProps = {
  label: string;
  onClick?: () => void;
};

function MenuItem({ label, onClick }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-100 text-sm"
    >
      {label}
    </button>
  );
}