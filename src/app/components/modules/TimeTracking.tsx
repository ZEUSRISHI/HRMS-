import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
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
import { Clock, Plus } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { mockProjects, mockUsers } from "../../data/mockData";
import { format, subDays } from "date-fns";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

/* ================= TYPES ================= */

type Category = "project" | "meeting" | "admin" | "other";

interface TimeEntry {
  id: string;
  userId: string;
  projectId?: string;
  date: string;
  hours: number;
  category: Category;
  description: string;
  createdAt: string;
}

const STORAGE_KEY = "startup_time_entries";

/* ================= MODULE ================= */

export function TimeTracking() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  const isManager =
    currentUser.role === "manager" || currentUser.role === "admin";

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    projectId: "none",
    hours: "",
    category: "" as Category | "",
    description: "",
  });

  /* ================= LOAD ================= */

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setEntries(JSON.parse(stored));
    }
  }, []);

  /* ================= SAVE ================= */

  const saveEntries = (data: TimeEntry[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setEntries(data);
  };

  /* ================= LOG TIME ================= */

  const handleLogTime = () => {
    if (!form.hours || !form.category) {
      alert("Hours and Category required");
      return;
    }

    const newEntry: TimeEntry = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      projectId:
        form.projectId !== "none" ? form.projectId : undefined,
      date: form.date,
      hours: parseFloat(form.hours),
      category: form.category as Category,
      description: form.description,
      createdAt: new Date().toISOString(),
    };

    const updated = [...entries, newEntry];
    saveEntries(updated);

    setForm({
      date: format(new Date(), "yyyy-MM-dd"),
      projectId: "none",
      hours: "",
      category: "",
      description: "",
    });

    setOpen(false);
  };

  /* ================= FILTER ================= */

  const timeEntries = isManager
    ? entries
    : entries.filter((t) => t.userId === currentUser.id);

  /* ================= CATEGORY DATA ================= */

  const categoryData = useMemo(() => {
    const map: Record<Category, number> = {
      project: 0,
      meeting: 0,
      admin: 0,
      other: 0,
    };

    timeEntries.forEach((e) => {
      map[e.category] += e.hours;
    });

    return Object.entries(map).map(([key, value]) => ({
      name: key,
      hours: value,
    }));
  }, [timeEntries]);

  /* ================= DAILY TREND (LAST 7 DAYS) ================= */

  const dailyTrend = useMemo(() => {
    const data = [];

    for (let i = 6; i >= 0; i--) {
      const date = format(subDays(new Date(), i), "yyyy-MM-dd");
      const total = timeEntries
        .filter((t) => t.date === date)
        .reduce((sum, t) => sum + t.hours, 0);

      data.push({
        date: format(subDays(new Date(), i), "MMM d"),
        hours: total,
      });
    }

    return data;
  }, [timeEntries]);

  /* ================= UI ================= */

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Time Tracking</h1>
          <p className="text-sm text-muted-foreground">
            Track work hours and visualize productivity
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Log Time
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Work Hours</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm({ ...form, date: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Project</Label>
                <Select
                  value={form.projectId}
                  onValueChange={(value) =>
                    setForm({ ...form, projectId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Project</SelectItem>
                    {mockProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Hours *</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={form.hours}
                  onChange={(e) =>
                    setForm({ ...form, hours: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Category *</Label>
                <Select
                  value={form.category}
                  onValueChange={(value: Category) =>
                    setForm({ ...form, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>

              <Button className="w-full" onClick={handleLogTime}>
                Save Entry
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* CATEGORY BAR CHART */}
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="hours" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* DAILY TREND LINE GRAPH */}
      <Card>
        <CardHeader>
          <CardTitle>Last 7 Days Trend</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="hours" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

    </div>
  );
}