import { useEffect, useState, useMemo, useCallback } from "react";
import React from "react";
import { Button } from "../ui/button";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "../ui/table";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Trash, Download, Plus, RefreshCw, Users, TrendingUp,
  Search, Edit2, CheckCircle, Clock, AlertCircle, Zap,
  Mail, CreditCard, History, BarChart3, LogIn, LogOut,
  UserCheck, UserX, Activity, Wallet,
  ArrowUpRight, ArrowDownRight, Building2, Shield,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { payrollApi, attendanceApi } from "@/services/api";
import { format } from "date-fns";

interface PayrollRecord {
  _id:          string;
  userId:       { _id: string; name: string; email: string; role: string; department?: string } | null;
  month:        string;
  periodStart?: string;
  periodEnd?:   string;
  role:         string;
  workingDays:  number;
  presentDays:  number;
  leaveDays:    number;
  paidLeaveDays:number;
  basicSalary:  number;
  earnedBasic:  number;
  grossSalary:  number;
  netSalary:    number;
  status:       "draft" | "pending" | "processed" | "paid";
  paymentDate?: string;
  paymentMode?: string;
  remarks?:     string;
}

interface AttendanceRecord {
  _id:      string;
  userId?:  { _id: string; name: string; role: string; email?: string; department?: string };
  date:     string;
  checkIn?: string;
  checkOut?:string;
  tagline?: string;
}

interface UserRecord {
  _id:         string;
  name:        string;
  role:        string;
  email?:      string;
  department?: string;
}

const fmt = (n: number) =>
  "₹" + (n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const fmtK = (n: number) => {
  if (n >= 100000) return "₹" + (n / 100000).toFixed(1) + "L";
  if (n >= 1000)   return "₹" + (n / 1000).toFixed(1)   + "K";
  return fmt(n);
};

const calcLive = (
  basicSalary:   number,
  workingDays:   number,
  presentDays:   number,
  leaveDays:     number,
  paidLeaveDays: number
) => {
  const wDays  = Math.max(1, workingDays  || 26);
  const pDays  = Math.max(0, presentDays  || 0);
  const lDays  = Math.max(0, leaveDays    || 0);
  const plDays = Math.max(0, paidLeaveDays|| 1);
  const basic  = Math.max(0, basicSalary  || 0);
  const perDay           = basic / wDays;
  const effectivePaid    = Math.min(lDays, plDays);
  const paidDays         = pDays + effectivePaid;
  const earnedBasic      = Math.round(perDay * paidDays);
  const unpaidLeave      = Math.max(0, lDays - plDays);
  const absentDays       = Math.max(0, wDays - pDays - lDays);
  return { earnedBasic, netSalary: earnedBasic, perDay, paidDays, unpaidLeave, absentDays };
};

const statusConfig: Record<string, { color: string; bg: string; dot: string }> = {
  draft:     { color: "text-slate-600",   bg: "bg-slate-100",   dot: "bg-slate-400"   },
  pending:   { color: "text-amber-700",   bg: "bg-amber-50",    dot: "bg-amber-400"   },
  processed: { color: "text-blue-700",    bg: "bg-blue-50",     dot: "bg-blue-500"    },
  paid:      { color: "text-emerald-700", bg: "bg-emerald-50",  dot: "bg-emerald-500" },
};

const roleConfig: Record<string, { bg: string; text: string }> = {
  admin:    { bg: "bg-rose-100",    text: "text-rose-700"    },
  hr:       { bg: "bg-violet-100",  text: "text-violet-700"  },
  manager:  { bg: "bg-blue-100",    text: "text-blue-700"    },
  employee: { bg: "bg-emerald-100", text: "text-emerald-700" },
  intern:   { bg: "bg-gray-100",    text: "text-gray-600"    },
};

const StatCard = ({ label, value, sub, icon, gradient, trend }: {
  label: string; value: string; sub?: string; icon: React.ReactNode;
  gradient: string; trend?: "up" | "down" | "neutral";
}) => (
  <div className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 ${gradient}`}>
    <div className="flex items-start justify-between mb-2 sm:mb-3">
      <div className="p-2 sm:p-2.5 bg-white/20 rounded-xl">{icon}</div>
      {trend && trend !== "neutral" && (
        <div className={`flex items-center text-[10px] font-bold px-2 py-1 rounded-full bg-white/20 ${trend === "up" ? "text-emerald-100" : "text-red-100"}`}>
          {trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        </div>
      )}
    </div>
    <p className="text-xl sm:text-2xl font-black text-white tracking-tight">{value}</p>
    <p className="text-xs sm:text-sm text-white/70 font-medium mt-0.5">{label}</p>
    {sub && <p className="text-[10px] sm:text-xs text-white/50 mt-1">{sub}</p>}
    <div className="absolute -bottom-3 -right-3 w-16 h-16 bg-white/5 rounded-full pointer-events-none" />
    <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/5 rounded-full pointer-events-none" />
  </div>
);

const TabBtn = ({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) => (
  <button onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all
      ${active ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"}`}>
    {icon}<span className="hidden sm:inline">{label}</span>
  </button>
);

const AttBadge = ({ present, total }: { present: number; total: number }) => {
  const pct   = total > 0 ? Math.round((present / total) * 100) : 0;
  const color = pct >= 90 ? "text-emerald-600 bg-emerald-50 border-emerald-200"
              : pct >= 75 ? "text-amber-600 bg-amber-50 border-amber-200"
              :             "text-red-600 bg-red-50 border-red-200";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${color}`}>
      <Activity className="h-2.5 w-2.5" />{present}/{total}d · {pct}%
    </span>
  );
};

export function PayrollModule() {
  const { currentUser } = useAuth();
  const role    = ((currentUser as any)?._doc?.role ?? (currentUser as any)?.role ?? "").toLowerCase().trim();
  const isAdmin = role === "admin";
  const isHR    = role === "hr";

  const [records,       setRecords]       = useState<PayrollRecord[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [toast,         setToast]         = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);
  const [saving,        setSaving]        = useState(false);
  const [sending,       setSending]       = useState<string | null>(null);
  const [activeTab,     setActiveTab]     = useState<"records" | "attendance" | "analytics">("records");

  const [search,        setSearch]        = useState("");
  const [filterStatus,  setFilterStatus]  = useState("all");
  const [filterRole,    setFilterRole]    = useState("all");
  const [filterMonth,   setFilterMonth]   = useState("all");

  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [allUsers,      setAllUsers]      = useState<UserRecord[]>([]);
  const [attLoading,    setAttLoading]    = useState(false);
  const [attMonth,      setAttMonth]      = useState(format(new Date(), "yyyy-MM"));
  const [attSearch,     setAttSearch]     = useState("");
  const [attRoleFilter, setAttRoleFilter] = useState("all");

  const [createOpen,     setCreateOpen]     = useState(false);
  const [bulkOpen,       setBulkOpen]       = useState(false);
  const [backfillOpen,   setBackfillOpen]   = useState(false);
  const [backfillMonths, setBackfillMonths] = useState("");
  const [bulkMonth,      setBulkMonth]      = useState(format(new Date(), "yyyy-MM"));

  const [createUserId,    setCreateUserId]    = useState("");
  const [createMonth,     setCreateMonth]     = useState("");
  const [createBasic,     setCreateBasic]     = useState("");
  const [createPaidLeave, setCreatePaidLeave] = useState("1");
  const [createMode,      setCreateMode]      = useState("bank_transfer");
  const [createRemarks,   setCreateRemarks]   = useState("");
  const [createEmployeeId, setCreateEmployeeId] = useState("");

  const [editRecord,     setEditRecord]     = useState<PayrollRecord | null>(null);
  const [editBasic,      setEditBasic]      = useState("");
  const [editWorking,    setEditWorking]    = useState("");
  const [editPresent,    setEditPresent]    = useState("");
  const [editLeave,      setEditLeave]      = useState("");
  const [editPaidLeave,  setEditPaidLeave]  = useState("");
  const [editStatus,     setEditStatus]     = useState("");
  const [editMode,       setEditMode]       = useState("");
  const [editRemarks,    setEditRemarks]    = useState("");

  const [editAttId,      setEditAttId]      = useState<string | null>(null);
  const [editAttName,    setEditAttName]    = useState("");
  const [attWorking,     setAttWorking]     = useState("");
  const [attPresent,     setAttPresent]     = useState("");
  const [attLeave,       setAttLeave]       = useState("");

  const [paidDialog,     setPaidDialog]     = useState<PayrollRecord | null>(null);
  const [paidDate,       setPaidDate]       = useState(format(new Date(), "yyyy-MM-dd"));
  const [paidMode,       setPaidMode]       = useState("bank_transfer");

  const [reportType,     setReportType]     = useState<"monthly" | "custom">("monthly");
  const [reportMonth,    setReportMonth]    = useState(format(new Date(), "yyyy-MM"));
  const [reportStart,    setReportStart]    = useState("");
  const [reportEnd,      setReportEnd]      = useState("");

  const showToast = useCallback((msg: string, type: "success" | "error" | "info" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  }, []);

  const loadPayroll = useCallback(async () => {
    try {
      setLoading(true);
      const r    = ((currentUser as any)?._doc?.role ?? (currentUser as any)?.role ?? "").toLowerCase().trim();
      const data = (r === "admin" || r === "hr") ? await payrollApi.getAll() : await payrollApi.getMy();
      setRecords(data.records || []);
    } catch (err: any) {
      showToast("Failed to load payroll: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [currentUser, showToast]);

  const loadAttendance = useCallback(async () => {
    if (!isAdmin && !isHR) return;
    try {
      setAttLoading(true);
      const [attRes, usersRes] = await Promise.all([
        attendanceApi.getAll(),
        attendanceApi.getUsersList(),
      ]);
      setAllAttendance(attRes.records || []);
      setAllUsers(usersRes.users     || []);
    } catch {
      showToast("Failed to load attendance", "error");
    } finally {
      setAttLoading(false);
    }
  }, [isAdmin, isHR, showToast]);

  useEffect(() => {
    if (currentUser) { loadPayroll(); loadAttendance(); }
  }, [currentUser]);

  useEffect(() => {
    if (!isAdmin && !isHR) return;
    const id = setInterval(() => loadAttendance(), 60000);
    return () => clearInterval(id);
  }, [isAdmin, isHR, loadAttendance]);

  const uniqueMonths = useMemo(() =>
    [...new Set(records.map(r => r.month))].sort().reverse(), [records]);

  const filtered = useMemo(() =>
    records.filter(r => {
      const q = search.toLowerCase();
      return (
        (!q || r.userId?.name?.toLowerCase().includes(q) || r.userId?.email?.toLowerCase().includes(q) || r.month.includes(q)) &&
        (filterStatus === "all" || r.status === filterStatus) &&
        (filterRole   === "all" || r.role   === filterRole)   &&
        (filterMonth  === "all" || r.month  === filterMonth)
      );
    }), [records, search, filterStatus, filterRole, filterMonth]);

  const todayStr        = format(new Date(), "yyyy-MM-dd");
  const todayAttendance = useMemo(() => allAttendance.filter(r => r.date === todayStr), [allAttendance, todayStr]);
  const presentToday    = todayAttendance.filter(r => r.checkIn).length;
  const checkedOut      = todayAttendance.filter(r => r.checkIn && r.checkOut).length;
  const notYet          = allUsers.length - presentToday;

  const attSummary = useMemo(() => {
    const [y, m]      = attMonth.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const monthPrefix = attMonth + "-";
    const workingDays = Array.from({ length: daysInMonth }, (_, i) =>
      new Date(y, m - 1, i + 1).getDay() !== 0 ? 1 : 0
    ).reduce((a: number, b) => a + b, 0);
    const passedWorkingDays = Array.from({ length: daysInMonth }, (_, i) => {
      const dateStr = `${y}-${String(m).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`;
      return new Date(y, m - 1, i + 1).getDay() !== 0 && dateStr <= todayStr ? 1 : 0;
    }).reduce((a: number, b) => a + b, 0);
    const summary: Record<string, any> = {};
    allUsers.forEach(u => {
      summary[u._id] = { userId: u._id, name: u.name, role: u.role, department: u.department,
        presentDays: 0, leaveDays: 0, workingDays, absentDays: 0 };
    });
    allAttendance.forEach(r => {
      if (!r.date.startsWith(monthPrefix) || r.date > todayStr) return;
      const uid = r.userId?._id;
      if (!uid || !summary[uid]) return;
      if (r.checkIn) summary[uid].presentDays++;
    });
    Object.values(summary).forEach((s: any) => {
      s.absentDays = Math.max(0, passedWorkingDays - s.presentDays - s.leaveDays);
    });
    return Object.values(summary);
  }, [allAttendance, allUsers, attMonth, todayStr]);

  const filteredAtt = useMemo(() =>
    attSummary.filter((s: any) => {
      const q = attSearch.toLowerCase();
      return (
        (!q || s.name.toLowerCase().includes(q) || (s.department || "").toLowerCase().includes(q)) &&
        (attRoleFilter === "all" || s.role === attRoleFilter)
      );
    }), [attSummary, attSearch, attRoleFilter]);

  const stats = useMemo(() => ({
    totalPaid:      records.filter(r => r.status === "paid").reduce((s, r) => s + r.netSalary, 0),
    totalProcessed: records.filter(r => r.status === "processed").reduce((s, r) => s + r.netSalary, 0),
    totalPending:   records.filter(r => ["draft","pending"].includes(r.status)).reduce((s, r) => s + r.netSalary, 0),
    totalGross:     records.reduce((s, r) => s + r.grossSalary, 0),
    headcount:      new Set(records.map(r => r.userId?._id)).size,
    paidCount:      records.filter(r => r.status === "paid").length,
    draftCount:     records.filter(r => r.status === "draft").length,
  }), [records]);

  const liveEdit = editRecord ? calcLive(
    Number(editBasic), Number(editWorking), Number(editPresent),
    Number(editLeave), Number(editPaidLeave),
  ) : null;

  const liveAtt = editAttId ? (() => {
    const rec = records.find(r => r._id === editAttId);
    if (!rec) return null;
    return calcLive(rec.basicSalary, Number(attWorking), Number(attPresent), Number(attLeave), rec.paidLeaveDays);
  })() : null;

  const liveCreate = createBasic ? calcLive(
    Number(createBasic), 26, 26, 0, Number(createPaidLeave)
  ) : null;

  const handleCreate = async () => {
    if (!createUserId || !createMonth || !createBasic)
      return showToast("Employee, month and basic salary required", "error");
    try {
      await payrollApi.create({
        userId:        createUserId,
        month:         createMonth,
        basicSalary:   Number(createBasic),
        paidLeaveDays: Number(createPaidLeave || 1),
        paymentMode:   createMode,
        remarks:       createRemarks,
        employeeId:    createEmployeeId,
      });
      showToast("Payroll record created ✓");
      setCreateOpen(false);
      setCreateUserId(""); setCreateMonth(""); setCreateBasic("");
      setCreatePaidLeave("1"); setCreateMode("bank_transfer"); setCreateRemarks("");
      setCreateEmployeeId("");
      loadPayroll();
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const handleBulk = async () => {
    if (!window.confirm(`Bulk generate payroll for ${bulkMonth}?`)) return;
    try {
      const res = await payrollApi.bulk({ month: bulkMonth, paidLeaveDays: 1 });
      showToast(`Created: ${res.created}, Skipped: ${res.skipped}`);
      setBulkOpen(false);
      loadPayroll();
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const handleBackfill = async () => {
    const months = backfillMonths.split(",").map(s => s.trim()).filter(Boolean);
    if (!months.length) return showToast("Enter at least one month", "error");
    if (!window.confirm(`Backfill for ${months.join(", ")}?`)) return;
    try {
      const res = await payrollApi.backfill({ months });
      showToast(`Done: ${res.summary?.map((s: any) => `${s.month}: +${s.created}`).join(", ")}`);
      setBackfillOpen(false); setBackfillMonths("");
      loadPayroll();
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const handleProcess = async () => {
    if (!window.confirm("Process all draft/pending payrolls? Emails will be sent.")) return;
    try {
      const res = await payrollApi.process();
      showToast(res.message || "Processed ✓");
      loadPayroll();
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const openEdit = (rec: PayrollRecord) => {
    setEditRecord(rec);
    setEditBasic(String(rec.basicSalary));
    setEditWorking(String(rec.workingDays));
    setEditPresent(String(rec.presentDays));
    setEditLeave(String(rec.leaveDays));
    setEditPaidLeave(String(rec.paidLeaveDays || 1));
    setEditStatus(rec.status);
    setEditMode(rec.paymentMode || "bank_transfer");
    setEditRemarks(rec.remarks || "");
  };

  const handleEdit = async () => {
    if (!editRecord) return;
    setSaving(true);
    const calc = calcLive(
      Number(editBasic), Number(editWorking),
      Number(editPresent), Number(editLeave), Number(editPaidLeave)
    );
    try {
      await payrollApi.update(editRecord._id, {
        basicSalary:   Number(editBasic),
        workingDays:   Number(editWorking),
        presentDays:   Number(editPresent),
        leaveDays:     Number(editLeave),
        paidLeaveDays: Number(editPaidLeave),
        status:        editStatus as any,
        paymentMode:   editMode,
        remarks:       editRemarks,
      } as any);
      setRecords(prev => prev.map(r => r._id !== editRecord._id ? r : {
        ...r,
        basicSalary:   Number(editBasic),
        workingDays:   Number(editWorking),
        presentDays:   Number(editPresent),
        leaveDays:     Number(editLeave),
        paidLeaveDays: Number(editPaidLeave),
        earnedBasic:   calc.earnedBasic,
        grossSalary:   calc.earnedBasic,
        netSalary:     calc.netSalary,
        status:        editStatus as PayrollRecord["status"],
        paymentMode:   editMode,
        remarks:       editRemarks,
      }));
      showToast("Saved & recalculated ✓");
      setEditRecord(null);
      loadPayroll();
    } catch (err: any) { showToast(err.message, "error"); }
    finally { setSaving(false); }
  };

  const openEditAtt = (rec: PayrollRecord) => {
    setEditAttId(rec._id);
    setEditAttName(rec.userId?.name || "");
    setAttWorking(String(rec.workingDays));
    setAttPresent(String(rec.presentDays));
    setAttLeave(String(rec.leaveDays));
  };

  const handleEditAtt = async () => {
    if (!editAttId) return;
    setSaving(true);
    const rec  = records.find(r => r._id === editAttId);
    const calc = rec ? calcLive(rec.basicSalary, Number(attWorking), Number(attPresent), Number(attLeave), rec.paidLeaveDays) : null;
    try {
      await payrollApi.update(editAttId, {
        workingDays: Number(attWorking),
        presentDays: Number(attPresent),
        leaveDays:   Number(attLeave),
      } as any);
      setRecords(prev => prev.map(r => r._id !== editAttId ? r : {
        ...r,
        workingDays:  Number(attWorking),
        presentDays:  Number(attPresent),
        leaveDays:    Number(attLeave),
        ...(calc ? { earnedBasic: calc.earnedBasic, grossSalary: calc.earnedBasic, netSalary: calc.netSalary } : {}),
      }));
      showToast("Attendance updated & salary recalculated ✓");
      setEditAttId(null);
      loadPayroll();
    } catch (err: any) { showToast(err.message, "error"); }
    finally { setSaving(false); }
  };

  const handleMarkPaid = async () => {
    if (!paidDialog) return;
    try {
      await payrollApi.markPaid(paidDialog._id, { paymentDate: paidDate, paymentMode: paidMode });
      showToast("Marked paid & email sent ✓");
      setPaidDialog(null);
      loadPayroll();
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const handleResend = async (id: string) => {
    setSending(id);
    try {
      await payrollApi.resend(id);
      showToast("Payslip resent ✓");
    } catch (err: any) { showToast(err.message, "error"); }
    finally { setSending(null); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      await payrollApi.delete(id);
      setRecords(prev => prev.filter(r => r._id !== id));
      showToast("Deleted");
      loadPayroll();
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const downloadReport = () => {
    let data = [...records];
    if (reportType === "monthly") data = data.filter(r => r.month === reportMonth);
    else if (reportStart && reportEnd) {
      const s = new Date(reportStart), e = new Date(reportEnd);
      data = data.filter(r => { const d = new Date(r.periodStart || r.month + "-01"); return d >= s && d <= e; });
    }
    if (!data.length) return showToast("No records for selected period", "error");
    const headers = ["Employee","Email","Role","Month","Working Days","Present Days","Leave Days","Paid Leave Days","Basic Salary","Earned Basic","Net Salary","Status","Payment Date","Payment Mode","Remarks"];
    const rows = data.map(r => [
      r.userId?.name||"-", r.userId?.email||"-", r.role||"-", r.month,
      r.workingDays, r.presentDays, r.leaveDays, r.paidLeaveDays,
      r.basicSalary, r.earnedBasic, r.netSalary, r.status,
      r.paymentDate ? format(new Date(r.paymentDate), "dd MMM yyyy") : "-",
      r.paymentMode||"-", r.remarks||"-",
    ]);
    const csv = [headers, ...rows].map(row =>
      row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href  = url;
    link.download = `payroll_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${data.length} records`);
  };

  if (!currentUser || (!isAdmin && !isHR)) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
      <Shield className="h-10 w-10 opacity-30" />
      <p className="text-sm font-medium">Access restricted to administrators.</p>
    </div>
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="w-10 h-10 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      <p className="text-sm text-slate-400 font-medium">Loading payroll data…</p>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 pb-10 px-3 sm:px-0">

      {toast && (
        <div className={`fixed top-4 right-4 z-[200] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl text-sm font-semibold max-w-sm border backdrop-blur-sm
          ${toast.type==="error"?"bg-white border-red-200 text-red-700":toast.type==="info"?"bg-white border-blue-200 text-blue-700":"bg-white border-emerald-200 text-emerald-700"}`}>
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-black
            ${toast.type==="error"?"bg-red-100 text-red-600":toast.type==="info"?"bg-blue-100 text-blue-600":"bg-emerald-100 text-emerald-600"}`}>
            {toast.type==="error"?"✕":toast.type==="info"?"i":"✓"}
          </div>
          <span className="flex-1 text-xs sm:text-sm">{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8">
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-11 sm:h-11 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-black text-white">Payroll Management</h1>
                <p className="text-slate-400 text-xs sm:text-sm">Quibo Technologies · Basic Salary</p>
              </div>
            </div>
            <button onClick={() => { loadPayroll(); loadAttendance(); }}
              className="p-2.5 text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all flex-shrink-0">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />{presentToday} present today
            </span>
            <span className="text-[11px] text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">{records.length} records</span>
            <span className="text-[11px] text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">{stats.headcount} employees</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Backfill */}
            <Dialog open={backfillOpen} onOpenChange={setBackfillOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all">
                  <History className="h-3.5 w-3.5" /> Backfill
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-sm mx-4 rounded-2xl">
                <DialogHeader><DialogTitle className="text-base font-black">Backfill Historical Payroll</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div>
                    <Label className="text-xs font-semibold">Months (comma-separated)</Label>
                    <Input className="mt-1.5 rounded-xl" placeholder="2026-01,2026-02"
                      value={backfillMonths} onChange={e => setBackfillMonths(e.target.value)} />
                  </div>
                  <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    Creates "paid" records for past months. Skips existing records.
                  </p>
                  <Button className="w-full bg-slate-800 hover:bg-slate-900 text-white rounded-xl" onClick={handleBackfill}>Run Backfill</Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Bulk */}
            <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all">
                  <Zap className="h-3.5 w-3.5" /> Auto-Generate
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-sm mx-4 rounded-2xl">
                <DialogHeader><DialogTitle className="text-base font-black">Bulk Generate Payroll</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div>
                    <Label className="text-xs font-semibold">Month</Label>
                    <Input type="month" className="mt-1.5 rounded-xl" value={bulkMonth} onChange={e => setBulkMonth(e.target.value)} />
                  </div>
                  <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    Creates draft payrolls for all active employees using their profile basicSalary + attendance.
                  </p>
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl" onClick={handleBulk}>Generate</Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Add Record */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-all shadow-lg shadow-orange-500/30">
                  <Plus className="h-3.5 w-3.5" /> Add Record
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md mx-4 rounded-2xl">
                <DialogHeader><DialogTitle className="text-base font-black">Create Payroll Record</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Employee *</Label>
                    <select className="mt-1.5 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                      value={createUserId} onChange={e => setCreateUserId(e.target.value)}>
                      <option value="">— Select Employee —</option>
                      {allUsers.map(u => (
                        <option key={u._id} value={u._id}>{u.name} ({u.role}{u.department ? ` · ${u.department}` : ""})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Employee ID</Label>
                    <Input
                      placeholder="e.g. QT2025001"
                      className="mt-1.5 rounded-xl border-slate-200"
                      value={createEmployeeId}
                      onChange={e => setCreateEmployeeId(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Month *</Label>
                      <Input type="month" className="mt-1.5 rounded-xl border-slate-200"
                        value={createMonth} onChange={e => setCreateMonth(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Basic Salary *</Label>
                      <div className="relative mt-1.5">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">₹</span>
                        <Input type="number" placeholder="0" className="pl-6 rounded-xl border-slate-200"
                          value={createBasic} onChange={e => setCreateBasic(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Paid Leave Days</Label>
                      <Input type="number" placeholder="1" className="mt-1.5 rounded-xl border-slate-200"
                        value={createPaidLeave} onChange={e => setCreatePaidLeave(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Payment Mode</Label>
                      <select className="mt-1.5 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                        value={createMode} onChange={e => setCreateMode(e.target.value)}>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cheque">Cheque</option>
                        <option value="cash">Cash</option>
                      </select>
                    </div>
                  </div>

                  {liveCreate && Number(createBasic) > 0 && (
                    <div className="bg-slate-800 rounded-xl p-3 text-center">
                      <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-1">Preview (26 working days assumed)</p>
                      <p className="text-lg font-black text-orange-300">{fmt(liveCreate.earnedBasic)} net</p>
                    </div>
                  )}

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Remarks</Label>
                    <Input placeholder="Optional note…" className="mt-1.5 rounded-xl border-slate-200"
                      value={createRemarks} onChange={e => setCreateRemarks(e.target.value)} />
                  </div>

                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl h-11 font-semibold" onClick={handleCreate}>
                    Create Record
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Process */}
            <button onClick={handleProcess}
              className="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold text-emerald-300 bg-emerald-900/30 hover:bg-emerald-900/50 rounded-xl border border-emerald-800/60 transition-all">
              <CheckCircle className="h-3.5 w-3.5" /> Process & Email
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Present Today" value={String(presentToday)} icon={<UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-white" />} gradient="bg-gradient-to-br from-emerald-500 to-emerald-600" trend="up" />
        <StatCard label="Checked Out"   value={String(checkedOut)}   icon={<LogOut   className="h-4 w-4 sm:h-5 sm:w-5 text-white" />} gradient="bg-gradient-to-br from-blue-500 to-blue-600"    trend="neutral" />
        <StatCard label="Not Yet In"    value={String(notYet)}       icon={<UserX    className="h-4 w-4 sm:h-5 sm:w-5 text-white" />} gradient="bg-gradient-to-br from-amber-500 to-orange-500"  trend="down" />
        <StatCard label="Total Staff"   value={String(allUsers.length)} icon={<Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />} gradient="bg-gradient-to-br from-slate-600 to-slate-700"   trend="neutral" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Paid"      value={fmtK(stats.totalPaid)}      sub={`${stats.paidCount} records`}   icon={<CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-white" />} gradient="bg-gradient-to-br from-emerald-600 to-teal-700"  trend="up" />
        <StatCard label="Processed"       value={fmtK(stats.totalProcessed)} sub="awaiting payment"               icon={<TrendingUp  className="h-4 w-4 sm:h-5 sm:w-5 text-white" />} gradient="bg-gradient-to-br from-violet-500 to-purple-600" trend="neutral" />
        <StatCard label="Pending / Draft" value={fmtK(stats.totalPending)}   sub={`${stats.draftCount} drafts`}   icon={<Clock       className="h-4 w-4 sm:h-5 sm:w-5 text-white" />} gradient="bg-gradient-to-br from-orange-500 to-red-500"    trend="down" />
        <StatCard label="Total Gross"     value={fmtK(stats.totalGross)}     sub={`${stats.headcount} employees`} icon={<Building2   className="h-4 w-4 sm:h-5 sm:w-5 text-white" />} gradient="bg-gradient-to-br from-slate-700 to-slate-800"   trend="neutral" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
        <TabBtn active={activeTab==="records"}    onClick={()=>setActiveTab("records")}    icon={<Wallet   className="h-3.5 w-3.5 sm:h-4 sm:w-4"/>} label="Payroll Records" />
        <TabBtn active={activeTab==="attendance"} onClick={()=>setActiveTab("attendance")} icon={<Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4"/>} label="Live Attendance" />
        <TabBtn active={activeTab==="analytics"}  onClick={()=>setActiveTab("analytics")}  icon={<BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4"/>} label="Analytics" />
      </div>

      {/* ══ TAB: ATTENDANCE ══ */}
      {activeTab === "attendance" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm sm:text-base font-black text-slate-800">Today's Live Attendance</h3>
                <span className="text-xs text-slate-400 hidden sm:inline">{format(new Date(), "d MMM yyyy")}</span>
              </div>
              <button onClick={loadAttendance} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all">
                <RefreshCw className={`h-4 w-4 text-slate-500 ${attLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="p-4 sm:p-6">
              {attLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-7 h-7 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {allUsers.map(u => {
                    const rec   = todayAttendance.find(r => r.userId?._id === u._id);
                    const isIn  = !!rec?.checkIn;
                    const isOut = !!rec?.checkOut;
                    const rc    = roleConfig[u.role] || roleConfig.employee;
                    return (
                      <div key={u._id} className={`rounded-2xl border p-4 transition-all hover:shadow-md
                        ${isOut ? "border-slate-200 bg-slate-50" : isIn ? "border-emerald-200 bg-emerald-50/40" : "border-red-100 bg-red-50/20"}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                              {u.name[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate">{u.name}</p>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rc.bg} ${rc.text}`}>{u.role}</span>
                            </div>
                          </div>
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${isOut ? "bg-slate-400" : isIn ? "bg-emerald-500 animate-pulse" : "bg-red-400"}`} />
                        </div>
                        <div className="flex gap-3 text-xs mb-2">
                          <span className={`flex items-center gap-1 font-mono font-semibold ${isIn ? "text-emerald-600" : "text-slate-300"}`}>
                            <LogIn className="h-3 w-3" />{isIn ? rec!.checkIn : "—"}
                          </span>
                          <span className={`flex items-center gap-1 font-mono font-semibold ${isOut ? "text-slate-600" : "text-slate-300"}`}>
                            <LogOut className="h-3 w-3" />{isOut ? rec!.checkOut : "—"}
                          </span>
                        </div>
                        {rec?.tagline && <p className="text-[10px] text-slate-400 italic mb-2 truncate">"{rec.tagline}"</p>}
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full
                          ${isOut ? "bg-slate-100 text-slate-600" : isIn ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                          {isOut ? "✓ Completed" : isIn ? "● Working" : "✕ Absent"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-orange-500" />
                  <h3 className="text-sm sm:text-base font-black text-slate-800">Monthly Summary</h3>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Input type="month" value={attMonth} className="h-8 text-xs w-36 rounded-xl border-slate-200"
                    onChange={e => setAttMonth(e.target.value)} />
                  <select value={attRoleFilter} onChange={e => setAttRoleFilter(e.target.value)}
                    className="h-8 text-xs border border-slate-200 rounded-xl px-2 bg-white">
                    <option value="all">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="hr">HR</option>
                    <option value="manager">Manager</option>
                    <option value="employee">Employee</option>
                  </select>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                    <Input placeholder="Search…" value={attSearch} className="h-8 text-xs pl-8 w-32 rounded-xl border-slate-200"
                      onChange={e => setAttSearch(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b border-slate-100">
                    {["Employee", "Working", "Present", "Absent", "Leave", "Rate", "Payroll", "Edit"].map(h => (
                      <TableHead key={h} className="text-[11px] font-black text-slate-500 uppercase tracking-wide py-3">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAtt.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-slate-400 py-12">No data for {attMonth}.</TableCell></TableRow>
                  ) : (filteredAtt as any[]).map(s => {
                    const pct       = s.workingDays > 0 ? Math.round((s.presentDays / s.workingDays) * 100) : 0;
                    const barColor  = pct >= 90 ? "bg-emerald-500" : pct >= 75 ? "bg-amber-500" : "bg-red-500";
                    const rc        = roleConfig[s.role] || roleConfig.employee;
                    const linkedPay = records.find(r => r.userId?._id === s.userId && r.month === attMonth);
                    return (
                      <TableRow key={s.userId} className="hover:bg-orange-50/20 transition-colors border-b border-slate-50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white font-black text-xs flex-shrink-0">
                              {s.name[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-800">{s.name}</p>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${rc.bg} ${rc.text}`}>{s.role}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-600">{s.workingDays}d</TableCell>
                        <TableCell><span className="text-xs font-bold text-emerald-600">{s.presentDays}d</span></TableCell>
                        <TableCell><span className="text-xs font-bold text-red-500">{s.absentDays}d</span></TableCell>
                        <TableCell><span className="text-xs font-bold text-amber-600">{s.leaveDays}d</span></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[70px]">
                            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className={`text-[10px] font-black ${pct >= 90 ? "text-emerald-600" : pct >= 75 ? "text-amber-600" : "text-red-600"}`}>{pct}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {linkedPay
                            ? <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1 w-fit"><CheckCircle className="h-2.5 w-2.5" /> Linked</span>
                            : <span className="text-[10px] text-slate-400">—</span>}
                        </TableCell>
                        <TableCell>
                          {linkedPay && (
                            <button className="p-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 transition-all" onClick={() => openEditAtt(linkedPay)}>
                              <Edit2 className="h-3.5 w-3.5 text-orange-500" />
                            </button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="px-4 sm:px-6 py-3 border-t border-slate-100 text-[11px] text-slate-400">
              {filteredAtt.length} employees · {attMonth} · Auto-refreshes every 60s
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB: ANALYTICS ══ */}
      {activeTab === "analytics" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Net Paid",  value: fmtK(stats.totalPaid),      icon: "✅", g: "from-emerald-500 to-teal-600"  },
              { label: "Processed Queue", value: fmtK(stats.totalProcessed), icon: "⚙️", g: "from-amber-500 to-orange-500"  },
              { label: "Pending Amount",  value: fmtK(stats.totalPending),   icon: "⏳", g: "from-slate-500 to-slate-600"   },
              { label: "Total Gross",     value: fmtK(stats.totalGross),     icon: "💼", g: "from-slate-700 to-slate-800"   },
              { label: "Paid Records",    value: String(stats.paidCount),    icon: "💳", g: "from-blue-500 to-blue-600"     },
              { label: "Draft Records",   value: String(stats.draftCount),   icon: "📝", g: "from-rose-500 to-rose-600"     },
              { label: "Total Records",   value: String(records.length),     icon: "📊", g: "from-violet-500 to-purple-600" },
              { label: "Employees",       value: String(stats.headcount),    icon: "👥", g: "from-indigo-500 to-indigo-600" },
            ].map(s => (
              <div key={s.label} className={`bg-gradient-to-br ${s.g} rounded-2xl p-4 sm:p-5 relative overflow-hidden`}>
                <div className="text-xl sm:text-2xl mb-2">{s.icon}</div>
                <p className="text-xl sm:text-2xl font-black text-white">{s.value}</p>
                <p className="text-[11px] sm:text-xs text-white/70 font-medium mt-1">{s.label}</p>
                <div className="absolute -bottom-3 -right-3 w-14 h-14 bg-white/10 rounded-full pointer-events-none" />
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
            <h3 className="text-sm font-black text-slate-800 mb-4">Net Salary by Role</h3>
            <div className="space-y-3">
              {["admin", "hr", "manager", "employee", "intern"].map(r => {
                const recs  = records.filter(rec => rec.role === r);
                if (!recs.length) return null;
                const total = recs.reduce((s, rec) => s + rec.netSalary, 0);
                const pct   = stats.totalPaid > 0 ? Math.round((total / stats.totalPaid) * 100) : 0;
                const rc    = roleConfig[r] || roleConfig.employee;
                return (
                  <div key={r} className="flex items-center gap-3">
                    <span className={`text-[10px] sm:text-xs font-black px-2.5 py-1.5 rounded-xl capitalize w-20 text-center flex-shrink-0 ${rc.bg} ${rc.text}`}>{r}</span>
                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs sm:text-sm font-black text-slate-700 w-16 sm:w-20 text-right flex-shrink-0">{fmtK(total)}</span>
                    <span className="text-[10px] text-slate-400 w-8 text-right flex-shrink-0">{recs.length}e</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(["draft", "pending", "processed", "paid"] as const).map(s => {
              const sc  = statusConfig[s];
              const cnt = records.filter(r => r.status === s).length;
              const amt = records.filter(r => r.status === s).reduce((a, r) => a + r.netSalary, 0);
              return (
                <div key={s} className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
                  <div className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1.5 rounded-full mb-3 ${sc.bg} ${sc.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </div>
                  <p className="text-2xl font-black text-slate-800">{cnt}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">records</p>
                  <p className="text-sm font-bold text-slate-600 mt-2">{fmtK(amt)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ TAB: RECORDS ══ */}
      {activeTab === "records" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end flex-wrap">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Report Type</p>
                <select className="h-9 text-xs border border-slate-200 rounded-xl px-3 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                  value={reportType} onChange={(e: any) => setReportType(e.target.value)}>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
              {reportType === "monthly" && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Month</p>
                  <Input type="month" value={reportMonth} className="h-9 text-xs w-36 rounded-xl border-slate-200"
                    onChange={e => setReportMonth(e.target.value)} />
                </div>
              )}
              {reportType === "custom" && (<>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">From</p>
                  <Input type="date" value={reportStart} className="h-9 text-xs w-36 rounded-xl border-slate-200"
                    onChange={e => setReportStart(e.target.value)} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">To</p>
                  <Input type="date" value={reportEnd} className="h-9 text-xs w-36 rounded-xl border-slate-200"
                    onChange={e => setReportEnd(e.target.value)} />
                </div>
              </>)}
              <button onClick={downloadReport}
                className="flex items-center gap-2 h-9 px-4 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition-all">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search employee…" value={search} className="pl-9 h-9 text-sm rounded-xl border-slate-200"
                onChange={e => setSearch(e.target.value)} />
            </div>
            {[
              { value: filterMonth,  set: setFilterMonth,  opts: [["all","All Months"], ...uniqueMonths.map(m=>[m,m])] },
              { value: filterStatus, set: setFilterStatus, opts: [["all","All Status"],["draft","Draft"],["pending","Pending"],["processed","Processed"],["paid","Paid"]] },
              { value: filterRole,   set: setFilterRole,   opts: [["all","All Roles"],["admin","Admin"],["hr","HR"],["manager","Manager"],["employee","Employee"],["intern","Intern"]] },
            ].map(({ value, set, opts }, i) => (
              <select key={i} value={value} onChange={e => set(e.target.value)}
                className="h-9 text-sm border border-slate-200 rounded-xl px-3 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 w-full sm:w-auto">
                {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[860px]">
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b border-slate-200">
                    {["Employee","Month","Attendance","Full Basic","Earned / Net","Status","Actions"].map(h => (
                      <TableHead key={h} className="text-[10px] font-black text-slate-500 uppercase tracking-wider py-3">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-slate-400 py-16">
                        <div className="flex flex-col items-center gap-3">
                          <Wallet className="h-10 w-10 opacity-20" />
                          <p className="text-sm font-semibold">No payroll records found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filtered.map(rec => {
                    const sc     = statusConfig[rec.status] || statusConfig.draft;
                    const rc     = roleConfig[rec.role]     || roleConfig.employee;
                    const pct    = rec.workingDays > 0 ? Math.round((rec.presentDays / rec.workingDays) * 100) : 0;
                    const todayR = todayAttendance.find(r => r.userId?._id === rec.userId?._id);
                    return (
                      <TableRow key={rec._id} className="hover:bg-orange-50/20 transition-colors border-b border-slate-50 last:border-0">
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                              {(rec.userId?.name || "?")[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate max-w-[100px]">{rec.userId?.name || "—"}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${rc.bg} ${rc.text}`}>{rec.role}</span>
                                {todayR?.checkIn && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-0.5">
                                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />in
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <p className="text-xs font-bold text-slate-700">{rec.month}</p>
                          {rec.periodStart && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {format(new Date(rec.periodStart), "d MMM")}–{format(new Date(rec.periodEnd!), "d MMM")}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="py-3">
                          <AttBadge present={rec.presentDays} total={rec.workingDays} />
                          <div className="flex gap-2 text-[10px] mt-1">
                            <span className="text-emerald-600 font-bold">{rec.presentDays}P</span>
                            <span className="text-amber-500">{rec.leaveDays}L</span>
                            <span className="text-slate-400">{rec.workingDays}W</span>
                          </div>
                          <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
                            <div className={`h-full rounded-full ${pct >= 90 ? "bg-emerald-500" : pct >= 75 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-700 py-3">
                          {fmt(rec.basicSalary)}
                          <p className="text-[10px] text-slate-400 mt-0.5">full month</p>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-sm font-black text-emerald-600">{fmt(rec.netSalary)}</span>
                          <p className="text-[10px] text-slate-400 mt-0.5">earned basic</p>
                          {rec.paymentDate && (
                            <p className="text-[10px] text-slate-400">{format(new Date(rec.paymentDate), "d MMM yy")}</p>
                          )}
                        </TableCell>
                        <TableCell className="py-3">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-full ${sc.bg} ${sc.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex gap-1">
                            <button title="Resend Payslip" disabled={sending === rec._id}
                              className="p-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 transition-all disabled:opacity-50"
                              onClick={() => handleResend(rec._id)}>
                              {sending === rec._id
                                ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-purple-500" />
                                : <Mail className="h-3.5 w-3.5 text-purple-500" />}
                            </button>
                            {rec.status !== "paid" && (
                              <button title="Mark as Paid"
                                className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-all"
                                onClick={() => { setPaidDialog(rec); setPaidDate(format(new Date(), "yyyy-MM-dd")); setPaidMode(rec.paymentMode || "bank_transfer"); }}>
                                <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                              </button>
                            )}
                            <button title="Edit Attendance"
                              className="p-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 transition-all"
                              onClick={() => openEditAtt(rec)}>
                              <Activity className="h-3.5 w-3.5 text-blue-500" />
                            </button>
                            <button title="Edit Payroll"
                              className="p-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 transition-all"
                              onClick={() => openEdit(rec)}>
                              <Edit2 className="h-3.5 w-3.5 text-orange-500" />
                            </button>
                            <button title="Delete"
                              className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 transition-all"
                              onClick={() => handleDelete(rec._id)}>
                              <Trash className="h-3.5 w-3.5 text-red-500" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {filtered.length > 0 && (
              <div className="px-4 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="text-xs text-slate-500 font-medium">
                  <span className="font-bold text-slate-700">{filtered.length}</span> of {records.length} records
                </span>
                <span className="text-xs text-slate-500">
                  Total net: <span className="font-bold text-emerald-600">{fmt(filtered.reduce((s, r) => s + r.netSalary, 0))}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ EDIT ATTENDANCE DIALOG ══ */}
      {editAttId && (
        <Dialog open={!!editAttId} onOpenChange={() => setEditAttId(null)}>
          <DialogContent className="max-w-md mx-4 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Activity className="h-4 w-4 text-blue-500" />
                Edit Attendance — {editAttName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-700">
                ℹ️ Changing attendance will <strong>automatically recalculate</strong> earned salary.
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Working Days", val: attWorking, set: setAttWorking },
                  { label: "Present Days", val: attPresent, set: setAttPresent },
                  { label: "Leave Days",   val: attLeave,   set: setAttLeave   },
                ].map(f => (
                  <div key={f.label}>
                    <Label className="text-xs font-semibold text-slate-700">{f.label}</Label>
                    <Input type="number" min="0" className="mt-1.5 rounded-xl border-slate-200"
                      value={f.val} onChange={e => f.set(e.target.value)} />
                  </div>
                ))}
              </div>
              {(() => {
                const w   = Number(attWorking) || 1;
                const p   = Number(attPresent) || 0;
                const l   = Number(attLeave)   || 0;
                const pct = Math.round((p / w) * 100);
                const abs = Math.max(0, w - p - l);
                return (
                  <>
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-xs border border-slate-200">
                      <div className="flex justify-between"><span className="text-slate-500">Attendance rate</span><span className="font-bold">{pct}%</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Absent days</span><span className="font-bold text-red-500">{abs}d</span></div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct >= 90 ? "bg-emerald-500" : pct >= 75 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    {liveAtt && (
                      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-3 border border-slate-700 text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block mr-1.5 animate-pulse" />Salary Preview
                        </p>
                        <p className="text-lg font-black text-orange-300">{fmt(liveAtt.earnedBasic)}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{liveAtt.paidDays} paid days × {fmt(Math.round(liveAtt.perDay))}/day</p>
                      </div>
                    )}
                  </>
                );
              })()}
              <div className="flex gap-2">
                <Button disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl" onClick={handleEditAtt}>
                  {saving ? <><RefreshCw className="h-3.5 w-3.5 animate-spin mr-2" />Saving…</> : "Update & Recalculate"}
                </Button>
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setEditAttId(null)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ══ MARK PAID DIALOG ══ */}
      {paidDialog && (
        <Dialog open={!!paidDialog} onOpenChange={() => setPaidDialog(null)}>
          <DialogContent className="max-w-sm mx-4 rounded-2xl">
            <DialogHeader><DialogTitle className="text-sm sm:text-base font-black">Mark as Paid — {paidDialog.userId?.name}</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-center">
                <p className="text-xs text-emerald-100 mb-1">Net Salary</p>
                <p className="text-3xl font-black text-white">{fmt(paidDialog.netSalary)}</p>
                <p className="text-xs text-emerald-200 mt-1">{paidDialog.month}</p>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Payment Date</Label>
                <Input type="date" className="mt-1.5 rounded-xl border-slate-200" value={paidDate} onChange={e => setPaidDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Payment Mode</Label>
                <select className="mt-1.5 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  value={paidMode} onChange={e => setPaidMode(e.target.value)}>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 bg-slate-50 rounded-xl p-3 border border-slate-200">
                <Mail className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                Payslip will be sent to <strong className="truncate">{paidDialog.userId?.email}</strong>
              </p>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 font-semibold" onClick={handleMarkPaid}>
                <CreditCard className="h-4 w-4 mr-2" /> Mark Paid & Send Email
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ══ EDIT PAYROLL DIALOG ══ */}
      {editRecord && (
        <Dialog open={!!editRecord} onOpenChange={() => setEditRecord(null)}>
          <DialogContent className="max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-sm sm:text-base font-black">
                Edit Payroll — {editRecord.userId?.name}
                <span className="ml-2 text-xs font-normal text-slate-400">{editRecord.month}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {liveEdit && (
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-4 border border-slate-700">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Preview</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-slate-400 mb-1">Per Day</p>
                      <p className="text-sm font-black text-white">{fmt(Math.round(liveEdit.perDay))}</p>
                    </div>
                    <div className="bg-blue-900/40 rounded-xl p-3 text-center border border-blue-800/40">
                      <p className="text-[10px] text-blue-400 mb-1">Paid Days</p>
                      <p className="text-sm font-black text-blue-300">{liveEdit.paidDays}d</p>
                    </div>
                    <div className="bg-orange-900/40 rounded-xl p-3 text-center border border-orange-800/40">
                      <p className="text-[10px] text-orange-400 mb-1">Net Salary</p>
                      <p className="text-base font-black text-orange-300">{fmt(liveEdit.netSalary)}</p>
                    </div>
                  </div>
                  {(liveEdit.unpaidLeave > 0 || liveEdit.absentDays > 0) && (
                    <div className="mt-3 pt-3 border-t border-slate-700 flex gap-4 text-[10px]">
                      {liveEdit.unpaidLeave > 0 && <span className="text-amber-400">⚠ {liveEdit.unpaidLeave} unpaid leave day(s)</span>}
                      {liveEdit.absentDays  > 0 && <span className="text-red-400">✕ {liveEdit.absentDays} absent day(s)</span>}
                    </div>
                  )}
                </div>
              )}

              <div className="bg-orange-50 rounded-2xl p-4 border border-orange-200 space-y-3">
                <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">💰 Basic Salary</p>
                <div>
                  <Label className="text-xs font-semibold text-slate-600">Full Month Basic Salary</Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">₹</span>
                    <Input type="number" min="0" className="pl-6 rounded-xl border-orange-200 bg-white focus:ring-orange-400"
                      value={editBasic} onChange={e => setEditBasic(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">📅 Attendance</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Working Days", val: editWorking,   set: setEditWorking   },
                    { label: "Present Days", val: editPresent,   set: setEditPresent   },
                    { label: "Leave Days",   val: editLeave,     set: setEditLeave     },
                    { label: "Paid Leave",   val: editPaidLeave, set: setEditPaidLeave },
                  ].map(f => (
                    <div key={f.label}>
                      <Label className="text-xs font-semibold text-slate-600">{f.label}</Label>
                      <Input type="number" min="0" className="mt-1.5 rounded-xl border-slate-200 bg-white"
                        value={f.val} onChange={e => f.set(e.target.value)} />
                    </div>
                  ))}
                </div>
                {(() => {
                  const w   = Number(editWorking) || 1;
                  const p   = Number(editPresent) || 0;
                  const pct = Math.round((p / w) * 100);
                  return (
                    <div className="flex items-center gap-3 pt-1">
                      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${pct >= 90 ? "bg-emerald-500" : pct >= 75 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`text-[10px] font-black ${pct >= 90 ? "text-emerald-600" : pct >= 75 ? "text-amber-600" : "text-red-600"}`}>{pct}% attendance</span>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Status</Label>
                  <select className="mt-1.5 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                    value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                    <option value="processed">Processed</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Payment Mode</Label>
                  <select className="mt-1.5 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                    value={editMode} onChange={e => setEditMode(e.target.value)}>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Remarks</Label>
                  <Input className="mt-1.5 rounded-xl border-slate-200" placeholder="Optional note…"
                    value={editRemarks} onChange={e => setEditRemarks(e.target.value)} />
                </div>
              </div>

              <div className="flex gap-2">
                <Button disabled={saving} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl h-11 font-semibold" onClick={handleEdit}>
                  {saving ? <><RefreshCw className="h-3.5 w-3.5 animate-spin mr-2" />Saving…</> : "Save & Recalculate"}
                </Button>
                <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => setEditRecord(null)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
