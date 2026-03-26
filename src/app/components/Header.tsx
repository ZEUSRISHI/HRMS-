import { useState } from "react";
import { Menu, Bell, MessageSquare, LogOut, User, Settings } from "lucide-react";
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
  const [notifOpen, setNotifOpen] = useState(false);

  if (!currentUser) return null;

  const avatarUrl = currentUser.avatar
    ? currentUser.avatar
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=f97316&color=fff`;

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="bg-white border-b px-4 md:px-6 h-16 flex items-center justify-between shadow-sm sticky top-0 z-40">

      {/* ===== LEFT ===== */}
      <div className="flex items-center gap-3">

        {/* MOBILE MENU BUTTON */}
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <Menu size={22} />
        </button>

        {/* BRAND */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">Q</span>
          </div>
          <h1 className="text-orange-600 font-bold text-lg hidden sm:block">
            Quibo Tech HRMS
          </h1>
        </div>

      </div>

      {/* ===== RIGHT ===== */}
      <div className="flex items-center gap-2 md:gap-4">

        {/* MESSAGE */}
        <button className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600 hover:text-orange-600">
          <MessageSquare size={20} />
        </button>

        {/* NOTIFICATIONS */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600 hover:text-orange-600 relative"
          >
            <Bell size={20} />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white border rounded-xl shadow-lg z-50 p-3 space-y-2">
              <p className="font-semibold text-sm text-gray-700">Notifications</p>
              {notifications.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">No notifications</p>
              ) : (
                notifications.slice(0, 5).map((n) => (
                  <div key={n.id} className="text-xs text-gray-600 p-2 bg-gray-50 rounded-lg">
                    {n.message}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* PROFILE DROPDOWN */}
        <div className="relative">
          <button
            onClick={() => { setOpen(!open); setNotifOpen(false); }}
            className="flex items-center gap-2 hover:bg-gray-100 px-2 py-1.5 rounded-lg transition"
          >
            <img
              src={avatarUrl}
              alt={currentUser.name}
              className="h-8 w-8 rounded-full border-2 border-orange-200 object-cover"
            />
            <div className="hidden sm:block text-left leading-tight">
              <p className="text-sm font-semibold text-gray-800">
                {currentUser.name}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {currentUser.role}
              </p>
            </div>
          </button>

          {/* DROPDOWN MENU */}
          {open && (
            <div className="absolute right-0 mt-2 w-60 bg-white border rounded-xl shadow-xl z-50 overflow-hidden">

              {/* USER INFO */}
              <div className="p-4 border-b bg-orange-50">
                <div className="flex items-center gap-3">
                  <img
                    src={avatarUrl}
                    alt={currentUser.name}
                    className="w-10 h-10 rounded-full border-2 border-orange-300"
                  />
                  <div>
                    <p className="font-semibold text-sm text-gray-800">
                      {currentUser.name}
                    </p>
                    <p className="text-xs text-gray-500">{currentUser.email}</p>
                    <span className="inline-block mt-1 text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full capitalize">
                      {currentUser.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* MENU ITEMS */}
              <div className="py-1">
                <button
                  onClick={() => { onNavigate?.("profile"); setOpen(false); }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition"
                >
                  <User size={16} className="text-gray-500" />
                  My Profile
                </button>

                <button
                  onClick={() => { onNavigate?.("account"); setOpen(false); }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition"
                >
                  <Settings size={16} className="text-gray-500" />
                  My Account
                </button>
              </div>

              <div className="border-t py-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>

            </div>
          )}
        </div>

      </div>
    </header>
  );
}