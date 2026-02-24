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
import { Clock, Plus, Trash } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { mockProjects } from "../../data/mockData";
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

  const [popup, setPopup] = useState("");

  const [form, setForm] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    projectId: "none",
    hours: "",
    category: "" as Category | "",
    description: "",
  });

  /* ================= POPUP ================= */

  function showPopup(message: string) {
    setPopup(message);
    setTimeout(() => setPopup(""), 2500);
  }

  /* ================= LOAD ================= */

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setEntries(JSON.parse(stored));
  }, []);

  /* ================= SAVE ================= */

  const saveEntries = (data: TimeEntry[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setEntries(data);
  };

  /* ================= CREATE ================= */

  const handleLogTime = () => {
    if (!form.hours || !form.category) {
      alert("Hours and Category required");
      return;
    }

    const newEntry: TimeEntry = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      projectId: form.projectId !== "none" ? form.projectId : undefined,
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
    showPopup("Time entry saved successfully ⏱️");
  };

  /* ================= DELETE ================= */

  const handleDelete = (id: string) => {
    if (!confirm("Delete this entry?")) return;
    const updated = entries.filter((e) => e.id !== id);
    saveEntries(updated);
    showPopup("Entry deleted 🗑️");
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

  /* ================= DAILY TREND ================= */

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

      {popup && (
        <div className="fixed top-5 right-5 bg-black text-white px-4 py-2 rounded shadow z-50">
          {popup}
        </div>
      )}

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
              <Input type="date" value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })} />

              <Select value={form.projectId}
                onValueChange={(v) => setForm({ ...form, projectId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Project</SelectItem>
                  {mockProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input type="number" step="0.5" placeholder="Hours"
                value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })} />

              <Select value={form.category}
                onValueChange={(v: Category) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Textarea placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />

              <Button className="w-full" onClick={handleLogTime}>
                Save Entry
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* TABLE */}
      <Card>
        <CardHeader>
          <CardTitle>Logged Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {timeEntries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.date}</TableCell>
                  <TableCell>{e.hours}</TableCell>
                  <TableCell><Badge>{e.category}</Badge></TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="destructive"
                      onClick={() => handleDelete(e.id)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* CHARTS */}
      <Card>
        <CardHeader><CardTitle>Category Breakdown</CardTitle></CardHeader>
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

      <Card>
        <CardHeader><CardTitle>Last 7 Days Trend</CardTitle></CardHeader>
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