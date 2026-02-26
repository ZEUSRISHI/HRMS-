import { useEffect, useState } from "react";
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

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  type: EventType;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  createdBy: string;
  createdAt: string;
}

/* ================= COMPONENT ================= */

export function CalendarModule() {
  const { currentUser } = useAuth();

  if (!currentUser) return <div className="p-6">Loading...</div>;

  const isManager = currentUser.role === "manager";

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
  });

  /* ================= LOAD ================= */
  useEffect(() => {
    const stored = localStorage.getItem("calendarEvents");
    if (stored) setEvents(JSON.parse(stored));
  }, []);

  const persist = (data: CalendarEvent[]) => {
    localStorage.setItem("calendarEvents", JSON.stringify(data));
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
        e.id === selectedId
          ? { ...e, ...form }
          : e
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
    });
    setOpen(false);
  };

  /* ================= SORT ================= */
  const sortedEvents = [...events].sort(
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
        <div className="bg-green-100 text-green-700 px-4 py-2 rounded">
          {msg}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-semibold text-lg">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Company schedule & events
          </p>
        </div>

        {isManager && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Event
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-xl">
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type *</Label>
                    <Select
                      value={form.type}
                      onValueChange={(v: EventType) =>
                        setForm({ ...form, type: v })
                      }
                    >
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="holiday">Holiday</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) =>
                        setForm({ ...form, date: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start *</Label>
                    <Input
                      type="time"
                      value={form.startTime}
                      onChange={(e) =>
                        setForm({ ...form, startTime: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label>End *</Label>
                    <Input
                      type="time"
                      value={form.endTime}
                      onChange={(e) =>
                        setForm({ ...form, endTime: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label>Location</Label>
                  <Input
                    value={form.location}
                    onChange={(e) =>
                      setForm({ ...form, location: e.target.value })
                    }
                  />
                </div>

                <Button className="w-full" onClick={handleSubmit}>
                  {isEdit ? "Update Event" : "Create Event"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* EVENT LIST */}
      <Card>
        <CardHeader>
          <CardTitle>All Events</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {sortedEvents.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No events created
            </p>
          )}

          {sortedEvents.map((event) => (
            <Card key={event.id}>
              <CardContent className="flex gap-4 py-4">
                <div className={`w-1 rounded ${color(event.type)}`} />

                <div className="flex-1">
                  <div className="flex justify-between">
                    <h4 className="font-medium">{event.title}</h4>
                    <Badge variant="outline">{event.type}</Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {event.description}
                  </p>

                  <div className="text-sm mt-2 text-muted-foreground flex gap-4">
                    <span>{format(new Date(event.date), "MMM d, yyyy")}</span>
                    <span>{event.startTime} - {event.endTime}</span>
                    {event.location && <span>{event.location}</span>}
                  </div>
                </div>

                {isManager && (
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline"
                      onClick={() => handleEdit(event)}>
                      <Pencil className="h-4 w-4"/>
                    </Button>

                    <Button size="icon" variant="destructive"
                      onClick={() => handleDelete(event.id)}>
                      <Trash className="h-4 w-4"/>
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