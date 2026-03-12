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
import { calendarApi } from "@/services/api";

type RoleType = "admin" | "manager" | "employee" | "hr" | "all";

interface CalendarEvent {
  _id: string;
  title: string;
  description: string;
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  assignedTo: RoleType;
  createdBy: any;
}

export function CalendarModule() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  const isAdmin = currentUser.role === "admin";

  const [events, setEvents]   = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen]       = useState(false);
  const [isEdit, setIsEdit]   = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msg, setMsg]         = useState("");

  const [form, setForm] = useState({
    title:       "",
    description: "",
    type:        "",
    date:        "",
    startTime:   "",
    endTime:     "",
    location:    "",
    assignedTo:  "all" as RoleType,
  });

  /* ===== LOAD EVENTS FROM API ===== */
  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = isAdmin
        ? await calendarApi.getAll()
        : await calendarApi.getEvents();
      setEvents(data.events || []);
    } catch (err: any) {
      console.error("Load events error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  /* ===== CREATE / UPDATE ===== */
  const handleSubmit = async () => {
    if (!form.title) return alert("Title required");
    if (!form.type)  return alert("Event type required");
    if (!form.date)  return alert("Date required");

    try {
      if (isEdit && selectedId) {
        await calendarApi.update(selectedId, form);
        setMsg("✅ Event updated");
      } else {
        await calendarApi.create(form);
        setMsg("✅ Event created");
      }

      await loadEvents();
      resetForm();
      setTimeout(() => setMsg(""), 3000);
    } catch (err: any) {
      setMsg("❌ " + err.message);
    }
  };

  /* ===== DELETE ===== */
  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete event?")) return;
    try {
      await calendarApi.delete(id);
      setMsg("✅ Event deleted");
      await loadEvents();
      setTimeout(() => setMsg(""), 3000);
    } catch (err: any) {
      setMsg("❌ " + err.message);
    }
  };

  /* ===== EDIT ===== */
  const handleEdit = (event: CalendarEvent) => {
    setIsEdit(true);
    setSelectedId(event._id);
    setForm({
      title:       event.title,
      description: event.description,
      type:        event.type,
      date:        event.date,
      startTime:   event.startTime,
      endTime:     event.endTime,
      location:    event.location,
      assignedTo:  event.assignedTo,
    });
    setOpen(true);
  };

  const resetForm = () => {
    setIsEdit(false);
    setSelectedId(null);
    setForm({
      title: "", description: "", type: "", date: "",
      startTime: "", endTime: "", location: "", assignedTo: "all",
    });
    setOpen(false);
  };

  /* ===== SORT EVENTS ===== */
  const sortedEvents = useMemo(() => {
    return [...events].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [events]);

  /* ===== DOWNLOAD ===== */
  const downloadReport = () => {
    if (!events.length) return alert("No events to download");
    const headers = ["Title", "Type", "Date", "Start", "End", "Location", "Assigned To"];
    const rows = events.map((e) => [
      e.title, e.type, e.date, e.startTime, e.endTime, e.location, e.assignedTo,
    ]);
    const csv = "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((r) => r.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `calendar_events_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
  };

  /* ===== COLORS ===== */
  const bgColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("meeting"))  return "bg-blue-50 border-blue-200";
    if (t.includes("holiday"))  return "bg-red-50 border-red-200";
    if (t.includes("training")) return "bg-yellow-50 border-yellow-200";
    if (t.includes("event"))    return "bg-green-50 border-green-200";
    return "bg-purple-50 border-purple-200";
  };

  const colorBar = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("meeting"))  return "bg-blue-500";
    if (t.includes("holiday"))  return "bg-red-500";
    if (t.includes("training")) return "bg-yellow-500";
    if (t.includes("event"))    return "bg-green-500";
    return "bg-purple-500";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">

      {/* MESSAGE */}
      {msg && (
        <div className={`px-4 py-2 rounded-lg text-sm ${
          msg.startsWith("✅")
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }`}>
          {msg}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-semibold text-lg">Calendar</h1>
          <p className="text-sm text-gray-500">
            {events.length} event{events.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex gap-2">
          {isAdmin && (
            <>
              <Button variant="outline" onClick={downloadReport} className="gap-2">
                <Download className="h-4 w-4" /> Download
              </Button>

              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {isEdit ? "Edit Event" : "Create Event"}
                  </Button>
                </DialogTrigger>

                <DialogContent className="w-[95%] max-w-md rounded-xl p-5 max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {isEdit ? "Edit Event" : "Create Event"}
                    </DialogTitle>
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
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>Event Type *</Label>
                      <Input
                        placeholder="Meeting / Holiday / Training"
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
                        <SelectTrigger><SelectValue /></SelectTrigger>
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

                    <div className="grid grid-cols-2 gap-3">
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

                    <Button className="w-full" onClick={handleSubmit}>
                      {isEdit ? "Update Event" : "Create Event"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* EVENTS LIST */}
      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedEvents.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              No events available
            </p>
          )}

          {sortedEvents.map((event) => (
            <Card
              key={event._id}
              className={`rounded-lg border ${bgColor(event.type)}`}
            >
              <CardContent className="flex gap-3 py-4 flex-col sm:flex-row">
                <div className={`w-1 rounded ${colorBar(event.type)}`} />

                <div className="flex-1 space-y-1">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <h4 className="font-medium text-sm">{event.title}</h4>
                    <Badge variant="outline" className="w-fit text-xs">
                      {event.assignedTo === "all"
                        ? "Organization"
                        : event.assignedTo?.toUpperCase()}
                    </Badge>
                  </div>

                  {event.description && (
                    <p className="text-xs text-gray-500">{event.description}</p>
                  )}

                  <div className="text-xs text-gray-500 flex flex-wrap gap-3">
                    <span>
                      {format(new Date(event.date), "MMM d, yyyy")}
                    </span>
                    {event.startTime && event.endTime && (
                      <span>{event.startTime} - {event.endTime}</span>
                    )}
                    {event.location && <span>📍 {event.location}</span>}
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
                      onClick={() => handleDelete(event._id)}
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