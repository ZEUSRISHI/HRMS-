// src/app/components/modules/RoleBasedDashboard.tsx

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  attendanceApi, leaveApi, taskApi, payrollApi,
  projectApi, helpdeskApi, timesheetApi, onboardingApi
} from "@/services/api";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area
} from "recharts";
import {
  Users, Clock, CheckSquare, DollarSign, TrendingUp,
  Calendar, Briefcase, TicketCheck, RefreshCw,
  CheckCircle2, XCircle, LogIn, LogOut, ArrowUp, ArrowDown,
  Activity, Target
} from "lucide-react";

/* ── unified slate colour palette for charts ── */
const COLORS = ["#475569", "#64748b", "#94a3b8", "#cbd5e1", "#334155", "#1e293b"];

/* ======================================================================
   STAT CARD
   ====================================================================== */
function StatCard({
  title, value, subtitle, icon: Icon, color = "slate", trend, loading,
}: {
  title: string; value: string | number; subtitle?: string;
  icon: any; color?: string; trend?: { value: number; up: boolean };
  loading?: boolean;
}) {
  const colorMap: Record<string, string> = {
    slate:  "bg-slate-100 text-slate-600",
    gray:   "bg-gray-100  text-gray-600",
    zinc:   "bg-zinc-100  text-zinc-600",
    green:  "bg-green-50  text-green-600",
    red:    "bg-red-50    text-red-600",
    yellow: "bg-yellow-50 text-yellow-600",
    /* kept for semantic meaning only */
    indigo: "bg-slate-100 text-slate-600",
    blue:   "bg-slate-100 text-slate-600",
    orange: "bg-gray-100  text-gray-600",
    purple: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[color] ?? colorMap.slate}`}>
          <Icon size={20} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            trend.up ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
          }`}>
            {trend.up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {trend.value}%
          </div>
        )}
      </div>
      {loading
        ? <div className="h-8 bg-gray-100 rounded animate-pulse mb-1" />
        : <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
      }
      <p className="text-sm font-medium text-gray-600 mt-0.5 leading-tight">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

/* ======================================================================
   SECTION WRAPPER
   ====================================================================== */
function Section({
  title, children, action,
}: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 text-sm sm:text-base">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ======================================================================
   REFRESH BUTTON — shared, slate themed
   ====================================================================== */
function RefreshBtn({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-700 hover:bg-slate-800 active:bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-medium transition disabled:opacity-50"
    >
      <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
      <span className="hidden sm:inline">{loading ? "Refreshing…" : "Refresh"}</span>
    </button>
  );
}

/* ======================================================================
   BANNER — slate gradient, replaces every role-coloured banner
   ====================================================================== */
function Banner({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-5 sm:p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold">{title}</h2>
          {subtitle && <p className="text-slate-400 text-xs sm:text-sm mt-0.5">{subtitle}</p>}
        </div>
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
      </div>
      {children}
    </div>
  );
}

/* shared banner stat tile */
function BannerTile({
  label, value, icon: Icon, danger,
}: { label: string; value: number | string; icon?: any; danger?: boolean }) {
  return (
    <div className={`rounded-xl p-3 text-center ${danger ? "bg-red-500/25" : "bg-white/10"}`}>
      {Icon && <Icon size={18} className="mx-auto mb-1 opacity-70" />}
      <p className="text-xl sm:text-2xl font-bold">{value}</p>
      <p className="text-[11px] sm:text-xs text-slate-300 leading-tight mt-0.5">{label}</p>
    </div>
  );
}

/* ======================================================================
   ADMIN DASHBOARD
   ====================================================================== */
function AdminDashboard() {
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [attendance,    setAttendance]    = useState<any[]>([]);
  const [allLeaves,     setAllLeaves]     = useState<any[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [tasks,         setTasks]         = useState<any[]>([]);
  const [payroll,       setPayroll]       = useState<any[]>([]);
  const [projects,      setProjects]      = useState<any[]>([]);
  const [helpdesk,      setHelpdesk]      = useState<any[]>([]);
  const [helpdeskStats, setHelpdeskStats] = useState<any>(null);
  const [onboarding,    setOnboarding]    = useState<any[]>([]);
  const [timesheets,    setTimesheets]    = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const [attRes, leavesRes, pendRes, tasksRes, payRes, projRes, hdRes, hdStats, onbRes, tsRes] =
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
      if (attRes.status    === "fulfilled") setAttendance(attRes.value.records ?? []);
      if (leavesRes.status === "fulfilled") setAllLeaves(leavesRes.value.leaves ?? []);
      if (pendRes.status   === "fulfilled") setPendingLeaves(pendRes.value.leaves ?? []);
      if (tasksRes.status  === "fulfilled") setTasks(tasksRes.value.tasks ?? []);
      if (payRes.status    === "fulfilled") setPayroll(payRes.value.records ?? []);
      if (projRes.status   === "fulfilled") setProjects(projRes.value.projects ?? []);
      if (hdRes.status     === "fulfilled") setHelpdesk(hdRes.value.tickets ?? []);
      if (hdStats.status   === "fulfilled") setHelpdeskStats(hdStats.value.stats);
      if (onbRes.status    === "fulfilled") setOnboarding((onbRes.value.onboarding ?? []).filter((o: any) => o.userId));
      if (tsRes.status     === "fulfilled") setTimesheets(tsRes.value.sheets ?? []);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const today       = new Date().toISOString().split("T")[0];
  const todayAtt    = attendance.filter(a => a.date === today && !a.isManual);
  const checkedIn   = todayAtt.filter(a => a.checkIn && !a.checkOut).length;
  const checkedOut  = todayAtt.filter(a => a.checkOut).length;
  const totalStaff  = new Set(attendance.map(a => a.userId?._id)).size;
  const absent      = Math.max(0, totalStaff - todayAtt.length);

  const pendingTasks    = tasks.filter(t => t.status === "pending").length;
  const inProgressTasks = tasks.filter(t => t.status === "in-progress").length;
  const completedTasks  = tasks.filter(t => t.status === "completed").length;
  const totalPayroll    = payroll.filter(p => p.status === "paid").reduce((s, p) => s + p.netSalary, 0);
  const pendingPayroll  = payroll.filter(p => ["draft","pending"].includes(p.status)).reduce((s, p) => s + p.netSalary, 0);
  const activeProjects  = projects.filter(p => p.status === "in-progress").length;
  const avgProgress     = projects.length > 0 ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0;
  const totalHours      = timesheets.reduce((s, t) => s + (t.hours || 0), 0);
  const activeEmployees = onboarding.filter(o => o.userId?.isActive).length;

  const taskPieData = [
    { name: "Pending",     value: pendingTasks    },
    { name: "In Progress", value: inProgressTasks },
    { name: "Completed",   value: completedTasks  },
  ].filter(d => d.value > 0);

  const projectStatusData = [
    { name: "Planning",    count: projects.filter(p => p.status === "planning").length    },
    { name: "In Progress", count: projects.filter(p => p.status === "in-progress").length },
    { name: "Completed",   count: projects.filter(p => p.status === "completed").length   },
    { name: "On Hold",     count: projects.filter(p => p.status === "on-hold").length     },
  ].filter(d => d.count > 0);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().split("T")[0];
    const dayAtt = attendance.filter(a => a.date === ds && !a.isManual);
    return {
      day:     d.toLocaleDateString("en-US", { weekday: "short" }),
      present: dayAtt.filter(a => a.checkIn).length,
      absent:  Math.max(0, totalStaff - dayAtt.length),
    };
  });

  const payrollByStatus = [
    { name: "Paid",      value: payroll.filter(p => p.status === "paid").length      },
    { name: "Processed", value: payroll.filter(p => p.status === "processed").length },
    { name: "Pending",   value: payroll.filter(p => p.status === "pending").length   },
    { name: "Draft",     value: payroll.filter(p => p.status === "draft").length     },
  ].filter(d => d.value > 0);

  const leaveTypeData = ["Sick Leave","Casual Leave","Earned Leave","Emergency Leave","Other"].map(type => ({
    name:  type.replace(" Leave", ""),
    count: allLeaves.filter(l => l.type === type).length,
  })).filter(d => d.count > 0);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Admin Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Real-time overview of your organization</p>
        </div>
        <RefreshBtn onClick={() => { setRefreshing(true); load(); }} loading={refreshing} />
      </div>

      {/* Attendance Banner */}
      <Banner
        title="Today's Attendance"
        subtitle={new Date().toLocaleDateString("en-IN", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <BannerTile label="Checked In"  value={loading ? "—" : checkedIn}  icon={LogIn}   />
          <BannerTile label="Checked Out" value={loading ? "—" : checkedOut} icon={LogOut}  />
          <BannerTile label="Absent"      value={loading ? "—" : absent}     icon={XCircle} danger />
          <BannerTile label="Total Staff" value={loading ? "—" : totalStaff} icon={Users}   />
        </div>
      </Banner>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard title="Active Employees" value={loading ? "—" : activeEmployees}                                                        icon={Users}       color="slate"  loading={loading} />
        <StatCard title="Pending Tasks"    value={loading ? "—" : pendingTasks}                                                           icon={CheckSquare} color="slate"  loading={loading} />
        <StatCard title="Active Projects"  value={loading ? "—" : activeProjects}                                                         icon={Briefcase}   color="slate"  loading={loading} />
        <StatCard title="Leave Requests"   value={loading ? "—" : pendingLeaves.length} subtitle="Pending approval"                       icon={Calendar}    color="yellow" loading={loading} />
        <StatCard title="Open Tickets"     value={loading ? "—" : (helpdeskStats?.open ?? helpdesk.filter(h => h.status === "open").length)} icon={TicketCheck} color="red"    loading={loading} />
        <StatCard title="Total Hours"      value={loading ? "—" : `${totalHours.toFixed(0)}h`} subtitle="All timesheets"                  icon={Clock}       color="slate"  loading={loading} />
      </div>

      {/* Payroll row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard title="Paid Payroll"          value={`₹${(totalPayroll/1000).toFixed(0)}K`}   icon={DollarSign} color="green"  loading={loading} />
        <StatCard title="Pending Payroll"       value={`₹${(pendingPayroll/1000).toFixed(0)}K`} icon={DollarSign} color="yellow" loading={loading} />
        <StatCard title="Avg Project Progress"  value={`${avgProgress}%`}                        icon={Target}     color="slate"  loading={loading} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Section title="Weekly Attendance Trend">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={last7Days}>
              <defs>
                <linearGradient id="gradPresent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#475569" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#475569" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="present" stroke="#475569" fill="url(#gradPresent)" strokeWidth={2} />
              <Bar   dataKey="absent"  fill="#94a3b8" radius={4} />
            </AreaChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Task Distribution">
          <div className="flex items-center justify-center gap-4 sm:gap-6 flex-wrap sm:flex-nowrap">
            <ResponsiveContainer width="55%" height={200}>
              <PieChart>
                <Pie data={taskPieData} dataKey="value" outerRadius={80} innerRadius={42} paddingAngle={3}>
                  {taskPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 text-sm">
              {taskPieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i] }} />
                  <span className="text-gray-600">{d.name}</span>
                  <span className="font-semibold ml-auto pl-3">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Section title="Project Status Overview">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={projectStatusData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="count" fill="#475569" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Leave Type Distribution">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={leaveTypeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#64748b" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      {/* Payroll + Helpdesk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Section title="Payroll by Status">
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie
                data={payrollByStatus} dataKey="value"
                outerRadius={75} innerRadius={38} paddingAngle={3}
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {payrollByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Helpdesk Overview">
          {helpdeskStats ? (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total",       value: helpdeskStats.total,      bg: "bg-slate-50",  txt: "text-slate-700"  },
                { label: "Open",        value: helpdeskStats.open,       bg: "bg-yellow-50", txt: "text-yellow-700" },
                { label: "In Progress", value: helpdeskStats.inProgress, bg: "bg-gray-50",   txt: "text-gray-700"   },
                { label: "Critical",    value: helpdeskStats.critical,   bg: "bg-red-50",    txt: "text-red-700"    },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
                  <p className={`text-2xl sm:text-3xl font-bold ${s.txt}`}>{loading ? "—" : s.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8 text-sm">No helpdesk data</div>
          )}
        </Section>
      </div>

      {/* Pending Actions */}
      <Section
        title="Pending Actions"
        action={
          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full font-medium">
            {pendingLeaves.length + helpdesk.filter(h => h.status === "open").length} items
          </span>
        }
      >
        <div className="space-y-2">
          {pendingLeaves.slice(0, 5).map(l => (
            <div key={l._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <Calendar size={15} className="text-slate-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{l.userId?.name || "Unknown"}</p>
                  <p className="text-xs text-gray-500 truncate">{l.type} · {l.startDate} → {l.endDate}</p>
                </div>
              </div>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2">
                {l.status?.replace(/_/g, " ")}
              </span>
            </div>
          ))}
          {pendingLeaves.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-4">No pending leave requests</p>
          )}
        </div>
      </Section>

      {/* Recent Onboarding */}
      <Section title="Recent Onboarding">
        <div className="space-y-2">
          {onboarding.slice(0, 5).map(o => {
            if (!o.userId) return null;
            const done  = o.tasks?.filter((t: any) => t.completed).length || 0;
            const total = o.tasks?.length || 0;
            return (
              <div key={o._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 text-sm font-bold flex-shrink-0">
                    {o.userId.name?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{o.userId.name}</p>
                    <p className="text-xs text-gray-500 truncate">{o.role} · Started {o.startDate}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-xs font-medium text-slate-600">{done}/{total} tasks</p>
                  <div className="w-16 sm:w-20 h-1.5 bg-slate-100 rounded-full mt-1">
                    <div className="h-full bg-slate-500 rounded-full" style={{ width: `${total > 0 ? (done/total)*100 : 0}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
          {onboarding.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No onboarding records</p>}
        </div>
      </Section>
    </div>
  );
}

/* ======================================================================
   MANAGER DASHBOARD
   ====================================================================== */
function ManagerDashboard() {
  const { currentUser } = useAuth();
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [tasks,      setTasks]      = useState<any[]>([]);
  const [projects,   setProjects]   = useState<any[]>([]);
  const [leaves,     setLeaves]     = useState<any[]>([]);
  const [timesheets, setTimesheets] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const [attRes, tasksRes, projRes, leavesRes, tsRes] = await Promise.allSettled([
        attendanceApi.getAll(), taskApi.getAll(), projectApi.getAll(),
        leaveApi.getPending(), timesheetApi.getAll(),
      ]);
      if (attRes.status    === "fulfilled") setAttendance(attRes.value.records  ?? []);
      if (tasksRes.status  === "fulfilled") setTasks(tasksRes.value.tasks       ?? []);
      if (projRes.status   === "fulfilled") setProjects(projRes.value.projects  ?? []);
      if (leavesRes.status === "fulfilled") setLeaves(leavesRes.value.leaves    ?? []);
      if (tsRes.status     === "fulfilled") setTimesheets(tsRes.value.sheets    ?? []);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const today              = new Date().toISOString().split("T")[0];
  const todayAtt           = attendance.filter(a => a.date === today && !a.isManual);
  const myTasks            = tasks.filter(t => t.assignedBy?._id === (currentUser as any)?._id || t.assignedBy?._id === currentUser?.id);
  const teamTasks          = tasks;
  const pendingApprovals   = leaves.filter(l => l.status === "pending_manager");
  const myProjects         = projects;
  const pendingTimesheets  = timesheets.filter(t => t.status === "pending");

  const taskProgress = [
    { name: "Pending",     value: teamTasks.filter(t => t.status === "pending").length     },
    { name: "In Progress", value: teamTasks.filter(t => t.status === "in-progress").length },
    { name: "Completed",   value: teamTasks.filter(t => t.status === "completed").length   },
  ];

  const projectBudget = myProjects.slice(0, 5).map(p => ({
    name:   p.name?.substring(0, 12),
    budget: p.budget / 1000,
    spent:  p.spent  / 1000,
  }));

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().split("T")[0];
    return {
      day:     d.toLocaleDateString("en-US", { weekday: "short" }),
      present: attendance.filter(a => a.date === ds && !a.isManual && a.checkIn).length,
    };
  });

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Manager Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-500">Welcome back, {currentUser?.name}</p>
        </div>
        <RefreshBtn onClick={() => { setRefreshing(true); load(); }} loading={refreshing} />
      </div>

      <Banner
        title="Team Overview — Today"
        subtitle={new Date().toLocaleDateString("en-IN", { weekday:"long", month:"long", day:"numeric" })}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <BannerTile label="Present"        value={loading ? "—" : todayAtt.filter(a => a.checkIn).length} />
          <BannerTile label="Team Tasks"     value={loading ? "—" : teamTasks.length}                       />
          <BannerTile label="Pending Leaves" value={loading ? "—" : pendingApprovals.length}                />
          <BannerTile label="Pending Sheets" value={loading ? "—" : pendingTimesheets.length}               />
        </div>
      </Banner>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Active Projects" value={loading ? "—" : myProjects.filter(p => p.status === "in-progress").length} icon={Briefcase}   color="slate"  loading={loading} />
        <StatCard title="Tasks Assigned"  value={loading ? "—" : myTasks.length}                                            icon={CheckSquare} color="slate"  loading={loading} />
        <StatCard title="Team Members"    value={loading ? "—" : new Set(attendance.map(a => a.userId?._id)).size}          icon={Users}       color="slate"  loading={loading} />
        <StatCard title="Avg Progress"    value={loading ? "—" : `${myProjects.length > 0 ? Math.round(myProjects.reduce((s,p)=>s+p.progress,0)/myProjects.length) : 0}%`} icon={TrendingUp} color="green" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Section title="Team Task Status">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={taskProgress}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#475569" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Project Budget vs Spent (₹K)">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={projectBudget}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="budget" fill="#475569" radius={4} />
              <Bar dataKey="spent"  fill="#94a3b8" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      <Section title="Attendance Trend (Last 7 Days)">
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={last7Days}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="present" stroke="#475569" strokeWidth={2} dot={{ r: 4, fill: "#475569" }} />
          </LineChart>
        </ResponsiveContainer>
      </Section>

      <Section title="Pending Leave Approvals">
        <div className="space-y-2">
          {pendingApprovals.slice(0, 5).map(l => (
            <div key={l._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{l.userId?.name || "Unknown"}</p>
                <p className="text-xs text-gray-500 truncate">{l.type} · {l.startDate} → {l.endDate}</p>
              </div>
              <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">{l.priority}</span>
            </div>
          ))}
          {pendingApprovals.length === 0 && <p className="text-center text-sm text-gray-400 py-4">No pending approvals</p>}
        </div>
      </Section>
    </div>
  );
}

/* ======================================================================
   HR DASHBOARD
   ====================================================================== */
function HRDashboard() {
  const { currentUser } = useAuth();
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [allLeaves,  setAllLeaves]  = useState<any[]>([]);
  const [pending,    setPending]    = useState<any[]>([]);
  const [onboarding, setOnboarding] = useState<any[]>([]);
  const [payroll,    setPayroll]    = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const [attRes, leavesRes, pendRes, onbRes, payRes] = await Promise.allSettled([
        attendanceApi.getAll(), leaveApi.getAll(), leaveApi.getPending(),
        onboardingApi.getAll(), payrollApi.getAll(),
      ]);
      if (attRes.status    === "fulfilled") setAttendance(attRes.value.records  ?? []);
      if (leavesRes.status === "fulfilled") setAllLeaves(leavesRes.value.leaves ?? []);
      if (pendRes.status   === "fulfilled") setPending(pendRes.value.leaves     ?? []);
      if (onbRes.status    === "fulfilled") setOnboarding((onbRes.value.onboarding ?? []).filter((o: any) => o.userId));
      if (payRes.status    === "fulfilled") setPayroll(payRes.value.records     ?? []);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const today           = new Date().toISOString().split("T")[0];
  const todayAtt        = attendance.filter(a => a.date === today && !a.isManual);
  const totalStaff      = new Set(attendance.map(a => a.userId?._id)).size;
  const pendingHR       = pending.filter(l => l.status === "pending_hr");
  const activeEmployees = onboarding.filter(o => o.userId?.isActive).length;
  const approvedLeaves  = allLeaves.filter(l => l.status === "approved").length;
  const rejectedLeaves  = allLeaves.filter(l => l.status === "rejected").length;

  const leaveStatusData = [
    { name: "Approved", value: approvedLeaves },
    { name: "Pending",  value: pending.length },
    { name: "Rejected", value: rejectedLeaves },
  ].filter(d => d.value > 0);

  const attLast7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().split("T")[0];
    const dayAtt = attendance.filter(a => a.date === ds && !a.isManual);
    return {
      day:  d.toLocaleDateString("en-US", { weekday: "short" }),
      rate: totalStaff > 0 ? Math.round((dayAtt.filter(a => a.checkIn).length / totalStaff) * 100) : 0,
    };
  });

  const payrollStatus = [
    { name: "Paid",      value: payroll.filter(p => p.status === "paid").length      },
    { name: "Processed", value: payroll.filter(p => p.status === "processed").length },
    { name: "Pending",   value: payroll.filter(p => ["pending","draft"].includes(p.status)).length },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">HR Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-500">Welcome, {currentUser?.name}</p>
        </div>
        <RefreshBtn onClick={() => { setRefreshing(true); load(); }} loading={refreshing} />
      </div>

      <Banner title="HR Operations Summary">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <BannerTile label="Active Employees" value={loading ? "—" : activeEmployees}                                            />
          <BannerTile label="Present Today"    value={loading ? "—" : todayAtt.filter(a => a.checkIn).length}                    />
          <BannerTile label="Pending (HR)"     value={loading ? "—" : pendingHR.length}                                          />
          <BannerTile label="Onboarding"       value={loading ? "—" : onboarding.filter(o => o.status === "in-progress").length} />
        </div>
      </Banner>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Leave Requests"  value={loading ? "—" : allLeaves.length}  icon={Calendar}    color="slate"  loading={loading} />
        <StatCard title="Approved Leaves" value={loading ? "—" : approvedLeaves}    icon={CheckCircle2} color="green" loading={loading} />
        <StatCard title="Payroll Records" value={loading ? "—" : payroll.length}    icon={DollarSign}  color="slate"  loading={loading} />
        <StatCard title="Total Staff"     value={loading ? "—" : totalStaff}        icon={Users}       color="slate"  loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Section title="Attendance Rate (Last 7 Days)">
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={attLast7}>
              <defs>
                <linearGradient id="gradRate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#475569" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#475569" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v: any) => `${v}%`} />
              <Area type="monotone" dataKey="rate" stroke="#475569" fill="url(#gradRate)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Leave Status Breakdown">
          <div className="flex items-center justify-center gap-4 sm:gap-6 flex-wrap sm:flex-nowrap">
            <ResponsiveContainer width="55%" height={190}>
              <PieChart>
                <Pie data={leaveStatusData} dataKey="value" outerRadius={75} innerRadius={38} paddingAngle={4}>
                  {leaveStatusData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 text-sm">
              {leaveStatusData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i] }} />
                  <span className="text-gray-600">{d.name}</span>
                  <span className="font-semibold ml-auto pl-3">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Section title="Payroll Status">
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={payrollStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#475569" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Pending Leave Approvals (HR Queue)">
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {pendingHR.slice(0, 8).map(l => (
              <div key={l._id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{l.userId?.name || "Unknown"}</p>
                  <p className="text-xs text-gray-500 truncate">{l.type} · {l.startDate}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2 ${
                  l.priority === "high" ? "bg-red-100 text-red-700" : "bg-slate-200 text-slate-700"
                }`}>{l.priority}</span>
              </div>
            ))}
            {pendingHR.length === 0 && <p className="text-center text-sm text-gray-400 py-6">No pending HR approvals</p>}
          </div>
        </Section>
      </div>
    </div>
  );
}

/* ======================================================================
   EMPLOYEE DASHBOARD
   ====================================================================== */
function EmployeeDashboardNew() {
  const { currentUser } = useAuth();
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayRec,   setTodayRec]   = useState<any>(null);
  const [myRecords,  setMyRecords]  = useState<any[]>([]);
  const [myLeaves,   setMyLeaves]   = useState<any[]>([]);
  const [myTasks,    setMyTasks]    = useState<any[]>([]);
  const [mySheets,   setMySheets]   = useState<any[]>([]);
  const [myTickets,  setMyTickets]  = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const [todayRes, myAttRes, leavesRes, tasksRes, sheetsRes, ticketsRes] = await Promise.allSettled([
        attendanceApi.getToday(), attendanceApi.getMy(), leaveApi.getMy(),
        taskApi.getMy(), timesheetApi.getMy(), helpdeskApi.getMy(),
      ]);
      if (todayRes.status   === "fulfilled") setTodayRec(todayRes.value.record    ?? null);
      if (myAttRes.status   === "fulfilled") setMyRecords(myAttRes.value.records  ?? []);
      if (leavesRes.status  === "fulfilled") setMyLeaves(leavesRes.value.leaves   ?? []);
      if (tasksRes.status   === "fulfilled") setMyTasks(tasksRes.value.tasks      ?? []);
      if (sheetsRes.status  === "fulfilled") setMySheets(sheetsRes.value.sheets   ?? []);
      if (ticketsRes.status === "fulfilled") setMyTickets(ticketsRes.value.tickets ?? []);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const now          = new Date();
  const monthStart   = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthRecords = myRecords.filter(r => new Date(r.date) >= monthStart);
  const workingDays  = now.getDate();
  const attRate      = workingDays > 0 ? Math.min(Math.round((monthRecords.length / workingDays) * 100), 100) : 0;

  const pendingTasks   = myTasks.filter(t => t.status === "pending").length;
  const inProgTasks    = myTasks.filter(t => t.status === "in-progress").length;
  const doneTasks      = myTasks.filter(t => t.status === "completed").length;
  const totalHours     = mySheets.reduce((s, t) => s + (t.hours || 0), 0);
  const approvedLeaves = myLeaves.filter(l => l.status === "approved").length;
  const openTickets    = myTickets.filter(t => t.status === "open").length;

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d  = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().split("T")[0];
    const rec = myRecords.find(r => r.date === ds);
    return {
      day:     d.toLocaleDateString("en-US", { weekday: "short" }),
      present: rec ? 1 : 0,
    };
  });

  const taskData = [
    { name: "Pending",     value: pendingTasks },
    { name: "In Progress", value: inProgTasks  },
    { name: "Done",        value: doneTasks    },
  ].filter(d => d.value > 0);

  const leaveTypeData = ["Sick Leave","Casual Leave","Earned Leave","Emergency Leave"].map(type => ({
    name:  type.replace(" Leave", ""),
    count: myLeaves.filter(l => l.type === type).length,
  })).filter(d => d.count > 0);

  const statusIcon = todayRec?.checkOut ? "✓ Done" : todayRec?.checkIn ? "● Active" : "Absent";

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">My Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-500">Welcome back, {currentUser?.name}</p>
        </div>
        <RefreshBtn onClick={() => { setRefreshing(true); load(); }} loading={refreshing} />
      </div>

      {/* Personal banner — slate themed */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-5 sm:p-6 text-white">
        <div className="flex items-start sm:items-center justify-between mb-5 gap-3 flex-wrap">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/15 flex items-center justify-center text-xl sm:text-2xl font-bold flex-shrink-0">
              {currentUser?.name?.charAt(0)}
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold truncate">{currentUser?.name}</h2>
              <p className="text-slate-400 text-xs sm:text-sm capitalize truncate">
                {currentUser?.role} · {currentUser?.email}
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-slate-400 text-xs">This Month</p>
            <p className="text-3xl font-bold">{attRate}%</p>
            <p className="text-slate-400 text-xs">Attendance</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: "Check In",  value: todayRec?.checkIn  || "—", mono: true },
            { label: "Check Out", value: todayRec?.checkOut || "—", mono: true },
            { label: "Status",    value: statusIcon,                 mono: false },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-xl p-2.5 sm:p-3 text-center">
              <p className={`text-base sm:text-lg font-bold ${s.mono ? "font-mono" : ""} capitalize truncate`}>{s.value}</p>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard title="Attendance"      value={`${attRate}%`}                   icon={Activity}    color="slate"  loading={loading} />
        <StatCard title="My Tasks"        value={myTasks.length}                  icon={CheckSquare} color="slate"  loading={loading} />
        <StatCard title="Hours Logged"    value={`${totalHours.toFixed(0)}h`}     icon={Clock}       color="slate"  loading={loading} />
        <StatCard title="Approved Leaves" value={approvedLeaves}                  icon={Calendar}    color="green"  loading={loading} />
        <StatCard title="Open Tickets"    value={openTickets}                     icon={TicketCheck} color="red"    loading={loading} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Section title="My Attendance (Last 7 Days)">
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={last7Days}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0,1]} tickFormatter={v => v === 1 ? "Present" : "Absent"} />
              <Tooltip formatter={(v: any) => v === 1 ? "Present" : "Absent"} />
              <Bar dataKey="present" fill="#475569" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section title="My Tasks">
          {taskData.length > 0 ? (
            <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
              <ResponsiveContainer width="60%" height={190}>
                <PieChart>
                  <Pie data={taskData} dataKey="value" outerRadius={75} innerRadius={38} paddingAngle={4}>
                    {taskData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 text-sm">
                {taskData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i] }} />
                    <span className="text-gray-600">{d.name}</span>
                    <span className="font-bold ml-auto pl-3">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 text-sm py-12">No tasks assigned</div>
          )}
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Section title="My Leave History">
          {leaveTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={leaveTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#64748b" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-400 text-sm py-8">No leave records</p>
          )}
        </Section>

        <Section title="Recent Tasks">
          <div className="space-y-2 max-h-[180px] overflow-y-auto">
            {myTasks.slice(0, 6).map(t => (
              <div key={t._id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    t.status === "completed"  ? "bg-slate-600" :
                    t.status === "in-progress"? "bg-slate-400" : "bg-gray-300"
                  }`} />
                  <p className="text-sm text-gray-700 truncate">{t.title}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2 ${
                  t.priority === "high"   ? "bg-red-100 text-red-700"       :
                  t.priority === "medium" ? "bg-yellow-100 text-yellow-700" :
                                            "bg-slate-100 text-slate-600"
                }`}>{t.priority}</span>
              </div>
            ))}
            {myTasks.length === 0 && <p className="text-center text-gray-400 text-sm py-6">No tasks assigned</p>}
          </div>
        </Section>
      </div>

      <Section title="My Leave Requests">
        <div className="space-y-2">
          {myLeaves.slice(0, 5).map(l => (
            <div key={l._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{l.type}</p>
                <p className="text-xs text-gray-500 truncate">{l.startDate} → {l.endDate} · {l.days}d</p>
              </div>
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium flex-shrink-0 ml-2 ${
                l.status === "approved" || l.status === "emergency_approved" ? "bg-green-100 text-green-700" :
                l.status === "rejected"  ? "bg-red-100 text-red-700"  :
                                           "bg-slate-100 text-slate-700"
              }`}>{l.status?.replace(/_/g, " ")}</span>
            </div>
          ))}
          {myLeaves.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No leave requests</p>}
        </div>
      </Section>
    </div>
  );
}

/* ======================================================================
   ROOT
   ====================================================================== */
export default function RoleBasedDashboard() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;
  switch (currentUser.role) {
    case "admin":    return <AdminDashboard />;
    case "manager":  return <ManagerDashboard />;
    case "hr":       return <HRDashboard />;
    case "employee": return <EmployeeDashboardNew />;
    default:         return <AdminDashboard />;
  }
}
