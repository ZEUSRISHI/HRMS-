import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Plus, Pencil, Trash, Clock, Download } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { timesheetApi } from "@/services/api";
import { format, subDays } from "date-fns";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, LineChart, Line,
} from "recharts";

type Category = "project" | "meeting" | "admin" | "other";

export function TimeTracking() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  const isAdmin   = currentUser.role === "admin";
  const isManager = currentUser.role === "manager";

  const [sheets, setSheets]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen]       = useState(false);
  const [toast, setToast]     = useState("");

  const [form, setForm] = useState({
    date:        format(new Date(), "yyyy-MM-dd"),
    hours:       "",
    category:    "" as Category | "",
    description: "",
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const loadSheets = async () => {
    try {
      setLoading(true);
      const data = isAdmin || isManager
        ? await timesheetApi.getAll()
        : await timesheetApi.getMy();
      setSheets(data.sheets || []);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSheets(); }, []);

  const handleSubmit = async () => {
    if (!form.hours || !form.category) return showToast("Hours and Category required");
    try {
      await timesheetApi.add({
        date:        form.date,
        hours:       parseFloat(form.hours),
        category:    form.category,
        description: form.description,
      });
      showToast("✅ Time logged successfully");
      setForm({ date: format(new Date(), "yyyy-MM-dd"), hours: "", category: "", description: "" });
      setOpen(false);
      await loadSheets();
    } catch (err: any) {
      showToast("❌ " + err.message);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await timesheetApi.approve(id);
      showToast("✅ Timesheet approved");
      await loadSheets();
    } catch (err: any) {
      showToast("❌ " + err.message);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await timesheetApi.reject(id);
      showToast("✅ Timesheet rejected");
      await loadSheets();
    } catch (err: any) {
      showToast("❌ " + err.message);
    }
  };

  const totalHours = sheets.reduce((sum, e) => sum + (e.hours || 0), 0);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = { project: 0, meeting: 0, admin: 0, other: 0 };
    sheets.forEach((e) => { if (e.category) map[e.category] = (map[e.category] || 0) + e.hours; });
    return Object.entries(map).map(([name, hours]) => ({ name, hours }));
  }, [sheets]);

  const dailyTrend = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
      const total = sheets.filter((s) => s.date === date).reduce((sum, s) => sum + s.hours, 0);
      return { date: format(subDays(new Date(), 6 - i), "MMM d"), hours: total };
    });
  }, [sheets]);

  const downloadReport = () => {
    const rows = ["Employee,Date,Hours,Category,Description,Status"];
    sheets.forEach((e) => {
      rows.push(`${e.employeeId?.name || e.employeeName || "-"},${e.date},${e.hours},${e.category || "-"},"${e.description || ""}",${e.status}`);
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timesheets_${Date.now()}.csv`;
    a.click();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 p-4">

      {toast && (
        <div className="fixed top-5 right-5 bg-black text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm">
          {toast}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-orange-500" /> Time Tracking
          </h1>
          <p className="text-gray-500 text-sm">Monitor productivity and logged hours</p>
        </div>

        <div className="flex gap-2">
          {!isAdmin && !isManager && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Log Time</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Log Work Hours</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <Input type="date" value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  <Input type="number" placeholder="Hours worked" value={form.hours}
                    onChange={(e) => setForm({ ...form, hours: e.target.value })} />
                  <Select value={form.category}
                    onValueChange={(v: Category) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea placeholder="Description (optional)" value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  <Button className="w-full" onClick={handleSubmit}>Save Entry</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {(isAdmin || isManager) && (
            <Button variant="outline" onClick={downloadReport} className="gap-2">
              <Download className="h-4 w-4" /> Download Report
            </Button>
          )}
        </div>
      </div>

      {/* SUMMARY */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-500">Total Hours Logged</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-orange-500">{totalHours.toFixed(1)} hrs</div>
        </CardContent>
      </Card>

      {/* TABLE */}
      <Card>
        <CardHeader><CardTitle>Time Entries ({sheets.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {(isAdmin || isManager) && <TableHead>Employee</TableHead>}
                  <TableHead>Date</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  {(isAdmin || isManager) && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sheets.map((e) => (
                  <TableRow key={e._id}>
                    {(isAdmin || isManager) && (
                      <TableCell>{e.employeeId?.name || e.employeeName || "-"}</TableCell>
                    )}
                    <TableCell>{e.date}</TableCell>
                    <TableCell>{e.hours}</TableCell>
                    <TableCell>
                      {e.category && <Badge variant="secondary">{e.category}</Badge>}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{e.description}</TableCell>
                    <TableCell>
                      <Badge variant={
                        e.status === "approved" ? "default" :
                        e.status === "rejected" ? "destructive" : "secondary"
                      }>
                        {e.status}
                      </Badge>
                    </TableCell>
                    {(isAdmin || isManager) && e.status === "pending" && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-green-600 text-white"
                            onClick={() => handleApprove(e._id)}>Approve</Button>
                          <Button size="sm" variant="destructive"
                            onClick={() => handleReject(e._id)}>Reject</Button>
                        </div>
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
          <CardHeader><CardTitle>Category Breakdown</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="hours" fill="#f97316" />
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
                <Line type="monotone" dataKey="hours" stroke="#f97316" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}