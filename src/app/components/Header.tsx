import { useState } from "react";
import { Bell, MessageSquare, LogOut } from "lucide-react";
import { useNotification } from "../contexts/NotificationContext";
import { useAuth } from "../contexts/AuthContext";

type Props = {
  onNavigate?: (module: "profile" | "account") => void;
};

export default function Header({ onNavigate }: Props) {
  const { notifications } = useNotification();
  const { currentUser, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (!currentUser) return null;

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6 shadow-sm">

      {/* ===== APP TITLE ===== */}
      <h1 className="text-lg font-semibold text-orange-600">
        Quibo Tech HRMS
      </h1>

      {/* ===== RIGHT SIDE ===== */}
      <div className="flex items-center gap-5">

        {/* MESSAGE ICON */}
        <button className="relative hover:text-orange-600 transition">
          <MessageSquare className="w-5 h-5" />
        </button>

        {/* NOTIFICATION ICON */}
        <button className="relative hover:text-orange-600 transition">
          <Bell className="w-5 h-5" />

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
            <div className="h-9 w-9 rounded-full bg-orange-500 text-white flex items-center justify-center font-semibold">
              {currentUser.name.charAt(0)}
            </div>

            {/* User Info */}
            <div className="text-left leading-tight">
              <p className="text-sm font-medium">{currentUser.name}</p>
              <p className="text-xs text-gray-500">{currentUser.email}</p>
            </div>
          </button>

          {/* ===== DROPDOWN MENU ===== */}
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
