import { Bell, MessageCircle } from "lucide-react";
import { useState } from "react";
import NotificationPanel from "../app/components/notifications/NotificationPanel";
import { useNotification } from "../app/contexts/NotificationContext";

export default function DashboardHeader() {
  const [open, setOpen] = useState(false);
  const { notifications } = useNotification();

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b bg-white">

      <h1 className="font-semibold text-lg">Dashboard</h1>

      <div className="flex items-center gap-4">

        {/* MESSAGE ICON */}
        <button className="relative p-2 rounded-lg hover:bg-gray-100">
          <MessageCircle size={20} />
        </button>

        {/* NOTIFICATION ICON */}
        <button
          onClick={() => setOpen(!open)}
          className="relative p-2 rounded-lg hover:bg-gray-100"
        >
          <Bell size={20} />

          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1 rounded-full">
              {notifications.length}
            </span>
          )}
        </button>

        {/* PROFILE */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-500" />
          <span className="text-sm font-medium">Admin</span>
        </div>
      </div>

      {open && <NotificationPanel />}
    </div>
  );
}
