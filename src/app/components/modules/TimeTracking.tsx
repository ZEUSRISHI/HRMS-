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
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

import { Plus, Trash, Pencil, Clock } from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";
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

  const isAdmin = currentUser.role === "admin";

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    if (stored) setEntries(JSON.parse(stored));
  }, []);

  const saveEntries = (data: TimeEntry[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setEntries(data);
  };

  /* ================= CREATE / UPDATE ================= */

  const handleSubmit = () => {
    if (!form.hours || !form.category) {
      alert("Hours and Category required");
      return;
    }

    if (editingId) {
      const updated = entries.map((e) =>
        e.id === editingId
          ? {
              ...e,
              date: form.date,
              hours: parseFloat(form.hours),
              category: form.category as Category,
              description: form.description,
            }
          : e
      );

      saveEntries(updated);
      setEditingId(null);
    } else {
      const newEntry: TimeEntry = {
        id: crypto.randomUUID(),
        userId: currentUser.id,
        date: form.date,
        hours: parseFloat(form.hours),
        category: form.category as Category,
        description: form.description,
        createdAt: new Date().toISOString(),
      };

      saveEntries([...entries, newEntry]);
    }

    setForm({
      date: format(new Date(), "yyyy-MM-dd"),
      projectId: "none",
      hours: "",
      category: "",
      description: "",
    });

    setOpen(false);
  };

  /* ================= DELETE ================= */

  const handleDelete = (id: string) => {
    if (!confirm("Delete this entry?")) return;
    saveEntries(entries.filter((e) => e.id !== id));
  };

  /* ================= FILTER ================= */

  const timeEntries = isAdmin
    ? entries
    : entries.filter((t) => t.userId === currentUser.id);

  /* ================= STATS ================= */

  const totalHours = timeEntries.reduce((sum, e) => sum + e.hours, 0);

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            Time Tracking
          </h1>
          <p className="text-muted-foreground text-sm">
            Monitor productivity and logged hours
          </p>
        </div>

        {!isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Log Time
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md">

              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Entry" : "Log Work Hours"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">

                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm({ ...form, date: e.target.value })
                  }
                />

                <Input
                  type="number"
                  placeholder="Hours"
                  value={form.hours}
                  onChange={(e) =>
                    setForm({ ...form, hours: e.target.value })
                  }
                />

                <Select
                  value={form.category}
                  onValueChange={(v: Category) =>
                    setForm({ ...form, category: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>

                <Textarea
                  placeholder="Description"
                  value={form.description}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description: e.target.value,
                    })
                  }
                />

                <Button className="w-full" onClick={handleSubmit}>
                  {editingId ? "Update Entry" : "Save Entry"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* SUMMARY */}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Hours
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {totalHours} hrs
            </div>
          </CardContent>
        </Card>

      </div>

      {/* TABLE */}

      <Card>

        <CardHeader>
          <CardTitle>Time Entries</CardTitle>
        </CardHeader>

        <CardContent>

          <div className="overflow-x-auto">

            <Table>

              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  {!isAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>

              <TableBody>
                {timeEntries.map((e) => (
                  <TableRow key={e.id}>

                    <TableCell>{e.date}</TableCell>

                    <TableCell>{e.hours}</TableCell>

                    <TableCell>
                      <Badge variant="secondary">
                        {e.category}
                      </Badge>
                    </TableCell>

                    <TableCell className="max-w-xs truncate">
                      {e.description}
                    </TableCell>

                    {!isAdmin && (
                      <TableCell className="flex gap-2">

                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => {
                            setEditingId(e.id);
                            setForm({
                              date: e.date,
                              hours: e.hours.toString(),
                              category: e.category,
                              description: e.description,
                              projectId: "none",
                            });
                            setOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => handleDelete(e.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>

                      </TableCell>
                    )}

                  </TableRow>
                ))}
              </TableBody>

            </Table>

          </div>

        </CardContent>
      </Card>

      {/* CHARTS */}

      <div className="grid gap-6 md:grid-cols-2">

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
                <Bar dataKey="hours" fill="#6366f1" />
              </BarChart>

            </ResponsiveContainer>

          </CardContent>

        </Card>

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
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="#16a34a"
                />
              </LineChart>

            </ResponsiveContainer>

          </CardContent>

        </Card>

      </div>

    </div>
  );
}