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
import { Plus, Pencil, Trash, Download } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";

type EventType = string;

type RoleType = "admin" | "manager" | "employee" | "hr" | "all";

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
    type: "",
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
      const allKeys = Object.keys(localStorage).filter((key) =>
        key.startsWith("calendarEvents_admin_")
      );
      let allEvents: CalendarEvent[] = [];
      allKeys.forEach((key) => {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            allEvents.push(...JSON.parse(data));
          } catch {}
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
    if (!form.type) return "Event type required";
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
      type: "",
      date: "",
      startTime: "",
      endTime: "",
      location: "",
      assignedTo: "all",
    });
    setOpen(false);
  };

  /* ================= FILTER & SORT ================= */
  const visibleEvents = useMemo(() => {
    if (isAdmin) return events;
    return events.filter(
      (e) => e.assignedTo === "all" || e.assignedTo === currentUser.role
    );
  }, [events, currentUser, isAdmin]);

  const sortedEvents = [...visibleEvents].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  /* ================= COLORS ================= */
  const bgColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("meeting")) return "bg-blue-50 border-blue-200";
    if (t.includes("holiday")) return "bg-red-50 border-red-200";
    if (t.includes("training")) return "bg-yellow-50 border-yellow-200";
    if (t.includes("event")) return "bg-green-50 border-green-200";
    return "bg-purple-50 border-purple-200";
  };

  const colorBar = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("meeting")) return "bg-blue-500";
    if (t.includes("holiday")) return "bg-red-500";
    if (t.includes("training")) return "bg-yellow-500";
    if (t.includes("event")) return "bg-green-500";
    return "bg-purple-500";
  };

  /* ================= DOWNLOAD REPORT ================= */
  const downloadReport = () => {
    if (!events.length) return alert("No events to download");
    const headers = [
      "Title",
      "Description",
      "Type",
      "Date",
      "Start Time",
      "End Time",
      "Location",
      "Assigned To",
      "Created By",
      "Created At",
    ];
    const rows = events.map((e) => [
      e.title,
      e.description,
      e.type,
      e.date,
      e.startTime,
      e.endTime,
      e.location,
      e.assignedTo.toUpperCase(),
      e.createdBy,
      e.createdAt,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((r) => r.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `calendar_events_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
  };

  /* ================= UI ================= */
  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      {msg && (
        <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm">
          {msg}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-semibold text-lg">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Organization events & assigned tasks
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {isAdmin && (
            <Button
              variant="outline"
              className="flex items-center gap-2 w-full sm:w-auto"
              onClick={downloadReport}
            >
              <Download className="h-4 w-4" />
              Download Report
            </Button>
          )}

          {isAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  {isEdit ? "Edit Event" : "Create Event"}
                </Button>
              </DialogTrigger>

              <DialogContent className="w-[95%] max-w-md rounded-xl p-5">
                <DialogHeader>
                  <DialogTitle>{isEdit ? "Edit Event" : "Create Event"}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                  <div className="space-y-1">
                    <Label>Title *</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Description</Label>
                    <Textarea
                      rows={3}
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Event Type *</Label>
                    <Input
                      placeholder="Meeting / Deployment / Training"
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Assign To</Label>
                    <Select
                      value={form.assignedTo}
                      onValueChange={(v: RoleType) => setForm({ ...form, assignedTo: v })}
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
                  <div className="space-y-1">
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={form.startTime}
                        onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={form.endTime}
                        onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Location</Label>
                    <Input
                      placeholder="Conference room / Zoom"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                    />
                  </div>
                  <Button className="w-full mt-2" onClick={handleSubmit}>
                    {isEdit ? "Update Event" : "Create Event"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* EVENTS LIST */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>Events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedEvents.length === 0 && (
            <p className="text-sm text-muted-foreground">No events available</p>
          )}
          {sortedEvents.map((event) => (
            <Card key={event.id} className={`rounded-lg border ${bgColor(event.type)}`}>
              <CardContent className="flex gap-3 py-4 flex-col sm:flex-row">
                <div className={`w-1 rounded ${colorBar(event.type)}`} />
                <div className="flex-1 space-y-1">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <h4 className="font-medium text-sm sm:text-base">{event.title}</h4>
                    <Badge variant="outline" className="w-fit">
                      {event.assignedTo === "all" ? "Organization" : event.assignedTo.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">{event.description}</p>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                    <span>{format(new Date(event.date), "MMM d, yyyy")}</span>
                    <span>{event.startTime} - {event.endTime}</span>
                    {event.location && <span>{event.location}</span>}
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex flex-row gap-2 mt-2 sm:mt-0">
                    <Button size="icon" variant="outline" onClick={() => handleEdit(event)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="destructive" onClick={() => handleDelete(event.id)}>
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