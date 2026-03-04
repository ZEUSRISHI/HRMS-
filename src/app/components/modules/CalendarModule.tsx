import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Plus, Pencil, Trash } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";

/* ================= TYPES ================= */

type EventType = "meeting" | "holiday" | "event" | "personal";

type RoleType =
  | "admin"
  | "manager"
  | "employee"
  | "hr"
  | "all";

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  type: EventType;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  assignedTo: RoleType;
  createdBy: string;
  createdAt: string;
}

/* ================= COMPONENT ================= */

export function CalendarModule() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  const isAdmin = currentUser.role === "admin";

  const STORAGE_KEY = `calendarEvents_admin_${currentUser.id}`;

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [open, setOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "meeting" as EventType,
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    assignedTo: "all" as RoleType,
  });

  /* ================= LOAD ================= */

  useEffect(() => {
    if (isAdmin) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setEvents(JSON.parse(stored));
    } else {
      // Load all admin-created events
      const allKeys = Object.keys(localStorage).filter((key) =>
        key.startsWith("calendarEvents_admin_")
      );

      let allEvents: CalendarEvent[] = [];

      allKeys.forEach((key) => {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            allEvents.push(...JSON.parse(data));
          } catch {
            console.warn("Invalid event data in localStorage");
          }
        }
      });

      setEvents(allEvents);
    }
  }, [currentUser]);

  const persist = (data: CalendarEvent[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setEvents(data);
  };

  /* ================= VALIDATION ================= */

  const validate = () => {
    if (!form.title) return "Title required";
    if (!form.date) return "Date required";
    if (!form.startTime) return "Start time required";
    if (!form.endTime) return "End time required";
    return "";
  };

  /* ================= CREATE / UPDATE ================= */

  const handleSubmit = () => {
    const error = validate();
    if (error) return alert(error);

    if (isEdit && selectedId) {
      const updated = events.map((e) =>
        e.id === selectedId ? { ...e, ...form } : e
      );
      persist(updated);
      setMsg("✅ Event updated");
    } else {
      const newEvent: CalendarEvent = {
        id: crypto.randomUUID(),
        ...form,
        createdBy: currentUser.id,
        createdAt: new Date().toISOString(),
      };
      persist([newEvent, ...events]);
      setMsg("✅ Event created");
    }

    resetForm();
    setTimeout(() => setMsg(""), 3000);
  };

  /* ================= DELETE ================= */

  const handleDelete = (id: string) => {
    if (!window.confirm("Delete event?")) return;
    persist(events.filter((e) => e.id !== id));
  };

  /* ================= EDIT ================= */

  const handleEdit = (event: CalendarEvent) => {
    setIsEdit(true);
    setSelectedId(event.id);
    setForm({
      title: event.title,
      description: event.description,
      type: event.type,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      assignedTo: event.assignedTo,
    });
    setOpen(true);
  };

  const resetForm = () => {
    setIsEdit(false);
    setSelectedId(null);
    setForm({
      title: "",
      description: "",
      type: "meeting",
      date: "",
      startTime: "",
      endTime: "",
      location: "",
      assignedTo: "all",
    });
    setOpen(false);
  };

  /* ================= FILTER BASED ON ROLE ================= */

  const visibleEvents = useMemo(() => {
    if (isAdmin) return events;

    return events.filter(
      (e) =>
        e.assignedTo === "all" ||
        e.assignedTo === currentUser.role
    );
  }, [events, currentUser, isAdmin]);

  const sortedEvents = [...visibleEvents].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const color = (type: EventType) => {
    if (type === "meeting") return "bg-blue-500";
    if (type === "holiday") return "bg-red-500";
    if (type === "event") return "bg-green-500";
    return "bg-purple-500";
  };

  /* ================= UI ================= */

  return (
    <div className="space-y-6">

      {msg && (
        <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm shadow">
          {msg}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-semibold text-lg">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Organization events & assigned tasks
          </p>
        </div>

        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Event
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-xl rounded-2xl">
              <DialogHeader>
                <DialogTitle>
                  {isEdit ? "Edit Event" : "Create Event"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">

                <div>
                  <Label>Title *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label>Assign To *</Label>
                  <Select
                    value={form.assignedTo}
                    onValueChange={(v: RoleType) =>
                      setForm({ ...form, assignedTo: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Entire Organization</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="hr">HR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) =>
                      setForm({ ...form, date: e.target.value })
                    }
                  />
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) =>
                      setForm({ ...form, startTime: e.target.value })
                    }
                  />
                </div>

                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) =>
                    setForm({ ...form, endTime: e.target.value })
                  }
                />

                <Input
                  placeholder="Location"
                  value={form.location}
                  onChange={(e) =>
                    setForm({ ...form, location: e.target.value })
                  }
                />

                <Button className="w-full" onClick={handleSubmit}>
                  {isEdit ? "Update Event" : "Create Event"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* EVENT LIST */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Events</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {sortedEvents.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No events available
            </p>
          )}

          {sortedEvents.map((event) => (
            <Card key={event.id} className="rounded-xl">
              <CardContent className="flex gap-4 py-4">
                <div className={`w-1 rounded ${color(event.type)}`} />

                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">{event.title}</h4>
                    <Badge variant="outline">
                      {event.assignedTo === "all"
                        ? "Organization"
                        : event.assignedTo.toUpperCase()}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {event.description}
                  </p>

                  <div className="text-xs mt-2 text-muted-foreground flex gap-4">
                    <span>{format(new Date(event.date), "MMM d, yyyy")}</span>
                    <span>
                      {event.startTime} - {event.endTime}
                    </span>
                    {event.location && <span>{event.location}</span>}
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleEdit(event)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => handleDelete(event.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}