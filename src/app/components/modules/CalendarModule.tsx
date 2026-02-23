import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Calendar } from "../ui/calendar";
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
import {
  CalendarDays,
  MapPin,
  Users,
  Plus,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";

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
  attendees: string[];
  createdBy: string;
  createdAt: string;
}

export function CalendarModule() {
  const { currentUser } = useAuth();

  // ✅ Null safety fix
  if (!currentUser) {
    return <div className="p-6">Loading...</div>;
  }

  const isAdmin = currentUser.role === "admin";

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "meeting" as EventType,
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    attendees: [] as string[],
  });

  // ✅ Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("calendarEvents");
    if (stored) {
      setEvents(JSON.parse(stored));
    }
  }, []);

  // ✅ Save to localStorage
  const saveToLocal = (data: CalendarEvent[]) => {
    localStorage.setItem("calendarEvents", JSON.stringify(data));
    setEvents(data);
  };

  // ✅ Create Event Function
  const handleCreateEvent = () => {
    if (
      !form.title ||
      !form.date ||
      !form.startTime ||
      !form.endTime
    ) {
      alert("Please fill all required fields");
      return;
    }

    const newEvent: CalendarEvent = {
      id: crypto.randomUUID(),
      title: form.title,
      description: form.description,
      type: form.type,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      location: form.location,
      attendees: form.attendees,
      createdBy: currentUser.id,
      createdAt: new Date().toISOString(),
    };

    const updated = [...events, newEvent];
    saveToLocal(updated);

    // Reset form
    setForm({
      title: "",
      description: "",
      type: "meeting",
      date: "",
      startTime: "",
      endTime: "",
      location: "",
      attendees: [],
    });

    setOpen(false);
  };

  const upcomingEvents = events
    .filter((event) => new Date(event.date) >= new Date())
    .sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

  const holidays = events.filter((e) => e.type === "holiday");

  const getEventTypeColor = (type: EventType) => {
    switch (type) {
      case "meeting":
        return "bg-blue-500";
      case "holiday":
        return "bg-red-500";
      case "event":
        return "bg-green-500";
      case "personal":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold mb-2">
            Calendar Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage company events, meetings, and holidays
          </p>
        </div>

        {/* ✅ Only Admin can create */}
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Event
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Calendar Event</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Event Title *</Label>
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
                      setForm({
                        ...form,
                        description: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Event Type *</Label>
                    <Select
                      value={form.type}
                      onValueChange={(value: EventType) =>
                        setForm({ ...form, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meeting">
                          Meeting
                        </SelectItem>
                        <SelectItem value="event">
                          Company Event
                        </SelectItem>
                        {isAdmin && (
                          <SelectItem value="holiday">
                            Holiday
                          </SelectItem>
                        )}
                        <SelectItem value="personal">
                          Personal
                        </SelectItem>
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
                    <Label>Start Time *</Label>
                    <Input
                      type="time"
                      value={form.startTime}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          startTime: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>End Time *</Label>
                    <Input
                      type="time"
                      value={form.endTime}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          endTime: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label>Location</Label>
                  <Input
                    value={form.location}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        location: e.target.value,
                      })
                    }
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleCreateEvent}
                >
                  Create Event
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingEvents.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No upcoming events
            </p>
          )}

          {upcomingEvents.map((event) => (
            <Card key={event.id}>
              <CardContent className="py-4 flex gap-4">
                <div
                  className={`w-1 ${getEventTypeColor(
                    event.type
                  )} rounded`}
                />
                <div className="flex-1">
                  <div className="flex justify-between">
                    <h4 className="font-medium">
                      {event.title}
                    </h4>
                    <Badge variant="outline">
                      {event.type}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {event.description}
                  </p>

                  <div className="flex gap-4 text-sm mt-2 text-muted-foreground">
                    <span>
                      {format(
                        new Date(event.date),
                        "MMMM d, yyyy"
                      )}
                    </span>
                    <span>
                      {event.startTime} - {event.endTime}
                    </span>
                    {event.location && (
                      <span>{event.location}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Holidays */}
      {holidays.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Company Holidays</CardTitle>
          </CardHeader>
          <CardContent>
            {holidays.map((holiday) => (
              <div
                key={holiday.id}
                className="flex justify-between py-2 border-b"
              >
                <span>{holiday.title}</span>
                <span className="text-sm text-muted-foreground">
                  {format(
                    new Date(holiday.date),
                    "MMMM d, yyyy"
                  )}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}