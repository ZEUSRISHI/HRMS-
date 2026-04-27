import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import * as XLSX from "xlsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";
import {
  Plus, Pencil, Trash, Download, FileText, Upload,
  Filter, ChevronDown, ChevronUp, Calendar, BarChart2,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { taskApi } from "@/services/api";

type TaskStatus = "pending" | "in-progress" | "completed";
type Priority   = "low" | "medium" | "high";
type ReportRange = "this_week" | "this_month" | "custom";

interface AssignableUser { _id: string; name: string; email: string; role: string; }
interface Task {
  _id: string; title: string; description: string;
  assignedTo: any; assignedBy: any; priority: Priority;
  dueDate: string; status: TaskStatus; updates: any[];
  createdAt?: string;
}
interface ReportSummary {
  total: number; pending: number; inProgress: number; completed: number;
  high: number; medium: number; low: number;
}
interface EmployeeSummary {
  name: string; email: string; role: string;
  total: number; pending: number; inProgress: number; completed: number; totalHours: number;
}

/* ── tiny xlsx writer (no dependency needed) ── */
function exportToExcel(reportData: any, rangeLabel: string) {
  // ===== SUMMARY SHEET =====
  const summaryData = [
    ["TASK REPORT", rangeLabel],
    ["Generated", new Date().toLocaleString()],
    [],
    ["Total", "Pending", "In Progress", "Completed", "High", "Medium", "Low"],
    [
      reportData.summary.total,
      reportData.summary.pending,
      reportData.summary.inProgress,
      reportData.summary.completed,
      reportData.summary.high,
      reportData.summary.medium,
      reportData.summary.low,
    ],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

  // ===== EMPLOYEE SHEET =====
  const employeeData = [
    ["Employee", "Role", "Total", "Pending", "In Progress", "Completed", "Hours"],
    ...reportData.employeeSummary.map((e: any) => [
      e.name,
      e.role,
      e.total,
      e.pending,
      e.inProgress,
      e.completed,
      e.totalHours,
    ]),
  ];

  const employeeSheet = XLSX.utils.aoa_to_sheet(employeeData);

  // ===== TASKS SHEET =====
  const taskData = [
    [
      "Title",
      "Description",
      "Assigned To",
      "Assigned Role",
      "Assigned By",
      "Priority",
      "Status",
      "Due Date",
      "Created At",
      "Hours Worked",
      "Latest Note",
    ],
    ...reportData.tasks.map((t: any) => [
      t.title,
      t.description || "",
      t.assignedTo?.name || "Unassigned",
      t.assignedTo?.role || "",
      t.assignedBy?.name || "",
      t.priority,
      t.status,
      t.dueDate || "",
      t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "",
      t.updates?.reduce((s: number, u: any) => s + (u.hoursWorked || 0), 0) || 0,
      t.updates?.[0]?.note || "",
    ]),
  ];

  const taskSheet = XLSX.utils.aoa_to_sheet(taskData);

  // ===== AUTO COLUMN WIDTH (🔥 improves UI) =====
  const autoWidth = (data: any[]) =>
    data[0].map((_: any, colIndex: number) => ({
      wch: Math.max(
        ...data.map(row =>
          row[colIndex] ? row[colIndex].toString().length : 10
        )
      ),
    }));

  summarySheet["!cols"] = autoWidth(summaryData);
  employeeSheet["!cols"] = autoWidth(employeeData);
  taskSheet["!cols"] = autoWidth(taskData);

  // ===== CREATE WORKBOOK =====
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
  XLSX.utils.book_append_sheet(workbook, employeeSheet, "Employees");
  XLSX.utils.book_append_sheet(workbook, taskSheet, "Tasks");

  // ===== DOWNLOAD =====
  XLSX.writeFile(
    workbook,
    `task-report-${rangeLabel.replace(/ /g, "-")}-${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`
  );
}

export function TaskManagement() {
  const { currentUser } = useAuth();
  const myId      = (currentUser as any)?._id ?? (currentUser as any)?.id;
  const isAdmin   = currentUser?.role === "admin";
  const isManager = currentUser?.role === "manager";
  const isHR      = currentUser?.role === "hr";
  const canCreate = isAdmin || isManager || isHR;

  // ── Core state ──
  const [tasks,           setTasks]           = useState<Task[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [open,            setOpen]            = useState(false);
  const [editId,          setEditId]          = useState<string | null>(null);
  const [toast,           setToast]           = useState("");

  // ── Filter state ──
  const [filterStatus,   setFilterStatus]   = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [showFilters,    setShowFilters]    = useState(false);

  // ── Manual entry ──
  const [manualOpen,    setManualOpen]    = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  const defaultManual = {
    title: "", description: "", assignedTo: "none",
    priority: "medium" as Priority, dueDate: "",
    status: "pending" as TaskStatus,
    // date control
    dateMode: "single" as "single" | "range",
    createdAt: "",
    rangeStart: "", rangeEnd: "",
    hoursWorked: "", note: "",
  };
  const [manualForm, setManualForm] = useState({ ...defaultManual });

  // ── Bulk CSV import ──
  const csvRef       = useRef<HTMLInputElement>(null);
  const [bulkOpen,   setBulkOpen]   = useState(false);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvLoading, setCsvLoading] = useState(false);

  // ── Report ──
  const [reportOpen,     setReportOpen]     = useState(false);
  const [reportRange,    setReportRange]    = useState<ReportRange>("this_month");
  const [reportStart,    setReportStart]    = useState("");
  const [reportEnd,      setReportEnd]      = useState("");
  const [reportStatus,   setReportStatus]   = useState("");
  const [reportPriority, setReportPriority] = useState("");
  const [reportLoading,  setReportLoading]  = useState(false);
  const [reportData,     setReportData]     = useState<{
    tasks: Task[]; summary: ReportSummary; employeeSummary: EmployeeSummary[];
  } | null>(null);

  // ── Task form ──
  const [form, setForm] = useState({
    title: "", description: "", assignedTo: "",
    priority: "medium" as Priority, dueDate: "", status: "pending" as TaskStatus,
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  /* ===== LOAD ===== */
  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = isAdmin
        ? await taskApi.getAllFiltered({ status: filterStatus, priority: filterPriority })
        : await taskApi.getMy();
      setTasks(data.tasks || []);
    } catch (err: any) { console.error(err.message); }
    finally { setLoading(false); }
  };

  const loadAssignableUsers = async () => {
    if (!canCreate) return;
    try {
      const data = await taskApi.getAssignable();
      setAssignableUsers(data.users || []);
    } catch (err: any) { console.error(err.message); }
  };

  useEffect(() => {
    loadTasks();
    loadAssignableUsers();
  }, []);

  useEffect(() => { if (isAdmin) loadTasks(); }, [filterStatus, filterPriority]);

  /* ===== TASK CRUD ===== */
  const handleSubmit = async () => {
    if (!form.title) return showToast("Title is required");
    try {
      const payload = { ...form, assignedTo: form.assignedTo || undefined };
      if (editId) { await taskApi.update(editId, payload); showToast("✅ Task updated"); }
      else        { await taskApi.create(payload);          showToast("✅ Task created"); }
      await loadTasks();
      resetForm();
    } catch (err: any) { showToast("❌ " + err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this task?")) return;
    try { await taskApi.delete(id); showToast("✅ Deleted"); await loadTasks(); }
    catch (err: any) { showToast("❌ " + err.message); }
  };

  const handleEdit = (task: Task) => {
    setEditId(task._id);
    setForm({
      title: task.title, description: task.description,
      assignedTo: task.assignedTo?._id || task.assignedTo || "",
      priority: task.priority, dueDate: task.dueDate || "", status: task.status,
    });
    setOpen(true);
  };

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    try { await taskApi.update(id, { status }); showToast("✅ Status updated"); await loadTasks(); }
    catch (err: any) { showToast("❌ " + err.message); }
  };

  const resetForm = () => {
    setEditId(null);
    setForm({ title: "", description: "", assignedTo: "", priority: "medium", dueDate: "", status: "pending" });
    setOpen(false);
  };

  /* ===== MANUAL ENTRY — supports single date OR date range ===== */
  // When range mode is used, we create one task per day in the range
  const generateDateRange = (start: string, end: string): string[] => {
    const dates: string[] = [];
    const cur = new Date(start);
    const last = new Date(end);
    while (cur <= last) {
      dates.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  };

  const handleManualSubmit = async () => {
    if (!manualForm.title) return showToast("Title is required");
    setManualLoading(true);
    try {
      const assignedToVal = manualForm.assignedTo === "none" ? undefined : manualForm.assignedTo || undefined;

      if (manualForm.dateMode === "range") {
        // validate range
        if (!manualForm.rangeStart || !manualForm.rangeEnd)
          return showToast("Please select both start and end dates");
        const dates = generateDateRange(manualForm.rangeStart, manualForm.rangeEnd);
        if (dates.length > 366)
          return showToast("Range too large — max 366 days");

        // bulk import all dates as individual tasks
        const tasks = dates.map(date => ({
          title:       manualForm.title,
          description: manualForm.description,
          assignedTo:  assignedToVal,
          priority:    manualForm.priority,
          dueDate:     manualForm.dueDate || date,
          status:      manualForm.status,
          createdAt:   date,
          updates: manualForm.hoursWorked || manualForm.note
            ? [{ status: manualForm.status, hoursWorked: Number(manualForm.hoursWorked) || 0, note: manualForm.note }]
            : [],
        }));

        const result = await taskApi.bulkManual(tasks);
        showToast(`✅ Imported ${result.created} tasks for date range`);
      } else {
        // single task
        const updates = manualForm.hoursWorked || manualForm.note
          ? [{ status: manualForm.status, hoursWorked: Number(manualForm.hoursWorked) || 0, note: manualForm.note }]
          : [];

        await taskApi.createManual({
          title:       manualForm.title,
          description: manualForm.description,
          assignedTo:  assignedToVal,
          priority:    manualForm.priority,
          dueDate:     manualForm.dueDate,
          status:      manualForm.status,
          createdAt:   manualForm.createdAt || undefined,
          updates,
        });
        showToast("✅ Manual task saved");
      }

      setManualOpen(false);
      setManualForm({ ...defaultManual });
      await loadTasks();
    } catch (err: any) { showToast("❌ " + err.message); }
    finally { setManualLoading(false); }
  };

  /* ===== CSV BULK IMPORT ===== */
  const handleCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) return showToast("CSV needs a header row + data rows");
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/ /g, ""));
      const rows = lines.slice(1).map(line => {
        const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
        const obj: any = {};
        headers.forEach((h, i) => { obj[h] = values[i] || ""; });
        return obj;
      });
      setCsvPreview(rows.slice(0, 5));
      setBulkOpen(true);
      (window as any)._csvAllRows = rows;
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleBulkImport = async () => {
    const rows = (window as any)._csvAllRows || [];
    if (!rows.length) return;
    setCsvLoading(true);
    try {
      const result = await taskApi.bulkManual(rows);
      showToast(`✅ Imported ${result.created} tasks${result.failed?.length ? `, ${result.failed.length} failed` : ""}`);
      setBulkOpen(false);
      setCsvPreview([]);
      await loadTasks();
    } catch (err: any) { showToast("❌ " + err.message); }
    finally { setCsvLoading(false); }
  };

  /* ===== REPORT ===== */
  const fetchReport = async () => {
    setReportLoading(true);
    try {
      const data = await taskApi.getReport({
        range:     reportRange,
        startDate: reportRange === "custom" ? reportStart : undefined,
        endDate:   reportRange === "custom" ? reportEnd   : undefined,
        status:    reportStatus   || undefined,
        priority:  reportPriority || undefined,
      });
      setReportData(data);
    } catch (err: any) { showToast("❌ " + err.message); }
    finally { setReportLoading(false); }
  };

  const getRangeLabel = () =>
    reportRange === "this_week"  ? "This Week" :
    reportRange === "this_month" ? "This Month" :
    `${reportStart} to ${reportEnd}`;

  const downloadExcel = () => {
    if (!reportData) return;
    exportToExcel(reportData, getRangeLabel());
  };

  const downloadPDF = () => {
    if (!reportData) return;
    const rangeLabel = getRangeLabel();
    const taskRows = reportData.tasks.map(t => `
      <tr>
        <td>${t.title}</td>
        <td>${t.assignedTo?.name || "Unassigned"}</td>
        <td>${t.assignedTo?.role || ""}</td>
        <td><span class="badge ${t.priority}">${t.priority}</span></td>
        <td><span class="badge ${t.status.replace("-","")}">${t.status}</span></td>
        <td>${t.dueDate || "—"}</td>
        <td>${t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}</td>
        <td>${t.updates?.reduce((s: number, u: any) => s + (u.hoursWorked || 0), 0) || 0}h</td>
      </tr>`).join("");

    const empRows = reportData.employeeSummary.map(e => `
      <tr>
        <td>${e.name}</td><td>${e.role}</td><td>${e.total}</td>
        <td>${e.pending}</td><td>${e.inProgress}</td><td>${e.completed}</td>
        <td>${e.totalHours}h</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html><html><head><title>Task Report</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:12px;padding:24px;color:#111}
  h1{font-size:20px;margin-bottom:4px}
  .subtitle{color:#666;margin-bottom:20px}
  .summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
  .summary-card{border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center}
  .summary-card .val{font-size:24px;font-weight:bold}
  .summary-card .lbl{font-size:11px;color:#6b7280}
  table{width:100%;border-collapse:collapse;margin-bottom:24px}
  th{background:#f3f4f6;text-align:left;padding:8px;font-size:11px;text-transform:uppercase}
  td{padding:8px;border-bottom:1px solid #f3f4f6}
  h2{font-size:14px;margin-bottom:10px;color:#374151}
  .badge{padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600}
  .high{background:#fee2e2;color:#991b1b}
  .medium{background:#fef3c7;color:#92400e}
  .low{background:#d1fae5;color:#065f46}
  .pending{background:#e5e7eb;color:#374151}
  .inprogress{background:#dbeafe;color:#1e40af}
  .completed{background:#d1fae5;color:#065f46}
</style></head><body>
  <h1>Task Report — ${rangeLabel}</h1>
  <p class="subtitle">Generated ${new Date().toLocaleString()} · Total: ${reportData.summary.total}</p>
  <div class="summary-grid">
    <div class="summary-card"><div class="val">${reportData.summary.total}</div><div class="lbl">Total</div></div>
    <div class="summary-card"><div class="val" style="color:#f59e0b">${reportData.summary.pending}</div><div class="lbl">Pending</div></div>
    <div class="summary-card"><div class="val" style="color:#3b82f6">${reportData.summary.inProgress}</div><div class="lbl">In Progress</div></div>
    <div class="summary-card"><div class="val" style="color:#10b981">${reportData.summary.completed}</div><div class="lbl">Completed</div></div>
  </div>
  <h2>Employee Summary</h2>
  <table><thead><tr><th>Employee</th><th>Role</th><th>Total</th><th>Pending</th><th>In Progress</th><th>Completed</th><th>Hours</th></tr></thead>
  <tbody>${empRows}</tbody></table>
  <h2>All Tasks</h2>
  <table><thead><tr><th>Title</th><th>Assigned To</th><th>Role</th><th>Priority</th><th>Status</th><th>Due</th><th>Created</th><th>Hours</th></tr></thead>
  <tbody>${taskRows}</tbody></table>
</body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  /* ===== HELPERS ===== */
  const priorityColor = (p: string) => {
    if (p === "high")   return "bg-red-100 text-red-700";
    if (p === "medium") return "bg-yellow-100 text-yellow-700";
    return "bg-green-100 text-green-700";
  };
  const statusColor = (s: string) => {
    if (s === "completed")   return "bg-green-500 text-white";
    if (s === "in-progress") return "bg-blue-500 text-white";
    return "bg-gray-400 text-white";
  };
  const roleColor = (r: string) => {
    if (r === "admin")   return "bg-red-500 text-white";
    if (r === "hr")      return "bg-blue-500 text-white";
    if (r === "manager") return "bg-purple-500 text-white";
    return "bg-gray-500 text-white";
  };

  const userChip = (user: any, label: string) => {
    if (!user?.name) return null;
    return (
      <div className="flex items-center gap-1.5 text-xs flex-wrap">
        <span className="text-gray-400">{label}:</span>
        <span className="font-medium text-gray-700">{user.name}</span>
        <Badge className={`${roleColor(user.role)} text-[10px] px-1.5 py-0`}>{user.role}</Badge>
      </div>
    );
  };

  const isAssignedToMe = (task: Task) =>
    task.assignedTo?._id === myId || task.assignedTo === myId;
  const isAssignedByMe = (task: Task) =>
    task.assignedBy?._id === myId || task.assignedBy === myId;

  const filteredTasks = tasks.filter(t => {
    if (filterStatus   && t.status   !== filterStatus)   return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 px-2 sm:px-0">

      {/* TOAST */}
      {toast && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-80 bg-black text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm text-center sm:text-left">
          {toast}
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold">Task Management</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
              {(filterStatus || filterPriority) && " (filtered)"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => setShowFilters(f => !f)} className="gap-1 h-8 text-xs">
              <Filter className="h-3 w-3" /> Filter
              {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>

            <Button size="sm" variant="outline" onClick={() => { setReportOpen(true); fetchReport(); }} className="gap-1 h-8 text-xs">
              <BarChart2 className="h-3 w-3" /> Report
            </Button>

            {isAdmin && (
              <>
                <Button size="sm" variant="outline" onClick={() => { setManualForm({ ...defaultManual }); setManualOpen(true); }} className="gap-1 h-8 text-xs">
                  <Calendar className="h-3 w-3" /> Manual
                </Button>
                <Button size="sm" variant="outline" onClick={() => csvRef.current?.click()} className="gap-1 h-8 text-xs">
                  <Upload className="h-3 w-3" /> CSV Import
                </Button>
                <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCSVFile} />
              </>
            )}

            {canCreate && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => resetForm()} className="gap-1 h-8 text-xs">
                    <Plus className="h-3 w-3" /> New Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md mx-2 sm:mx-auto max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editId ? "Edit Task" : "Create New Task"}</DialogTitle>
                  </DialogHeader>
                  <div className="text-xs bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-blue-700">
                    {isAdmin && "📋 You can assign tasks to Managers"}
                    {isManager && "📋 You can assign tasks to HR & Employees"}
                    {isHR && "📋 You can assign tasks to Employees"}
                  </div>
                  <div className="space-y-3 mt-1">
                    <div>
                      <Label className="text-xs">Title *</Label>
                      <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Task title" className="h-9" />
                    </div>
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" />
                    </div>
                    <div>
                      <Label className="text-xs">Assign To</Label>
                      <Select value={form.assignedTo || "none"} onValueChange={v => setForm({ ...form, assignedTo: v === "none" ? "" : v })}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select user..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Unassigned —</SelectItem>
                          {assignableUsers.map(u => <SelectItem key={u._id} value={u._id}>{u.name} ({u.role})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Priority</Label>
                        <Select value={form.priority} onValueChange={(v: Priority) => setForm({ ...form, priority: v })}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Status</Label>
                        <Select value={form.status} onValueChange={(v: TaskStatus) => setForm({ ...form, status: v })}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Due Date</Label>
                      <Input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="h-9" />
                    </div>
                    <Button className="w-full" onClick={handleSubmit}>{editId ? "Update Task" : "Create Task"}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border">
            <Select value={filterStatus || "all"} onValueChange={v => setFilterStatus(v === "all" ? "" : v)}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority || "all"} onValueChange={v => setFilterPriority(v === "all" ? "" : v)}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            {(filterStatus || filterPriority) && (
              <Button size="sm" variant="ghost" className="h-8 text-xs text-gray-500"
                onClick={() => { setFilterStatus(""); setFilterPriority(""); }}>Clear</Button>
            )}
          </div>
        )}
      </div>

      {/* ── TASK LIST ── */}
      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-400 text-sm">
            No tasks found. {canCreate && "Create your first task!"}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredTasks.map(task => (
            <Card key={task._id} className="hover:shadow-md transition">
              <CardHeader className="flex flex-row items-start justify-between pb-2 pt-4 px-4">
                <div className="space-y-1 flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-sm sm:text-base">{task.title}</CardTitle>
                    {isAssignedToMe(task) && !isAdmin && (
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Mine</span>
                    )}
                    {isAssignedByMe(task) && !isAssignedToMe(task) && !isAdmin && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">By me</span>
                    )}
                  </div>
                  {task.description && <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>}
                </div>
                <div className="flex flex-col sm:flex-row gap-1 shrink-0">
                  <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${priorityColor(task.priority)}`}>{task.priority}</span>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${statusColor(task.status)}`}>{task.status}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 px-4 pb-4">
                <div className="flex flex-wrap gap-2">
                  {userChip(task.assignedTo, "To")}
                  {userChip(task.assignedBy, "By")}
                  {task.dueDate && <div className="flex items-center gap-1 text-xs text-gray-500"><span>📅</span><span>{task.dueDate}</span></div>}
                  {task.createdAt && <div className="text-xs text-gray-400">🕐 {new Date(task.createdAt).toLocaleDateString()}</div>}
                  {task.updates?.length > 0 && <div className="text-xs text-gray-400">📝 {task.updates.length} update{task.updates.length !== 1 ? "s" : ""}</div>}
                </div>
                {task.updates?.length > 0 && task.updates[0].note && (
                  <div className="text-xs bg-gray-50 border rounded px-2 py-1.5 text-gray-600">
                    <span className="font-medium">Note: </span>{task.updates[0].note}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {isAssignedToMe(task) && (
                    <Select value={task.status} onValueChange={(v: TaskStatus) => handleStatusChange(task._id, v)}>
                      <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {(isAdmin || isAssignedByMe(task)) && (
                    <Button size="sm" variant="outline" onClick={() => handleEdit(task)} className="h-7 text-xs px-2">
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                  )}
                  {isAdmin && (
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(task._id)} className="h-7 text-xs px-2">
                      <Trash className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── MANUAL ENTRY DIALOG ── */}
      <Dialog open={manualOpen} onOpenChange={(v) => { if (!manualLoading) setManualOpen(v); }}>
        <DialogContent className="max-w-lg mx-2 sm:mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📅 Manual Task Entry</DialogTitle>
          </DialogHeader>

          <div className="text-xs bg-amber-50 border border-amber-200 rounded px-3 py-2 text-amber-700">
            Enter past task data. Use <strong>Single Date</strong> for one task or <strong>Date Range</strong> to create identical tasks across multiple days (e.g. a whole month or year).
          </div>

          <div className="space-y-3">
            {/* Title */}
            <div>
              <Label className="text-xs">Title *</Label>
              <Input value={manualForm.title} onChange={e => setManualForm({ ...manualForm, title: e.target.value })} placeholder="Task title" className="h-9" />
            </div>

            {/* Description */}
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea rows={2} value={manualForm.description} onChange={e => setManualForm({ ...manualForm, description: e.target.value })} placeholder="Description" />
            </div>

            {/* Assign To */}
            <div>
              <Label className="text-xs">Assign To</Label>
              <Select value={manualForm.assignedTo} onValueChange={v => setManualForm({ ...manualForm, assignedTo: v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select user..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Unassigned —</SelectItem>
                  {assignableUsers.map(u => (
                    <SelectItem key={u._id} value={u._id}>{u.name} ({u.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority + Status */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Priority</Label>
                <Select value={manualForm.priority} onValueChange={(v: Priority) => setManualForm({ ...manualForm, priority: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={manualForm.status} onValueChange={(v: TaskStatus) => setManualForm({ ...manualForm, status: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Due Date */}
            <div>
              <Label className="text-xs">Due Date</Label>
              <Input type="date" value={manualForm.dueDate} onChange={e => setManualForm({ ...manualForm, dueDate: e.target.value })} className="h-9" />
            </div>

            {/* Date Mode toggle */}
            <div className="border-t pt-3">
              <Label className="text-xs font-semibold text-gray-600 mb-2 block">Creation Date Mode</Label>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setManualForm({ ...manualForm, dateMode: "single" })}
                  className={`flex-1 py-1.5 text-xs rounded border font-medium transition ${manualForm.dateMode === "single" ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-600 border-gray-300"}`}
                >
                  Single Date
                </button>
                <button
                  type="button"
                  onClick={() => setManualForm({ ...manualForm, dateMode: "range" })}
                  className={`flex-1 py-1.5 text-xs rounded border font-medium transition ${manualForm.dateMode === "range" ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-600 border-gray-300"}`}
                >
                  Date Range (multi-task)
                </button>
              </div>

              {manualForm.dateMode === "single" ? (
                <div>
                  <Label className="text-xs">Task Creation Date</Label>
                  <Input
                    type="date"
                    value={manualForm.createdAt}
                    onChange={e => setManualForm({ ...manualForm, createdAt: e.target.value })}
                    className="h-9"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Leave blank to use today's date</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] text-blue-600 bg-blue-50 border border-blue-200 rounded px-2 py-1">
                    ℹ️ One task will be created for <strong>each day</strong> in this range (max 366 days). Great for bulk historical data entry for months or years.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Range Start</Label>
                      <Input
                        type="date"
                        value={manualForm.rangeStart}
                        onChange={e => setManualForm({ ...manualForm, rangeStart: e.target.value })}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Range End</Label>
                      <Input
                        type="date"
                        value={manualForm.rangeEnd}
                        onChange={e => setManualForm({ ...manualForm, rangeEnd: e.target.value })}
                        className="h-9"
                      />
                    </div>
                  </div>
                  {manualForm.rangeStart && manualForm.rangeEnd && new Date(manualForm.rangeStart) <= new Date(manualForm.rangeEnd) && (
                    <p className="text-[10px] text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                      ✅ Will create <strong>{generateDateRange(manualForm.rangeStart, manualForm.rangeEnd).length}</strong> tasks
                      ({manualForm.rangeStart} → {manualForm.rangeEnd})
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Progress update */}
            <div className="border-t pt-3">
              <p className="text-xs font-medium text-gray-500 mb-2">Progress Update (optional)</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Hours Worked</Label>
                  <Input type="number" min="0" value={manualForm.hoursWorked} onChange={e => setManualForm({ ...manualForm, hoursWorked: e.target.value })} placeholder="0" className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Note</Label>
                  <Input value={manualForm.note} onChange={e => setManualForm({ ...manualForm, note: e.target.value })} placeholder="Progress note..." className="h-9" />
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={handleManualSubmit} disabled={manualLoading}>
              {manualLoading ? "Saving..." : "💾 Save Manual Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── CSV BULK PREVIEW DIALOG ── */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-2xl mx-2 sm:mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>📤 CSV Import Preview</DialogTitle></DialogHeader>
          <div className="text-xs bg-blue-50 border border-blue-200 rounded px-3 py-2 text-blue-700 space-y-1">
            <p><strong>Expected CSV columns:</strong></p>
            <p>title, description, assignedTo (name or ID), priority, status, dueDate, createdAt</p>
          </div>
          <div className="text-xs text-gray-500">Showing first 5 rows preview:</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  {csvPreview[0] && Object.keys(csvPreview[0]).map(h => (
                    <th key={h} className="border px-2 py-1 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvPreview.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((v: any, j) => (
                      <td key={j} className="border px-2 py-1 truncate max-w-[120px]">{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleBulkImport} disabled={csvLoading}>
              {csvLoading ? "Importing..." : "Import All Rows"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── REPORT DIALOG ── */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-4xl mx-2 sm:mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>📊 Task Report</DialogTitle></DialogHeader>

          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border">
            <Select value={reportRange} onValueChange={(v: ReportRange) => setReportRange(v)}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            {reportRange === "custom" && (
              <>
                <Input type="date" value={reportStart} onChange={e => setReportStart(e.target.value)} className="h-8 text-xs w-36" />
                <Input type="date" value={reportEnd} onChange={e => setReportEnd(e.target.value)} className="h-8 text-xs w-36" />
              </>
            )}
            <Select value={reportStatus || "all"} onValueChange={v => setReportStatus(v === "all" ? "" : v)}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="All status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={reportPriority || "all"} onValueChange={v => setReportPriority(v === "all" ? "" : v)}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="All priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={fetchReport} disabled={reportLoading} className="h-8 text-xs">
              {reportLoading ? "Loading..." : "Apply"}
            </Button>
          </div>

          {reportData && (
            <>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={downloadExcel} className="gap-1 text-xs">
                  <Download className="h-3 w-3" /> Download Excel/CSV
                </Button>
                <Button size="sm" variant="outline" onClick={downloadPDF} className="gap-1 text-xs">
                  <FileText className="h-3 w-3" /> Download PDF
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "Total",       val: reportData.summary.total,      color: "text-gray-800" },
                  { label: "Pending",     val: reportData.summary.pending,    color: "text-yellow-600" },
                  { label: "In Progress", val: reportData.summary.inProgress, color: "text-blue-600" },
                  { label: "Completed",   val: reportData.summary.completed,  color: "text-green-600" },
                ].map(s => (
                  <div key={s.label} className="bg-white border rounded-lg p-3 text-center">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                  </div>
                ))}
              </div>

              {reportData.employeeSummary.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Employee Summary</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          {["Employee","Role","Total","Pending","In Progress","Completed","Hours"].map(h => (
                            <th key={h} className="border px-2 py-1.5 text-left font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.employeeSummary.map((e, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="border px-2 py-1.5 font-medium">{e.name}</td>
                            <td className="border px-2 py-1.5"><Badge className={`${roleColor(e.role)} text-[10px]`}>{e.role}</Badge></td>
                            <td className="border px-2 py-1.5 text-center">{e.total}</td>
                            <td className="border px-2 py-1.5 text-center text-yellow-600">{e.pending}</td>
                            <td className="border px-2 py-1.5 text-center text-blue-600">{e.inProgress}</td>
                            <td className="border px-2 py-1.5 text-center text-green-600">{e.completed}</td>
                            <td className="border px-2 py-1.5 text-center">{e.totalHours}h</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium mb-2">Tasks ({reportData.tasks.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        {["Title","Assigned To","Priority","Status","Due","Created","Hours"].map(h => (
                          <th key={h} className="border px-2 py-1.5 text-left font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.tasks.map((t, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="border px-2 py-1.5 font-medium max-w-[150px] truncate">{t.title}</td>
                          <td className="border px-2 py-1.5 whitespace-nowrap">{t.assignedTo?.name || "—"}</td>
                          <td className="border px-2 py-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityColor(t.priority)}`}>{t.priority}</span>
                          </td>
                          <td className="border px-2 py-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColor(t.status)}`}>{t.status}</span>
                          </td>
                          <td className="border px-2 py-1.5 whitespace-nowrap">{t.dueDate || "—"}</td>
                          <td className="border px-2 py-1.5 whitespace-nowrap">
                            {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}
                          </td>
                          <td className="border px-2 py-1.5 text-center">
                            {t.updates?.reduce((s: number, u: any) => s + (u.hoursWorked || 0), 0) || 0}h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {reportLoading && (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
