import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  User,
  Settings,
  HelpCircle,
  LogOut,
  CircleUser,
} from "lucide-react";

export function ProfileMenu() {
  const { currentUser, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (!currentUser) return null;

  return (
    <div className="relative">
      {/* PROFILE BUTTON */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm hover:bg-gray-50"
      >
        <img
          src={`https://ui-avatars.com/api/?name=${currentUser.name}`}
          alt="avatar"
          className="w-8 h-8 rounded-full"
        />
        <span className="text-sm font-medium">{currentUser.name}</span>
      </button>

      {/* DROPDOWN */}
      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white border rounded-xl shadow-lg z-50">

          {/* USER INFO */}
          <div className="flex items-center gap-3 p-4 border-b">
            <img
              src={`https://ui-avatars.com/api/?name=${currentUser.name}`}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <p className="font-semibold">{currentUser.name}</p>
              <p className="text-sm text-gray-500">{currentUser.email}</p>
            </div>
          </div>

          {/* MENU ITEMS */}
          <MenuItem icon={User} label="My Profile" />
          <MenuItem icon={Settings} label="Settings" />
          <MenuItem icon={CircleUser} label="My Account" />
          <MenuItem icon={HelpCircle} label="Knowledge Base" />

          {/* LOGOUT */}
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-b-xl"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

/* ===== MENU ITEM ===== */

function MenuItem({ icon: Icon, label }: any) {
  return (
    <button className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-100">
      <Icon size={18} />
      {label}
    </button>
  );
}
