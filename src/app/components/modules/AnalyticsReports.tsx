import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  attendanceApi, leaveApi, taskApi, payrollApi,
  projectApi, helpdeskApi, timesheetApi, onboardingApi,
} from "@/services/api";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import {
  Download, RefreshCw, TrendingUp, Users, DollarSign, CheckCircle,
  Clock, Calendar, Briefcase, TicketCheck, Target, BarChart3,
  AlertCircle, Activity, ChevronDown, ChevronUp,
} from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, parseISO, eachDayOfInterval } from "date-fns";

/* ================================================================
   TYPES
   ================================================================ */
interface DataState {
  attendance:    any[];
  allLeaves:     any[];
  pendingLeaves: any[];
  tasks:         any[];
  payroll:       any[];
  projects:      any[];
  helpdesk:      any[];
  timesheets:    any[];
  onboarding:    any[];
  hdStats:       any;
}

/* ================================================================
   CONSTANTS
   ================================================================ */
const SLATE_PALETTE = ["#1e293b", "#334155", "#475569", "#64748b", "#94a3b8", "#cbd5e1"];
const RANGE_OPTS = [
  { label: "Last 7 Days",  value: "7d"  },
  { label: "Last 30 Days", value: "30d" },
  { label: "This Month",   value: "month" },
  { label: "Last Month",   value: "lmonth" },
  { label: "All Time",     value: "all"  },
];

/* ================================================================
   HELPERS
   ================================================================ */
const fmt = (d: string) => { try { return format(parseISO(d), "MMM d"); } catch { return d; } };
const fmtK = (n: number) => n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${n}`;

function buildDailyRange(days: number) {
  return Array.from({ length: days }, (_, i) => {
    const d = subDays(new Date(), days - 1 - i);
    return { date: format(d, "yyyy-MM-dd"), label: format(d, days > 14 ? "MMM d" : "EEE") };
  });
}

function applyRange(items: any[], field: string, range: string): any[] {
  const now = new Date();
  if (range === "7d")   return items.filter(i => i[field] >= format(subDays(now, 7), "yyyy-MM-dd"));
  if (range === "30d")  return items.filter(i => i[field] >= format(subDays(now, 30), "yyyy-MM-dd"));
  if (range === "month") {
    const ms = format(startOfMonth(now), "yyyy-MM-dd");
    const me = format(endOfMonth(now), "yyyy-MM-dd");
    return items.filter(i => i[field] >= ms && i[field] <= me);
  }
  if (range === "lmonth") {
    const lm = subMonths(now, 1);
    const ms = format(startOfMonth(lm), "yyyy-MM-dd");
    const me = format(endOfMonth(lm), "yyyy-MM-dd");
    return items.filter(i => i[field] >= ms && i[field] <= me);
  }
  return items;
}

/* ================================================================
   SUB-COMPONENTS
   ================================================================ */
function KpiCard({ label, value, sub, icon: Icon, color = "slate", trend }: {
  label: string; value: string | number; sub?: string;
  icon: any; color?: string; trend?: number;
}) {
  const colorMap: Record<string, string> = {
    slate:  "bg-slate-100 text-slate-600",
    green:  "bg-green-50  text-green-600",
    yellow: "bg-yellow-50 text-yellow-600",
    red:    "bg-red-50    text-red-600",
    blue:   "bg-slate-100 text-slate-500",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colorMap[color] || colorMap.slate}`}>
          <Icon size={18} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${trend >= 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      <p className="text-sm text-gray-600 font-medium mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ================================================================
   CUSTOM TOOLTIP
   ================================================================ */
function CustomTooltip({ active, payload, label, unit = "" }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="text-gray-500 mb-1 font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-semibold text-gray-900">{p.value}{unit}</span>
        </div>
      ))}
    </div>
  );
}

/* ================================================================
   DOWNLOAD HELPERS
   ================================================================ */
// ✅ FIXED: changed string[][] to (string | number)[][]
function downloadCSV(rows: (string | number)[][], filename: string) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, "'")}"` ).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export function AnalyticsReports() {
  const { currentUser } = useAuth();
  const isAdmin   = currentUser?.role === "admin";
  const isManager = currentUser?.role === "manager";
  const canView   = isAdmin || isManager;

  const [data,       setData]       = useState<DataState>({
    attendance: [], allLeaves: [], pendingLeaves: [], tasks: [],
    payroll: [], projects: [], helpdesk: [], timesheets: [], onboarding: [], hdStats: null,
  });
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range,      setRange]      = useState("30d");
  const [activeTab,  setActiveTab]  = useState<"overview" | "attendance" | "tasks" | "payroll" | "projects" | "helpdesk">("overview");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── load all data ── */
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [attR, leavesR, pendR, tasksR, payR, projR, hdR, hdSR, onbR, tsR] =
        await Promise.allSettled([
          attendanceApi.getAll(),
          leaveApi.getAll(),
          leaveApi.getPending(),
          taskApi.getAll(),
          payrollApi.getAll(),
          projectApi.getAll(),
          helpdeskApi.getAll(),
          helpdeskApi.getStats(),
          onboardingApi.getAll(),
          timesheetApi.getAll(),
        ]);
      setData({
        attendance:    attR.status    === "fulfilled" ? attR.value.records       || [] : [],
        allLeaves:     leavesR.status === "fulfilled" ? leavesR.value.leaves     || [] : [],
        pendingLeaves: pendR.status   === "fulfilled" ? pendR.value.leaves       || [] : [],
        tasks:         tasksR.status  === "fulfilled" ? tasksR.value.tasks       || [] : [],
        payroll:       payR.status    === "fulfilled" ? payR.value.records       || [] : [],
        projects:      projR.status   === "fulfilled" ? projR.value.projects     || [] : [],
        helpdesk:      hdR.status     === "fulfilled" ? hdR.value.tickets        || [] : [],
        timesheets:    tsR.status     === "fulfilled" ? tsR.value.sheets         || [] : [],
        onboarding:    onbR.status    === "fulfilled" ? (onbR.value.onboarding   || []).filter((o: any) => o.userId) : [],
        hdStats:       hdSR.status    === "fulfilled" ? hdSR.value.stats         || null : null,
      });
    } catch (e) {
      console.error("Analytics load error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    pollingRef.current = setInterval(() => load(true), 60000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [load]);

  /* ================================================================
     COMPUTED — OVERVIEW KPIs
     ================================================================ */
  const today         = format(new Date(), "yyyy-MM-dd");
  const todayAtt      = data.attendance.filter(a => a.date === today && !a.isManual);
  const totalStaff    = new Set(data.attendance.map(a => a.userId?._id)).size;
  const checkedIn     = todayAtt.filter(a => a.checkIn && !a.checkOut).length;
  const checkedOut    = todayAtt.filter(a => a.checkOut).length;
  const absentToday   = Math.max(0, totalStaff - todayAtt.length);
  const attRate       = totalStaff > 0 ? Math.round(((checkedIn + checkedOut) / totalStaff) * 100) : 0;

  const pendTasks     = data.tasks.filter(t => t.status === "pending").length;
  const inProgTasks   = data.tasks.filter(t => t.status === "in-progress").length;
  const doneTasks     = data.tasks.filter(t => t.status === "completed").length;
  const taskCompletion = data.tasks.length > 0 ? Math.round((doneTasks / data.tasks.length) * 100) : 0;

  const totalPayroll  = data.payroll.filter(p => p.status === "paid").reduce((s, p) => s + p.netSalary, 0);
  const pendPayroll   = data.payroll.filter(p => ["draft","pending"].includes(p.status)).reduce((s, p) => s + p.netSalary, 0);

  const activeProj    = data.projects.filter(p => p.status === "in-progress").length;
  const avgProgress   = data.projects.length > 0
    ? Math.round(data.projects.reduce((s, p) => s + p.progress, 0) / data.projects.length) : 0;
  const totalBudget   = data.projects.reduce((s, p) => s + (p.budget || 0), 0);
  const totalSpent    = data.projects.reduce((s, p) => s + (p.spent  || 0), 0);
  const burnRate      = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : "0";

  const totalHours    = data.timesheets.reduce((s, t) => s + (t.hours || 0), 0);
  const activeEmps    = data.onboarding.filter(o => o.userId?.isActive).length;
  const openTickets   = data.hdStats?.open ?? data.helpdesk.filter(h => h.status === "open").length;

  /* ================================================================
     COMPUTED — ATTENDANCE CHARTS
     ================================================================ */
  const attTrend = useMemo(() => {
    const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "month" ? new Date().getDate() : 14;
    return buildDailyRange(days).map(d => {
      const dayAtt = data.attendance.filter(a => a.date === d.date && !a.isManual);
      return {
        ...d,
        present: dayAtt.filter(a => a.checkIn).length,
        absent:  Math.max(0, totalStaff - dayAtt.length),
        rate:    totalStaff > 0 ? Math.round((dayAtt.filter(a => a.checkIn).length / totalStaff) * 100) : 0,
      };
    });
  }, [data.attendance, range, totalStaff]);

  const leaveTypeDist = useMemo(() => {
    const types = ["Sick Leave", "Casual Leave", "Earned Leave", "Emergency Leave", "Other"];
    return types.map(t => ({
      name:  t.replace(" Leave", ""),
      count: data.allLeaves.filter(l => l.type === t).length,
    })).filter(d => d.count > 0);
  }, [data.allLeaves]);

  const leaveStatusDist = useMemo(() => [
    { name: "Approved",  value: data.allLeaves.filter(l => l.status === "approved" || l.status === "emergency_approved").length },
    { name: "Pending",   value: data.pendingLeaves.length },
    { name: "Rejected",  value: data.allLeaves.filter(l => l.status === "rejected").length },
  ].filter(d => d.value > 0), [data]);

  /* ================================================================
     COMPUTED — TASK CHARTS
     ================================================================ */
  const taskStatusDist = useMemo(() => [
    { name: "Pending",     value: pendTasks,    fill: "#94a3b8" },
    { name: "In Progress", value: inProgTasks,  fill: "#475569" },
    { name: "Completed",   value: doneTasks,    fill: "#1e293b" },
  ].filter(d => d.value > 0), [pendTasks, inProgTasks, doneTasks]);

  const taskPriorityDist = useMemo(() => [
    { name: "High",   value: data.tasks.filter(t => t.priority === "high").length,   fill: "#e24b4a" },
    { name: "Medium", value: data.tasks.filter(t => t.priority === "medium").length, fill: "#ef9f27" },
    { name: "Low",    value: data.tasks.filter(t => t.priority === "low").length,    fill: "#639922" },
  ].filter(d => d.value > 0), [data.tasks]);

  const topAssignees = useMemo(() => {
    const map: Record<string, { name: string; total: number; done: number }> = {};
    data.tasks.forEach(t => {
      const id   = t.assignedTo?._id || "unassigned";
      const name = t.assignedTo?.name || "Unassigned";
      if (!map[id]) map[id] = { name, total: 0, done: 0 };
      map[id].total++;
      if (t.status === "completed") map[id].done++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 6)
      .map(e => ({ ...e, rate: e.total > 0 ? Math.round((e.done / e.total) * 100) : 0 }));
  }, [data.tasks]);

  /* ================================================================
     COMPUTED — PAYROLL CHARTS
     ================================================================ */
  const payrollByMonth = useMemo(() => {
    const map: Record<string, { month: string; net: number; gross: number; count: number }> = {};
    data.payroll.forEach(p => {
      if (!p.month) return;
      if (!map[p.month]) map[p.month] = { month: p.month, net: 0, gross: 0, count: 0 };
      map[p.month].net   += p.netSalary   || 0;
      map[p.month].gross += p.grossSalary || 0;
      map[p.month].count++;
    });
    return Object.values(map)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6)
      .map(m => ({ ...m, net: Math.round(m.net), gross: Math.round(m.gross) }));
  }, [data.payroll]);

  const payrollStatusDist = useMemo(() => [
    { name: "Paid",      value: data.payroll.filter(p => p.status === "paid").length      },
    { name: "Processed", value: data.payroll.filter(p => p.status === "processed").length },
    { name: "Pending",   value: data.payroll.filter(p => p.status === "pending").length   },
    { name: "Draft",     value: data.payroll.filter(p => p.status === "draft").length     },
  ].filter(d => d.value > 0), [data.payroll]);

  /* ================================================================
     COMPUTED — PROJECTS CHARTS
     ================================================================ */
  const projStatusDist = useMemo(() => [
    { name: "Planning",    count: data.projects.filter(p => p.status === "planning").length    },
    { name: "In Progress", count: data.projects.filter(p => p.status === "in-progress").length },
    { name: "Completed",   count: data.projects.filter(p => p.status === "completed").length   },
    { name: "On Hold",     count: data.projects.filter(p => p.status === "on-hold").length     },
  ].filter(d => d.count > 0), [data.projects]);

  const projBudget = useMemo(() =>
    data.projects.slice(0, 8).map(p => ({
      name:   (p.name || "").substring(0, 12),
      budget: Math.round(p.budget / 1000),
      spent:  Math.round(p.spent  / 1000),
      progress: p.progress || 0,
    })), [data.projects]);

  /* ================================================================
     COMPUTED — HELPDESK
     ================================================================ */
  const hdTicketTrend = useMemo(() => {
    const days = 14;
    return buildDailyRange(days).map(d => ({
      ...d,
      open:     data.helpdesk.filter(h => h.createdAt?.startsWith(d.date)).length,
      resolved: data.helpdesk.filter(h => h.resolvedAt?.startsWith(d.date)).length,
    }));
  }, [data.helpdesk]);

  /* ================================================================
     DOWNLOAD REPORT
     ================================================================ */
  const downloadReport = (section: string) => {
    if (section === "attendance") {
      downloadCSV([
        ["Date", "Present", "Absent", "Attendance Rate"],
        ...attTrend.map(d => [d.date, d.present, d.absent, `${d.rate}%`]),
      ], `attendance_report_${format(new Date(), "yyyyMMdd")}.csv`);
    } else if (section === "tasks") {
      downloadCSV([
        ["Title", "Assigned To", "Priority", "Status", "Due Date"],
        ...data.tasks.map(t => [t.title, t.assignedTo?.name || "—", t.priority, t.status, t.dueDate || "—"]),
      ], `tasks_report_${format(new Date(), "yyyyMMdd")}.csv`);
    } else if (section === "payroll") {
      downloadCSV([
        ["Employee", "Month", "Gross", "Net", "Status"],
        ...data.payroll.map(p => [p.userId?.name || "—", p.month, p.grossSalary, p.netSalary, p.status]),
      ], `payroll_report_${format(new Date(), "yyyyMMdd")}.csv`);
    } else if (section === "projects") {
      downloadCSV([
        ["Project", "Client", "Status", "Progress", "Budget", "Spent"],
        ...data.projects.map(p => [p.name, p.clientName, p.status, `${p.progress}%`, p.budget, p.spent]),
      ], `projects_report_${format(new Date(), "yyyyMMdd")}.csv`);
    } else {
      downloadCSV([
        ["Metric", "Value"],
        ["Attendance Rate Today", `${attRate}%`],
        ["Total Staff", totalStaff],
        ["Checked In", checkedIn],
        ["Task Completion Rate", `${taskCompletion}%`],
        ["Total Paid Payroll", fmtK(totalPayroll)],
        ["Active Projects", activeProj],
        ["Avg Project Progress", `${avgProgress}%`],
        ["Open Helpdesk Tickets", openTickets],
        ["Total Hours Logged", `${totalHours.toFixed(1)}h`],
      ], `analytics_full_${format(new Date(), "yyyyMMdd")}.csv`);
    }
  };

  if (!canView) return (
    <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
      Access restricted to admin and manager.
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-slate-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-7xl mx-auto px-3 sm:px-0">

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 size={20} className="text-slate-500" /> Analytics & Reports
          </h1>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
            Real-time insights · auto-refreshes every 60s
            {refreshing && <RefreshCw size={12} className="animate-spin text-slate-400" />}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => downloadReport("all")}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            <Download size={15} /> Export All
          </button>
          <select
            value={range}
            onChange={e => setRange(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            {RANGE_OPTS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      </div>

      {/* ── TOP KPI GRID ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Attendance Today" value={`${attRate}%`}    sub={`${checkedIn + checkedOut}/${totalStaff} in`} icon={Users}       color="slate"  />
        <KpiCard label="Task Completion"  value={`${taskCompletion}%`} sub={`${doneTasks}/${data.tasks.length} done`}   icon={CheckCircle} color="green"  />
        <KpiCard label="Paid Payroll"     value={fmtK(totalPayroll)} sub={`${data.payroll.filter(p=>p.status==="paid").length} records`} icon={DollarSign} color="blue" />
        <KpiCard label="Active Projects"  value={activeProj}       sub={`${avgProgress}% avg progress`}              icon={Briefcase}   color="slate"  />
        <KpiCard label="Open Tickets"     value={openTickets}      sub="helpdesk"                                     icon={TicketCheck} color="red"    />
        <KpiCard label="Hours Logged"     value={`${totalHours.toFixed(0)}h`} sub="all time"                          icon={Clock}       color="purple" />
      </div>

      {/* ── TABS ── */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto">
        {(["overview", "attendance", "tasks", "payroll", "projects", "helpdesk"] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize whitespace-nowrap ${
              activeTab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════
          OVERVIEW TAB
          ═══════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-4">

          {/* Today banner */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h2 className="text-base font-semibold">Today's Snapshot</h2>
                <p className="text-slate-400 text-xs mt-0.5">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Checked In",       value: checkedIn                        },
                { label: "Checked Out",      value: checkedOut                       },
                { label: "Absent",           value: absentToday,  danger: true       },
                { label: "Pending Leaves",   value: data.pendingLeaves.length        },
              ].map(s => (
                <div key={s.label} className={`rounded-xl p-3 text-center ${s.danger ? "bg-red-500/25" : "bg-white/10"}`}>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-slate-300 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 4 charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Attendance trend */}
            <SectionCard title="Attendance Trend">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={attTrend}>
                  <defs>
                    <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#475569" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#475569" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area type="monotone" dataKey="present" name="Present" stroke="#475569" fill="url(#ag1)" strokeWidth={2} />
                  <Area type="monotone" dataKey="absent"  name="Absent"  stroke="#94a3b8" fill="none"       strokeWidth={1.5} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            </SectionCard>

            {/* Task status donut */}
            <SectionCard title="Task Distribution">
              <div className="flex items-center justify-center gap-6 flex-wrap">
                <ResponsiveContainer width="55%" height={190}>
                  <PieChart>
                    <Pie data={taskStatusDist} dataKey="value" outerRadius={75} innerRadius={42} paddingAngle={3}>
                      {taskStatusDist.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {taskStatusDist.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-3 h-3 rounded-full" style={{ background: d.fill }} />
                      <span className="text-gray-600">{d.name}</span>
                      <span className="font-bold ml-auto pl-3">{d.value}</span>
                    </div>
                  ))}
                  <div className="mt-2 pt-2 border-t border-gray-100 text-xs">
                    <span className="text-gray-500">Completion: </span>
                    <span className="font-bold text-gray-900">{taskCompletion}%</span>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Project status */}
            <SectionCard title="Project Status">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={projStatusDist} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Projects" fill="#475569" radius={3} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            {/* Payroll by month */}
            <SectionCard title="Monthly Payroll (₹K)">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={payrollByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}K`} />
                  <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`]} />
                  <Legend />
                  <Bar dataKey="gross" name="Gross"  fill="#94a3b8" radius={3} />
                  <Bar dataKey="net"   name="Net"    fill="#475569" radius={3} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>

          {/* Leave type + helpdesk row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Leave Type Distribution">
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={leaveTypeDist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Requests" fill="#64748b" radius={3} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            <SectionCard title="Helpdesk Overview">
              {data.hdStats ? (
                <div className="grid grid-cols-2 gap-3 h-full">
                  {[
                    { label: "Total",       value: data.hdStats.total,      bg: "bg-slate-50",  txt: "text-slate-700"  },
                    { label: "Open",        value: data.hdStats.open,       bg: "bg-yellow-50", txt: "text-yellow-700" },
                    { label: "In Progress", value: data.hdStats.inProgress, bg: "bg-blue-50",   txt: "text-blue-700"   },
                    { label: "Critical",    value: data.hdStats.critical,   bg: "bg-red-50",    txt: "text-red-700"    },
                  ].map(s => (
                    <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
                      <p className={`text-3xl font-bold ${s.txt}`}>{s.value ?? 0}</p>
                      <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400 text-sm py-8">No helpdesk data</p>
              )}
            </SectionCard>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          ATTENDANCE TAB
          ═══════════════════════════════════════════ */}
      {activeTab === "attendance" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => downloadReport("attendance")}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Download size={14} /> Download CSV
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="Checked In Today"  value={checkedIn + checkedOut} icon={Users}    color="slate" />
            <KpiCard label="Absent Today"       value={absentToday}            icon={AlertCircle} color="red" />
            <KpiCard label="Attendance Rate"    value={`${attRate}%`}          icon={Activity} color="green" />
            <KpiCard label="Total Staff"        value={totalStaff}             icon={Users}    color="slate" />
          </div>

          <SectionCard title="Daily Attendance Trend">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={attTrend}>
                <defs>
                  <linearGradient id="ag2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#475569" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#475569" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="present" name="Present" stroke="#475569" fill="url(#ag2)" strokeWidth={2} />
                <Area type="monotone" dataKey="absent"  name="Absent"  stroke="#e24b4a" fill="none"       strokeWidth={1.5} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </SectionCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Attendance Rate (%)">
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={attTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip unit="%" />} />
                  <Line type="monotone" dataKey="rate" name="Rate" stroke="#475569" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </SectionCard>

            <SectionCard title="Leave Distribution">
              <div className="flex items-center justify-center gap-4 flex-wrap sm:flex-nowrap">
                <ResponsiveContainer width="55%" height={190}>
                  <PieChart>
                    <Pie data={leaveStatusDist} dataKey="value" outerRadius={70} innerRadius={38} paddingAngle={3}>
                      {leaveStatusDist.map((_, i) => <Cell key={i} fill={SLATE_PALETTE[i * 2]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {leaveStatusDist.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="w-3 h-3 rounded-full" style={{ background: SLATE_PALETTE[i * 2] }} />
                      <span className="text-gray-600">{d.name}</span>
                      <span className="font-bold ml-2">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          TASKS TAB
          ═══════════════════════════════════════════ */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => downloadReport("tasks")}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Download size={14} /> Download CSV
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="Total Tasks"     value={data.tasks.length} icon={CheckCircle} color="slate" />
            <KpiCard label="Pending"         value={pendTasks}          icon={Clock}       color="yellow" />
            <KpiCard label="In Progress"     value={inProgTasks}        icon={Activity}    color="blue" />
            <KpiCard label="Completed"       value={doneTasks}          icon={Target}      color="green" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Task Status">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={taskStatusDist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Tasks" radius={4}>
                    {taskStatusDist.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            <SectionCard title="Task Priority">
              <div className="flex items-center justify-center gap-4">
                <ResponsiveContainer width="55%" height={190}>
                  <PieChart>
                    <Pie data={taskPriorityDist} dataKey="value" outerRadius={70} innerRadius={38} paddingAngle={3}>
                      {taskPriorityDist.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {taskPriorityDist.map(d => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="w-3 h-3 rounded-full" style={{ background: d.fill }} />
                      <span className="text-gray-600">{d.name}</span>
                      <span className="font-bold ml-2">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Performance by Assignee">
            <div className="space-y-3">
              {topAssignees.map((e, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 text-xs font-bold flex-shrink-0">
                    {e.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 truncate">{e.name}</span>
                      <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{e.done}/{e.total} · {e.rate}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-600 rounded-full transition-all" style={{ width: `${e.rate}%` }} />
                    </div>
                  </div>
                </div>
              ))}
              {topAssignees.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No task data</p>}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          PAYROLL TAB
          ═══════════════════════════════════════════ */}
      {activeTab === "payroll" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => downloadReport("payroll")}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Download size={14} /> Download CSV
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="Total Paid"        value={fmtK(totalPayroll)}  icon={DollarSign} color="green"  />
            <KpiCard label="Pending / Draft"   value={fmtK(pendPayroll)}   icon={Clock}      color="yellow" />
            <KpiCard label="Records"           value={data.payroll.length} icon={TrendingUp} color="slate"  />
            <KpiCard label="Headcount"         value={new Set(data.payroll.map(p=>p.userId?._id)).size} icon={Users} color="slate" />
          </div>

          <SectionCard title="Monthly Payroll Trend (₹)">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={payrollByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v}K`} />
                <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`]} />
                <Legend />
                <Bar dataKey="gross" name="Gross"  fill="#94a3b8" radius={3} />
                <Bar dataKey="net"   name="Net"    fill="#475569" radius={3} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Payroll Status Breakdown">
              <div className="flex items-center justify-center gap-4">
                <ResponsiveContainer width="55%" height={190}>
                  <PieChart>
                    <Pie data={payrollStatusDist} dataKey="value" outerRadius={70} innerRadius={38} paddingAngle={3}>
                      {payrollStatusDist.map((_, i) => <Cell key={i} fill={SLATE_PALETTE[i]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {payrollStatusDist.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="w-3 h-3 rounded-full" style={{ background: SLATE_PALETTE[i] }} />
                      <span className="text-gray-600">{d.name}</span>
                      <span className="font-bold ml-2">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Recent Payroll Records">
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {data.payroll.slice(0, 8).map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs font-medium text-gray-800">{p.userId?.name || "—"}</p>
                      <p className="text-[10px] text-gray-400">{p.month} · {p.userId?.role || ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-900">₹{p.netSalary?.toLocaleString()}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        p.status === "paid" ? "bg-green-100 text-green-700" :
                        p.status === "processed" ? "bg-blue-100 text-blue-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>{p.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          PROJECTS TAB
          ═══════════════════════════════════════════ */}
      {activeTab === "projects" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => downloadReport("projects")}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Download size={14} /> Download CSV
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="Total Projects" value={data.projects.length} icon={Briefcase}  color="slate"  />
            <KpiCard label="Active"          value={activeProj}           icon={Activity}   color="blue"   />
            <KpiCard label="Avg Progress"    value={`${avgProgress}%`}   icon={Target}     color="green"  />
            <KpiCard label="Budget Used"     value={`${burnRate}%`}      icon={DollarSign} color="yellow" />
          </div>

          <SectionCard title="Budget vs Spent by Project (₹K)">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={projBudget}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} unit="K" />
                <Tooltip formatter={(v: number) => [`₹${v}K`]} />
                <Legend />
                <Bar dataKey="budget" name="Budget" fill="#94a3b8" radius={3} />
                <Bar dataKey="spent"  name="Spent"  fill="#475569" radius={3} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Project Status">
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={projStatusDist} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Projects" fill="#475569" radius={3} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            <SectionCard title="Progress Overview">
              <div className="space-y-3 max-h-[220px] overflow-y-auto">
                {data.projects.map((p, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700 font-medium truncate max-w-[60%]">{p.name}</span>
                      <span className="text-gray-500 ml-2">{p.progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${p.progress}%`,
                          background: p.progress >= 80 ? "#639922" : p.progress >= 40 ? "#475569" : "#e24b4a",
                        }}
                      />
                    </div>
                  </div>
                ))}
                {data.projects.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No projects</p>}
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          HELPDESK TAB
          ═══════════════════════════════════════════ */}
      {activeTab === "helpdesk" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="Total Tickets"   value={data.hdStats?.total      ?? data.helpdesk.length} icon={TicketCheck} color="slate"  />
            <KpiCard label="Open"            value={data.hdStats?.open       ?? openTickets}           icon={AlertCircle} color="yellow" />
            <KpiCard label="In Progress"     value={data.hdStats?.inProgress ?? 0}                     icon={Activity}    color="blue"   />
            <KpiCard label="Critical"        value={data.hdStats?.critical   ?? 0}                     icon={AlertCircle} color="red"    />
          </div>

          <SectionCard title="Ticket Activity (Last 14 Days)">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={hdTicketTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="open"     name="Created"  fill="#475569" radius={3} />
                <Bar dataKey="resolved" name="Resolved" fill="#94a3b8" radius={3} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>

          <SectionCard title="Recent Open Tickets">
            <div className="space-y-2">
              {data.helpdesk
                .filter(h => h.status === "open" || h.status === "in_progress")
                .slice(0, 8)
                .map((h, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{h.title}</p>
                      <p className="text-[10px] text-gray-500">
                        {h.raisedBy?.name || "—"} · {h.category} · {h.ticketNumber}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2 ${
                      h.priority === "critical" ? "bg-red-100 text-red-700" :
                      h.priority === "high"     ? "bg-orange-100 text-orange-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>
                      {h.priority}
                    </span>
                  </div>
                ))}
              {data.helpdesk.filter(h => h.status === "open").length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">No open tickets</p>
              )}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
