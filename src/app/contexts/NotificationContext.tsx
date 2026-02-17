import { createContext, useContext, useState } from "react";

type Notification = {
  id: string;
  message: string;
  time: string;
};

type NotificationContextType = {
  notifications: Notification[];
  addNotification: (msg: string) => void;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: any) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (message: string) => {
    const newNotification = {
      id: Date.now().toString(),
      message,
      time: new Date().toLocaleTimeString(),
    };

    setNotifications((prev) => [newNotification, ...prev]);
  };

  return (
    <NotificationContext.Provider value={{ notifications, addNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotification = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification must be used inside provider");
  return ctx;
};
