// src/app/components/modules/LeaveModule.tsx

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { useAuth } from "../../contexts/AuthContext";
import { leaveApi } from "@/services/api";
import {
  format, startOfMonth, endOfMonth, subMonths,
} from "date-fns";
import {
  Download, PlusCircle, Calendar,
} from "lucide-react";

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
    return ["Submitted", "Manager Approval", "Done"];
  if (isEmergency)
    return ["Submitted", "Manager Approval", "Done"];
  return ["Submitted", "HR Approval", "Manager Approval", "Done"];
};

const currentStepIndex = (
  status: LeaveStatus,
  isEmergency: boolean,
  applicantRole: string,
): number => {
  if (status === "pending_hr")      return 1;
  if (status === "pending_manager") return isEmergency || applicantRole === "hr" || applicantRole === "manager" ? 1 : 2;
  if (status === "approved" || status === "emergency_approved")
    return flowSteps(applicantRole, isEmergency).length - 1;
  return 0;
};

/* ============================================================
   COMPONENT
   ============================================================ */
export function LeaveModule() {
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  const isEmployee = role === "employee";
  const isManager  = role === "manager";
  const isHR       = role === "hr";
  const isAdmin    = role === "admin";

  /* ── state ── */
  const [leaves,   setLeaves]   = useState<any>(null);
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [form,        setForm]        = useState(initForm);
  const [dialogOpen,  setDialogOpen]  = useState(false);
  const [activeTab,   setActiveTab]   = useState<"pending" | "all">("pending");

  const [manualLeaveOpen,    setManualLeaveOpen]    = useState(false);
  const [manualLeave,        setManualLeave]        = useState(initManualLeave);
  const [manualLeaveRecords, setManualLeaveRecords] = useState<any[]>([]);

  const [leaveReportFilter, setLeaveReportFilter] = useState<"custom"|"this_month"|"last_month"|"this_year"|"last_year">("this_month");
  const [leaveReportStart,  setLeaveReportStart]  = useState("");
  const [leaveReportEnd,    setLeaveReportEnd]    = useState("");

  /* ── helpers ── */
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const setF  = (k: keyof typeof initForm, v: any)        => setForm(f => ({ ...f, [k]: v }));
  const setML = (k: keyof typeof initManualLeave, v: any) => setManualLeave(f => ({ ...f, [k]: v }));

  const triggerDownload = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  /* ============================================================
     LOAD DATA
     ============================================================ */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (isAdmin) {
        const [allLeavesRes, pendingRes] = await Promise.all([
          leaveApi.getAll(),
          leaveApi.getPending(),
        ]);
        setLeaves({ all: allLeavesRes.leaves || [], pending: pendingRes.leaves || [] });
        setMyLeaves(allLeavesRes.leaves || []);
      } else if (isHR || isManager) {
        const pendingRes = await leaveApi.getPending();
        setLeaves(pendingRes.leaves || []);
        const myLeavesRes = await leaveApi.getMy();
        setMyLeaves(myLeavesRes.leaves || []);
      } else {
        const myLeavesRes = await leaveApi.getMy();
        setLeaves(myLeavesRes.leaves || []);
        setMyLeaves(myLeavesRes.leaves || []);
      }
    } catch (err: any) {
      console.error("loadData error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isHR, isManager]);

  useEffect(() => { loadData(); }, [loadData]);

  if (!currentUser) return null;

  const displayLeaves: any[] = isAdmin
    ? (activeTab === "pending" ? leaves?.pending ?? [] : leaves?.all ?? [])
    : (leaves ?? []);

  /* ============================================================
     MANUAL LEAVE ENTRY
     ============================================================ */
  const submitManualLeave = () => {
    if (!manualLeave.employeeName.trim()) { showToast("Employee name is required", "error"); return; }
    if (!manualLeave.type || !manualLeave.startDate || !manualLeave.endDate || !manualLeave.reason) {
      showToast("Please fill all required fields", "error"); return;
    }
    const today = format(new Date(), "yyyy-MM-dd");
    if (manualLeave.endDate >= today) { showToast("Manual leave entry is only allowed for previous dates", "error"); return; }
    if (manualLeave.startDate > manualLeave.endDate) { showToast("Start date cannot be after end date", "error"); return; }
    const start = new Date(manualLeave.startDate);
    const end   = new Date(manualLeave.endDate);
    const days  = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const newRecord = {
      id: Date.now(),
      employeeName: manualLeave.employeeName.trim(),
      type:         manualLeave.type,
      startDate:    manualLeave.startDate,
      endDate:      manualLeave.endDate,
      days,
      reason:   manualLeave.reason,
      status:   manualLeave.status,
      priority: manualLeave.priority,
      enteredBy: currentUser?.name ?? "Admin",
      enteredAt: new Date().toISOString(),
    };
    setManualLeaveRecords(prev => [...prev, newRecord]);
    setManualLeave(initManualLeave);
    setManualLeaveOpen(false);
    showToast("✅ Manual leave record added");
  };

  /* ============================================================
     SUBMIT LEAVE (non-admin)
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
     LEAVE REPORT HELPERS
     ============================================================ */
  const getLeaveReportDateRange = (): { start: string; end: string } => {
    const today = new Date();
    switch (leaveReportFilter) {
      case "this_month": return { start: format(startOfMonth(today), "yyyy-MM-dd"), end: format(endOfMonth(today), "yyyy-MM-dd") };
      case "last_month": { const lm = subMonths(today, 1); return { start: format(startOfMonth(lm), "yyyy-MM-dd"), end: format(endOfMonth(lm), "yyyy-MM-dd") }; }
      case "this_year":  return { start: format(new Date(today.getFullYear(), 0, 1), "yyyy-MM-dd"), end: format(new Date(today.getFullYear(), 11, 31), "yyyy-MM-dd") };
      case "last_year":  { const ly = today.getFullYear() - 1; return { start: format(new Date(ly, 0, 1), "yyyy-MM-dd"), end: format(new Date(ly, 11, 31), "yyyy-MM-dd") }; }
      default:           return { start: leaveReportStart, end: leaveReportEnd };
    }
  };

  const filterLeaveRows = (rows: any[], start: string, end: string) => {
    let f = rows;
    if (start) f = f.filter(l => l.startDate >= start);
    if (end)   f = f.filter(l => l.endDate   <= end);
    return f;
  };

  const downloadLeaveReport = () => {
    const { start, end } = getLeaveReportDateRange();
    const allApiLeaves   = isAdmin ? (leaves?.all ?? []) : (Array.isArray(leaves) ? leaves : []);
    const apiFiltered    = filterLeaveRows(allApiLeaves,       start, end);
    const manualFiltered = filterLeaveRows(manualLeaveRecords, start, end);
    const apiRows    = apiFiltered.map(l => ({ name: l.userId?.name ?? "Unknown", role: l.userId?.role ?? "", type: l.type ?? "", startDate: l.startDate ?? "", endDate: l.endDate ?? "", days: l.days ?? "", status: l.status ?? "", reason: l.reason ?? "", source: "System" }));
    const manualRows = manualFiltered.map(l => ({ name: l.employeeName ?? "", role: "Manual", type: l.type ?? "", startDate: l.startDate ?? "", endDate: l.endDate ?? "", days: l.days ?? "", status: l.status ?? "", reason: l.reason ?? "", source: `Manual (by ${l.enteredBy})` }));
    const all = [...apiRows, ...manualRows];
    if (all.length === 0) { showToast("No leave records match the selected filters", "error"); return; }
    all.sort((a, b) => a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : (a.name || "").localeCompare(b.name || ""));
    const header = "Name,Role,Type,Start Date,End Date,Days,Status,Reason,Source";
    const rows   = all.map(l => `${l.name},${l.role},${l.type},${l.startDate},${l.endDate},${l.days},${l.status},"${(l.reason || "").replace(/"/g, '""')}",${l.source}`);
    triggerDownload([header, ...rows].join("\n"), `leave_report_${start || "all"}_to_${end || "all"}.csv`);
  };

  const leavePreviewCount = (() => {
    const { start, end } = getLeaveReportDateRange();
    const allApiLeaves = isAdmin ? (leaves?.all ?? []) : (Array.isArray(leaves) ? leaves : []);
    return filterLeaveRows(allApiLeaves, start, end).length + filterLeaveRows(manualLeaveRecords, start, end).length;
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
      pending_hr: "Pending HR", pending_manager: "Pending Manager",
      pending_admin: "Pending Admin", approved: "Approved",
      rejected: "Rejected", emergency_approved: "Emergency Approved",
    };
    return map[s] ?? s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  const priorityColor = (p: string) => {
    if (p === "high")   return "bg-red-100 text-red-700";
    if (p === "medium") return "bg-yellow-100 text-yellow-700";
    return "bg-green-100 text-green-700";
  };

  const roleColor = (r: string) => {
    if (r === "admin")   return "bg-slate-700 text-white";
    if (r === "hr")      return "bg-slate-500 text-white";
    if (r === "manager") return "bg-slate-600 text-white";
    return "bg-slate-400 text-white";
  };

  const canActOnLeave = (leave: any): boolean => {
    if (isHR      && leave.status === "pending_hr")      return true;
    if (isManager && leave.status === "pending_manager") return true;
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
                ${current ? "bg-slate-100 text-slate-700 ring-1 ring-slate-300" : ""}
                ${!done && !current ? "bg-gray-100 text-gray-400" : ""}
              `}>
                {done ? "✓ " : ""}{step}
              </span>
              {i < steps.length - 1 && <span className="text-gray-300 text-xs">→</span>}
            </div>
          );
        })}
        {isRejected && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">✕ Rejected</span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto px-2 sm:px-3 py-3 sm:py-4">

      {/* TOAST */}
      {toast && (
        <div className={`fixed top-4 right-4 sm:top-6 sm:right-6 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl shadow-lg z-50 text-white text-xs sm:text-sm font-medium transition-all max-w-[90vw] ${
          toast.type === "error" ? "bg-red-600" : "bg-slate-800"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          LEAVE REPORT CARD
          ══════════════════════════════════════════════════════ */}
      {(isAdmin || isHR || isManager) && (
        <Card>
          <CardHeader className="px-3 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base"><Download size={17} /> Leave Report</CardTitle>
              {isAdmin && (
                <Dialog open={manualLeaveOpen} onOpenChange={open => { setManualLeaveOpen(open); if (!open) setManualLeave(initManualLeave); }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2 text-xs sm:text-sm border-dashed border-gray-400 hover:border-gray-600 self-start sm:self-auto">
                      <PlusCircle size={14} /> Add Previous Leave Entry
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto mx-3 sm:mx-auto">
                    <DialogHeader><DialogTitle>Manual Leave Entry</DialogTitle></DialogHeader>
                    <div className="space-y-4 mt-2">
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">Employee Name <span className="text-red-500">*</span></label>
                        <input className="border p-2 rounded w-full text-sm" placeholder="Enter employee name" value={manualLeave.employeeName} onChange={e => setML("employeeName", e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">Leave Type <span className="text-red-500">*</span></label>
                        <select className="border p-2 rounded w-full text-sm bg-white" value={manualLeave.type} onChange={e => setML("type", e.target.value)}>
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
                        <select className="border p-2 rounded w-full text-sm bg-white" value={manualLeave.priority} onChange={e => setML("priority", e.target.value)}>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">Status</label>
                        <select className="border p-2 rounded w-full text-sm bg-white" value={manualLeave.status} onChange={e => setML("status", e.target.value)}>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                          <option value="pending_admin">Pending Admin</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-700 mb-1 block">Start Date <span className="text-red-500">*</span></label>
                          <input type="date" max={format(new Date(Date.now() - 86400000), "yyyy-MM-dd")} className="border p-2 rounded w-full text-sm" value={manualLeave.startDate} onChange={e => setML("startDate", e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-700 mb-1 block">End Date <span className="text-red-500">*</span></label>
                          <input type="date" max={format(new Date(Date.now() - 86400000), "yyyy-MM-dd")} className="border p-2 rounded w-full text-sm" value={manualLeave.endDate} onChange={e => setML("endDate", e.target.value)} />
                        </div>
                      </div>
                      {manualLeave.startDate && manualLeave.endDate && manualLeave.startDate <= manualLeave.endDate && (
                        <p className="text-[11px] text-slate-600 font-medium">
                          📅 {Math.ceil((new Date(manualLeave.endDate).getTime() - new Date(manualLeave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} day(s)
                        </p>
                      )}
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">Reason <span className="text-red-500">*</span></label>
                        <input className="border p-2 rounded w-full text-sm" placeholder="Brief reason" value={manualLeave.reason} onChange={e => setML("reason", e.target.value)} />
                      </div>
                      <Button onClick={submitManualLeave} className="w-full bg-slate-800 hover:bg-slate-900 text-white">Save Leave Entry</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5 px-3 sm:px-6">
            {isAdmin && manualLeaveRecords.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-3 sm:px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-700">📋 Manually Added Leave Records ({manualLeaveRecords.length})</span>
                  <button onClick={() => setManualLeaveRecords([])} className="text-[11px] text-red-500 hover:text-red-700 font-medium">Clear All</button>
                </div>
                <div className="overflow-x-auto max-h-52 overflow-y-auto">
                  <table className="w-full text-xs min-w-[500px]">
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
                      {manualLeaveRecords.map(l => (
                        <tr key={l.id} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">{l.employeeName}</td>
                          <td className="px-3 py-2">{l.type}</td>
                          <td className="px-3 py-2">{l.startDate}</td>
                          <td className="px-3 py-2">{l.endDate}</td>
                          <td className="px-3 py-2">{l.days}d</td>
                          <td className="px-3 py-2"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor(l.status)}`}>{statusLabel(l.status)}</span></td>
                          <td className="px-3 py-2"><button onClick={() => setManualLeaveRecords(prev => prev.filter(x => x.id !== l.id))} className="text-red-500 hover:text-red-700 font-medium">✕</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Date Range</p>
              <div className="flex flex-wrap gap-2">
                {([
                  { value: "this_month", label: "This Month" },
                  { value: "last_month", label: "Last Month" },
                  { value: "this_year",  label: "This Year"  },
                  { value: "last_year",  label: "Last Year"  },
                  { value: "custom",     label: "Custom"     },
                ] as const).map(opt => (
                  <button key={opt.value} onClick={() => setLeaveReportFilter(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${leaveReportFilter === opt.value ? "bg-slate-800 text-white border-slate-800" : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {leaveReportFilter === "custom" && (
              <div className="flex flex-wrap gap-3 sm:gap-4">
                <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                  <label className="text-xs text-gray-500">From</label>
                  <input type="date" value={leaveReportStart} onChange={e => setLeaveReportStart(e.target.value)} className="border p-2 rounded text-sm w-full" />
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                  <label className="text-xs text-gray-500">To</label>
                  <input type="date" value={leaveReportEnd} onChange={e => setLeaveReportEnd(e.target.value)} className="border p-2 rounded text-sm w-full" />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">{leavePreviewCount} record{leavePreviewCount !== 1 ? "s" : ""} matched</span>
              <Button onClick={downloadLeaveReport} className="bg-slate-800 text-white flex items-center gap-2 text-xs sm:text-sm">
                <Download size={14} /> Download Leave CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════
          LEAVE REQUEST BUTTON (non-admin)
          ══════════════════════════════════════════════════════ */}
      {!isAdmin && (
        <div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-slate-700 text-white hover:bg-slate-800 w-fit text-sm">+ Request Leave</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto mx-3 sm:mx-auto">
              <DialogHeader><DialogTitle>Submit Leave Request</DialogTitle></DialogHeader>
              <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-600 space-y-0.5">
                {isEmployee && (
                  <>
                    <p>📋 <strong>Normal leave</strong> requires HR → Manager approval</p>
                    <p>🚨 <strong>Emergency leave</strong> is approved by Manager only</p>
                  </>
                )}
                {(isHR || isManager) && <p>📋 Your leave goes directly to <strong>Manager</strong> for approval</p>}
              </div>
              <div className="space-y-4 mt-2">
                {isEmployee && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <input type="checkbox" id="emergency" checked={form.isEmergency} onChange={e => setF("isEmergency", e.target.checked)} className="w-4 h-4" />
                    <label htmlFor="emergency" className="font-medium text-sm text-slate-700 cursor-pointer">🚨 Emergency Leave</label>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Leave Type <span className="text-red-500">*</span></label>
                  <select className="border p-2 rounded w-full text-sm bg-white" value={form.type} onChange={e => setF("type", e.target.value)}>
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
                  <select className="border p-2 rounded w-full text-sm bg-white" value={form.priority} onChange={e => setF("priority", e.target.value as any)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Start Date <span className="text-red-500">*</span></label>
                    <input type="date" className="border p-2 rounded w-full text-sm" value={form.startDate} onChange={e => setF("startDate", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">End Date <span className="text-red-500">*</span></label>
                    <input type="date" className="border p-2 rounded w-full text-sm" value={form.endDate} onChange={e => setF("endDate", e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Reason <span className="text-red-500">*</span></label>
                  <input className="border p-2 rounded w-full text-sm" placeholder="Brief reason" value={form.reason} onChange={e => setF("reason", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Description (Optional)</label>
                  <Textarea placeholder="Additional details" value={form.description} onChange={e => setF("description", e.target.value)} rows={3} />
                </div>
                {form.isEmergency && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Emergency Contact Number</label>
                    <input className="border p-2 rounded w-full text-sm" placeholder="+91 9XXXXXXXXX" value={form.emergencyContact} onChange={e => setF("emergencyContact", e.target.value)} />
                  </div>
                )}
                <Button onClick={submitLeave} className="w-full bg-slate-700 hover:bg-slate-800 text-white">Submit Leave Request</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          LEAVE TABLE
          ══════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-sm sm:text-base">
              {isAdmin ? "Leave Requests" : isManager ? "Pending Approvals (Manager)" : isHR ? "Pending Approvals (HR)" : "My Leave Requests"}
            </CardTitle>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {isAdmin && (
                <div className="flex rounded-lg border overflow-hidden text-xs sm:text-sm">
                  <button onClick={() => setActiveTab("pending")}
                    className={`px-2.5 sm:px-3 py-1.5 font-medium transition-colors ${activeTab === "pending" ? "bg-slate-700 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                    Pending
                    {(leaves?.pending ?? []).length > 0 && (
                      <span className="ml-1 sm:ml-1.5 bg-slate-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{leaves.pending.length}</span>
                    )}
                  </button>
                  <button onClick={() => setActiveTab("all")}
                    className={`px-2.5 sm:px-3 py-1.5 font-medium transition-colors ${activeTab === "all" ? "bg-slate-700 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                    All
                  </button>
                </div>
              )}
              <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{displayLeaves.length} record{displayLeaves.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0 sm:px-6">
          {displayLeaves.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">No leave requests found.</p>
          ) : (
            <Table className="min-w-[700px] text-xs sm:text-sm">
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
                        <Badge className={`${roleColor(l.userId?.role)} text-[10px] mt-1`}>{l.userId?.role}</Badge>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span>{l.type}</span>
                        {l.isEmergency && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full w-fit">🚨 Emergency</span>}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{l.startDate} — {l.endDate}</TableCell>
                    <TableCell>{l.days}d</TableCell>
                    <TableCell><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor(l.priority)}`}>{l.priority}</span></TableCell>
                    <TableCell className="min-w-[160px] sm:min-w-[180px]">
                      <Badge className={statusColor(l.status)}>{statusLabel(l.status)}</Badge>
                      {(isEmployee || (isAdmin && activeTab === "all")) && <FlowTracker leave={l} />}
                    </TableCell>
                    <TableCell className="max-w-[120px] sm:max-w-[160px] truncate" title={l.reason}>{l.reason}</TableCell>
                    {(isManager || isHR || isAdmin) && (
                      <TableCell>
                        {canActOnLeave(l) ? (
                          <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                            <Button size="sm" className="bg-slate-700 hover:bg-slate-800 text-white text-xs h-7 sm:h-8 px-2 sm:px-3" onClick={() => approveLeave(l._id)}>Approve</Button>
                            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white text-xs h-7 sm:h-8 px-2 sm:px-3" onClick={() => rejectLeave(l._id)}>Reject</Button>
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
