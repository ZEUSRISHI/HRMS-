import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { useAuth } from "../../contexts/AuthContext";
import { attendanceApi, leaveApi } from "@/services/api";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, eachDayOfInterval, parseISO } from "date-fns";
import { LogIn, LogOut, Download, Users, Calendar, Clock, PlusCircle } from "lucide-react";

/* ============================================================
   TYPES
   ============================================================ */
type LeaveStatus =
  | "pending_hr"
  | "pending_manager"
  | "pending_admin"
  | "approved"
  | "rejected"
  | "emergency_approved";

const initForm = {
  type:             "",
  isEmergency:      false,
  priority:         "medium" as "low" | "medium" | "high",
  startDate:        "",
  endDate:          "",
  reason:           "",
  description:      "",
  emergencyContact: "",
};

const initManualAttendance = {
  employeeName: "",
  employeeRole: "employee",
  startDate:    "",
  endDate:      "",
  checkIn:      "",
  checkOut:     "",
};

const initManualLeave = {
  employeeName: "",
  type:         "",
  startDate:    "",
  endDate:      "",
  reason:       "",
  status:       "approved",
  priority:     "medium",
};

/* ============================================================
   APPROVAL FLOW HELPERS
   ============================================================ */
const flowSteps = (applicantRole: string, isEmergency: boolean): string[] => {
  if (applicantRole === "hr" || applicantRole === "manager")
    return ["Submitted", "Admin Approval", "Done"];
  if (isEmergency)
    return ["Submitted", "Manager Approval", "Done"];
  return ["Submitted", "HR Approval", "Manager Approval", "Admin Approval", "Done"];
};

const currentStepIndex = (
  status: LeaveStatus,
  isEmergency: boolean,
  applicantRole: string,
): number => {
  if (status === "pending_hr")      return 1;
  if (status === "pending_manager") return isEmergency ? 1 : 2;
  if (status === "pending_admin") {
    if (applicantRole === "hr" || applicantRole === "manager") return 1;
    return 3;
  }
  if (status === "approved" || status === "emergency_approved")
    return flowSteps(applicantRole, isEmergency).length - 1;
  return 0;
};

/* ============================================================
   COMPONENT
   ============================================================ */
export function AttendanceModule() {
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  const isEmployee = role === "employee";
  const isManager  = role === "manager";
  const isHR       = role === "hr";
  const isAdmin    = role === "admin";

  /* ── state ── */
  const [todayRecord,   setTodayRecord]   = useState<any>(null);
  const [allAttendance, setAllAttendance] = useState<any[]>([]);
  const [leaves,        setLeaves]        = useState<any>(null);
  const [loading,       setLoading]       = useState(true);
  const [toast,         setToast]         = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [form,          setForm]          = useState(initForm);
  const [dialogOpen,    setDialogOpen]    = useState(false);
  const [activeTab,     setActiveTab]     = useState<"pending" | "all">("pending");

  /* ── manual attendance (admin only) ── */
  const [manualAttendanceOpen,    setManualAttendanceOpen]    = useState(false);
  const [manualAttendance,        setManualAttendance]        = useState(initManualAttendance);
  const [manualAttendanceRecords, setManualAttendanceRecords] = useState<any[]>([]);

  /* ── manual leave (admin only) ── */
  const [manualLeaveOpen,    setManualLeaveOpen]    = useState(false);
  const [manualLeave,        setManualLeave]        = useState(initManualLeave);
  const [manualLeaveRecords, setManualLeaveRecords] = useState<any[]>([]);

  /* ── attendance report filters ── */
  const [reportFilter, setReportFilter] = useState<"custom" | "this_week" | "last_week" | "this_month" | "last_month">("custom");
  const [reportStart,  setReportStart]  = useState("");
  const [reportEnd,    setReportEnd]    = useState("");
  const [reportRole,   setReportRole]   = useState("all");
  const [reportName,   setReportName]   = useState("");

  /* ── leave report filters ── */
  const [leaveReportFilter, setLeaveReportFilter] = useState<"custom" | "this_month" | "last_month" | "this_year" | "last_year">("this_month");
  const [leaveReportStart,  setLeaveReportStart]  = useState("");
  const [leaveReportEnd,    setLeaveReportEnd]     = useState("");

  /* ── helpers ── */
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const setF  = (k: keyof typeof initForm, v: any)             => setForm((f)             => ({ ...f, [k]: v }));
  const setMA = (k: keyof typeof initManualAttendance, v: any) => setManualAttendance((f) => ({ ...f, [k]: v }));
  const setML = (k: keyof typeof initManualLeave, v: any)      => setManualLeave((f)      => ({ ...f, [k]: v }));

  const triggerDownload = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ============================================================
     LOAD DATA
     ============================================================ */
  const loadData = async () => {
    try {
      setLoading(true);

      const todayRes = await attendanceApi.getToday();
      setTodayRecord(todayRes.record || null);

      if (isAdmin || isHR || isManager) {
        const allRes = await attendanceApi.getAll();
        setAllAttendance(allRes.records || []);
      }

      if (isAdmin) {
        const [allRes, pendingRes] = await Promise.all([
          leaveApi.getAll(),
          leaveApi.getPending(),
        ]);
        setLeaves({ all: allRes.leaves || [], pending: pendingRes.leaves || [] });
      } else if (isHR || isManager) {
        const pendingRes = await leaveApi.getPending();
        setLeaves(pendingRes.leaves || []);
      } else {
        const myRes = await leaveApi.getMy();
        setLeaves(myRes.leaves || []);
      }
    } catch (err: any) {
      console.error("loadData error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  if (!currentUser) return null;

  /* ── leaves to display in table ── */
  const displayLeaves: any[] = isAdmin
    ? (activeTab === "pending" ? leaves?.pending ?? [] : leaves?.all ?? [])
    : (leaves ?? []);

  /* ============================================================
     CHECK IN / OUT  (today only)
     ============================================================ */
  const handleCheckIn = async () => {
    try {
      await attendanceApi.checkIn();
      showToast("✅ Checked in successfully");
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Check-in failed", "error");
    }
  };

  const handleCheckOut = async () => {
    try {
      await attendanceApi.checkOut();
      showToast("✅ Checked out successfully");
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Check-out failed", "error");
    }
  };

  /* ============================================================
     MANUAL ATTENDANCE ENTRY
     Admin only — generates one record per day in the date range
     ============================================================ */
  const submitManualAttendance = () => {
    if (!manualAttendance.employeeName.trim()) {
      showToast("Employee name is required", "error"); return;
    }
    if (!manualAttendance.employeeRole) {
      showToast("Employee role is required", "error"); return;
    }
    if (!manualAttendance.startDate || !manualAttendance.endDate) {
      showToast("Start date and end date are required", "error"); return;
    }
    if (!manualAttendance.checkIn) {
      showToast("Check-In time is required", "error"); return;
    }

    const today = format(new Date(), "yyyy-MM-dd");
    if (manualAttendance.endDate >= today) {
      showToast("Manual entry is only allowed for previous dates", "error"); return;
    }
    if (manualAttendance.startDate > manualAttendance.endDate) {
      showToast("Start date cannot be after end date", "error"); return;
    }

    // Generate one record per calendar day in the range
    const days = eachDayOfInterval({
      start: parseISO(manualAttendance.startDate),
      end:   parseISO(manualAttendance.endDate),
    });

    const newRecords = days.map((day) => ({
      id:           Date.now() + Math.random(),
      employeeName: manualAttendance.employeeName.trim(),
      employeeRole: manualAttendance.employeeRole,
      date:         format(day, "yyyy-MM-dd"),
      checkIn:      manualAttendance.checkIn,
      checkOut:     manualAttendance.checkOut,
      enteredBy:    currentUser?.name ?? "Admin",
      enteredAt:    new Date().toISOString(),
    }));

    setManualAttendanceRecords((prev) => [...prev, ...newRecords]);
    setManualAttendance(initManualAttendance);
    setManualAttendanceOpen(false);
    showToast(`✅ ${newRecords.length} attendance record${newRecords.length > 1 ? "s" : ""} added`);
  };

  /* ============================================================
     MANUAL LEAVE ENTRY  — admin only
     ============================================================ */
  const submitManualLeave = () => {
    if (!manualLeave.employeeName.trim()) {
      showToast("Employee name is required", "error"); return;
    }
    if (!manualLeave.type || !manualLeave.startDate || !manualLeave.endDate || !manualLeave.reason) {
      showToast("Please fill all required fields", "error"); return;
    }
    const today = format(new Date(), "yyyy-MM-dd");
    if (manualLeave.endDate >= today) {
      showToast("Manual leave entry is only allowed for previous dates", "error"); return;
    }
    if (manualLeave.startDate > manualLeave.endDate) {
      showToast("Start date cannot be after end date", "error"); return;
    }

    const start = new Date(manualLeave.startDate);
    const end   = new Date(manualLeave.endDate);
    const days  = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const newRecord = {
      id:           Date.now(),
      employeeName: manualLeave.employeeName.trim(),
      type:         manualLeave.type,
      startDate:    manualLeave.startDate,
      endDate:      manualLeave.endDate,
      days,
      reason:       manualLeave.reason,
      status:       manualLeave.status,
      priority:     manualLeave.priority,
      enteredBy:    currentUser?.name ?? "Admin",
      enteredAt:    new Date().toISOString(),
    };

    setManualLeaveRecords((prev) => [...prev, newRecord]);
    setManualLeave(initManualLeave);
    setManualLeaveOpen(false);
    showToast("✅ Manual leave record added");
  };

  /* ============================================================
     SUBMIT LEAVE  (non-admin roles)
     ============================================================ */
  const submitLeave = async () => {
    if (!form.type || !form.startDate || !form.endDate || !form.reason) {
      showToast("Please fill all required fields", "error"); return;
    }
    try {
      await leaveApi.apply({
        type:             form.type,
        isEmergency:      form.isEmergency,
        priority:         form.priority,
        startDate:        form.startDate,
        endDate:          form.endDate,
        reason:           form.reason,
        description:      form.description,
        emergencyContact: form.emergencyContact,
      });
      showToast("✅ Leave request submitted successfully");
      setForm(initForm);
      setDialogOpen(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to submit leave", "error");
    }
  };

  /* ============================================================
     APPROVE / REJECT
     ============================================================ */
  const approveLeave = async (id: string) => {
    try {
      await leaveApi.approve(id);
      showToast("✅ Leave approved");
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Approval failed", "error");
    }
  };

  const rejectLeave = async (id: string) => {
    try {
      await leaveApi.reject(id);
      showToast("Leave rejected", "error");
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Rejection failed", "error");
    }
  };

  /* ============================================================
     ATTENDANCE REPORT HELPERS
     ============================================================ */
  const getReportDateRange = (): { start: string; end: string } => {
    const today = new Date();
    switch (reportFilter) {
      case "this_week":
        return {
          start: format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"),
          end:   format(endOfWeek(today,   { weekStartsOn: 1 }), "yyyy-MM-dd"),
        };
      case "last_week": {
        const lw = subWeeks(today, 1);
        return {
          start: format(startOfWeek(lw, { weekStartsOn: 1 }), "yyyy-MM-dd"),
          end:   format(endOfWeek(lw,   { weekStartsOn: 1 }), "yyyy-MM-dd"),
        };
      }
      case "this_month":
        return {
          start: format(startOfMonth(today), "yyyy-MM-dd"),
          end:   format(endOfMonth(today),   "yyyy-MM-dd"),
        };
      case "last_month": {
        const lm = subMonths(today, 1);
        return {
          start: format(startOfMonth(lm), "yyyy-MM-dd"),
          end:   format(endOfMonth(lm),   "yyyy-MM-dd"),
        };
      }
      default:
        return { start: reportStart, end: reportEnd };
    }
  };

  const filterApiAttendance = (rows: any[], start: string, end: string) => {
    let f = rows;
    if (start)                f = f.filter((r) => r.date >= start);
    if (end)                  f = f.filter((r) => r.date <= end);
    if (reportRole !== "all") f = f.filter((r) => r.userId?.role === reportRole);
    if (reportName.trim())    f = f.filter((r) =>
      r.userId?.name?.toLowerCase().includes(reportName.trim().toLowerCase()));
    return f;
  };

  const filterManualAttendance = (rows: any[], start: string, end: string) => {
    let f = rows;
    if (start)             f = f.filter((r) => r.date >= start);
    if (end)               f = f.filter((r) => r.date <= end);
    if (reportRole !== "all") f = f.filter((r) => r.employeeRole === reportRole);
    if (reportName.trim()) f = f.filter((r) =>
      r.employeeName?.toLowerCase().includes(reportName.trim().toLowerCase()));
    return f;
  };

  const downloadAttendance = () => {
    const { start, end } = getReportDateRange();
    const apiFiltered    = filterApiAttendance(allAttendance, start, end);
    const manualFiltered = filterManualAttendance(manualAttendanceRecords, start, end);

    const apiRows = apiFiltered.map(
      (r) => `${r.userId?.name ?? "Unknown"},${r.userId?.role ?? ""},${r.date},${r.checkIn ?? ""},${r.checkOut ?? ""},API`
    );
    const manualRows = manualFiltered.map(
      (r) => `${r.employeeName},${r.employeeRole},${r.date},${r.checkIn},${r.checkOut ?? ""},Manual (by ${r.enteredBy})`
    );

    const all = [...apiRows, ...manualRows];
    if (all.length === 0) { showToast("No records match the selected filters", "error"); return; }

    const csv = ["Name,Role,Date,CheckIn,CheckOut,Source", ...all].join("\n");
    triggerDownload(csv, `attendance_report_${start || "all"}_to_${end || "all"}.csv`);
  };

  const previewCount = (() => {
    const { start, end } = getReportDateRange();
    return (
      filterApiAttendance(allAttendance, start, end).length +
      filterManualAttendance(manualAttendanceRecords, start, end).length
    );
  })();

  /* ============================================================
     LEAVE REPORT HELPERS
     ============================================================ */
  const getLeaveReportDateRange = (): { start: string; end: string } => {
    const today = new Date();
    switch (leaveReportFilter) {
      case "this_month":
        return {
          start: format(startOfMonth(today), "yyyy-MM-dd"),
          end:   format(endOfMonth(today),   "yyyy-MM-dd"),
        };
      case "last_month": {
        const lm = subMonths(today, 1);
        return {
          start: format(startOfMonth(lm), "yyyy-MM-dd"),
          end:   format(endOfMonth(lm),   "yyyy-MM-dd"),
        };
      }
      case "this_year":
        return {
          start: format(new Date(today.getFullYear(), 0,  1),  "yyyy-MM-dd"),
          end:   format(new Date(today.getFullYear(), 11, 31), "yyyy-MM-dd"),
        };
      case "last_year": {
        const ly = today.getFullYear() - 1;
        return {
          start: format(new Date(ly, 0,  1),  "yyyy-MM-dd"),
          end:   format(new Date(ly, 11, 31), "yyyy-MM-dd"),
        };
      }
      default:
        return { start: leaveReportStart, end: leaveReportEnd };
    }
  };

  const filterLeaveRows = (rows: any[], start: string, end: string) => {
    let f = rows;
    if (start) f = f.filter((l) => l.startDate >= start);
    if (end)   f = f.filter((l) => l.endDate   <= end);
    return f;
  };

  const downloadLeaveReport = () => {
    const { start, end } = getLeaveReportDateRange();
    const allApiLeaves   = isAdmin ? (leaves?.all ?? []) : (Array.isArray(leaves) ? leaves : []);
    const apiFiltered    = filterLeaveRows(allApiLeaves,       start, end);
    const manualFiltered = filterLeaveRows(manualLeaveRecords, start, end);

    const apiRows = apiFiltered.map(
      (l) => `${l.userId?.name ?? "Unknown"},${l.userId?.role ?? ""},${l.type},${l.startDate},${l.endDate},${l.days ?? ""},${l.status},${l.reason},API`
    );
    const manualRows = manualFiltered.map(
      (l) => `${l.employeeName},Manual,${l.type},${l.startDate},${l.endDate},${l.days},${l.status},${l.reason},Manual (by ${l.enteredBy})`
    );

    const all = [...apiRows, ...manualRows];
    if (all.length === 0) { showToast("No leave records match the selected filters", "error"); return; }

    const csv = ["Name,Role,Type,StartDate,EndDate,Days,Status,Reason,Source", ...all].join("\n");
    triggerDownload(csv, `leave_report_${start || "all"}_to_${end || "all"}.csv`);
  };

  const leavePreviewCount = (() => {
    const { start, end } = getLeaveReportDateRange();
    const allApiLeaves   = isAdmin ? (leaves?.all ?? []) : (Array.isArray(leaves) ? leaves : []);
    return (
      filterLeaveRows(allApiLeaves,       start, end).length +
      filterLeaveRows(manualLeaveRecords, start, end).length
    );
  })();

  /* ============================================================
     COLOR / LABEL HELPERS
     ============================================================ */
  const statusColor = (s: string) => {
    if (s === "approved" || s === "emergency_approved") return "bg-green-500 text-white";
    if (s === "rejected")        return "bg-red-500 text-white";
    if (s === "pending_hr")      return "bg-blue-400 text-white";
    if (s === "pending_manager") return "bg-purple-400 text-white";
    if (s === "pending_admin")   return "bg-orange-400 text-white";
    return "bg-gray-200 text-gray-700";
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      pending_hr:         "Pending HR",
      pending_manager:    "Pending Manager",
      pending_admin:      "Pending Admin",
      approved:           "Approved",
      rejected:           "Rejected",
      emergency_approved: "Emergency Approved",
    };
    return map[s] ?? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const priorityColor = (p: string) => {
    if (p === "high")   return "bg-red-100 text-red-700";
    if (p === "medium") return "bg-yellow-100 text-yellow-700";
    return "bg-green-100 text-green-700";
  };

  const roleColor = (r: string) => {
    if (r === "admin")   return "bg-red-500 text-white";
    if (r === "hr")      return "bg-blue-500 text-white";
    if (r === "manager") return "bg-purple-500 text-white";
    return "bg-gray-500 text-white";
  };

  const canActOnLeave = (leave: any): boolean => {
    if (isHR      && leave.status === "pending_hr")      return true;
    if (isManager && leave.status === "pending_manager") return true;
    if (isAdmin   && leave.status === "pending_admin")   return true;
    return false;
  };

  /* ============================================================
     FLOW TRACKER
     ============================================================ */
  const FlowTracker = ({ leave }: { leave: any }) => {
    const applicantRole = leave.userId?.role ?? "employee";
    const steps         = flowSteps(applicantRole, leave.isEmergency);
    const currentIdx    = currentStepIndex(leave.status as LeaveStatus, leave.isEmergency, applicantRole);
    const isRejected    = leave.status === "rejected";

    return (
      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
        {steps.map((step, i) => {
          const done    = !isRejected && i < currentIdx;
          const current = !isRejected && i === currentIdx;
          return (
            <div key={step} className="flex items-center gap-1">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap
                ${done    ? "bg-green-100 text-green-700" : ""}
                ${current ? "bg-blue-100 text-blue-700 ring-1 ring-blue-300" : ""}
                ${!done && !current ? "bg-gray-100 text-gray-400" : ""}
              `}>
                {done ? "✓ " : ""}{step}
              </span>
              {i < steps.length - 1 && <span className="text-gray-300 text-xs">→</span>}
            </div>
          );
        })}
        {isRejected && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
            ✕ Rejected
          </span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <div className="space-y-8 max-w-7xl mx-auto px-3 py-4">

      {/* TOAST */}
      {toast && (
        <div className={`fixed top-6 right-6 px-5 py-3 rounded-xl shadow-lg z-50 text-white text-sm font-medium ${
          toast.type === "error" ? "bg-red-600" : "bg-gray-900"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TODAY'S ATTENDANCE
          ══════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock size={18} /> Today's Attendance — {format(new Date(), "MMMM d, yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row justify-between gap-6">
          <div className="space-y-1 text-sm">
            <p><span className="text-gray-500">Check In: </span><strong>{todayRecord?.checkIn ?? "Not checked in"}</strong></p>
            <p><span className="text-gray-500">Check Out: </span><strong>{todayRecord?.checkOut ?? "Not checked out"}</strong></p>
            <p><span className="text-gray-500">Status: </span><strong className="capitalize">{todayRecord?.status ?? "Absent"}</strong></p>
          </div>
          <div className="flex gap-3 flex-wrap items-start">
            {!todayRecord && (
              <Button onClick={handleCheckIn} className="bg-blue-600 text-white hover:bg-blue-700">
                <LogIn size={16} className="mr-1" /> Check In
              </Button>
            )}
            {todayRecord && !todayRecord.checkOut && (
              <Button onClick={handleCheckOut} className="bg-red-500 text-white hover:bg-red-600">
                <LogOut size={16} className="mr-1" /> Check Out
              </Button>
            )}
            {todayRecord?.checkOut && (
              <span className="text-green-600 font-medium text-sm mt-2">✓ Done for today</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════
          ADMIN: TODAY'S OVERVIEW
          ══════════════════════════════════════════════════════ */}
      {isAdmin && allAttendance.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Users size={18} />
            <CardTitle>Today's Attendance Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {allAttendance
              .filter((r) => r.date === format(new Date(), "yyyy-MM-dd"))
              .map((r) => (
                <div key={r._id} className="border rounded-lg p-4 bg-white shadow-sm flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-sm">{r.userId?.name}</p>
                    <p className="text-xs text-gray-500">In: {r.checkIn} | Out: {r.checkOut ?? "—"}</p>
                  </div>
                  <Badge className={roleColor(r.userId?.role)}>{r.userId?.role}</Badge>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════
          ATTENDANCE REPORT
          ══════════════════════════════════════════════════════ */}
      {(isAdmin || isManager) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="flex items-center gap-2">
                <Calendar size={18} /> Attendance Report
              </CardTitle>

              {/* ── Manual Entry — ADMIN ONLY ── */}
              {isAdmin && (
                <Dialog open={manualAttendanceOpen} onOpenChange={(open) => {
                  setManualAttendanceOpen(open);
                  if (!open) setManualAttendance(initManualAttendance);
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2 text-sm border-dashed border-gray-400 hover:border-gray-600">
                      <PlusCircle size={15} /> Add Previous Entry
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Manual Attendance Entry</DialogTitle>
                    </DialogHeader>


                    <div className="space-y-4 mt-1">

                      {/* ── Employee Name ── */}
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">
                          Employee Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          className="border p-2 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                          placeholder="e.g. Ravi Kumar"
                          value={manualAttendance.employeeName}
                          onChange={(e) => setMA("employeeName", e.target.value)}
                        />
                      </div>

                      {/* ── Employee Role ── */}
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">
                          Role <span className="text-red-500">*</span>
                        </label>
                        <select
                          className="border p-2 rounded w-full text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
                          value={manualAttendance.employeeRole}
                          onChange={(e) => setMA("employeeRole", e.target.value)}
                        >
                          <option value="employee">Employee</option>
                          <option value="manager">Manager</option>
                          <option value="hr">HR</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>

                      {/* ── Date Range ── */}
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">
                          Date Range <span className="text-red-500">*</span>
                          <span className="font-normal text-gray-400 ml-1">(previous dates only)</span>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] text-gray-500 mb-1 block">From</label>
                            <input
                              type="date"
                              max={format(new Date(Date.now() - 86400000), "yyyy-MM-dd")}
                              className="border p-2 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                              value={manualAttendance.startDate}
                              onChange={(e) => setMA("startDate", e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-gray-500 mb-1 block">To</label>
                            <input
                              type="date"
                              max={format(new Date(Date.now() - 86400000), "yyyy-MM-dd")}
                              className="border p-2 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                              value={manualAttendance.endDate}
                              onChange={(e) => setMA("endDate", e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Day count preview */}
                        {manualAttendance.startDate && manualAttendance.endDate &&
                          manualAttendance.startDate <= manualAttendance.endDate && (
                          <p className="text-[11px] text-indigo-600 mt-1.5 font-medium">
                            📅{" "}
                            {eachDayOfInterval({
                              start: parseISO(manualAttendance.startDate),
                              end:   parseISO(manualAttendance.endDate),
                            }).length}{" "}
                            day(s) will be added
                          </p>
                        )}
                      </div>

                      {/* ── Check In / Out ── */}
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">
                          Check-In / Check-Out Time
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] text-gray-500 mb-1 block">
                              Check In <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="time"
                              className="border p-2 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                              value={manualAttendance.checkIn}
                              onChange={(e) => setMA("checkIn", e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-gray-500 mb-1 block">Check Out</label>
                            <input
                              type="time"
                              className="border p-2 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                              value={manualAttendance.checkOut}
                              onChange={(e) => setMA("checkOut", e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={submitManualAttendance}
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                      >
                        Save Attendance Records
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-5">

            {/* ── Manual records preview table ── */}
            {isAdmin && manualAttendanceRecords.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-yellow-50 px-4 py-2.5 flex items-center justify-between border-b border-yellow-200">
                  <span className="text-xs font-semibold text-yellow-800">
                    📋 Manually Added Records ({manualAttendanceRecords.length})
                  </span>
                  <button
                    onClick={() => setManualAttendanceRecords([])}
                    className="text-[11px] text-red-500 hover:text-red-700 font-medium"
                  >
                    Clear All
                  </button>
                </div>
                <div className="overflow-x-auto max-h-52 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Name</th>
                        <th className="text-left px-3 py-2 font-medium">Role</th>
                        <th className="text-left px-3 py-2 font-medium">Date</th>
                        <th className="text-left px-3 py-2 font-medium">Check In</th>
                        <th className="text-left px-3 py-2 font-medium">Check Out</th>
                        <th className="text-left px-3 py-2 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {manualAttendanceRecords.map((r) => (
                        <tr key={r.id} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">{r.employeeName}</td>
                          <td className="px-3 py-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium text-white ${roleColor(r.employeeRole)}`}>
                              {r.employeeRole}
                            </span>
                          </td>
                          <td className="px-3 py-2">{r.date}</td>
                          <td className="px-3 py-2">{r.checkIn}</td>
                          <td className="px-3 py-2">{r.checkOut || "—"}</td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => setManualAttendanceRecords((prev) => prev.filter((x) => x.id !== r.id))}
                              className="text-red-500 hover:text-red-700 font-medium"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Date range pills ── */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Date Range</p>
              <div className="flex flex-wrap gap-2">
                {([
                  { value: "this_week",  label: "This Week"  },
                  { value: "last_week",  label: "Last Week"  },
                  { value: "this_month", label: "This Month" },
                  { value: "last_month", label: "Last Month" },
                  { value: "custom",     label: "Custom"     },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setReportFilter(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      reportFilter === opt.value
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {reportFilter === "custom" && (
              <div className="flex flex-wrap gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">From</label>
                  <input type="date" value={reportStart} onChange={(e) => setReportStart(e.target.value)} className="border p-2 rounded text-sm" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">To</label>
                  <input type="date" value={reportEnd} onChange={(e) => setReportEnd(e.target.value)} className="border p-2 rounded text-sm" />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Filter by Role</label>
                <select
                  value={reportRole}
                  onChange={(e) => setReportRole(e.target.value)}
                  className="border p-2 rounded text-sm bg-white min-w-[140px]"
                >
                  <option value="all">All Roles</option>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="hr">HR</option>
                  {isAdmin && <option value="admin">Admin</option>}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Filter by Name</label>
                <input
                  type="text"
                  placeholder="Search name…"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  className="border p-2 rounded text-sm min-w-[180px]"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                {previewCount} record{previewCount !== 1 ? "s" : ""} matched
                {isAdmin && manualAttendanceRecords.length > 0 && (
                  <span className="ml-1 text-yellow-600">
                    (incl. {filterManualAttendance(manualAttendanceRecords, getReportDateRange().start, getReportDateRange().end).length} manual)
                  </span>
                )}
              </span>
              <Button onClick={downloadAttendance} className="bg-black text-white flex items-center gap-2">
                <Download size={16} /> Download CSV
              </Button>
            </div>

          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════
          LEAVE REPORT CARD
          ══════════════════════════════════════════════════════ */}
      {(isAdmin || isHR || isManager) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="flex items-center gap-2">
                <Download size={18} /> Leave Report
              </CardTitle>

              {/* ── Manual Leave Entry — ADMIN ONLY ── */}
              {isAdmin && (
                <Dialog open={manualLeaveOpen} onOpenChange={(open) => {
                  setManualLeaveOpen(open);
                  if (!open) setManualLeave(initManualLeave);
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2 text-sm border-dashed border-gray-400 hover:border-gray-600">
                      <PlusCircle size={15} /> Add Previous Leave Entry
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Manual Leave Entry</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">
                          Employee Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          className="border p-2 rounded w-full text-sm"
                          placeholder="Enter employee name"
                          value={manualLeave.employeeName}
                          onChange={(e) => setML("employeeName", e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">
                          Leave Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          className="border p-2 rounded w-full text-sm bg-white"
                          value={manualLeave.type}
                          onChange={(e) => setML("type", e.target.value)}
                        >
                          <option value="">— Select type —</option>
                          <option value="Casual Leave">Casual Leave</option>
                          <option value="Sick Leave">Sick Leave</option>
                          <option value="Earned Leave">Earned Leave</option>
                          <option value="Maternity Leave">Maternity Leave</option>
                          <option value="Paternity Leave">Paternity Leave</option>
                          <option value="Emergency Leave">Emergency Leave</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">Priority</label>
                        <select
                          className="border p-2 rounded w-full text-sm bg-white"
                          value={manualLeave.priority}
                          onChange={(e) => setML("priority", e.target.value)}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">Status</label>
                        <select
                          className="border p-2 rounded w-full text-sm bg-white"
                          value={manualLeave.status}
                          onChange={(e) => setML("status", e.target.value)}
                        >
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                          <option value="pending_admin">Pending Admin</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-700 mb-1 block">
                            Start Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            max={format(new Date(Date.now() - 86400000), "yyyy-MM-dd")}
                            className="border p-2 rounded w-full text-sm"
                            value={manualLeave.startDate}
                            onChange={(e) => setML("startDate", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-700 mb-1 block">
                            End Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            max={format(new Date(Date.now() - 86400000), "yyyy-MM-dd")}
                            className="border p-2 rounded w-full text-sm"
                            value={manualLeave.endDate}
                            onChange={(e) => setML("endDate", e.target.value)}
                          />
                        </div>
                      </div>

                      {manualLeave.startDate && manualLeave.endDate &&
                        manualLeave.startDate <= manualLeave.endDate && (
                        <p className="text-[11px] text-indigo-600 font-medium">
                          📅{" "}
                          {Math.ceil(
                            (new Date(manualLeave.endDate).getTime() - new Date(manualLeave.startDate).getTime()) /
                            (1000 * 60 * 60 * 24)
                          ) + 1}{" "}
                          day(s)
                        </p>
                      )}

                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">
                          Reason <span className="text-red-500">*</span>
                        </label>
                        <input
                          className="border p-2 rounded w-full text-sm"
                          placeholder="Brief reason"
                          value={manualLeave.reason}
                          onChange={(e) => setML("reason", e.target.value)}
                        />
                      </div>

                      <Button
                        onClick={submitManualLeave}
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                      >
                        Save Leave Entry
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-5">

            {/* ── Manual leave records preview ── */}
            {isAdmin && manualLeaveRecords.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-yellow-50 px-4 py-2.5 flex items-center justify-between border-b border-yellow-200">
                  <span className="text-xs font-semibold text-yellow-800">
                    📋 Manually Added Leave Records ({manualLeaveRecords.length})
                  </span>
                  <button
                    onClick={() => setManualLeaveRecords([])}
                    className="text-[11px] text-red-500 hover:text-red-700 font-medium"
                  >
                    Clear All
                  </button>
                </div>
                <div className="overflow-x-auto max-h-52 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Name</th>
                        <th className="text-left px-3 py-2 font-medium">Type</th>
                        <th className="text-left px-3 py-2 font-medium">Start</th>
                        <th className="text-left px-3 py-2 font-medium">End</th>
                        <th className="text-left px-3 py-2 font-medium">Days</th>
                        <th className="text-left px-3 py-2 font-medium">Status</th>
                        <th className="text-left px-3 py-2 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {manualLeaveRecords.map((l) => (
                        <tr key={l.id} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">{l.employeeName}</td>
                          <td className="px-3 py-2">{l.type}</td>
                          <td className="px-3 py-2">{l.startDate}</td>
                          <td className="px-3 py-2">{l.endDate}</td>
                          <td className="px-3 py-2">{l.days}d</td>
                          <td className="px-3 py-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor(l.status)}`}>
                              {statusLabel(l.status)}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => setManualLeaveRecords((prev) => prev.filter((x) => x.id !== l.id))}
                              className="text-red-500 hover:text-red-700 font-medium"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Leave report date range pills ── */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Date Range</p>
              <div className="flex flex-wrap gap-2">
                {([
                  { value: "this_month", label: "This Month" },
                  { value: "last_month", label: "Last Month" },
                  { value: "this_year",  label: "This Year"  },
                  { value: "last_year",  label: "Last Year"  },
                  { value: "custom",     label: "Custom"     },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setLeaveReportFilter(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      leaveReportFilter === opt.value
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {leaveReportFilter === "custom" && (
              <div className="flex flex-wrap gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">From</label>
                  <input type="date" value={leaveReportStart} onChange={(e) => setLeaveReportStart(e.target.value)} className="border p-2 rounded text-sm" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">To</label>
                  <input type="date" value={leaveReportEnd} onChange={(e) => setLeaveReportEnd(e.target.value)} className="border p-2 rounded text-sm" />
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                {leavePreviewCount} record{leavePreviewCount !== 1 ? "s" : ""} matched
                {isAdmin && manualLeaveRecords.length > 0 && (
                  <span className="ml-1 text-yellow-600">
                    (incl. {filterLeaveRows(manualLeaveRecords, getLeaveReportDateRange().start, getLeaveReportDateRange().end).length} manual)
                  </span>
                )}
              </span>
              <Button onClick={downloadLeaveReport} className="bg-black text-white flex items-center gap-2">
                <Download size={16} /> Download Leave CSV
              </Button>
            </div>

          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════
          LEAVE REQUEST BUTTON  (non-admin)
          ══════════════════════════════════════════════════════ */}
      {!isAdmin && (
        <div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 text-white hover:bg-indigo-700 w-fit">
                + Request Leave
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Submit Leave Request</DialogTitle>
              </DialogHeader>

              <div className="text-xs bg-gray-50 border rounded-lg p-3 text-gray-600 space-y-0.5">
                {isEmployee && (
                  <>
                    <p>📋 <strong>Normal leave</strong> requires HR → Manager → Admin approval</p>
                    <p>🚨 <strong>Emergency leave</strong> is approved by Manager only</p>
                  </>
                )}
                {(isHR || isManager) && (
                  <p>📋 Your leave goes directly to <strong>Admin</strong> for approval</p>
                )}
              </div>

              <div className="space-y-4 mt-2">
                {isEmployee && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-orange-200 bg-orange-50">
                    <input
                      type="checkbox"
                      id="emergency"
                      checked={form.isEmergency}
                      onChange={(e) => setF("isEmergency", e.target.checked)}
                      className="w-4 h-4 accent-orange-500"
                    />
                    <label htmlFor="emergency" className="font-medium text-sm text-orange-700 cursor-pointer">
                      🚨 Emergency Leave
                    </label>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Leave Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="border p-2 rounded w-full text-sm bg-white"
                    value={form.type}
                    onChange={(e) => setF("type", e.target.value)}
                  >
                    <option value="">— Select type —</option>
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Earned Leave">Earned Leave</option>
                    <option value="Maternity Leave">Maternity Leave</option>
                    <option value="Paternity Leave">Paternity Leave</option>
                    <option value="Emergency Leave">Emergency Leave</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Priority</label>
                  <select
                    className="border p-2 rounded w-full text-sm bg-white"
                    value={form.priority}
                    onChange={(e) => setF("priority", e.target.value as any)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input type="date" className="border p-2 rounded w-full text-sm"
                      value={form.startDate} onChange={(e) => setF("startDate", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <input type="date" className="border p-2 rounded w-full text-sm"
                      value={form.endDate} onChange={(e) => setF("endDate", e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="border p-2 rounded w-full text-sm"
                    placeholder="Brief reason"
                    value={form.reason}
                    onChange={(e) => setF("reason", e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Description (Optional)</label>
                  <Textarea
                    placeholder="Additional details"
                    value={form.description}
                    onChange={(e) => setF("description", e.target.value)}
                    rows={3}
                  />
                </div>

                {form.isEmergency && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Emergency Contact Number</label>
                    <input
                      className="border p-2 rounded w-full text-sm"
                      placeholder="+91 9XXXXXXXXX"
                      value={form.emergencyContact}
                      onChange={(e) => setF("emergencyContact", e.target.value)}
                    />
                  </div>
                )}

                <Button onClick={submitLeave} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                  Submit Leave Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          LEAVE TABLE
          ══════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>
              {isAdmin   ? "Leave Requests"              :
               isManager ? "Pending Approvals (Manager)" :
               isHR      ? "Pending Approvals (HR)"      :
               "My Leave Requests"}
            </CardTitle>

            <div className="flex items-center gap-3 flex-wrap">
              {isAdmin && (
                <div className="flex rounded-lg border overflow-hidden text-sm">
                  <button
                    onClick={() => setActiveTab("pending")}
                    className={`px-3 py-1.5 font-medium transition-colors ${
                      activeTab === "pending"
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Pending
                    {(leaves?.pending ?? []).length > 0 && (
                      <span className="ml-1.5 bg-orange-400 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                        {leaves.pending.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab("all")}
                    className={`px-3 py-1.5 font-medium transition-colors ${
                      activeTab === "all"
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    All Requests
                  </button>
                </div>
              )}
              <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                {displayLeaves.length} record{displayLeaves.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                { label: "Pending HR",      cls: "bg-blue-400 text-white"   },
                { label: "Pending Manager", cls: "bg-purple-400 text-white" },
                { label: "Pending Admin",   cls: "bg-orange-400 text-white" },
                { label: "Approved",        cls: "bg-green-500 text-white"  },
                { label: "Rejected",        cls: "bg-red-500 text-white"    },
              ].map((b) => (
                <span key={b.label} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${b.cls}`}>
                  {b.label}
                </span>
              ))}
            </div>
          )}
        </CardHeader>

        <CardContent className="overflow-x-auto">
          {displayLeaves.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">No leave requests found.</p>
          ) : (
            <Table className="min-w-[750px] text-sm">
              <TableHeader>
                <TableRow className="bg-gray-50">
                  {(isManager || isHR || isAdmin) && <TableHead className="font-semibold">Employee</TableHead>}
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Dates</TableHead>
                  <TableHead className="font-semibold">Days</TableHead>
                  <TableHead className="font-semibold">Priority</TableHead>
                  <TableHead className="font-semibold">Status / Flow</TableHead>
                  <TableHead className="font-semibold">Reason</TableHead>
                  {(isManager || isHR || isAdmin) && <TableHead className="font-semibold">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayLeaves.map((l: any) => (
                  <TableRow key={l._id} className="hover:bg-gray-50 align-top">
                    {(isManager || isHR || isAdmin) && (
                      <TableCell>
                        <p className="font-medium">{l.userId?.name ?? "Unknown"}</p>
                        <Badge className={`${roleColor(l.userId?.role)} text-[10px] mt-1`}>
                          {l.userId?.role}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span>{l.type}</span>
                        {l.isEmergency && (
                          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full w-fit">
                            🚨 Emergency
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{l.startDate} — {l.endDate}</TableCell>
                    <TableCell>{l.days}d</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor(l.priority)}`}>
                        {l.priority}
                      </span>
                    </TableCell>
                    <TableCell className="min-w-[180px]">
                      <Badge className={statusColor(l.status)}>{statusLabel(l.status)}</Badge>
                      {(isEmployee || (isAdmin && activeTab === "all")) && (
                        <FlowTracker leave={l} />
                      )}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate" title={l.reason}>
                      {l.reason}
                    </TableCell>
                    {(isManager || isHR || isAdmin) && (
                      <TableCell>
                        {canActOnLeave(l) ? (
                          <div className="flex gap-2 flex-wrap">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => approveLeave(l._id)}>
                              Approve
                            </Button>
                            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => rejectLeave(l._id)}>
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
