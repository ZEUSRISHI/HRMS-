import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { messageApi, taskApi, calendarApi, helpdeskApi, projectApi } from "@/services/api";
import { useAuth } from "./AuthContext";

interface UnreadCounts {
  messages: number;
  tasks: number;
  calendar: number;
  helpdesk: number;
  projects: number;
}

interface UnreadCountsContextType {
  counts: UnreadCounts;
  markSeen: (key: keyof UnreadCounts) => void;
  refresh: () => void;
}

const UnreadCountsContext = createContext<UnreadCountsContextType | null>(null);

const STORAGE_KEY = "hrms_last_seen";

function getLastSeen(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}
function setLastSeen(key: string, iso: string) {
  const cur = getLastSeen();
  cur[key] = iso;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cur));
}

export function UnreadCountsProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [counts, setCounts] = useState<UnreadCounts>({ messages: 0, tasks: 0, calendar: 0, helpdesk: 0, projects: 0 });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!currentUser) return;
    const lastSeen = getLastSeen();
    try {
      const [convRes, taskRes, calRes, hdRes, projRes] = await Promise.allSettled([
  messageApi.getConversations(),
  taskApi.getMy(),
  calendarApi.getEvents(),
  helpdeskApi.getMy ? helpdeskApi.getMy() : Promise.resolve({ tickets: [] }),
  projectApi.getMy(),
]);

      let unreadMsgs = 0;
      if (convRes.status === "fulfilled") {
        const since = lastSeen.messages ? new Date(lastSeen.messages) : new Date(0);
        (convRes.value.conversations || []).forEach((c: any) => {
          if (c.lastMessage && c.lastMessageAt && new Date(c.lastMessageAt) > since
              && c.lastMessage.senderId?._id !== currentUser.id) {
            unreadMsgs++;
          }
        });
      }

      let unreadTasks = 0;
      if (taskRes.status === "fulfilled") {
        const since = lastSeen.tasks ? new Date(lastSeen.tasks) : new Date(0);
        unreadTasks = (taskRes.value.tasks || []).filter((t: any) =>
          t.createdAt && new Date(t.createdAt) > since
        ).length;
      }

      let unreadCal = 0;
      if (calRes.status === "fulfilled") {
        const since = lastSeen.calendar ? new Date(lastSeen.calendar) : new Date(0);
        unreadCal = (calRes.value.events || []).filter((e: any) =>
          e.createdAt && new Date(e.createdAt) > since
        ).length;
      }

      let unreadHd = 0;
      if (hdRes.status === "fulfilled") {
        const since = lastSeen.helpdesk ? new Date(lastSeen.helpdesk) : new Date(0);
        unreadHd = (hdRes.value.tickets || []).filter((t: any) =>
          t.updatedAt && new Date(t.updatedAt) > since
        ).length;
      }

      let unreadProjects = 0;
      if (projRes.status === "fulfilled") {
        const since = lastSeen.projects ? new Date(lastSeen.projects) : new Date(0);
        unreadProjects = (projRes.value.projects || []).filter((p: any) =>
          p.createdAt && new Date(p.createdAt) > since &&
          Array.isArray(p.teamMembers) &&
          p.teamMembers.some((m: any) => (m._id ?? m) === currentUser.id)
        ).length;
      }

      setCounts({ messages: unreadMsgs, tasks: unreadTasks, calendar: unreadCal, helpdesk: unreadHd, projects: unreadProjects });
    } catch (e) {
      console.error("UnreadCounts refresh error:", e);
    }
  }, [currentUser]);

  const markSeen = useCallback((key: keyof UnreadCounts) => {
    setLastSeen(key, new Date().toISOString());
    setCounts(prev => ({ ...prev, [key]: 0 }));
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    refresh();
    pollRef.current = setInterval(refresh, 20000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [currentUser, refresh]);

  return (
    <UnreadCountsContext.Provider value={{ counts, markSeen, refresh }}>
      {children}
    </UnreadCountsContext.Provider>
  );
}

export function useUnreadCounts() {
  const ctx = useContext(UnreadCountsContext);
  if (!ctx) throw new Error("useUnreadCounts must be used within UnreadCountsProvider");
  return ctx;
}
