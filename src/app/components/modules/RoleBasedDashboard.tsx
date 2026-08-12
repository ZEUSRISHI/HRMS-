// src/app/components/modules/RoleBasedDashboard.tsx

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  attendanceApi, leaveApi, taskApi, payrollApi,
  projectApi, helpdeskApi, timesheetApi, onboardingApi, calendarApi,
  userManagementApi,
} from "@/services/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList,
  AreaChart, Area, ComposedChart, Line, Legend,
} from "recharts";
import {
  Users, Clock, CheckSquare, DollarSign, TrendingUp, Calendar, Briefcase,
  TicketCheck, RefreshCw, ArrowUpRight, FileUp, CalendarCheck, FileDown,
  UserPlus, ClipboardCheck, PartyPopper, CalendarDays, Target, Bell,
  AlertTriangle, CheckCircle2, Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import type { ModuleType } from "../../App";

/* ======================================================================
   DESIGN TOKENS
   ====================================================================== */
import {
  PAGE_BG, CARD, TILE_PINK, TILE_PEACH, TILE_BLUE, TILE_MINT, TILE_ROSE, BAR_COLOR,
} from "../../../styles/moduleTheme";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

interface NavProps { onNavigate?: (m: ModuleType) => void; }

/* ======================================================================
   HELPERS — shared across role views
   ====================================================================== */

// Matches a user record to "reports to currentUser", trying multiple
// possible field shapes since the exact backend field name for the
// manager relationship isn't confirmed. Adjust this if your User schema
// uses a different field (e.g. managerId instead of reportingManager).
function reportsToUser(u: any, currentUser: any): boolean {
  if (!u || !currentUser) return false;
  const mgrField = u.reportingManager ?? u.managerId ?? u.reportsTo;
  if (!mgrField) return false;
  if (typeof mgrField === "object") {
    return mgrField._id === currentUser._id || mgrField.name === currentUser.name;
  }
  return mgrField === currentUser._id || mgrField === currentUser.name;
}

function parseTimeToMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const clean = t.trim().toUpperCase();
  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!match) return null;
  let [, hh, mm, ampm] = match;
  let h = parseInt(hh, 10);
  const m = parseInt(mm, 10);
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

function computeOwnAttendance(myRecords: any[], myManual: any[], todayRec: any) {
  const combinedMap = new Map<string, any>();
  myRecords.forEach(r => combinedMap.set(r.date, r));
  myManual.forEach(r => combinedMap.set(r.date, r));
  const combined = Array.from(combinedMap.values());

  const now = new Date();
  const todayDate = format(now, "yyyy-MM-dd");
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthRecords = combined.filter(r => new Date(r.date) >= monthStart);

  let workingDaysInMonthSoFar = 0;
  {
    const cursor = new Date(now.getFullYear(), now.getMonth(), 1);
    while (cursor <= now) {
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) workingDaysInMonthSoFar++;
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const presentDaysThisMonth = monthRecords.filter(r => !!r?.checkIn).length;
  const attRate = workingDaysInMonthSoFar > 0
    ? Math.min(Math.round((presentDaysThisMonth / workingDaysInMonthSoFar) * 100), 100)
    : 0;

  const totalHoursToday = (() => {
    const todayRecord = combined.find(r => r.date === todayDate) || todayRec;
    if (!todayRecord?.checkIn) return 0;
    const inMin = parseTimeToMinutes(todayRecord.checkIn);
    if (inMin === null) return 0;
    let outMin: number;
    if (todayRecord.checkOut) {
      const parsedOut = parseTimeToMinutes(todayRecord.checkOut);
      if (parsedOut === null) return 0;
      outMin = parsedOut;
    } else {
      outMin = now.getHours() * 60 + now.getMinutes();
    }
    let mins = outMin - inMin;
    if (mins < 0) mins += 24 * 60;
    return mins / 60;
  })();

  const last5Months = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (4 - i));
    const label = d.toLocaleDateString("en-US", { month: "short" });
    const y = d.getFullYear(), m = d.getMonth();
    const daysInThatMonth = new Date(y, m + 1, 0).getDate();
    let workingDays = 0;
    for (let day = 1; day <= daysInThatMonth; day++) {
      const dt = new Date(y, m, day);
      if (dt > now) break;
      if (dt.getDay() !== 0 && dt.getDay() !== 6) workingDays++;
    }
    const value = combined.filter(r => {
      const rd = new Date(r.date);
      return rd.getFullYear() === y && rd.getMonth() === m && r.checkIn;
    }).length;
    const total = Math.max(workingDays, value, 1);
    const rate = Math.round((value / total) * 100);
    return { label, value, total, rate };
  });

  return { combined, attRate, totalHoursToday, last5Months };
}

/* ======================================================================
   NAVIGATION HELPER (fixes "not redirecting" issue)
   ------------------------------------------------------------------
   All QuickAction / clickable cards MUST call this instead of calling
   onNavigate directly with a bare string literal. This guarantees the
   value always matches a real ModuleType, logs a clear console warning
   if onNavigate was never passed down (the most common real-world cause
   of "clicking does nothing"), and prevents silent no-ops.
   ====================================================================== */
function safeNavigate(onNavigate: ((m: ModuleType) => void) | undefined, target: ModuleType) {
  if (typeof onNavigate !== "function") {
    // This fires if RoleBasedDashboard was rendered without onNavigate
    // being passed all the way down from App.tsx -> renderModule().
    console.warn(
      `[RoleBasedDashboard] onNavigate is not defined — cannot navigate to "${target}". ` +
      `Make sure <RoleBasedDashboard onNavigate={setActiveModule} /> is used in App.tsx.`
    );
    return;
  }
  onNavigate(target);
}

/* ======================================================================
   SHARED PRIMITIVES
   ====================================================================== */
function QuickAction({
  icon: Icon, title, subtitle, bg, onClick,
}: { icon: any; title: string; subtitle: string; bg: string; onClick?: () => void }) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`relative rounded-[28px] p-5 sm:p-6 ${bg} overflow-hidden ${onClick ? "cursor-pointer active:scale-[0.98] transition-transform hover:brightness-[0.98] select-none" : ""}`}
      style={onClick ? { pointerEvents: "auto" } : undefined}
    >
      <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center mb-7 sm:mb-8 shadow-sm">
        <Icon size={20} className="text-gray-800" />
      </div>
      <div
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        className="absolute top-5 right-5 w-9 h-9 rounded-full bg-[#14110F] flex items-center justify-center"
      >
        <ArrowUpRight size={16} className="text-white" />
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-gray-600 leading-snug max-w-[220px]">{subtitle}</p>
    </div>
  );
}

function StatTile({ value, label, bg, loading }: { value: string | number; label: string; bg: string; loading?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 sm:p-5 text-center ${bg}`}>
      {loading
        ? <div className="h-8 w-12 bg-white/50 rounded mx-auto animate-pulse" />
        : <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>}
      <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-tight">{label}</p>
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={`${CARD} p-5 sm:p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function AlertCard({
  title, subtitle, tone = "default", icon: Icon,
}: { title: string; subtitle: string; tone?: "default" | "success" | "warning" | "info"; icon?: any }) {
  const box = {
    default: "bg-[#FAF8F3] border border-[#EDE7DA]",
    success: "bg-[#E5F6EC] border border-[#BFE7CE]",
    warning: "bg-[#FDF1DC] border border-[#F6DDA8]",
    info:    "bg-[#EAF0FD] border border-[#C9DAF8]",
  }[tone];
  const titleColor = { default: "text-gray-900", success: "text-emerald-700", warning: "text-amber-700", info: "text-blue-700" }[tone];
  const subColor   = { default: "text-gray-500", success: "text-emerald-600", warning: "text-amber-600", info: "text-blue-600" }[tone];
  const iconBg     = { default: "bg-white", success: "bg-white", warning: "bg-white", info: "bg-white" }[tone];
  return (
    <div className={`rounded-2xl p-4 ${box} flex items-start gap-3`}>
      {Icon && (
        <div className={`w-8 h-8 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
          <Icon size={14} className={titleColor} />
        </div>
      )}
      <div className="min-w-0">
        <p className={`font-semibold text-sm ${titleColor} truncate`}>{title}</p>
        <p className={`text-xs mt-1 ${subColor}`}>{subtitle}</p>
      </div>
    </div>
  );
}

function ProgressCard({
  icon: Icon, title, description, percent, bg,
}: { icon: any; title: string; description: string; percent: number; bg: string }) {
  return (
    <div className={`rounded-[24px] p-5 ${bg}`}>
      <div className="w-10 h-10 rounded-full bg-white/70 flex items-center justify-center mb-4">
        <Icon size={18} className="text-gray-800" />
      </div>
      <h4 className="font-semibold text-gray-900 mb-2 leading-snug text-sm sm:text-base">{title}</h4>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
          <div className="h-full bg-gray-900 rounded-full transition-all" style={{ width: `${Math.min(percent, 100)}%` }} />
        </div>
        <span className="text-xs font-semibold text-gray-700">{Math.round(percent)}%</span>
      </div>
      <p className="text-xs text-gray-600 leading-snug">{description}</p>
    </div>
  );
}

function EventChip({ month, day, title, subtitle }: { month: string; day: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 bg-[#FAF8F3] border border-[#EDE7DA] rounded-2xl p-3 min-w-[220px]">
      <div className="bg-[#FBE3C4] rounded-xl px-3 py-1.5 text-center flex-shrink-0">
        <p className="text-[10px] font-semibold text-gray-600 uppercase">{month}</p>
        <p className="text-lg font-bold text-gray-900 leading-none">{day}</p>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
        <p className="text-xs text-gray-500 truncate">{subtitle}</p>
      </div>
    </div>
  );
}

function RefreshBtn({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#14110F] hover:bg-black text-white rounded-full text-xs sm:text-sm font-medium transition disabled:opacity-50 flex-shrink-0"
    >
      <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
      <span className="hidden sm:inline">{loading ? "Refreshing…" : "Refresh"}</span>
    </button>
  );
}

/* Improved bar panel — gradient fill, value labels, rounded, nicer axis */
function BarPanel({ title, data, dataKey = "value", tickFormatter, subtitle }: { title: string; data: any[]; dataKey?: string; tickFormatter?: (v: any) => string; subtitle?: string }) {
  const gradId = `barGrad-${title.replace(/\s+/g, "")}`;
  return (
    <Panel title={title}>
      {subtitle && <p className="text-xs text-gray-400 -mt-3 mb-3">{subtitle}</p>}
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} barCategoryGap="35%" margin={{ top: 20, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EEB877" />
              <stop offset="100%" stopColor="#E08A3E" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#EDE7DA" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8a8377" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#8a8377" }} axisLine={false} tickLine={false} tickFormatter={tickFormatter} allowDecimals={false} width={28} />
          <Tooltip
            cursor={{ fill: "rgba(227,154,86,0.08)" }}
            contentStyle={{ borderRadius: 12, border: "1px solid #EDE7DA", fontSize: 12 }}
          />
          <Bar dataKey={dataKey} fill={`url(#${gradId})`} radius={[10, 10, 10, 10]} maxBarSize={38}>
            <LabelList dataKey={dataKey} position="top" style={{ fontSize: 11, fill: "#6b6459", fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  );
}

/* Attendance trend for 7-day / team views — smooth area chart */
function AttendanceTrendPanel({ title, data, subtitle }: { title: string; data: { label: string; value: number; total?: number }[]; subtitle?: string }) {
  const gradId = `attGrad-${title.replace(/\s+/g, "")}`;
  const maxVal = Math.max(1, ...data.map(d => d.total ?? d.value));
  return (
    <Panel title={title}>
      {subtitle && <p className="text-xs text-gray-400 -mt-3 mb-3">{subtitle}</p>}
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 20, right: 12, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E39A56" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#E39A56" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#EDE7DA" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8a8377" }} axisLine={false} tickLine={false} />
          <YAxis
            domain={[0, maxVal]}
            tick={{ fontSize: 11, fill: "#8a8377" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={28}
          />
          <Tooltip
            cursor={{ stroke: "#E39A56", strokeWidth: 1, strokeDasharray: "4 4" }}
            contentStyle={{ borderRadius: 12, border: "1px solid #EDE7DA", fontSize: 12 }}
            formatter={(v: number, _n, item: any) => {
              const total = item?.payload?.total;
              return total ? [`${v} / ${total} present`, "Present"] : [v, "Present"];
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#E08A3E"
            strokeWidth={2.5}
            fill={`url(#${gradId})`}
            dot={{ fill: "#E08A3E", strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Panel>
  );
}

/* Redesigned "Last 5 Months" panel — cleaner combo chart:
   - Bars show days-present (left axis)
   - Line shows attendance rate % (right axis)
   - Softer gradient, rounder bars, clearer legend labels, better tooltip
   This reads far better than a raw area chart when values span both
   day-counts and percentages, and matches the rest of the UI's rounded,
   pastel aesthetic. */
function MonthlyAttendanceSummaryPanel({
  data, subtitle = "Days present vs. working days, with attendance rate",
}: { data: { label: string; value: number; total: number; rate: number }[]; subtitle?: string }) {
  const gradId = "monthlyAttGrad";
  return (
    <Panel title="Attendance Summary — Last 5 Months">
      <p className="text-xs text-gray-400 -mt-3 mb-3">{subtitle}</p>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 24, right: 16, left: -8, bottom: 0 }} barCategoryGap="30%">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F3C489" />
              <stop offset="100%" stopColor="#E08A3E" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#EDE7DA" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#8a8377", fontWeight: 500 }} axisLine={false} tickLine={false} />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "#8a8377" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={30}
            label={{ value: "Days", angle: -90, position: "insideLeft", fontSize: 10, fill: "#8a8377", offset: 10 }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#3A6EA5" }}
            axisLine={false}
            tickLine={false}
            width={38}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{ borderRadius: 14, border: "1px solid #EDE7DA", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
            formatter={(v: number, name: string, item: any) => {
              if (name === "rate") return [`${v}%`, "Attendance Rate"];
              const total = item?.payload?.total;
              return [`${v} / ${total} days`, "Days Present"];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => (value === "rate" ? "Attendance Rate" : "Days Present")}
            iconType="circle"
          />
          <Bar yAxisId="left" dataKey="value" fill={`url(#${gradId})`} radius={[10, 10, 10, 10]} maxBarSize={40} name="value">
            <LabelList dataKey="value" position="top" style={{ fontSize: 11, fill: "#6b6459", fontWeight: 700 }} />
          </Bar>
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="rate"
            stroke="#3A6EA5"
            strokeWidth={3}
            dot={{ fill: "#3A6EA5", strokeWidth: 2, stroke: "#fff", r: 5 }}
            activeDot={{ r: 7 }}
            name="rate"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Panel>
  );
}

/* ======================================================================
   SMART ALERTS BUILDER (shared across all roles)
   ====================================================================== */
type AlertItem = { key: string; title: string; subtitle: string; tone: "default" | "success" | "warning" | "info"; icon: any };

function buildSmartAlerts(opts: {
  dueSoonTasks?: any[];
  approvedLeaves?: any[];
  overdueTasks?: any[];
  criticalTickets?: number;
  highPriorityLeaves?: any[];
  onboardingInProgress?: any[];
  projectsNearDeadline?: any[];
}): AlertItem[] {
  const alerts: AlertItem[] = [];

  (opts.dueSoonTasks || []).slice(0, 2).forEach(t => {
    alerts.push({
      key: `due-${t._id}`,
      title: `Task Deadline Upcoming: ${t.title}`,
      subtitle: t.dueDate ? `Due ${format(new Date(t.dueDate), "MMM d")}` : "Due soon",
      tone: "warning",
      icon: Clock,
    });
  });

  (opts.overdueTasks || []).slice(0, 2).forEach(t => {
    alerts.push({
      key: `overdue-${t._id}`,
      title: `Overdue: ${t.title}`,
      subtitle: "Past due date — needs attention",
      tone: "warning",
      icon: AlertTriangle,
    });
  });

  (opts.approvedLeaves || []).slice(0, 2).forEach(l => {
    const approvedByManager = l.status === "emergency_approved" || l.approvedByRole === "manager";
    const approverLabel = l.approvedByRole === "hr"
      ? "HR"
      : approvedByManager
        ? "Manager"
        : "HR & Manager";
    alerts.push({
      key: `leave-${l._id}`,
      title: `Leave Approved by ${approverLabel}`,
      subtitle: `${l.userId?.name ? l.userId.name + " · " : ""}${l.type || "Leave"} · ${l.startDate} → ${l.endDate}`,
      tone: "success",
      icon: CheckCircle2,
    });
  });

  (opts.highPriorityLeaves || []).slice(0, 2).forEach(l => {
    alerts.push({
      key: `hp-leave-${l._id}`,
      title: l.userId?.name || "Employee",
      subtitle: "High-priority leave request awaiting approval",
      tone: "warning",
      icon: AlertTriangle,
    });
  });

  if (opts.criticalTickets && opts.criticalTickets > 0) {
    alerts.push({
      key: "critical-tickets",
      title: `${opts.criticalTickets} Critical Ticket${opts.criticalTickets > 1 ? "s" : ""}`,
      subtitle: "Needs immediate attention on Helpdesk",
      tone: "warning",
      icon: AlertTriangle,
    });
  }

  (opts.onboardingInProgress || []).slice(0, 2).forEach(o => {
    alerts.push({
      key: `onb-${o._id}`,
      title: o.userId?.name || "New hire",
      subtitle: "Onboarding in progress",
      tone: "info",
      icon: UserPlus,
    });
  });

  (opts.projectsNearDeadline || []).slice(0, 2).forEach(p => {
    alerts.push({
      key: `proj-${p._id}`,
      title: `Project Deadline: ${p.name}`,
      subtitle: p.endDate ? `Due ${format(new Date(p.endDate), "MMM d")}` : "Approaching deadline",
      tone: "info",
      icon: Sparkles,
    });
  });

  return alerts;
}

function SmartAlertsPanel({ alerts }: { alerts: AlertItem[] }) {
  return (
    <Panel title="Smart Alerts" action={<Bell size={16} className="text-gray-400" />}>
      <div className="space-y-2.5">
        {alerts.slice(0, 5).map(a => (
          <AlertCard key={a.key} tone={a.tone} title={a.title} subtitle={a.subtitle} icon={a.icon} />
        ))}
        {alerts.length === 0 && <p className="text-center text-gray-400 text-sm py-6">You're all caught up</p>}
      </div>
    </Panel>
  );
}

/* ======================================================================
   SHARED: Attendance/Hours/Leaves stat row (used across Manager/HR/Admin)
   ====================================================================== */
function AttendanceHoursLeavesRow({
  loading, attRate, hoursToday, leavesApproved,
}: { loading: boolean; attRate: string | number; hoursToday: string | number; leavesApproved: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
      <StatTile value={loading ? "—" : attRate}       bg={TILE_PEACH} label="Attendance (Month)" loading={loading} />
      <StatTile value={loading ? "—" : hoursToday}     bg={TILE_BLUE}  label="Hours Today"        loading={loading} />
      <StatTile value={loading ? "—" : leavesApproved} bg={TILE_ROSE}  label="Leaves Approved"    loading={loading} />
    </div>
  );
}

/* ======================================================================
   SHARED: Upcoming events fetch + filter helper
   (all roles get "new events" — i.e., events from today forward, sorted
   soonest first, deduped by _id, so nothing stale/expired shows up)
   ====================================================================== */
function getUpcomingEvents(events: any[], limit = 4) {
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
  const seen = new Set<string>();
  return events
    .filter(e => {
      if (e._id) {
        if (seen.has(e._id)) return false;
        seen.add(e._id);
      }
      return !e.date || new Date(e.date) >= startOfToday;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, limit);
}

function UpcomingEventsPanel({ events }: { events: any[] }) {
  const upcoming = getUpcomingEvents(events);
  return (
    <Panel title="Upcoming Events">
      <div className="flex gap-3 overflow-x-auto pb-1">
        {upcoming.map((e, i) => (
          <EventChip
            key={e._id || i}
            month={e.date ? new Date(e.date).toLocaleDateString("en-US", { month: "short" }).toUpperCase() : "—"}
            day={e.date ? new Date(e.date).getDate().toString() : "—"}
            title={e.title}
            subtitle={e.type || "Event"}
          />
        ))}
        {upcoming.length === 0 && <p className="text-center text-gray-400 text-sm py-4 w-full">No upcoming events</p>}
      </div>
    </Panel>
  );
}

/* ======================================================================
   EMPLOYEE DASHBOARD
   ====================================================================== */
function EmployeeDashboardView({ onNavigate }: NavProps) {
  const { currentUser } = useAuth();
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayRec, setTodayRec]     = useState<any>(null);
  const [myRecords, setMyRecords]   = useState<any[]>([]);
  const [myManual, setMyManual]     = useState<any[]>([]);
  const [myLeaves, setMyLeaves]     = useState<any[]>([]);
  const [myProjects, setMyProjects] = useState<any[]>([]);
  const [myTasks, setMyTasks]       = useState<any[]>([]);
  const [myTickets, setMyTickets]   = useState<any[]>([]);
  const [events, setEvents]         = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const [todayRes, myAttRes, manualRes, leavesRes, projRes, tasksRes, ticketsRes, evRes] =
        await Promise.allSettled([
          attendanceApi.getToday(), attendanceApi.getMy(), attendanceApi.getManualMy(),
          leaveApi.getMy(), projectApi.getMy(), taskApi.getMy(), helpdeskApi.getMy(),
          calendarApi.getEvents(),
        ]);
      if (todayRes.status  === "fulfilled") setTodayRec(todayRes.value.record ?? null);
      if (myAttRes.status  === "fulfilled") setMyRecords(myAttRes.value.records ?? []);
      if (manualRes.status === "fulfilled") setMyManual(manualRes.value.records ?? []);
      if (leavesRes.status === "fulfilled") setMyLeaves(leavesRes.value.leaves ?? []);
      if (projRes.status   === "fulfilled") setMyProjects(projRes.value.projects ?? []);
      if (tasksRes.status  === "fulfilled") setMyTasks(tasksRes.value.tasks ?? []);
      if (ticketsRes.status=== "fulfilled") setMyTickets(ticketsRes.value.tickets ?? []);
      if (evRes.status     === "fulfilled") setEvents(evRes.value.events ?? evRes.value.data ?? []);

      [todayRes, myAttRes, manualRes, leavesRes, projRes, tasksRes, ticketsRes, evRes].forEach((r, i) => {
        if (r.status === "rejected") {
          console.error(`[EmployeeDashboard] request #${i} failed:`, r.reason);
        }
      });
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const { combined, attRate, totalHoursToday, last5Months } = computeOwnAttendance(myRecords, myManual, todayRec);

  const totalLeaves     = 18;
  const usedLeaves      = myLeaves.filter(l => ["approved", "emergency_approved"].includes(l.status)).reduce((s, l) => s + (l.days || 0), 0);
  const pendingLeaves   = myLeaves.filter(l => l.status?.startsWith("pending")).length;
  const availableLeaves = Math.max(totalLeaves - usedLeaves, 0);

  const dueSoonTasks = myTasks.filter(t => t.status !== "completed" && t.dueDate && new Date(t.dueDate) > new Date())
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const overdueTasks = myTasks.filter(t => t.status !== "completed" && t.dueDate && new Date(t.dueDate) < new Date());
  const approvedLeaves = myLeaves.filter(l => l.status === "approved" || l.status === "emergency_approved")
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  const openTickets = myTickets.filter(t => t.status === "open").length;

  const projectsNearDeadline = myProjects.filter(p => p.status === "in-progress" && p.endDate && new Date(p.endDate).getTime() - Date.now() < 7 * 86400000 && new Date(p.endDate) >= new Date());

  const alerts = buildSmartAlerts({ dueSoonTasks, overdueTasks, approvedLeaves, projectsNearDeadline });

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className={`${CARD} p-6 sm:p-7`}>
        <div className="flex items-center justify-between gap-3 mb-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{getGreeting()}, {currentUser?.name?.split(" ")[0]}!</h1>
          <RefreshBtn onClick={() => { setRefreshing(true); load(); }} loading={refreshing} />
        </div>
        <p className="text-xs sm:text-sm text-gray-500 mb-6">Here's a quick overview of your workday and pending activities.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickAction icon={FileUp} bg={TILE_PINK} title="Apply Leave" subtitle="Request casual, sick, or planned leave in just a few clicks." onClick={() => safeNavigate(onNavigate, "leave")} />
          <QuickAction icon={CalendarCheck} bg={TILE_PEACH} title="Mark attendance" subtitle="Clock in and update today's attendance status instantly." onClick={() => safeNavigate(onNavigate, "attendance")} />
          <QuickAction icon={FileDown} bg={TILE_BLUE} title="Download payslip" subtitle="Access and download your latest salary slips securely." onClick={() => safeNavigate(onNavigate, "payroll")} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatTile value={loading ? "—" : `${attRate}%`}                    bg={TILE_PEACH} label="Attendance (Month)" loading={loading} />
        <StatTile value={loading ? "—" : `${totalHoursToday.toFixed(1)}h`} bg={TILE_BLUE}  label="Hours Today"        loading={loading} />
        <StatTile value={loading ? "—" : usedLeaves}                       bg={TILE_ROSE}  label="Leaves Used"        loading={loading} />
        <StatTile value={loading ? "—" : myTasks.length}                   bg={TILE_MINT}  label="My Tasks"           loading={loading} />
        <StatTile value={loading ? "—" : openTickets}                      bg={TILE_PINK}  label="Open Tickets"       loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className={`${CARD} p-5 sm:p-6 lg:col-span-2`}>
          <h3 className="font-semibold text-gray-900 mb-1">Leave balance</h3>
          <p className="text-xs text-gray-500 mb-4">{new Date().getFullYear()} Annual Leave Overview</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile value={loading ? "—" : totalLeaves}     label="Total Leaves"     bg={TILE_PEACH} loading={loading} />
            <StatTile value={loading ? "—" : availableLeaves} label="Available"        bg={TILE_MINT}  loading={loading} />
            <StatTile value={loading ? "—" : usedLeaves}      label="Used"             bg={TILE_BLUE}  loading={loading} />
            <StatTile value={loading ? "—" : pendingLeaves.toString().padStart(2, "0")} label="Pending Approval" bg={TILE_ROSE} loading={loading} />
          </div>
        </div>

        <SmartAlertsPanel alerts={alerts} />
      </div>

      <MonthlyAttendanceSummaryPanel data={last5Months} />

      <div>
        <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base px-1">My Project Progress</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {myProjects.slice(0, 3).map((p, i) => (
            <ProgressCard
              key={p._id}
              icon={Briefcase}
              title={p.name}
              description={p.description?.slice(0, 60) || "Active project"}
              percent={p.progress || 0}
              bg={[TILE_PINK, TILE_BLUE, TILE_MINT][i % 3]}
            />
          ))}
          {myProjects.length === 0 && <p className="text-center text-gray-400 text-sm py-8 col-span-3">No active projects</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Panel title="My Recent Tickets">
          <div className="space-y-2">
            {myTickets.slice(0, 4).map(t => (
              <div key={t._id} className="flex items-center justify-between p-3 bg-[#FAF8F3] border border-[#EDE7DA] rounded-xl">
                <p className="text-sm text-gray-800 truncate">{t.title}</p>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded-full font-medium text-gray-600 flex-shrink-0 ml-2">{t.status}</span>
              </div>
            ))}
            {myTickets.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No tickets raised</p>}
          </div>
        </Panel>

        <UpcomingEventsPanel events={events} />
      </div>
    </div>
  );
}

/* ======================================================================
   MANAGER DASHBOARD
   ====================================================================== */
function ManagerDashboardView({ onNavigate }: NavProps) {
  const { currentUser } = useAuth();
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [tasks, setTasks]           = useState<any[]>([]);
  const [projects, setProjects]     = useState<any[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [approvedLeaves, setApprovedLeaves] = useState<any[]>([]);
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [events, setEvents]         = useState<any[]>([]);
  const [allUsers, setAllUsers]     = useState<any[]>([]);
  const [myRecords, setMyRecords]   = useState<any[]>([]);
  const [myManual, setMyManual]     = useState<any[]>([]);
  const [todayRec, setTodayRec]     = useState<any>(null);

  const [orgUserCount, setOrgUserCount] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      // FIX: calendarApi.getAll() is admin-only per CalendarModule.tsx —
      // Manager/HR must call calendarApi.getEvents() instead, or the
      // request 403s and Upcoming Events silently stays empty.
      const [attRes, tasksRes, projRes, pendingRes, allLeavesRes, tsRes, evRes, usersRes, myAttRes, manualRes, todayRes, statsRes] = await Promise.allSettled([
        attendanceApi.getAll(), taskApi.getAll(), projectApi.getAll(),
        leaveApi.getPending(), leaveApi.getAll(), timesheetApi.getAll(), calendarApi.getEvents(),
        attendanceApi.getUsersList(), attendanceApi.getMy(), attendanceApi.getManualMy(), attendanceApi.getToday(),
        userManagementApi.getStats(),
      ]);
      if (attRes.status    === "fulfilled") setAttendance(attRes.value.records ?? []);
      if (tasksRes.status  === "fulfilled") setTasks(tasksRes.value.tasks ?? []);
      if (projRes.status   === "fulfilled") setProjects(projRes.value.projects ?? []);
      // FIX: leaveApi.getPending() already returns leaves that are pending;
      // the backend uses different "pending_*" statuses per approver stage.
      // We keep both pending_manager AND generic "pending" so managers
      // actually see requests instead of an empty/zero list.
      if (pendingRes.status === "fulfilled") {
        const raw = pendingRes.value.leaves ?? [];
        setPendingLeaves(raw.filter((l: any) =>
          l.status === "pending_manager" || l.status === "pending"
        ));
      }
      if (allLeavesRes.status === "fulfilled") setApprovedLeaves((allLeavesRes.value.leaves ?? []).filter((l: any) => l.status === "approved" || l.status === "emergency_approved"));
      if (tsRes.status     === "fulfilled") setTimesheets(tsRes.value.sheets ?? []);
      if (evRes.status     === "fulfilled") setEvents(evRes.value.events ?? evRes.value.data ?? []);
      if (usersRes.status  === "fulfilled") setAllUsers(usersRes.value.users ?? []);
      if (myAttRes.status  === "fulfilled") setMyRecords(myAttRes.value.records ?? []);
      if (manualRes.status === "fulfilled") setMyManual(manualRes.value.records ?? []);
      if (todayRes.status  === "fulfilled") setTodayRec(todayRes.value.record ?? null);
      // FIX: "Total Users" was wrong because attendanceApi.getUsersList()
      // may scope results per-role on the backend. userManagementApi.getStats()
      // is the same source Admin/HR dashboards use for their user counts,
      // so this guarantees the number always matches the real org total.
      if (statsRes.status  === "fulfilled") setOrgUserCount(statsRes.value.stats?.total ?? null);

      [attRes, tasksRes, projRes, pendingRes, allLeavesRes, tsRes, evRes, usersRes, myAttRes, manualRes, todayRes, statsRes].forEach((r, i) => {
        if (r.status === "rejected") console.error(`[ManagerDashboard] request #${i} failed:`, r.reason);
      });
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const today = new Date().toISOString().split("T")[0];

  // FIX: "Team Members" showed wrong count because reportsToUser() silently
  // returns 0 matches whenever the backend's User schema doesn't populate
  // reportingManager/managerId/reportsTo. Per your request, Manager
  // dashboard should show *total user count* here instead of a
  // hierarchy-dependent "my direct reports" count.
  // Prefer orgUserCount (userManagementApi.getStats — same source as
  // Admin/HR) since attendanceApi.getUsersList() may return a
  // role-scoped subset for non-admin callers, which was the actual cause
  // of the wrong number here.
  const totalUserCount = orgUserCount ?? allUsers.length;

  // Still compute team-scoped views (tasks/projects/leaves) using the
  // best-effort reportsToUser match where it's available; if it matches
  // nobody, gracefully fall back to org-wide data so the dashboard doesn't
  // look empty/broken.
  const teamUsers = allUsers.filter(u => reportsToUser(u, currentUser));
  const teamUserIds = new Set(
    teamUsers.length > 0 ? teamUsers.map(u => u._id) : allUsers.map(u => u._id)
  );

  // FIX: "Present Today" now correctly = how many users (org-wide) checked
  // in today, counting BOTH normal check-ins and admin-added manual
  // attendance, de-duplicated by user. This intentionally matches the
  // "Total Users" scope above rather than the fragile teamUserIds set.
  const presentTodaySet = new Set(
    attendance
      .filter(a => a.date === today && a.checkIn)
      .map(a => a.userId?._id ?? a.userId)
  );
  const presentToday = presentTodaySet.size;

  const teamTasks = tasks.filter(t => teamUserIds.has(t.assignedTo?._id ?? t.assignedTo));

  // FIX: previously, when reportsToUser() matched nobody, teamUserIds
  // silently fell back to *every* user, so "Active Projects" quietly
  // became org-wide while still labeled as the manager's own. That
  // produced numbers that looked "wrong" because they didn't match what
  // the manager expected to see for their team. We now track whether the
  // fallback happened so downstream logic/labels can react to it if needed,
  // and — more importantly — a project counts as the manager's project if
  // the manager IS its manager/owner, regardless of member-list matching,
  // which is the most reliable signal on most schemas.
  const hasRealTeamMatch = teamUsers.length > 0;
  const teamProjects = projects.filter(p => {
    const projectManagerId = p.managerId?._id ?? p.managerId;
    const isOwnedByThisManager = projectManagerId === currentUser?._id;
    const hasTeamMember = (p.members || []).some((m: any) => teamUserIds.has(m._id ?? m));
    return isOwnedByThisManager || (hasRealTeamMatch && hasTeamMember) || !hasRealTeamMatch;
  });

  // FIX: "Active Projects" was undercounting because status strings vary
  // a lot in practice ("Active", "On Track", "In Progress", "planning"
  // being miscounted, etc). Broaden matching to catch common variants
  // while still explicitly excluding completed/cancelled/on-hold states.
  const isActiveStatus = (s: any) => {
    const v = String(s || "").toLowerCase().replace(/[\s_-]/g, "");
    if (["completed", "done", "cancelled", "canceled", "onhold", "archived"].includes(v)) return false;
    if (!v) return false; // no status set — don't count as active
    return v === "inprogress" || v === "active" || v === "ongoing" || v === "ontrack" || v === "started";
  };
  const activeProjects = teamProjects.filter(p => isActiveStatus(p.status));

  const teamPendingLeaves = pendingLeaves.filter(l => teamUserIds.has(l.userId?._id ?? l.userId));
  const teamApprovedLeaves = approvedLeaves.filter(l => teamUserIds.has(l.userId?._id ?? l.userId));

  const pendingTimesheets = timesheets.filter(t => t.status === "pending" && teamUserIds.has(t.userId?._id ?? t.userId));

  // FIX: "Total user Attendance — Last 7 Days" now counts unique users
  // present per day across the whole org, including manual records, and
  // uses totalUserCount (from userManagementApi.getStats) as the "total"
  // denominator so the graph's percentage/scale matches the "Total Users"
  // stat tile above instead of the fragile team-matched set.
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().split("T")[0];
    const presentSet = new Set(
      attendance
        .filter(a => a.date === ds && a.checkIn)
        .map(a => a.userId?._id ?? a.userId)
    );
    return { label: d.toLocaleDateString("en-US", { weekday: "short" }), value: presentSet.size, total: totalUserCount };
  });

  const overdueTasks = teamTasks.filter(t => t.status !== "completed" && t.dueDate && new Date(t.dueDate) < new Date());
  const dueSoonTasks = teamTasks.filter(t => t.status !== "completed" && t.dueDate && new Date(t.dueDate) > new Date())
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const projectsNearDeadline = teamProjects.filter(p => isActiveStatus(p.status) && p.endDate && new Date(p.endDate).getTime() - Date.now() < 7 * 86400000 && new Date(p.endDate) >= new Date());

  const alerts = buildSmartAlerts({ overdueTasks, dueSoonTasks, approvedLeaves: teamApprovedLeaves, projectsNearDeadline });

  // Manager's own attendance stats
  const { attRate, totalHoursToday } = computeOwnAttendance(myRecords, myManual, todayRec);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className={`${CARD} p-6 sm:p-7`}>
        <div className="flex items-center justify-between gap-3 mb-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{getGreeting()}, {currentUser?.name?.split(" ")[0]}!</h1>
          <RefreshBtn onClick={() => { setRefreshing(true); load(); }} loading={refreshing} />
        </div>
        <p className="text-xs sm:text-sm text-gray-500 mb-6">Here's how your team is doing today.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickAction
            icon={FileUp}
            bg={TILE_PINK}
            title="Approve Leave"
            subtitle={`${teamPendingLeaves.length} request${teamPendingLeaves.length === 1 ? "" : "s"} waiting on your review.`}
            onClick={() => safeNavigate(onNavigate, "leave")}
          />
          <QuickAction icon={ClipboardCheck} bg={TILE_PEACH} title="Assign Task" subtitle="Create and assign a new task to your team." onClick={() => safeNavigate(onNavigate, "tasks")} />
          <QuickAction icon={Clock} bg={TILE_BLUE} title="Review Timesheets" subtitle={`${pendingTimesheets.length} timesheets pending approval.`} onClick={() => safeNavigate(onNavigate, "time-tracking")} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatTile value={loading ? "—" : totalUserCount}          bg={TILE_PEACH} label="Total Users"        loading={loading} />
        <StatTile value={loading ? "—" : presentToday}            bg={TILE_MINT}  label="Present Today"      loading={loading} />
        <StatTile value={loading ? "—" : activeProjects.length}   bg={TILE_BLUE}  label="Active Projects"    loading={loading} />
        <StatTile value={loading ? "—" : teamPendingLeaves.length} bg={TILE_ROSE}  label="Pending Approvals"  loading={loading} />
      </div>

      <AttendanceHoursLeavesRow
        loading={loading}
        attRate={`${attRate}%`}
        hoursToday={`${totalHoursToday.toFixed(1)}h`}
        leavesApproved={teamApprovedLeaves.length}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <AttendanceTrendPanel title="Total User Attendance — Last 7 Days" subtitle="Unique users present per day" data={last7Days} />
        </div>
        <SmartAlertsPanel alerts={alerts} />
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base px-1">Project Progress</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {activeProjects.slice(0, 3).map((p, i) => (
            <ProgressCard key={p._id} icon={Target} title={p.name} description={`₹${((p.spent||0)/1000).toFixed(0)}K of ₹${((p.budget||0)/1000).toFixed(0)}K spent`} percent={p.progress || 0} bg={[TILE_PINK, TILE_BLUE, TILE_MINT][i % 3]} />
          ))}
          {activeProjects.length === 0 && <p className="text-center text-gray-400 text-sm py-8 col-span-3">No active projects</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Panel title="Pending Leave Approvals">
          <div className="space-y-2">
            {teamPendingLeaves.slice(0, 5).map(l => (
              <div key={l._id} className="flex items-center justify-between p-3 bg-[#FAF8F3] border border-[#EDE7DA] rounded-xl">
                <div className="min-w-0"><p className="text-sm font-medium truncate">{l.userId?.name || "Unknown"}</p><p className="text-xs text-gray-500 truncate">{l.type} · {l.startDate} → {l.endDate}</p></div>
                <span className="text-xs bg-white px-2 py-0.5 rounded-full flex-shrink-0 ml-2">{l.priority}</span>
              </div>
            ))}
            {teamPendingLeaves.length === 0 && <p className="text-center text-sm text-gray-400 py-4">No pending approvals</p>}
          </div>
        </Panel>
        <UpcomingEventsPanel events={events} />
      </div>
    </div>
  );
}

/* ======================================================================
   HR DASHBOARD
   ====================================================================== */
function HRDashboardView({ onNavigate }: NavProps) {
  const { currentUser } = useAuth();
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [allLeaves, setAllLeaves]   = useState<any[]>([]);
  const [pending, setPending]       = useState<any[]>([]);
  const [onboarding, setOnboarding] = useState<any[]>([]);
  const [payroll, setPayroll]       = useState<any[]>([]);
  const [events, setEvents]         = useState<any[]>([]);
  const [allUsers, setAllUsers]     = useState<any[]>([]);
  const [myRecords, setMyRecords]   = useState<any[]>([]);
  const [myManual, setMyManual]     = useState<any[]>([]);
  const [todayRec, setTodayRec]     = useState<any>(null);

  const load = useCallback(async () => {
    try {
      // FIX: calendarApi.getAll() is admin-only per CalendarModule.tsx —
      // HR must call calendarApi.getEvents() or the request 403s silently,
      // leaving Upcoming Events permanently empty.
      const [attRes, leavesRes, pendRes, onbRes, payRes, evRes, usersRes, myAttRes, manualRes, todayRes] = await Promise.allSettled([
        attendanceApi.getAll(), leaveApi.getAll(), leaveApi.getPending(),
        onboardingApi.getAll(), payrollApi.getAll(), calendarApi.getEvents(),
        attendanceApi.getUsersList(), attendanceApi.getMy(), attendanceApi.getManualMy(), attendanceApi.getToday(),
      ]);
      if (attRes.status    === "fulfilled") setAttendance(attRes.value.records ?? []);
      if (leavesRes.status === "fulfilled") setAllLeaves(leavesRes.value.leaves ?? []);
      if (pendRes.status   === "fulfilled") {
        const raw = pendRes.value.leaves ?? [];
        setPending(raw.filter((l: any) => l.status === "pending_hr" || l.status === "pending"));
      }
      if (onbRes.status    === "fulfilled") setOnboarding((onbRes.value.onboarding ?? []).filter((o: any) => o.userId));
      if (payRes.status    === "fulfilled") setPayroll(payRes.value.records ?? []);
      if (evRes.status     === "fulfilled") setEvents(evRes.value.events ?? evRes.value.data ?? []);
      if (usersRes.status  === "fulfilled") setAllUsers(usersRes.value.users ?? []);
      if (myAttRes.status  === "fulfilled") setMyRecords(myAttRes.value.records ?? []);
      if (manualRes.status === "fulfilled") setMyManual(manualRes.value.records ?? []);
      if (todayRes.status  === "fulfilled") setTodayRec(todayRes.value.record ?? null);

      [attRes, leavesRes, pendRes, onbRes, payRes, evRes, usersRes, myAttRes, manualRes, todayRes].forEach((r, i) => {
        if (r.status === "rejected") console.error(`[HRDashboard] request #${i} failed:`, r.reason);
      });
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const today = new Date().toISOString().split("T")[0];

  // FIX: "Active Employees" -> "Active User" and fixed the count itself.
  // Previous logic silently fell back to counting distinct attendance
  // userIds when allUsers was empty, which under-counts anyone who hasn't
  // checked in yet. Now: prefer allUsers with isActive !== false; this is
  // the single source of truth and matches the "Active User" label.
  const activeUserCount = allUsers.filter(u => u.isActive !== false).length;

  // FIX: "Present Today" now dedupes by user (was previously fine, but
  // aligned here with the same logic used in Manager/Admin for consistency)
  const presentTodaySet = new Set(
    attendance.filter(a => a.date === today && a.checkIn).map(a => a.userId?._id ?? a.userId)
  );
  const presentToday = presentTodaySet.size;

  const inProgressOnboarding = onboarding.filter(o => o.status === "in-progress");
  const pendingPayroll = payroll.filter(p => ["draft", "pending"].includes(p.status)).length;
  const approvedLeaves = allLeaves.filter(l => l.status === "approved" || l.status === "emergency_approved")
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  const last5Months = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (4 - i));
    const label = d.toLocaleDateString("en-US", { month: "short" });
    const y = d.getFullYear(), m = d.getMonth();
    const monthLeaves = allLeaves.filter(l => { const ld = new Date(l.startDate); return ld.getFullYear() === y && ld.getMonth() === m; }).length;
    return { label, value: monthLeaves };
  });

  const highPriorityLeaves = pending.filter(l => l.priority === "high");
  const alerts = buildSmartAlerts({ highPriorityLeaves, onboardingInProgress: inProgressOnboarding, approvedLeaves });

  const { attRate, totalHoursToday } = computeOwnAttendance(myRecords, myManual, todayRec);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className={`${CARD} p-6 sm:p-7`}>
        <div className="flex items-center justify-between gap-3 mb-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{getGreeting()}, {currentUser?.name?.split(" ")[0]}!</h1>
          <RefreshBtn onClick={() => { setRefreshing(true); load(); }} loading={refreshing} />
        </div>
        <p className="text-xs sm:text-sm text-gray-500 mb-6">Here's your HR operations overview.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickAction icon={FileUp} bg={TILE_PINK} title="Approve Leave" subtitle={`${pending.length} requests in the HR queue.`} onClick={() => safeNavigate(onNavigate, "leave")} />
          <QuickAction icon={UserPlus} bg={TILE_PEACH} title="Start Onboarding" subtitle="Kick off onboarding for a new hire." onClick={() => safeNavigate(onNavigate, "onboarding")} />
          <QuickAction icon={DollarSign} bg={TILE_BLUE} title="Process Payroll" subtitle={`${pendingPayroll} payroll records pending.`} onClick={() => safeNavigate(onNavigate, "payroll")} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatTile value={loading ? "—" : activeUserCount}             bg={TILE_PEACH} label="Active User"        loading={loading} />
        <StatTile value={loading ? "—" : presentToday}                bg={TILE_MINT}  label="Present Today"     loading={loading} />
        <StatTile value={loading ? "—" : pending.length}              bg={TILE_ROSE}  label="Pending (HR)"      loading={loading} />
        <StatTile value={loading ? "—" : inProgressOnboarding.length} bg={TILE_BLUE}  label="Onboarding"        loading={loading} />
      </div>

      <AttendanceHoursLeavesRow
        loading={loading}
        attRate={`${attRate}%`}
        hoursToday={`${totalHoursToday.toFixed(1)}h`}
        leavesApproved={approvedLeaves.length}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2"><BarPanel title="Leave Requests — Last 5 Months" subtitle="Requests filed per month" data={last5Months} /></div>
        <SmartAlertsPanel alerts={alerts} />
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base px-1">Onboarding Progress</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {inProgressOnboarding.slice(0, 3).map((o, i) => {
            const done = o.tasks?.filter((t: any) => t.completed).length || 0;
            const total = o.tasks?.length || 1;
            return (
              <ProgressCard key={o._id} icon={UserPlus} title={o.userId?.name || "New Hire"} description={`${o.role || "Employee"} · Started ${o.startDate}`} percent={(done / total) * 100} bg={[TILE_PINK, TILE_BLUE, TILE_MINT][i % 3]} />
            );
          })}
          {inProgressOnboarding.length === 0 && <p className="text-center text-gray-400 text-sm py-8 col-span-3">No onboarding in progress</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Panel title="Pending HR Approvals">
          <div className="space-y-2 max-h-[220px] overflow-y-auto">
            {pending.slice(0, 6).map(l => (
              <div key={l._id} className="flex items-center justify-between p-2.5 bg-[#FAF8F3] border border-[#EDE7DA] rounded-lg">
                <div className="min-w-0"><p className="text-sm font-medium truncate">{l.userId?.name || "Unknown"}</p><p className="text-xs text-gray-500 truncate">{l.type} · {l.startDate}</p></div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2 ${l.priority === "high" ? "bg-[#FBDCE0] text-red-700" : "bg-white text-gray-600"}`}>{l.priority}</span>
              </div>
            ))}
            {pending.length === 0 && <p className="text-center text-sm text-gray-400 py-6">No pending HR approvals</p>}
          </div>
        </Panel>
        <UpcomingEventsPanel events={events} />
      </div>
    </div>
  );
}

/* ======================================================================
   ADMIN DASHBOARD
   ====================================================================== */
function AdminDashboardView({ onNavigate }: NavProps) {
  const { currentUser } = useAuth();
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [attendance, setAttendance]   = useState<any[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [approvedLeaves, setApprovedLeaves] = useState<any[]>([]);
  const [tasks, setTasks]             = useState<any[]>([]);
  const [payroll, setPayroll]         = useState<any[]>([]);
  const [projects, setProjects]       = useState<any[]>([]);
  const [helpdeskStats, setHelpdeskStats] = useState<any>(null);
  const [onboarding, setOnboarding]   = useState<any[]>([]);
  const [events, setEvents]           = useState<any[]>([]);
  const [allUsers, setAllUsers]       = useState<any[]>([]);
  const [myRecords, setMyRecords]     = useState<any[]>([]);
  const [myManual, setMyManual]       = useState<any[]>([]);
  const [todayRec, setTodayRec]       = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const [attRes, pendRes, allLeavesRes, tasksRes, payRes, projRes, hdStats, onbRes, evRes, usersRes, myAttRes, manualRes, todayRes] = await Promise.allSettled([
        attendanceApi.getAll(), leaveApi.getPending(), leaveApi.getAll(), taskApi.getAll(), payrollApi.getAll(),
        projectApi.getAll(), helpdeskApi.getStats(), onboardingApi.getAll(), calendarApi.getAll(),
        attendanceApi.getUsersList(), attendanceApi.getMy(), attendanceApi.getManualMy(), attendanceApi.getToday(),
      ]);
      if (attRes.status    === "fulfilled") setAttendance(attRes.value.records ?? []);
      if (pendRes.status   === "fulfilled") setPendingLeaves(pendRes.value.leaves ?? []);
      if (allLeavesRes.status === "fulfilled") setApprovedLeaves((allLeavesRes.value.leaves ?? []).filter((l: any) => l.status === "approved" || l.status === "emergency_approved"));
      if (tasksRes.status  === "fulfilled") setTasks(tasksRes.value.tasks ?? []);
      if (payRes.status    === "fulfilled") setPayroll(payRes.value.records ?? []);
      if (projRes.status   === "fulfilled") setProjects(projRes.value.projects ?? []);
      if (hdStats.status   === "fulfilled") setHelpdeskStats(hdStats.value.stats);
      if (onbRes.status    === "fulfilled") setOnboarding((onbRes.value.onboarding ?? []).filter((o: any) => o.userId));
      if (evRes.status     === "fulfilled") setEvents(evRes.value.events ?? evRes.value.data ?? []);
      if (usersRes.status  === "fulfilled") setAllUsers(usersRes.value.users ?? []);
      if (myAttRes.status  === "fulfilled") setMyRecords(myAttRes.value.records ?? []);
      if (manualRes.status === "fulfilled") setMyManual(manualRes.value.records ?? []);
      if (todayRes.status  === "fulfilled") setTodayRec(todayRes.value.record ?? null);

      [attRes, pendRes, allLeavesRes, tasksRes, payRes, projRes, hdStats, onbRes, evRes, usersRes, myAttRes, manualRes, todayRes].forEach((r, i) => {
        if (r.status === "rejected") console.error(`[AdminDashboard] request #${i} failed:`, r.reason);
      });
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const today = new Date().toISOString().split("T")[0];
  const totalStaff = allUsers.length > 0 ? allUsers.length : new Set(attendance.map(a => a.userId?._id)).size;

  const presentTodaySet = new Set(
    attendance.filter(a => a.date === today && a.checkIn).map(a => a.userId?._id ?? a.userId)
  );
  const presentToday = presentTodaySet.size;

  const isActiveStatus = (s: any) => {
    const v = String(s || "").toLowerCase().replace(/[\s_-]/g, "");
    return v === "inprogress" || v === "active" || v === "ongoing";
  };
  const activeProjects = projects.filter(p => isActiveStatus(p.status));
  const pendingPayroll = payroll.filter(p => ["draft", "pending"].includes(p.status)).reduce((s, p) => s + (p.netSalary || 0), 0);
  const openTickets = helpdeskStats?.open ?? 0;
  const criticalTickets = helpdeskStats?.critical ?? 0;
  const overdueTasks = tasks.filter(t => t.status !== "completed" && t.dueDate && new Date(t.dueDate) < new Date());
  const dueSoonTasks = tasks.filter(t => t.status !== "completed" && t.dueDate && new Date(t.dueDate) > new Date())
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const highPriorityLeaves = pendingLeaves.filter(l => l.priority === "high");
  const projectsNearDeadline = projects.filter(p => isActiveStatus(p.status) && p.endDate && new Date(p.endDate).getTime() - Date.now() < 7 * 86400000 && new Date(p.endDate) >= new Date());

  // FIX: "showing only Total Employees" — now Admin dashboard shows a full
  // role breakdown: Employees, Managers, HR, Admins as four separate tiles.
  const roleBreakdown = {
    employee: allUsers.filter(u => u.role === "employee").length,
    manager:  allUsers.filter(u => u.role === "manager").length,
    hr:       allUsers.filter(u => u.role === "hr").length,
    admin:    allUsers.filter(u => u.role === "admin").length,
  };

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().split("T")[0];
    const presentSet = new Set(
      attendance.filter(a => a.date === ds && a.checkIn).map(a => a.userId?._id ?? a.userId)
    );
    return { label: d.toLocaleDateString("en-US", { weekday: "short" }), value: presentSet.size, total: totalStaff };
  });

  const alerts = buildSmartAlerts({ criticalTickets, overdueTasks, dueSoonTasks, highPriorityLeaves, approvedLeaves, projectsNearDeadline });

  const { attRate, totalHoursToday } = computeOwnAttendance(myRecords, myManual, todayRec);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className={`${CARD} p-6 sm:p-7`}>
        <div className="flex items-center justify-between gap-3 mb-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{getGreeting()}, {currentUser?.name?.split(" ")[0]}!</h1>
          <RefreshBtn onClick={() => { setRefreshing(true); load(); }} loading={refreshing} />
        </div>
        <p className="text-xs sm:text-sm text-gray-500 mb-6">Real-time overview of your organization.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickAction icon={FileUp} bg={TILE_PINK} title="Approve Leaves" subtitle={`${pendingLeaves.length} requests awaiting approval.`} onClick={() => safeNavigate(onNavigate, "leave")} />
          <QuickAction icon={TicketCheck} bg={TILE_PEACH} title="Review Tickets" subtitle={`${openTickets} open, ${criticalTickets} critical.`} onClick={() => safeNavigate(onNavigate, "helpdesk")} />
          <QuickAction icon={DollarSign} bg={TILE_BLUE} title="Run Payroll" subtitle={`₹${(pendingPayroll/1000).toFixed(0)}K pending this cycle.`} onClick={() => safeNavigate(onNavigate, "payroll")} />
        </div>
      </div>

      {/* FIX: full role breakdown instead of just "Total Employees" */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatTile value={loading ? "—" : roleBreakdown.employee} bg={TILE_MINT}  label="Employees" loading={loading} />
        <StatTile value={loading ? "—" : roleBreakdown.manager}  bg={TILE_BLUE}  label="Managers"  loading={loading} />
        <StatTile value={loading ? "—" : roleBreakdown.hr}       bg={TILE_PEACH} label="HR"        loading={loading} />
        <StatTile value={loading ? "—" : roleBreakdown.admin}    bg={TILE_ROSE}  label="Admins"    loading={loading} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatTile value={loading ? "—" : presentToday}           bg={TILE_MINT}  label="Present Today"     loading={loading} />
        <StatTile value={loading ? "—" : activeProjects.length}  bg={TILE_BLUE}  label="Active Projects"   loading={loading} />
        <StatTile value={loading ? "—" : openTickets}            bg={TILE_ROSE}  label="Open Tickets"      loading={loading} />
        <StatTile value={loading ? "—" : totalStaff}             bg={TILE_PEACH} label="Total Users"       loading={loading} />
      </div>

      <AttendanceHoursLeavesRow
        loading={loading}
        attRate={`${attRate}%`}
        hoursToday={`${totalHoursToday.toFixed(1)}h`}
        leavesApproved={approvedLeaves.length}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2"><AttendanceTrendPanel title="Org Attendance — Last 7 Days" subtitle="Unique users checked in per day" data={last7Days} /></div>
        <SmartAlertsPanel alerts={alerts} />
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base px-1">Project Progress</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {activeProjects.slice(0, 3).map((p, i) => (
            <ProgressCard key={p._id} icon={Briefcase} title={p.name} description={`${p.status?.replace("-", " ")}`} percent={p.progress || 0} bg={[TILE_PINK, TILE_BLUE, TILE_MINT][i % 3]} />
          ))}
          {activeProjects.length === 0 && <p className="text-center text-gray-400 text-sm py-8 col-span-3">No active projects</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Panel title="Recent Onboarding">
          <div className="space-y-2">
            {onboarding.slice(0, 5).map(o => {
              const done = o.tasks?.filter((t: any) => t.completed).length || 0;
              const total = o.tasks?.length || 0;
              return (
                <div key={o._id} className="flex items-center justify-between p-3 bg-[#FAF8F3] border border-[#EDE7DA] rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#FBE3C4] flex items-center justify-center text-gray-700 text-sm font-bold flex-shrink-0">{o.userId?.name?.charAt(0)}</div>
                    <div className="min-w-0"><p className="text-sm font-medium text-gray-800 truncate">{o.userId?.name}</p><p className="text-xs text-gray-500 truncate">{o.role} · Started {o.startDate}</p></div>
                  </div>
                  <p className="text-xs font-medium text-gray-600 flex-shrink-0 ml-2">{done}/{total}</p>
                </div>
              );
            })}
            {onboarding.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No onboarding records</p>}
          </div>
        </Panel>
        <UpcomingEventsPanel events={events} />
      </div>
    </div>
  );
}

/* ======================================================================
   ROOT
   ====================================================================== */
export default function RoleBasedDashboard({ onNavigate }: NavProps) {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  // Defensive dev-time warning: if this component is ever rendered without
  // onNavigate, EVERY quick-action button will silently no-op. This is the
  // most likely root cause of "not redirecting" — App.tsx must render
  // <RoleBasedDashboard onNavigate={setActiveModule} />.
  if (typeof onNavigate !== "function" && import.meta.env.DEV) {
    console.warn("[RoleBasedDashboard] Rendered without onNavigate prop — quick actions will not navigate.");
  }

  const dashboard = (() => {
    switch (currentUser.role) {
      case "admin":    return <AdminDashboardView onNavigate={onNavigate} />;
      case "manager":  return <ManagerDashboardView onNavigate={onNavigate} />;
      case "hr":       return <HRDashboardView onNavigate={onNavigate} />;
      case "employee": return <EmployeeDashboardView onNavigate={onNavigate} />;
      default:         return <AdminDashboardView onNavigate={onNavigate} />;
    }
  })();

  return <div className={`${PAGE_BG} -m-4 sm:-m-6 p-4 sm:p-6 min-h-full`}>{dashboard}</div>;
} 
