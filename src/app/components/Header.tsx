import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { LogOut, User, Settings, BookOpen } from "lucide-react";

type Props = {
  onNavigate?: (module: "profile" | "account") => void;
};

export default function Header({ onNavigate }: Props) {
  const { currentUser, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (!currentUser) return null;

  return (
    <header className="bg-white border-b px-6 py-3 flex justify-between items-center shadow-sm">
      
      {/* APP TITLE */}
      <h1 className="font-semibold text-lg text-orange-600">
        Quibo Tech HRMS
      </h1>

      {/* PROFILE BUTTON */}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-3 hover:bg-gray-100 px-3 py-2 rounded-lg"
        >
          <div className="h-9 w-9 rounded-full bg-orange-500 text-white flex items-center justify-center font-semibold">
            {currentUser.name.charAt(0)}
          </div>

          <div className="text-left">
            <p className="text-sm font-medium">{currentUser.name}</p>
            <p className="text-xs text-gray-500">{currentUser.email}</p>
          </div>
        </button>

        {/* DROPDOWN MENU */}
        {open && (
          <div className="absolute right-0 mt-2 w-56 bg-white border rounded-lg shadow-lg z-50">

            <MenuItem
              icon={User}
              label="My Profile"
              onClick={() => {
                onNavigate?.("profile");
                setOpen(false);
              }}
            />

            <MenuItem
              icon={Settings}
              label="My Account"
              onClick={() => {
                onNavigate?.("account");
                setOpen(false);
              }}
            />

            <MenuItem icon={BookOpen} label="Knowledge Base" />

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
    </header>
  );
}

function MenuItem({ icon: Icon, label, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-100"
    >
      <Icon size={16} />
      {label}
    </button>
  );
}
