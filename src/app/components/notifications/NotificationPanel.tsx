import { useNotification } from "../../contexts/NotificationContext";

export default function NotificationPanel() {
  const { notifications } = useNotification();

  return (
    <div className="absolute right-6 top-16 w-80 bg-white border rounded-xl shadow-lg z-50">

      <div className="p-3 border-b font-semibold">
        Notifications
      </div>

      <div className="max-h-80 overflow-y-auto">

        {notifications.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">No notifications</p>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className="p-3 border-b hover:bg-gray-50">
              <p className="text-sm">{n.message}</p>
              <p className="text-xs text-gray-400">{n.time}</p>
            </div>
          ))
        )}

      </div>
    </div>
  );
}
