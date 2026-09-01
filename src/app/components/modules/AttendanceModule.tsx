// src/app/components/modules/AttendanceModule.tsx

import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "../ui/dialog";
import { useAuth } from "../../contexts/AuthContext";
import { attendanceApi, leaveApi } from "@/services/api";
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  subWeeks, subMonths, eachDayOfInterval, parseISO, getDaysInMonth,
} from "date-fns";
import {
  LogIn, LogOut, Download, Users, Calendar, Clock,
  PlusCircle, RefreshCw, CheckCircle2, XCircle, UserX,
  AlertCircle, Search, ShieldCheck, ChevronLeft, ChevronRight,
  TrendingUp, Edit2, Trash2, Plus,
} from "lucide-react";
import { PAGE_BG, PANEL_BORDER, SOFT_BG, ACCENT_DARK, ACCENT_ORANGE, ACCENT_ORANGE_HOVER } from "../../../styles/moduleTheme";

/* ============================================================
   TYPES
   ============================================================ */
const initManualAttendance = {
  employeeName: "",
  employeeId:   "",
  employeeRole: "employee",
  startDate:    "",
  endDate:      "",
  checkIn:      "",
  checkOut:     "",
  tagline:      "",
};

const initAdminDailyEntry = {
  userId:   "",
  date:     format(new Date(), "yyyy-MM-dd"),
  checkIn:  "",
  checkOut: "",
  tagline:  "",
};

/* ============================================================
   LIVE CLOCK
   ============================================================ */
const LiveClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono text-lg font-semibold text-gray-800 tabular-nums">
      {format(time, "hh:mm:ss aa")}
    </span>
  );
};


/* ============================================================
   WORKING HOURS HELPERS
   ============================================================ */
const parseTimeToMinutes = (timeStr?: string | null): number | null => {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && hours !== 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const formatMinutesAsHM = (totalMins: number): string => {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const calculateWorkingHours = (checkIn?: string | null, checkOut?: string | null): string | null => {
  const inMins = parseTimeToMinutes(checkIn);
  const outMins = parseTimeToMinutes(checkOut);
  if (inMins === null || outMins === null) return null;
  let diff = outMins - inMins;
  if (diff < 0) diff += 24 * 60; // overnight shift safety
  return formatMinutesAsHM(diff);
};

/* ============================================================
   MONTHLY ATTENDANCE CALENDAR COMPONENT
   ============================================================ */
interface MonthlyAttendanceProps {
  records: any[];
  leaveRecords: any[];
  userId?: string;
  userName?: string;
  isAdminView?: boolean;
  allUsers?: any[];
  currentUserName?: string;
  currentUserId?: string;
  canForceCheckout?: boolean;
  onForceCheckout?: (payload: { recordId: string; userId: string; date: string }) => void;
  forceCheckoutLoadingId?: string | null;
  canMarkLeave?: boolean;
  onMarkLeave?: (payload: { userId: string; userName: string; date: string }) => void;
  markLeaveLoadingId?: string | null;
}

const MonthlyAttendanceCalendar = ({
  records,
  leaveRecords,
  userId,
  userName,
  isAdminView = false,
  allUsers = [],
  currentUserName = "",
  currentUserId = "",
  canForceCheckout = false,
  onForceCheckout,
  forceCheckoutLoadingId = null,
  canMarkLeave = false,
  onMarkLeave,
  markLeaveLoadingId = null,
}: MonthlyAttendanceProps) => {
  const [viewMonth, setViewMonth] = useState(new Date());
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const year         = viewMonth.getFullYear();
  const month        = viewMonth.getMonth();
  const daysInMonth  = getDaysInMonth(viewMonth);
  const firstWeekday = new Date(year, month, 1).getDay();
  const todayStr     = format(new Date(), "yyyy-MM-dd");

  const dayData = Array.from({ length: daysInMonth }, (_, i) => {
    const day     = i + 1;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const date    = new Date(year, month, day);
    const isToday   = dateStr === todayStr;
    const isFuture  = dateStr > todayStr;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    const attRecord = records.find(r => {
      if (r.date !== dateStr) return false;

      if (r.isManual) {
        const manualUserId = r.userId
          ? (typeof r.userId === "object" ? r.userId?._id : String(r.userId))
          : null;

        const targetUserId = userId || currentUserId || null;
        const targetName = userId
          ? allUsers.find((u: any) => u._id === userId)?.name
          : currentUserName;

        if (manualUserId && targetUserId) {
          return manualUserId === targetUserId;
        }
        if (!targetName || !r.manualEmployeeName) return false;
        return r.manualEmployeeName.trim().toLowerCase() === targetName.trim().toLowerCase();
      }

      if (userId) return r.userId?._id === userId;
      return true;
    });

    const leaveRecord = leaveRecords.find(l => {
      const approved = l.status === "approved" || l.status === "emergency_approved";
      if (!approved) return false;
      if (userId) return dateStr >= l.startDate && dateStr <= l.endDate && l.userId?._id === userId;
      return dateStr >= l.startDate && dateStr <= l.endDate;
    });

    let status: "present" | "absent" | "leave" | "weekend" | "future" | "partial" | "manual_tagged" = "absent";
    if (isFuture)         status = "future";
    else if (isWeekend)   status = "weekend";
    else if (leaveRecord) status = "leave";
    else if (attRecord?.isManual && attRecord?.tagline && attRecord?.checkIn) status = "manual_tagged";
    else if (attRecord?.checkIn && attRecord?.checkOut) status = "present";
    else if (attRecord?.checkIn && !attRecord?.checkOut) status = "partial";
    else                  status = "absent";

        const recordUserId = attRecord?.userId
          ? (typeof attRecord.userId === "object" ? attRecord.userId._id : attRecord.userId)
          : null;

        return {
  day, dateStr, isToday, isFuture, isWeekend, status,
  checkIn:   attRecord?.checkIn  ?? null,
  checkOut:  attRecord?.checkOut ?? null,
  tagline:   attRecord?.tagline  ?? null,
  checkInLocation:  attRecord?.checkInLocation  ?? null,
  checkOutLocation: attRecord?.checkOutLocation ?? null,
  leaveType: leaveRecord?.type   ?? null,
  isManual:  attRecord?.isManual ?? false,
  workingHours: calculateWorkingHours(attRecord?.checkIn, attRecord?.checkOut),
  recordId:     attRecord?._id ?? null,
  recordUserId,
};
  });

const workingDays = dayData.filter(d => !d.isWeekend && !d.isFuture).length;
const presentDays = dayData.filter(
  d => d.status === "present" || d.status === "partial" || d.status === "manual_tagged"
).length;
const absentDays  = dayData.filter(d => d.status === "absent").length;
const leaveDays   = dayData.filter(d => d.status === "leave").length;
const percentage  = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;
const totalDays  = presentDays + absentDays + leaveDays;

const totalWorkedMinutes = dayData.reduce((sum, d) => {
    // Count present/partial/manual-tagged days with a real check-in.
    // Skip future, weekend-with-no-record, and any day missing a valid check-in.
    if (d.status !== "present" && d.status !== "partial" && d.status !== "manual_tagged") return sum;

    const inMins  = parseTimeToMinutes(d.checkIn);
    const outMins = parseTimeToMinutes(d.checkOut);
    if (inMins === null) return sum;

    // Partial day (checked in, not checked out yet) contributes 0 to total hours
    if (outMins === null) return sum;

    let diff = outMins - inMins;
    if (diff < 0) diff += 24 * 60; // overnight shift safety
    if (diff <= 0 || diff > 20 * 60) return sum; // guard against corrupt entries (>20h)

    return sum + diff;
  }, 0);
  const totalWorkedLabel = formatMinutesAsHM(totalWorkedMinutes);

  const completedDaysCount = dayData.filter(
    d => (d.status === "present" || d.status === "manual_tagged") && d.checkIn && d.checkOut
  ).length;
  const avgWorkedMinutesPerDay = completedDaysCount > 0 ? Math.round(totalWorkedMinutes / completedDaysCount) : 0;
  const avgWorkedLabel = formatMinutesAsHM(avgWorkedMinutesPerDay);

  const isCurrentMonth =
    format(viewMonth, "yyyy-MM") === format(new Date(), "yyyy-MM");

  const cellBg = (status: string) => {
    switch (status) {
      case "present":      return "bg-emerald-100 border border-emerald-200";
      case "manual_tagged":return "bg-purple-100 border border-purple-200";
      case "partial":      return "bg-blue-50 border border-blue-200";
      case "absent":       return "bg-red-50 border border-red-200";
      case "leave":        return "bg-amber-50 border border-amber-200";
      case "weekend":      return "bg-gray-50 border border-gray-100";
      default:             return "bg-white border border-gray-100";
    }
  };

  const cellTextColor = (status: string) => {
    switch (status) {
      case "present":       return "text-emerald-800";
      case "manual_tagged": return "text-purple-800";
      case "partial":       return "text-blue-700";
      case "absent":        return "text-red-700";
      case "leave":         return "text-amber-700";
      case "weekend":
      case "future":        return "text-gray-300";
      default:              return "text-gray-700";
    }
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <ChevronLeft size={13} />
          </button>
          <span className="text-sm font-bold text-gray-800 w-[120px] text-center">
            {format(viewMonth, "MMMM yyyy")}
          </span>
          <button
            onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            disabled={isCurrentMonth}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={13} />
          </button>
        </div>
        {userName && (
          <span className="text-[10px] bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-semibold truncate max-w-[130px]">
            {userName}
          </span>
        )}
      </div>

<div className="grid grid-cols-6 gap-1.5">
        {[
          { label: "Rate",    value: `${percentage}%`,   bg: "bg-slate-800",   text: "text-white"       },
          { label: "Present", value: presentDays,         bg: "bg-emerald-50", text: "text-emerald-800" },
          { label: "Absent",  value: absentDays,          bg: "bg-red-50",     text: "text-red-800"     },
          { label: "Leave",   value: leaveDays,           bg: "bg-amber-50",   text: "text-amber-800"   },
          { label: "Total",   value: totalDays,           bg: "bg-slate-100",  text: "text-slate-800"   },
          { label: "Hours",   value: totalWorkedLabel,    bg: "bg-blue-50",    text: "text-blue-800"    },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-lg py-2 px-1 text-center border border-gray-100`}>
            <p className={`text-sm font-black leading-none ${s.text}`}>{s.value}</p>
            <p className={`text-[9px] mt-1 font-semibold uppercase tracking-wide ${s.text} opacity-70`}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-gray-400">
          <span>{presentDays} of {workingDays} working days</span>
          <span className="font-bold text-slate-600">{percentage}%</span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-slate-700 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <div className="w-full">
        <div className="grid grid-cols-7 mb-1">
          {[
            { full: "Sun", short: "S", weekend: true  },
            { full: "Mon", short: "M", weekend: false },
            { full: "Tue", short: "T", weekend: false },
            { full: "Wed", short: "W", weekend: false },
            { full: "Thu", short: "T", weekend: false },
            { full: "Fri", short: "F", weekend: false },
            { full: "Sat", short: "S", weekend: true  },
          ].map((d, i) => (
            <div
              key={i}
              className={`text-center py-1 text-[9px] sm:text-[10px] font-bold tracking-widest uppercase ${
                d.weekend ? "text-gray-300" : "text-gray-400"
              }`}
            >
              <span className="hidden sm:inline">{d.full}</span>
              <span className="sm:hidden">{d.short}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7" style={{ gap: "2px" }}>
          {Array.from({ length: firstWeekday }, (_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {dayData.map(d => {
            const isActive  = d.status !== "future" && d.status !== "weekend";
            const isHovered = hoveredDay === d.day;

            return (
              <div
                key={d.day}
                className="aspect-square relative"
                onMouseEnter={() => isActive && setHoveredDay(d.day)}
                onMouseLeave={() => setHoveredDay(null)}
              >
                <div
                  className={`
                    w-full h-full flex flex-col items-center justify-center
                    rounded-md cursor-default select-none transition-all duration-100
                    ${cellBg(d.status)}
                    ${d.isToday ? "ring-2 ring-slate-800 ring-offset-1 shadow-md" : ""}
                    ${isActive ? "hover:opacity-80 hover:scale-105" : ""}
                  `}
                >
                  <span className={`
                    font-bold leading-none tabular-nums
                    text-[10px] xs:text-[11px] sm:text-[13px] md:text-[14px]
                    ${cellTextColor(d.status)}
                  `}>
                    {d.day}
                  </span>
                  {d.status === "present" && !d.isManual && (
                    <span className="w-1 h-1 rounded-full bg-emerald-500 mt-0.5 opacity-80" />
                  )}
                  {d.status === "present" && d.isManual && (
                    <span className="text-[6px] font-black text-emerald-600 mt-0.5 leading-none">M</span>
                  )}
                  {d.status === "manual_tagged" && (
                    <span className="text-[6px] font-black text-purple-600 mt-0.5 leading-none">M</span>
                  )}
                  {d.status === "partial" && (
                    <span className="w-1 h-1 rounded-full bg-blue-400 mt-0.5 opacity-80" />
                  )}
                  {d.status === "leave" && (
                    <span className="text-[6px] font-black text-amber-600 mt-0.5 leading-none">L</span>
                  )}
                  {d.status === "absent" && !d.isFuture && (
                    <span className="w-1 h-1 rounded-full bg-red-300 mt-0.5 opacity-60" />
                  )}
                </div>

                {isHovered && isActive && (
                  <div
                    className="absolute z-[100] pointer-events-none"
                    style={{
                      bottom: "calc(100% + 6px)",
                      left: "50%",
                      transform: "translateX(-50%)",
                      minWidth: "130px",
                    }}
                  >
                    <div className="bg-gray-900 text-white rounded-xl shadow-2xl px-3 py-2 text-left whitespace-normal max-w-[200px] pointer-events-auto">
                      <p className="text-[11px] font-bold mb-1">
                        {format(parseISO(d.dateStr), "d MMM yyyy")}
                      </p>
                      <p className={`text-[10px] font-semibold capitalize mb-1 ${
                        d.status === "present"       ? "text-emerald-400" :
                        d.status === "manual_tagged" ? "text-purple-400"  :
                        d.status === "partial"       ? "text-blue-400"    :
                        d.status === "leave"         ? "text-amber-400"   :
                        "text-red-400"
                      }`}>
                        {d.status === "partial" ? "Partial day" : d.status === "manual_tagged" ? "Manual entry" : d.status}
                        {d.isManual && (
                          <span className="ml-1 text-[9px] text-slate-400">(manual)</span>
                        )}
                      </p>
                      {d.checkIn && (
  <p className="text-[10px] text-gray-300">
    In: <span className="text-emerald-400 font-mono font-bold">{d.checkIn}</span>
  </p>
)}
{d.checkOut && (
  <p className="text-[10px] text-gray-300">
    Out: <span className="text-red-400 font-mono font-bold">{d.checkOut}</span>
  </p>
)}

{d.workingHours && (
  <p className="text-[10px] text-gray-300 mt-0.5">
    ⏱ Hours: <span className="text-blue-300 font-mono font-bold">{d.workingHours}</span>
  </p>
)}

{d.checkInLocation && (
  <p className="text-[10px] text-emerald-300 mt-0.5 max-w-[170px] whitespace-normal">
    📍 In: {d.checkInLocation}
  </p>
)}
{d.checkOutLocation && (
  <p className="text-[10px] text-red-300 mt-0.5 max-w-[170px] whitespace-normal">
    📍 Out: {d.checkOutLocation}
  </p>
)}
{d.leaveType && (
  <p className="text-[10px] text-amber-400 mt-0.5">{d.leaveType}</p>
)}
                      {d.tagline && (
                        <p className="text-[10px] text-gray-400 italic mt-0.5 max-w-[150px] truncate">
                          "{d.tagline}"
                        </p>
                      )}
                      {canForceCheckout && d.status === "partial" && d.recordUserId && d.recordId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onForceCheckout?.({ recordId: d.recordId, userId: d.recordUserId, date: d.dateStr });
                          }}
                          disabled={forceCheckoutLoadingId === d.recordId}
                          className="mt-1.5 w-full flex items-center justify-center gap-1 text-[10px] font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-md py-1 transition-colors disabled:opacity-50"
                        >
                          {forceCheckoutLoadingId === d.recordId ? "Checking out…" : "⏻ Check Out Now"}
                        </button>
                      )}
                      {canMarkLeave && isAdminView && userId && d.status !== "leave" && d.status !== "future" && onMarkLeave && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkLeave({ userId, userName: userName || "", date: d.dateStr });
                          }}
                          disabled={markLeaveLoadingId === `${userId}-${d.dateStr}`}
                          className="mt-1.5 w-full flex items-center justify-center gap-1 text-[10px] font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-md py-1 transition-colors disabled:opacity-50"
                        >
                          {markLeaveLoadingId === `${userId}-${d.dateStr}` ? "Marking…" : "🏖 Mark Leave"}
                        </button>
                      )}
                    </div>
                    <div className="flex justify-center" style={{ marginTop: "-1px" }}>
                      <div style={{
                        width: 0, height: 0,
                        borderLeft: "5px solid transparent",
                        borderRight: "5px solid transparent",
                        borderTop: "5px solid #111827",
                      }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 pt-2 border-t border-gray-100">
        {[
          { color: "bg-emerald-100 border border-emerald-200", label: "Present" },
          { color: "bg-purple-100 border border-purple-200",   label: "Manual + Note" },
          { color: "bg-blue-50 border border-blue-200",        label: "Partial" },
          { color: "bg-red-50 border border-red-200",          label: "Absent"  },
          { color: "bg-amber-50 border border-amber-200",      label: "Leave"   },
          { color: "bg-gray-50 border border-gray-200",        label: "Weekend" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1 text-[10px] text-gray-500">
            <span className={`w-2.5 h-2.5 rounded-sm ${l.color} flex-shrink-0`} />
            <span className="font-medium">{l.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0">
            <span className="text-[5px] font-black text-emerald-600">M</span>
          </span>
          <span className="font-medium">Manual Entry</span>
        </div>
      </div>
    </div>
  );
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

  const canCheckInOut   = isEmployee || isHR || isAdmin || isManager;
  const canAdminControl = isAdmin || isHR;

  /* ── state ── */
  const [todayRecord,      setTodayRecord]      = useState<any>(null);
  const [allAttendance,    setAllAttendance]    = useState<any[]>([]);
  const [myAttendance,     setMyAttendance]     = useState<any[]>([]);
  const [allUsersList,     setAllUsersList]     = useState<any[]>([]);
  const [manualDbRecords,  setManualDbRecords]  = useState<any[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [checkInLoading,   setCheckInLoading]   = useState(false);
  const [checkOutLoading,  setCheckOutLoading]  = useState(false);
  const [toast,            setToast]            = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [checkInTagline,    setCheckInTagline]    = useState("");
  const [taglineDialogOpen, setTaglineDialogOpen] = useState(false);
  const [locationRetryLoading, setLocationRetryLoading] = useState<"checkin" | "checkout" | null>(null);

  const [manualAttendanceOpen, setManualAttendanceOpen] = useState(false);
  const [manualAttendance,     setManualAttendance]     = useState(initManualAttendance);
  const [manualSubmitting,     setManualSubmitting]     = useState(false);

  const [reportFilter, setReportFilter] = useState<"custom"|"this_week"|"last_week"|"this_month"|"last_month">("custom");
  const [reportStart,  setReportStart]  = useState("");
  const [reportEnd,    setReportEnd]    = useState("");
  const [reportRole,   setReportRole]   = useState("all");
  const [reportName,   setReportName]   = useState("");

  const [overviewTab,  setOverviewTab]  = useState<"present" | "absent">("present");

  const [adminCheckInDialog,  setAdminCheckInDialog]  = useState(false);
  const [adminCheckInUser,    setAdminCheckInUser]    = useState<any>(null);
  const [adminCheckInTagline, setAdminCheckInTagline] = useState("");
  const [adminActionLoading,  setAdminActionLoading]  = useState<string | null>(null);
  const [reminderLoading,     setReminderLoading]     = useState<string | null>(null);

  

  const [userSearch,           setUserSearch]           = useState("");
  const [calendarSelectedUser, setCalendarSelectedUser] = useState<any>(null);
  const [myLeaveRecords,       setMyLeaveRecords]       = useState<any[]>([]);
  const [allLeaveRecords,      setAllLeaveRecords]      = useState<any[]>([]);
  const [calendarMarkLeaveLoadingId, setCalendarMarkLeaveLoadingId] = useState<string | null>(null);

  /* ── Admin CRUD entry state ── */
  const [adminDailyEntryOpen,  setAdminDailyEntryOpen]  = useState(false);
  const [adminDailyEntry,      setAdminDailyEntry]      = useState(initAdminDailyEntry);
  const [adminDailySubmitting, setAdminDailySubmitting] = useState(false);
  const [adminDailyLoading,    setAdminDailyLoading]    = useState(false);
  const [adminDailyEditId,     setAdminDailyEditId]     = useState<string | null>(null);
  const [adminDailyDeleteId,   setAdminDailyDeleteId]   = useState<string | null>(null);
  const [adminDailyTab,        setAdminDailyTab]        = useState<"today" | "all">("today");
  const [adminDailyUserFilter, setAdminDailyUserFilter] = useState("");

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── helpers ── */
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const setMA  = (k: keyof typeof initManualAttendance, v: any)  => setManualAttendance(f => ({ ...f, [k]: v }));
  const setADE = (k: keyof typeof initAdminDailyEntry, v: any)   => setAdminDailyEntry(f => ({ ...f, [k]: v }));

  const triggerDownload = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const to12Hour = (t: string) => {
    if (!t) return "";
    if (t.includes("AM") || t.includes("PM")) return t;
    const [hh, mm] = t.split(":").map(Number);
    const ampm = hh >= 12 ? "PM" : "AM";
    const h12  = hh % 12 || 12;
    return `${h12.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")} ${ampm}`;
  };

  const getCurrentPosition = (): Promise<{ lat: number; lng: number } | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported by this browser");
      showToast("⚠️ Your browser doesn't support location. Attendance will be marked without location.", "error");
      resolve(null);
      return;
    }

    if (!window.isSecureContext) {
      console.warn("Not a secure context (HTTPS required) — geolocation blocked");
      showToast("⚠️ Location requires HTTPS. Marking attendance without location.", "error");
      resolve(null);
      return;
    }

    const tryLowAccuracy = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log("📍 Location captured (low-accuracy fallback):", pos.coords.latitude, pos.coords.longitude, "accuracy:", pos.coords.accuracy);
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.error("Geolocation error (low-accuracy):", err.code, err.message);
          let msg = "⚠️ Couldn't get your location.";
          if (err.code === err.PERMISSION_DENIED) {
            msg = "⚠️ Location permission denied. Enable it in browser settings to record location.";
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg = "⚠️ Location unavailable right now. Try moving near a window or enabling device GPS.";
          } else if (err.code === err.TIMEOUT) {
            msg = "⚠️ Location request timed out. Try again in a moment.";
          }
          showToast(msg, "error");
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
      );
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log("📍 Location captured:", pos.coords.latitude, pos.coords.longitude, "accuracy:", pos.coords.accuracy);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        console.warn("High-accuracy geolocation failed, retrying with network-based location:", err.code, err.message);
        if (err.code === err.PERMISSION_DENIED) {
          showToast("⚠️ Location permission denied. Enable it in browser settings to record location.", "error");
          resolve(null);
          return;
        }
        // POSITION_UNAVAILABLE or TIMEOUT — retry with looser accuracy requirements
        tryLowAccuracy();
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  });
};

  /* ============================================================
     LOAD DATA
     ============================================================ */
  const loadTodayOnly = useCallback(async () => {
    try {
      const todayRes = await attendanceApi.getToday();
      setTodayRecord(todayRes.record ? { ...todayRes.record } : null);
      if (isAdmin || isHR || isManager) {
        const allRes = await attendanceApi.getAll();
        setAllAttendance(allRes.records ? [...allRes.records] : []);
      }
    } catch (err: any) {
      console.error("loadTodayOnly error:", err.message);
    }
  }, [isAdmin, isHR, isManager]);

  const loadingRef = useRef(false);

  const loadData = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      setLoading(true);
      const todayRes = await attendanceApi.getToday();
      setTodayRecord(todayRes.record || null);

      const myRes = await attendanceApi.getMy();
      setMyAttendance(myRes.records || []);

      const myLeavesRes = await leaveApi.getMy();
      setMyLeaveRecords(myLeavesRes.leaves || []);

      if (isAdmin || isHR || isManager) {
        const allRes = await attendanceApi.getAll();
        setAllAttendance(allRes.records || []);
      }
      if (canAdminControl) {
        const usersRes = await attendanceApi.getUsersList();
        setAllUsersList(usersRes.users || []);
        const allLeavesRes = await leaveApi.getAll();
        setAllLeaveRecords(allLeavesRes.leaves || []);
      }
      if (isAdmin) {
  const manualRes = await attendanceApi.getManual();
  setManualDbRecords(manualRes.records || []);
} else {
  const manualRes = await attendanceApi.getManualMy();
  setManualDbRecords(manualRes.records || []);
}
    } catch (err: any) {
      console.error("loadData error:", err.message);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [isAdmin, isHR, isManager, canAdminControl]);

  const loadAdminDailyRecords = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setAdminDailyLoading(true);
      const manualRes = await attendanceApi.getManual();
      setManualDbRecords(manualRes.records || []);
    } catch (err: any) {
      console.error("loadAdminDailyRecords error:", err.message);
    } finally {
      setAdminDailyLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (isAdmin) loadAdminDailyRecords(); }, [loadAdminDailyRecords, isAdmin]);
  useEffect(() => {
    pollingRef.current = setInterval(() => { loadTodayOnly(); }, 30000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [loadTodayOnly]);

  if (!currentUser) return null;

  /* ============================================================
     TODAY's OVERVIEW
     ============================================================ */
const todayStr = format(new Date(), "yyyy-MM-dd");

/* ── Step 1: real (non-manual) check-ins today ── */
const todayPresentRecords = allAttendance.filter(r => r.date === todayStr && !r.isManual);

/* ── Step 2: manual entries today ── */
const todayManualPresentRecords = manualDbRecords.filter(r => r.date === todayStr);

/* ── Step 3: merge real + manual into one map, keyed by userId ── */
const mergedTodayRecordsMap = new Map<string, any>();
todayPresentRecords.forEach(r => {
  const uid = r.userId?._id || r.userId;
  if (uid) mergedTodayRecordsMap.set(uid, r);
});
todayManualPresentRecords.forEach(r => {
  const uid = r.userId?._id || r.userId;
  if (uid) mergedTodayRecordsMap.set(uid, r);
});

/* ── Step 4: merge in approved leave for today (counts as present) ── */
allLeaveRecords
  .filter(l => {
    const approved = l.status === "approved" || l.status === "emergency_approved";
    return approved && todayStr >= l.startDate && todayStr <= l.endDate;
  })
  .forEach(l => {
    const uid = l.userId?._id || l.userId;
    if (uid && !mergedTodayRecordsMap.has(uid)) {
      mergedTodayRecordsMap.set(uid, {
        _id: `leave-${uid}`,
        userId: l.userId,
        checkIn: null,
        checkOut: null,
        tagline: `On Leave: ${l.type}`,
        isLeave: true,
      });
    }
  });

/* ── Step 5: final merged list used everywhere below ── */
const mergedTodayRecords = Array.from(mergedTodayRecordsMap.values());

const knownUserMap: Record<string, any> = {};
allAttendance.forEach(r => {
  if (r.userId?._id && !knownUserMap[r.userId._id]) knownUserMap[r.userId._id] = r.userId;
});
allUsersList.forEach(u => {
  if (u._id && !knownUserMap[u._id]) knownUserMap[u._id] = u;
});

const presentUserIds = new Set(mergedTodayRecords.map(r => r.userId?._id || r.userId));
const absentUsers    = Object.values(knownUserMap).filter(u => !presentUserIds.has(u._id));

const getUserTodayRecord = (userId: string) =>
  mergedTodayRecords.find(r => (r.userId?._id || r.userId) === userId) || null;

  /* ============================================================
     ADMIN / HR: Direct Check-In / Check-Out
     ============================================================ */
  const handleAdminCheckIn = async (user: any, tagline?: string) => {
    try {
      setAdminActionLoading(user._id);
      const res = await attendanceApi.adminCheckIn(user._id, { tagline: tagline || adminCheckInTagline || "" });
      showToast(`✅ Checked in ${user.name} at ${res.record.checkIn}`);
      setAdminCheckInTagline("");
      setAdminCheckInDialog(false);
      setAdminCheckInUser(null);
      const allRes = await attendanceApi.getAll();
      setAllAttendance(allRes.records || []);
    } catch (err: any) {
      showToast(err.message || "Check-in failed", "error");
    } finally {
      setAdminActionLoading(null);
    }
  };

  const handleAdminCheckOut = async (user: any) => {
    try {
      setAdminActionLoading(user._id);
      const res = await attendanceApi.adminCheckOut(user._id);
      showToast(`✅ Checked out ${user.name} at ${res.record.checkOut}`);
      const allRes = await attendanceApi.getAll();
      setAllAttendance(allRes.records || []);
    } catch (err: any) {
      showToast(err.message || "Check-out failed", "error");
    } finally {
      setAdminActionLoading(null);
    }
  };

  /* Force checkout for any user on any past/present date (missed checkout) */
  const handleForceCheckoutDate = async (record: any) => {
    const targetUserId = record.userId
      ? (typeof record.userId === "object" ? record.userId._id : record.userId)
      : null;
    if (!targetUserId) { showToast("This record has no linked user to check out.", "error"); return; }

    const isToday = record.date === todayStr;
    let checkOutTime: string | undefined;
    if (!isToday) {
      const input = window.prompt(`Enter check-out time for ${record.date} (24h HH:MM, e.g. 18:30):`, "18:00");
      if (!input) return;
      checkOutTime = input.trim();
    }

    try {
      setAdminActionLoading(`${record._id}-force`);
      const res = await attendanceApi.adminCheckOutForDate(targetUserId, { date: record.date, checkOutTime });
      showToast(`✅ ${res.message}`);
      const [manualRes, allRes] = await Promise.all([
        attendanceApi.getManual(),
        attendanceApi.getAll(),
      ]);
      setManualDbRecords(manualRes.records || []);
      setAllAttendance(allRes.records || []);
    } catch (err: any) {
      showToast(err.message || "Force checkout failed", "error");
    } finally {
      setAdminActionLoading(null);
    }
  };

  /* Force checkout triggered from the Team Monthly Attendance calendar (partial-day tooltip) */
  const [calendarForceCheckoutLoadingId, setCalendarForceCheckoutLoadingId] = useState<string | null>(null);

  const handleCalendarForceCheckout = async (payload: { recordId: string; userId: string; date: string }) => {
    const isToday = payload.date === todayStr;
    let checkOutTime: string | undefined;
    if (!isToday) {
      const input = window.prompt(`Enter check-out time for ${payload.date} (24h HH:MM, e.g. 18:30):`, "18:00");
      if (!input) return;
      checkOutTime = input.trim();
    }

    try {
      setCalendarForceCheckoutLoadingId(payload.recordId);
      const res = await attendanceApi.adminCheckOutForDate(payload.userId, { date: payload.date, checkOutTime });
      showToast(`✅ ${res.message}`);
      const [manualRes, allRes] = await Promise.all([
        attendanceApi.getManual(),
        attendanceApi.getAll(),
      ]);
      setManualDbRecords(manualRes.records || []);
      setAllAttendance(allRes.records || []);
    } catch (err: any) {
      showToast(err.message || "Force checkout failed", "error");
    } finally {
      setCalendarForceCheckoutLoadingId(null);
    }
  };

  const handleCalendarMarkLeave = async (payload: { userId: string; userName: string; date: string }) => {
    const type = window.prompt(
      `Leave type for ${payload.userName} on ${payload.date} (e.g. "Government Holiday", "Sick Leave"):`,
      "Government Holiday"
    );
    if (!type) return;
    const reason = window.prompt("Reason / note for this leave:", type) || type;

    try {
      setCalendarMarkLeaveLoadingId(`${payload.userId}-${payload.date}`);
      await leaveApi.addManual({
        employeeName: payload.userName,
        userId:       payload.userId,
        type,
        startDate:    payload.date,
        endDate:      payload.date,
        reason,
        status:       "approved",
      });
      showToast(`✅ Marked ${payload.userName} on leave for ${payload.date}`);
      const [allLeavesRes, myLeavesRes] = await Promise.all([
        leaveApi.getAll(),
        leaveApi.getMy(),
      ]);
      setAllLeaveRecords(allLeavesRes.leaves || []);
      setMyLeaveRecords(myLeavesRes.leaves || []);
    } catch (err: any) {
      showToast(err.message || "Failed to mark leave", "error");
    } finally {
      setCalendarMarkLeaveLoadingId(null);
    }
  };

  const handleSendReminder = async (user: any) => {
    try {
      setReminderLoading(user._id);
      await attendanceApi.sendCheckoutReminder(user._id);
      showToast(`📧 Reminder sent to ${user.name}`);
    } catch (err: any) {
      showToast(err.message || "Failed to send reminder", "error");
    } finally {
      setReminderLoading(null);
    }
  };

  /* ============================================================
     CHECK IN / CHECK OUT — own
     ============================================================ */
  const handleCheckIn = async (tagline?: string) => {
  try {
    setCheckInLoading(true);
    const coords = await getCurrentPosition();
    const res = await attendanceApi.checkIn({
      tagline: tagline || checkInTagline || "",
      lat: coords?.lat,
      lng: coords?.lng,
    });
    setTodayRecord({ ...res.record });
    showToast(
      res.record.checkInLocation
        ? `✅ Checked in at ${res.record.checkIn} · 📍 ${res.record.checkInLocation}`
        : "✅ Checked in at " + res.record.checkIn
    );
    setCheckInTagline("");
    setTaglineDialogOpen(false);
    const myRes = await attendanceApi.getMy();
    setMyAttendance(myRes.records || []);
    if (isAdmin || isHR || isManager) {
      const allRes = await attendanceApi.getAll();
      setAllAttendance(allRes.records || []);
    }
  } catch (err: any) {
    showToast(err.message || "Check-in failed", "error");
  } finally {
    setCheckInLoading(false);
  }
};

  const handleCheckOut = async () => {
  try {
    setCheckOutLoading(true);
    const coords = await getCurrentPosition();
    const res = await attendanceApi.checkOut({ lat: coords?.lat, lng: coords?.lng });
      setTodayRecord({ ...res.record });
    showToast(
      res.record.checkOutLocation
        ? `✅ Checked out at ${res.record.checkOut} · 📍 ${res.record.checkOutLocation}`
        : "✅ Checked out at " + res.record.checkOut
    );
    const myRes = await attendanceApi.getMy();
    setMyAttendance(myRes.records || []);
    if (isAdmin || isHR || isManager) {
      const allRes = await attendanceApi.getAll();
      setAllAttendance(allRes.records || []);
    }
  } catch (err: any) {
    showToast(err.message || "Check-out failed", "error");
  } finally {
    setCheckOutLoading(false);
  }
};

  const handleAddMissingLocation = async (type: "checkin" | "checkout") => {
    try {
      setLocationRetryLoading(type);
      const coords = await getCurrentPosition();
      if (!coords) {
        showToast("⚠️ Still couldn't get your location — check the site's location permission and try again.", "error");
        return;
      }
      const res = await attendanceApi.updateLocation({ lat: coords.lat, lng: coords.lng, type });
      if (res.record) {
        setTodayRecord({ ...res.record });
        showToast("📍 Location added successfully");
      } else {
        showToast(res.message || "Could not resolve that location", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to add location", "error");
    } finally {
      setLocationRetryLoading(null);
    }
  };

  /* ============================================================
     ADMIN DAILY ENTRY CRUD
     ============================================================ */
  const submitAdminDailyEntry = async () => {
    if (!adminDailyEntry.userId) { showToast("Please select an employee", "error"); return; }
    if (!adminDailyEntry.date)   { showToast("Please select a date", "error"); return; }
    if (!adminDailyEntry.checkIn){ showToast("Check-In time is required", "error"); return; }

    const selectedUser = allUsersList.find(u => u._id === adminDailyEntry.userId);
    if (!selectedUser) { showToast("Selected user not found", "error"); return; }

    try {
      setAdminDailySubmitting(true);
      if (adminDailyEditId) {
        await attendanceApi.deleteManual(adminDailyEditId);
      }
      await attendanceApi.addManual({
        employeeName: selectedUser.name,
        employeeRole: selectedUser.role,
        startDate:    adminDailyEntry.date,
        endDate:      adminDailyEntry.date,
        checkIn:      adminDailyEntry.checkIn,
        checkOut:     adminDailyEntry.checkOut || undefined,
        tagline:      adminDailyEntry.tagline  || undefined,
        userId:       adminDailyEntry.userId,
      });
      showToast(adminDailyEditId
        ? `✅ Record updated for ${selectedUser.name}`
        : `✅ Attendance saved for ${selectedUser.name} on ${adminDailyEntry.date}`
      );
      setAdminDailyEntry(initAdminDailyEntry);
      setAdminDailyEditId(null);
      setAdminDailyEntryOpen(false);
      const [manualRes, allRes] = await Promise.all([
        attendanceApi.getManual(),
        attendanceApi.getAll(),
      ]);
      setManualDbRecords(manualRes.records || []);
      setAllAttendance(allRes.records || []);
    } catch (err: any) {
      showToast(err.message || "Failed to save attendance", "error");
    } finally {
      setAdminDailySubmitting(false);
    }
  };

  const openEditAdminDaily = (record: any) => {
    const userId = record.userId
      ? (typeof record.userId === "object" ? record.userId._id : record.userId)
      : "";
    setAdminDailyEntry({
      userId,
      date:     record.date     || "",
      checkIn:  record.checkIn  || "",
      checkOut: record.checkOut || "",
      tagline:  record.tagline  || "",
    });
    setAdminDailyEditId(record._id);
    setAdminDailyEntryOpen(true);
  };

  const deleteAdminDailyRecord = async (id: string) => {
    try {
      await attendanceApi.deleteManual(id);
      showToast("Record deleted");
      setAdminDailyDeleteId(null);
      const [manualRes, allRes] = await Promise.all([
        attendanceApi.getManual(),
        attendanceApi.getAll(),
      ]);
      setManualDbRecords(manualRes.records || []);
      setAllAttendance(allRes.records || []);
    } catch (err: any) {
      showToast(err.message || "Delete failed", "error");
    }
  };

  /* filtered CRUD records shown in User Attendance Control */
  const filteredAdminDailyRecords = (() => {
    let recs = [...allAttendance.filter(r => r.isManual && r.userId), ...manualDbRecords.filter(r => r.userId)];
    const seen = new Set<string>();
    recs = recs.filter(r => { if (seen.has(r._id)) return false; seen.add(r._id); return true; });
    if (adminDailyTab === "today") recs = recs.filter(r => r.date === todayStr);
    if (adminDailyUserFilter.trim()) {
      const q = adminDailyUserFilter.trim().toLowerCase();
      recs = recs.filter(r => (r.userId?.name || r.manualEmployeeName || "").toLowerCase().includes(q));
    }
    return recs.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  })();

  /* ============================================================
     MANUAL ATTENDANCE ENTRY (previous dates, name-based)
     ============================================================ */
  const submitManualAttendance = async () => {
    if (!manualAttendance.employeeId) { showToast("Please select an employee", "error"); return; }
    if (!manualAttendance.startDate || !manualAttendance.endDate) { showToast("Start date and end date are required", "error"); return; }
    if (!manualAttendance.checkIn) { showToast("Check-In time is required", "error"); return; }
    const today = format(new Date(), "yyyy-MM-dd");
    if (manualAttendance.endDate >= today) { showToast("Manual entry is only allowed for previous dates", "error"); return; }
    if (manualAttendance.startDate > manualAttendance.endDate) { showToast("Start date cannot be after end date", "error"); return; }
    try {
      setManualSubmitting(true);
      const res = await attendanceApi.addManual({
  employeeName: manualAttendance.employeeName,
  employeeRole: manualAttendance.employeeRole,
  startDate:    manualAttendance.startDate,
  endDate:      manualAttendance.endDate,
  checkIn:      manualAttendance.checkIn,
  checkOut:     manualAttendance.checkOut || undefined,
  tagline:      manualAttendance.tagline  || undefined,
  userId:       manualAttendance.employeeId || undefined,
});
      const manualRes = await attendanceApi.getManual();
      setManualDbRecords(manualRes.records || []);
      setManualAttendance(initManualAttendance);
      setManualAttendanceOpen(false);
      showToast(`✅ ${res.records.length} attendance record(s) saved to database`);
    } catch (err: any) {
      showToast(err.message || "Failed to save manual attendance", "error");
    } finally {
      setManualSubmitting(false);
    }
  };

  const deleteManualRecord = async (id: string) => {
    try {
      await attendanceApi.deleteManual(id);
      setManualDbRecords(prev => prev.filter(r => r._id !== id));
      showToast("Record deleted");
    } catch (err: any) {
      showToast(err.message || "Delete failed", "error");
    }
  };

  /* ============================================================
     ATTENDANCE REPORT HELPERS
     ============================================================ */
  const getReportDateRange = (): { start: string; end: string } => {
    const today = new Date();
    switch (reportFilter) {
      case "this_week":  return { start: format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"), end: format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd") };
      case "last_week":  { const lw = subWeeks(today, 1); return { start: format(startOfWeek(lw, { weekStartsOn: 1 }), "yyyy-MM-dd"), end: format(endOfWeek(lw, { weekStartsOn: 1 }), "yyyy-MM-dd") }; }
      case "this_month": return { start: format(startOfMonth(today), "yyyy-MM-dd"), end: format(endOfMonth(today), "yyyy-MM-dd") };
      case "last_month": { const lm = subMonths(today, 1); return { start: format(startOfMonth(lm), "yyyy-MM-dd"), end: format(endOfMonth(lm), "yyyy-MM-dd") }; }
      default:           return { start: reportStart, end: reportEnd };
    }
  };

  const filterApiAttendance = (rows: any[], start: string, end: string) => {
    let f = rows.filter(r => !r.isManual);
    if (start)                f = f.filter(r => r.date >= start);
    if (end)                  f = f.filter(r => r.date <= end);
    if (reportRole !== "all") f = f.filter(r => r.userId?.role === reportRole);
    if (reportName.trim())    f = f.filter(r => r.userId?.name?.toLowerCase().includes(reportName.trim().toLowerCase()));
    return f;
  };

  const filterManualDbAttendance = (rows: any[], start: string, end: string) => {
    let f = rows;
    if (start)                f = f.filter(r => r.date >= start);
    if (end)                  f = f.filter(r => r.date <= end);
    if (reportRole !== "all") f = f.filter(r => r.manualEmployeeRole === reportRole);
    if (reportName.trim())    f = f.filter(r => r.manualEmployeeName?.toLowerCase().includes(reportName.trim().toLowerCase()));
    return f;
  };

  const downloadAttendance = () => {
    const { start, end } = getReportDateRange();
    const apiFiltered    = filterApiAttendance(allAttendance, start, end);
    const manualFiltered = filterManualDbAttendance(manualDbRecords, start, end);
    const apiRows = apiFiltered.map(r => ({ date: r.date ?? "", name: r.userId?.name ?? "Unknown", role: r.userId?.role ?? "", checkIn: r.checkIn ?? "", checkOut: r.checkOut ?? "", workingHours: calculateWorkingHours(r.checkIn, r.checkOut) ?? "", tagline: r.tagline ?? "", source: "System" }));
    const manualRows = manualFiltered.map(r => ({ date: r.date ?? "", name: r.manualEmployeeName ?? "", role: r.manualEmployeeRole ?? "", checkIn: r.checkIn ?? "", checkOut: r.checkOut ?? "", workingHours: calculateWorkingHours(r.checkIn, r.checkOut) ?? "", tagline: r.tagline ?? "", source: `Manual (by ${r.enteredByName ?? "Admin"})` }));
    const combined = [...apiRows, ...manualRows];
    if (combined.length === 0) { showToast("No records match the selected filters", "error"); return; }
    combined.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.name || "").localeCompare(b.name || ""));
    const header = "Date,Name,Role,Check In,Check Out,Working Hours,Tagline,Source";
    const rows   = combined.map(r => `${r.date},${r.name},${r.role},${r.checkIn},${r.checkOut},${r.workingHours},"${(r.tagline || "").replace(/"/g, '""')}",${r.source}`);
    triggerDownload([header, ...rows].join("\n"), `attendance_report_${start || "all"}_to_${end || "all"}.csv`);
  };

  const previewCount = (() => {
    const { start, end } = getReportDateRange();
    return filterApiAttendance(allAttendance, start, end).length + filterManualDbAttendance(manualDbRecords, start, end).length;
  })();

  /* ============================================================
     COLOR / LABEL HELPERS
     ============================================================ */
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

  const filteredUsers = allUsersList.filter(u =>
    !userSearch.trim() ||
    u.name?.toLowerCase().includes(userSearch.trim().toLowerCase()) ||
    u.role?.toLowerCase().includes(userSearch.trim().toLowerCase()) ||
    u.department?.toLowerCase().includes(userSearch.trim().toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const checkedIn  = !!todayRecord?.checkIn;
  const checkedOut = !!todayRecord?.checkOut;

  const myCalendarRecords = [...myAttendance, ...manualDbRecords];
  const teamCalendarRecords = [...allAttendance, ...manualDbRecords];

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <div className={`${PAGE_BG} -m-4 sm:-m-6 p-4 sm:p-6 min-h-full`}>
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
          TODAY'S ATTENDANCE — CHECK IN / CHECK OUT (own)
          ══════════════════════════════════════════════════════ */}
      {canCheckInOut && (
        <Card className={`rounded-[28px] border ${PANEL_BORDER}`}>
          <CardHeader className="pb-3 px-3 sm:px-6">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm sm:text-base">
              <div className="flex items-center gap-2">
                <Clock size={17} />
                <span className="font-semibold">Today's Attendance</span>
                <span className="text-gray-400 font-normal text-xs hidden sm:inline">
                  — {format(new Date(), "MMMM d, yyyy")}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border self-start sm:self-auto">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                <LiveClock />
              </div>
            </CardTitle>
            <p className="text-xs text-gray-400 sm:hidden mt-0.5">{format(new Date(), "MMMM d, yyyy")}</p>
            {(isHR || isAdmin) && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isAdmin ? "bg-slate-700 text-white" : "bg-slate-500 text-white"}`}>
                  {isAdmin ? "Admin" : "HR"}
                </span>
                <span className="text-[11px] text-gray-500">— Your attendance is tracked too</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="flex flex-col gap-4">
              <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                <div className={`flex-shrink-0 flex flex-col items-center justify-center w-28 sm:w-36 h-20 sm:h-24 rounded-2xl border-2 transition-all ${checkedIn ? "border-[#EEB877] bg-[#FBE3C4]" : "border-dashed border-gray-300 bg-[#FAF8F3]"}`}>
                  <CheckCircle2 size={20} className={checkedIn ? "text-slate-600" : "text-gray-300"} />
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Check In</p>
                  <p className={`text-xs sm:text-sm font-bold mt-0.5 ${checkedIn ? "text-slate-700" : "text-gray-400"}`}>{todayRecord?.checkIn ?? "—"}</p>
                </div>
                <div className={`flex-shrink-0 flex flex-col items-center justify-center w-28 sm:w-36 h-20 sm:h-24 rounded-2xl border-2 transition-all ${checkedOut ? "border-[#3A6EA5] bg-[#DCE6FB]" : "border-dashed border-gray-300 bg-[#FAF8F3]"}`}>
                  <XCircle size={20} className={checkedOut ? "text-slate-600" : "text-gray-300"} />
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Check Out</p>
                  <p className={`text-xs sm:text-sm font-bold mt-0.5 ${checkedOut ? "text-slate-700" : "text-gray-400"}`}>{todayRecord?.checkOut ?? "—"}</p>
                </div>
                <div className="flex-shrink-0 flex flex-col items-center justify-center w-28 sm:w-36 h-20 sm:h-24 rounded-2xl border-2 border-gray-200 bg-white">
                  <span className="text-[10px] sm:text-xs text-gray-500">Status</span>
                  <span className={`mt-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold capitalize ${checkedOut ? "bg-slate-100 text-slate-700" : checkedIn ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {checkedOut ? "Completed" : checkedIn ? "Present" : "Not In"}
                  </span>
                  {checkedIn && !checkedOut && <span className="text-[10px] text-gray-400 mt-1">Working…</span>}
                </div>
              </div>

              {checkedIn && todayRecord?.tagline && (
  <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
    <span className="text-slate-400 text-sm mt-0.5">💬</span>
    <div>
      <p className="text-[10px] text-slate-400 font-medium">Today's tagline</p>
      <p className="text-xs sm:text-sm text-slate-700 italic">"{todayRecord.tagline}"</p>
    </div>
  </div>
)}

{checkedIn && todayRecord?.checkInLocation && (
  <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
    <span className="text-emerald-500 text-sm mt-0.5">📍</span>
    <div>
      <p className="text-[10px] text-emerald-500 font-medium">Check-in location</p>
      <p className="text-xs sm:text-sm text-emerald-700">{todayRecord.checkInLocation}</p>
    </div>
  </div>
)}
{checkedIn && !todayRecord?.checkInLocation && (
  <button
    onClick={() => handleAddMissingLocation("checkin")}
    disabled={locationRetryLoading === "checkin"}
    className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl text-left hover:bg-amber-100 transition-colors w-fit"
  >
    <span className="text-amber-500 text-sm">📍</span>
    <span className="text-xs sm:text-sm text-amber-700 font-medium">
      {locationRetryLoading === "checkin" ? "Capturing location…" : "Check-in location missing — tap to add"}
    </span>
  </button>
)}

{checkedOut && todayRecord?.checkOutLocation && (
  <div className="flex items-start gap-2 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
    <span className="text-red-400 text-sm mt-0.5">📍</span>
    <div>
      <p className="text-[10px] text-red-400 font-medium">Check-out location</p>
      <p className="text-xs sm:text-sm text-red-700">{todayRecord.checkOutLocation}</p>
    </div>
  </div>
)}
{checkedOut && !todayRecord?.checkOutLocation && (
  <button
    onClick={() => handleAddMissingLocation("checkout")}
    disabled={locationRetryLoading === "checkout"}
    className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl text-left hover:bg-amber-100 transition-colors w-fit"
  >
    <span className="text-amber-500 text-sm">📍</span>
    <span className="text-xs sm:text-sm text-amber-700 font-medium">
      {locationRetryLoading === "checkout" ? "Capturing location…" : "Check-out location missing — tap to add"}
    </span>
  </button>
)}

              <div className="flex gap-2 sm:gap-3 flex-wrap items-center">
                {!checkedIn && (
                  <Button onClick={() => setTaglineDialogOpen(true)} disabled={checkInLoading}
                    className={`${ACCENT_DARK} text-white hover:bg-black rounded-full h-10 sm:h-11 px-4 sm:px-6 text-xs sm:text-sm`}>
                    {checkInLoading
                      ? <span className="flex items-center gap-1.5"><RefreshCw size={13} className="animate-spin" /> Checking in…</span>
                      : <span className="flex items-center gap-1.5"><LogIn size={14} /> Check In</span>}
                  </Button>
                )}
                {checkedIn && !checkedOut && (
                  <Button onClick={handleCheckOut} disabled={checkOutLoading}
                    className={`${ACCENT_DARK} text-white hover:bg-black rounded-full h-10 sm:h-11 px-4 sm:px-6 text-xs sm:text-sm`}>
                    {checkOutLoading
                      ? <span className="flex items-center gap-1.5"><RefreshCw size={13} className="animate-spin" /> Checking out…</span>
                      : <span className="flex items-center gap-1.5"><LogOut size={14} /> Check Out</span>}
                  </Button>
                )}
                {checkedIn && checkedOut && (
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 sm:px-4 py-2 rounded-xl">
                    <CheckCircle2 size={16} className="text-slate-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-700">Day Complete</p>
                      <p className="text-[10px] sm:text-xs text-slate-500">{todayRecord.checkIn} → {todayRecord.checkOut}</p>
                    </div>
                  </div>
                )}
                <button onClick={loadTodayOnly} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors" title="Refresh">
                  <RefreshCw size={14} />
                </button>
              </div>
              <p className="text-[10px] sm:text-[11px] text-gray-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block flex-shrink-0" />
                Status refreshes every 30 seconds
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── TAGLINE DIALOG ── */}
      <Dialog open={taglineDialogOpen} onOpenChange={open => { setTaglineDialogOpen(open); if (!open) setCheckInTagline(""); }}>
        <DialogContent className="max-w-sm mx-3 sm:mx-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-base"><LogIn size={17} /> Check In</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-1">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setTaglineDialogOpen(false); setCheckInTagline(""); }} className="flex-1 text-sm">Cancel</Button>
              <Button onClick={() => handleCheckIn(checkInTagline)} disabled={checkInLoading} className={`flex-1 ${ACCENT_DARK} hover:bg-black text-white rounded-full text-sm`}>
                {checkInLoading
                  ? <span className="flex items-center gap-1.5 justify-center"><RefreshCw size={13} className="animate-spin" /> Checking in…</span>
                  : <span className="flex items-center gap-1.5 justify-center"><LogIn size={14} /> Check In</span>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════
          MONTHLY ATTENDANCE CALENDAR — OWN
          ══════════════════════════════════════════════════════ */}
      <Card className={`rounded-[28px] border ${PANEL_BORDER}`}>
        <CardHeader className="px-3 sm:px-6 pb-3">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Calendar size={17} />
            <span>My Monthly Attendance</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-normal ml-1">MongoDB</span>
          </CardTitle>
          <p className="text-xs text-gray-400 mt-0.5">Day-by-day attendance from your records stored in the database</p>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <MonthlyAttendanceCalendar
            records={myCalendarRecords}
            leaveRecords={myLeaveRecords}
            currentUserName={currentUser?.name ?? ""}
            currentUserId={currentUser?._id ?? ""}
          />
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════
          ADMIN / HR: TEAM MONTHLY ATTENDANCE CALENDAR
          ══════════════════════════════════════════════════════ */}
      {(isAdmin || isHR) && (
        <Card className={`rounded-[28px] border ${PANEL_BORDER}`}>
          <CardHeader className="px-3 sm:px-6 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Users size={17} />
              <span>Team Monthly Attendance</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isAdmin ? "bg-slate-700 text-white" : "bg-slate-500 text-white"}`}>
                {isAdmin ? "Admin" : "HR"}
              </span>
            </CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">Select a team member to view their monthly attendance calendar</p>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 space-y-4">
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
              {allUsersList.map(u => (
                <button key={u._id} onClick={() => setCalendarSelectedUser(calendarSelectedUser?._id === u._id ? null : u)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                    calendarSelectedUser?._id === u._id ? "bg-slate-700 text-white border-slate-700" : "bg-white text-gray-600 border-gray-200 hover:border-slate-400"
                  }`}>
                  <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-[10px] flex-shrink-0">
                    {u.name?.[0]?.toUpperCase()}
                  </span>
                  <span className="truncate max-w-[100px]">{u.name}</span>
                  <span className={`text-[9px] px-1 py-0.5 rounded ${calendarSelectedUser?._id === u._id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>{u.role}</span>
                </button>
              ))}
              {allUsersList.length === 0 && <p className="text-xs text-gray-400">No users found</p>}
            </div>
            {calendarSelectedUser ? (
              <div className="border border-slate-100 rounded-xl p-3 sm:p-4 bg-slate-50/30">
                <MonthlyAttendanceCalendar
                  records={teamCalendarRecords}
                  leaveRecords={allLeaveRecords}
                  userId={calendarSelectedUser._id}
                  userName={calendarSelectedUser.name}
                  isAdminView
                  allUsers={allUsersList}
                  canForceCheckout={isAdmin || isHR}
                  onForceCheckout={handleCalendarForceCheckout}
                  forceCheckoutLoadingId={calendarForceCheckoutLoadingId}
                  canMarkLeave={isAdmin || isHR}
                  onMarkLeave={handleCalendarMarkLeave}
                  markLeaveLoadingId={calendarMarkLeaveLoadingId}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 border border-dashed border-gray-200 rounded-xl">
                <Users size={28} className="mb-2 opacity-30" />
                <p className="text-sm">Select a team member above to view their calendar</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════
          ADMIN / HR: USER ATTENDANCE CONTROL PANEL (with CRUD)
          ══════════════════════════════════════════════════════ */}
      {canAdminControl && (
        <Card className={`rounded-[28px] border ${PANEL_BORDER}`}>
          <CardHeader className="px-3 sm:px-6 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <ShieldCheck size={17} className="text-slate-600" />
                <span>User Attendance Control</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ml-1 ${isAdmin ? "bg-slate-700 text-white" : "bg-slate-500 text-white"}`}>
                  {isAdmin ? "Admin" : "HR"}
                </span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{allUsersList.length} users</span>
                {isAdmin && (
                  <Button
                    onClick={() => {
                      setAdminDailyEntry({ ...initAdminDailyEntry, date: format(new Date(), "yyyy-MM-dd") });
                      setAdminDailyEditId(null);
                      setAdminDailyEntryOpen(true);
                    }}
                    className={`${ACCENT_DARK} hover:bg-black text-white rounded-full text-xs flex items-center gap-1.5 h-8 px-3`}
                  >
                    <Plus size={13} /> Add Entry
                  </Button>
                )}
                <button onClick={async () => {
                  try {
                    const [usersRes, allRes, manualRes] = await Promise.all([
                      attendanceApi.getUsersList(),
                      attendanceApi.getAll(),
                      attendanceApi.getManual(),
                    ]);
                    setAllUsersList(usersRes.users || []);
                    setAllAttendance(allRes.records || []);
                    setManualDbRecords(manualRes.records || []);
                    showToast("Refreshed");
                  } catch {}
                }} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors" title="Refresh">
                  <RefreshCw size={13} />
                </button>
              </div>
            </div>
            <div className="relative mt-2">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search by name, role, department…" value={userSearch} onChange={e => setUserSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 bg-gray-50" />
            </div>
          </CardHeader>

          <CardContent className="px-3 sm:px-6 space-y-5">
            {/* Live today check-in/out grid */}
            {filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Users size={32} className="mb-2 opacity-30" />
                <p className="text-sm">No users found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredUsers.map(u => {
                  const todayRec     = getUserTodayRecord(u._id);
                  const isIn         = !!todayRec?.checkIn;
                  const isOut        = !!todayRec?.checkOut;
                  const isProcessing = adminActionLoading === u._id;
                  return (
                    <div key={u._id} className={`border rounded-xl p-3 sm:p-4 bg-white shadow-sm hover:shadow-md transition-all ${isOut ? "border-slate-200 bg-slate-50/50" : isIn ? "border-green-200 bg-green-50/30" : "border-gray-200"}`}>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-gray-800 truncate">{u.name}</p>
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">{u.department || u.designation || u.email || "—"}</p>
                        </div>
                        <Badge className={`${roleColor(u.role)} text-[10px] flex-shrink-0`}>{u.role}</Badge>
                      </div>
                      <div className="flex gap-3 text-xs text-gray-500 mb-3">
                        <span className="flex items-center gap-1"><LogIn size={10} className={isIn ? "text-green-600" : "text-gray-300"} />{isIn ? todayRec.checkIn : "—"}</span>
                        <span className="flex items-center gap-1"><LogOut size={10} className={isOut ? "text-slate-500" : "text-gray-300"} />{isOut ? todayRec.checkOut : "—"}</span>
                      </div>
                      {todayRec?.tagline && <p className="text-[11px] text-slate-500 italic mb-2 truncate">💬 "{todayRec.tagline}"</p>}
                      <div className="mb-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isOut ? "bg-slate-100 text-slate-600" : isIn ? "bg-green-100 text-green-700" : "bg-red-50 text-red-500"}`}>
                          {isOut ? "✓ Completed" : isIn ? "● Working" : "✕ Not In"}
                        </span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {!isIn && (
                          <Button size="sm" disabled={isProcessing}
                            onClick={() => { setAdminCheckInUser(u); setAdminCheckInDialog(true); }}
                            className="flex-1 bg-slate-700 hover:bg-slate-800 text-white text-xs h-8 px-3 min-w-0">
                            {isProcessing ? <RefreshCw size={11} className="animate-spin mx-auto" /> : <span className="flex items-center gap-1 justify-center"><LogIn size={11} /> Check In</span>}
                          </Button>
                        )}
                        {isIn && !isOut && (
                          <>
                            <Button size="sm" disabled={isProcessing} onClick={() => handleAdminCheckOut(u)}
                              className="flex-1 bg-slate-500 hover:bg-slate-600 text-white text-xs h-8 px-3 min-w-0">
                              {isProcessing ? <RefreshCw size={11} className="animate-spin mx-auto" /> : <span className="flex items-center gap-1 justify-center"><LogOut size={11} /> Check Out</span>}
                            </Button>
                            <button
                              onClick={() => handleSendReminder(u)}
                              disabled={reminderLoading === u._id}
                              className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 transition-colors flex-shrink-0"
                              title="Send checkout reminder email"
                            >
                              {reminderLoading === u._id ? <RefreshCw size={12} className="animate-spin" /> : <span className="text-xs">📧</span>}
                            </button>
                          </>
                        )}
                        {isOut && (
                          <span className="flex-1 flex items-center justify-center gap-1 text-[11px] text-slate-500 bg-slate-100 rounded-lg h-8 px-2">
                            <CheckCircle2 size={11} /> Done
                          </span>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setAdminDailyEntry({ userId: u._id, date: format(new Date(), "yyyy-MM-dd"), checkIn: "", checkOut: "", tagline: "" });
                              setAdminDailyEditId(null);
                              setAdminDailyEntryOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors flex-shrink-0"
                            title="Add entry for any date"
                          >
                            <Edit2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Admin CRUD records table */}
            {isAdmin && (
              <div className="border-t border-gray-100 pt-4">
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <div className="flex rounded-lg border overflow-hidden text-xs self-start">
                    {(["today", "all"] as const).map(tab => (
                      <button key={tab} onClick={() => setAdminDailyTab(tab)}
                        className={`px-3 py-1.5 font-medium capitalize transition-colors ${
                          adminDailyTab === tab ? "bg-slate-700 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                        }`}>
                        {tab === "today" ? `Today (${format(new Date(), "MMM d")})` : "All Records"}
                      </button>
                    ))}
                  </div>
                  <div className="relative flex-1 max-w-xs">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search employee…"
                      value={adminDailyUserFilter}
                      onChange={e => setAdminDailyUserFilter(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 bg-gray-50"
                    />
                  </div>
                  <button
                    onClick={() => loadAdminDailyRecords()}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors self-start"
                    title="Refresh"
                  >
                    <RefreshCw size={13} className={adminDailyLoading ? "animate-spin" : ""} />
                  </button>
                </div>

                {adminDailyLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredAdminDailyRecords.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400 border border-dashed border-gray-200 rounded-xl">
                    <Calendar size={24} className="mb-2 opacity-30" />
                    <p className="text-sm">No manual entries found.</p>
                    <p className="text-xs mt-1 text-gray-300">Click "+ Add Entry" or the edit icon on a user card.</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                      <table className="w-full text-xs min-w-[560px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="text-left px-3 py-2.5 font-semibold text-slate-700">Employee</th>
                            <th className="text-left px-3 py-2.5 font-semibold text-slate-700">Date</th>
                            <th className="text-left px-3 py-2.5 font-semibold text-slate-700">Check In</th>
                            <th className="text-left px-3 py-2.5 font-semibold text-slate-700">Check Out</th>
                            <th className="text-left px-3 py-2.5 font-semibold text-slate-700 hidden sm:table-cell">Tagline</th>
                            <th className="text-left px-3 py-2.5 font-semibold text-slate-700">Status</th>
                            <th className="text-center px-3 py-2.5 font-semibold text-slate-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAdminDailyRecords.map(r => {
                            const name    = r.userId?.name || r.manualEmployeeName || "Unknown";
                            const empRole = r.userId?.role || r.manualEmployeeRole || "";
                            const isToday = r.date === todayStr;
                            return (
                              <tr key={r._id} className={`border-b last:border-0 hover:bg-slate-50/50 transition-colors ${isToday ? "bg-slate-50/30" : ""}`}>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-[10px] flex-shrink-0">
                                      {name[0]?.toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-semibold truncate max-w-[90px] sm:max-w-none">{name}</p>
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium text-white ${roleColor(empRole)}`}>{empRole}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="flex flex-col">
                                    <span className="font-medium">{r.date}</span>
                                    {isToday && <span className="text-[9px] text-slate-600 font-semibold">Today</span>}
                                  </div>
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className="font-mono text-emerald-700 font-semibold">{r.checkIn || "—"}</span>
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className="font-mono text-red-600 font-semibold">{r.checkOut || "—"}</span>
                                </td>
                                <td className="px-3 py-2.5 hidden sm:table-cell">
                                  {r.tagline
                                    ? <span className="italic text-gray-500 truncate max-w-[100px] block" title={r.tagline}>"{r.tagline}"</span>
                                    : <span className="text-gray-300">—</span>}
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${r.checkOut ? "bg-slate-100 text-slate-700" : r.checkIn ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                                    {r.checkOut ? "✓ Complete" : r.checkIn ? "● Active" : "Pending"}
                                  </span>
                                </td>
                                 <td className="px-3 py-2.5">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {r.checkIn && !r.checkOut && (
                                      <button
                                        onClick={() => handleForceCheckoutDate(r)}
                                        disabled={adminActionLoading === `${r._id}-force`}
                                        className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 transition-colors"
                                        title="Check out (missed checkout)"
                                      >
                                        {adminActionLoading === `${r._id}-force`
                                          ? <RefreshCw size={12} className="animate-spin" />
                                          : <LogOut size={12} />}
                                      </button>
                                    )}
                                    <button onClick={() => openEditAdminDaily(r)}
                                      className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors" title="Edit">
                                      <Edit2 size={12} />
                                    </button>
                                    <button onClick={() => setAdminDailyDeleteId(r._id)}
                                      className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors" title="Delete">
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                        {filteredAdminDailyRecords.length} record{filteredAdminDailyRecords.length !== 1 ? "s" : ""}
                      </span>
                      <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                        {filteredAdminDailyRecords.filter(r => r.checkIn && r.checkOut).length} complete
                      </span>
                      <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                        {filteredAdminDailyRecords.filter(r => r.checkIn && !r.checkOut).length} active
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Admin Entry Dialog (Create / Edit) — any date ── */}
      <Dialog open={adminDailyEntryOpen} onOpenChange={open => {
        setAdminDailyEntryOpen(open);
        if (!open) { setAdminDailyEntry(initAdminDailyEntry); setAdminDailyEditId(null); }
      }}>
        <DialogContent className="max-w-md mx-3 sm:mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldCheck size={17} className="text-slate-600" />
              {adminDailyEditId ? "Edit Attendance Entry" : "Add Attendance Entry"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1 block">
                Employee <span className="text-red-500">*</span>
              </label>
              <select
                className="border p-2 rounded w-full text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                value={adminDailyEntry.userId}
                onChange={e => setADE("userId", e.target.value)}
              >
                <option value="">— Select employee —</option>
                {allUsersList.map(u => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.role}{u.department ? ` · ${u.department}` : ""})
                  </option>
                ))}
              </select>
              {adminDailyEntry.userId && (() => {
                const u = allUsersList.find(x => x._id === adminDailyEntry.userId);
                return u ? (
                  <div className="mt-2 flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs flex-shrink-0">
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{u.name}</p>
                      <p className="text-[10px] text-gray-500">{u.role}{u.department ? ` · ${u.department}` : ""}</p>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1 block">
                Date <span className="text-red-500">*</span>
                <span className="font-normal text-slate-500 ml-1">(any date — past, today, or future)</span>
              </label>
              <input
                type="date"
                className="border p-2 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                value={adminDailyEntry.date}
                onChange={e => setADE("date", e.target.value)}
              />
              {adminDailyEntry.date && (
                <p className="text-[11px] mt-1 text-slate-600 font-medium">
                  📅 {adminDailyEntry.date === todayStr
                    ? "Today"
                    : adminDailyEntry.date > todayStr
                    ? `Future date (${adminDailyEntry.date})`
                    : `Past date (${adminDailyEntry.date})`}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 mb-2 block">
                Times <span className="text-red-500">*</span>
                <span className="font-normal text-gray-400 ml-1">(no restrictions)</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Check In <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    className="border p-2 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    value={adminDailyEntry.checkIn}
                    onChange={e => setADE("checkIn", e.target.value)}
                  />
                  {adminDailyEntry.checkIn && (
                    <p className="text-[10px] text-emerald-600 mt-0.5 font-mono font-semibold">→ {to12Hour(adminDailyEntry.checkIn)}</p>
                  )}
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Check Out</label>
                  <input
                    type="time"
                    className="border p-2 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    value={adminDailyEntry.checkOut}
                    onChange={e => setADE("checkOut", e.target.value)}
                  />
                  {adminDailyEntry.checkOut && (
                    <p className="text-[10px] text-red-500 mt-0.5 font-mono font-semibold">→ {to12Hour(adminDailyEntry.checkOut)}</p>
                  )}
                </div>
              </div>
              {adminDailyEntry.checkIn && adminDailyEntry.checkOut && (
                <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600">
                  ⏱ Duration: {(() => {
                    const [inH, inM]   = adminDailyEntry.checkIn.split(":").map(Number);
                    const [outH, outM] = adminDailyEntry.checkOut.split(":").map(Number);
                    const totalMins    = (outH * 60 + outM) - (inH * 60 + inM);
                    if (totalMins <= 0) return "Invalid range";
                    return `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`;
                  })()}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1 block">
                Tagline <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                className="border p-2 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder='e.g. "WFH — Client demo day"'
                value={adminDailyEntry.tagline}
                onChange={e => setADE("tagline", e.target.value)}
                maxLength={200}
              />
              {adminDailyEntry.tagline && (
                <p className="text-[10px] text-gray-400 mt-0.5 text-right">{adminDailyEntry.tagline.length}/200</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setAdminDailyEntryOpen(false); setAdminDailyEntry(initAdminDailyEntry); setAdminDailyEditId(null); }} className="flex-1 text-sm">
                Cancel
              </Button>
              <Button
                onClick={submitAdminDailyEntry}
                disabled={adminDailySubmitting}
                className="flex-1 bg-slate-700 hover:bg-slate-800 text-white text-sm"
              >
                {adminDailySubmitting
                  ? <span className="flex items-center gap-1.5 justify-center"><RefreshCw size={13} className="animate-spin" /> Saving…</span>
                  : <span className="flex items-center gap-1.5 justify-center">
                      {adminDailyEditId ? <><Edit2 size={13} /> Update</> : <><Plus size={13} /> Save</>}
                    </span>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!adminDailyDeleteId} onOpenChange={open => { if (!open) setAdminDailyDeleteId(null); }}>
        <DialogContent className="max-w-sm mx-3 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-red-600">
              <Trash2 size={17} /> Confirm Delete
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-gray-600">Are you sure you want to delete this attendance record? This action cannot be undone.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAdminDailyDeleteId(null)} className="flex-1">Cancel</Button>
              <Button onClick={() => adminDailyDeleteId && deleteAdminDailyRecord(adminDailyDeleteId)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                <Trash2 size={13} className="mr-1" /> Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Admin Check-In for User Dialog (today, quick) ── */}
      <Dialog open={adminCheckInDialog} onOpenChange={open => { setAdminCheckInDialog(open); if (!open) { setAdminCheckInTagline(""); setAdminCheckInUser(null); } }}>
        <DialogContent className="max-w-sm mx-3 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldCheck size={17} /> Check In for {adminCheckInUser?.name}
            </DialogTitle>
          </DialogHeader>
          {adminCheckInUser && (
            <div className="space-y-4 mt-1">
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm flex-shrink-0">{adminCheckInUser.name?.[0]?.toUpperCase()}</div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{adminCheckInUser.name}</p>
                  <p className="text-xs text-gray-500">{adminCheckInUser.role} · {adminCheckInUser.department || adminCheckInUser.email}</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Tagline <span className="font-normal text-gray-400">(optional)</span></label>
                <input className="border p-2 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder='e.g. "WFH today"'
                  value={adminCheckInTagline}
                  onChange={e => setAdminCheckInTagline(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAdminCheckIn(adminCheckInUser, adminCheckInTagline)}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setAdminCheckInDialog(false); setAdminCheckInTagline(""); }} className="flex-1 text-sm">Cancel</Button>
                <Button onClick={() => handleAdminCheckIn(adminCheckInUser, adminCheckInTagline)} disabled={adminActionLoading === adminCheckInUser._id}
                  className="flex-1 bg-slate-700 hover:bg-slate-800 text-white text-sm">
                  {adminActionLoading === adminCheckInUser._id
                    ? <span className="flex items-center gap-1.5 justify-center"><RefreshCw size={13} className="animate-spin" /> Checking in…</span>
                    : <span className="flex items-center gap-1.5 justify-center"><LogIn size={14} /> Check In</span>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════
          ADMIN / HR / MANAGER: TODAY'S OVERVIEW
          ══════════════════════════════════════════════════════ */}
      {(isAdmin || isHR || isManager) && (
        <Card>
          <CardHeader className="px-3 sm:px-6 pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base"><Users size={17} />Today's Attendance Overview</CardTitle>
              <div className="flex rounded-lg border overflow-hidden text-xs self-start sm:self-auto">
                <button onClick={() => setOverviewTab("present")}
                  className={`px-3 py-1.5 font-medium transition-colors flex items-center gap-1.5 ${overviewTab === "present" ? "bg-green-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                  <CheckCircle2 size={12} /> Present
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${overviewTab === "present" ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600"}`}>{todayPresentRecords.length}</span>
                </button>
                <button onClick={() => setOverviewTab("absent")}
                  className={`px-3 py-1.5 font-medium transition-colors flex items-center gap-1.5 ${overviewTab === "absent" ? "bg-red-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                  <UserX size={12} /> Absent
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${overviewTab === "absent" ? "bg-red-400 text-white" : "bg-gray-100 text-gray-600"}`}>{absentUsers.length}</span>
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {overviewTab === "present" ? (
              todayPresentRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400"><Users size={32} className="mb-2 opacity-30" /><p className="text-sm">No one has checked in yet today.</p></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {mergedTodayRecords.map(r => (
                    <div key={r._id} className="border rounded-xl p-3 sm:p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{r.userId?.name}</p>
                          <div className="flex gap-2 sm:gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                            <span className="flex items-center gap-1"><LogIn size={10} className="text-slate-500 flex-shrink-0" />{r.checkIn ?? "—"}</span>
                            <span className="flex items-center gap-1"><LogOut size={10} className="text-slate-400 flex-shrink-0" />{r.checkOut ?? "—"}</span>
                          </div>
                          {r.tagline && <p className="text-[11px] text-slate-500 italic mt-1.5 truncate">💬 "{r.tagline}"</p>}
                        </div>
                        <Badge className={`${roleColor(r.userId?.role)} text-[10px] flex-shrink-0`}>{r.userId?.role}</Badge>
                      </div>
                      <div className="mt-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${r.isLeave ? "bg-amber-100 text-amber-700" : r.checkOut ? "bg-slate-100 text-slate-700" : r.checkIn ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
  {r.isLeave ? "🏖 On Leave" : r.checkOut ? "✓ Completed" : r.checkIn ? "● Working" : "Absent"}
</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              absentUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400"><CheckCircle2 size={32} className="mb-2 opacity-30 text-green-400" /><p className="text-sm">Everyone has checked in today! 🎉</p></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {absentUsers.map((u: any) => (
                    <div key={u._id} className="border border-red-100 rounded-xl p-3 sm:p-4 bg-red-50/40 hover:bg-red-50 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-gray-800 truncate">{u.name}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{u.department || u.designation || "—"}</p>
                        </div>
                        <Badge className={`${roleColor(u.role)} text-[10px] flex-shrink-0`}>{u.role}</Badge>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-600">✕ Absent Today</span>
                        {canAdminControl && (
                          <button onClick={() => { setAdminCheckInUser(u); setAdminCheckInDialog(true); }}
                            className="text-[10px] flex items-center gap-1 text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors font-medium">
                            <LogIn size={10} /> Check In
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════
          ATTENDANCE REPORT
          ══════════════════════════════════════════════════════ */}
      {(isAdmin || isManager) && (
        <Card className={`rounded-[28px] border ${PANEL_BORDER}`}>
          <CardHeader className="px-3 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base"><Calendar size={17} /> Attendance Report</CardTitle>
              {isAdmin && (
                <Dialog open={manualAttendanceOpen} onOpenChange={open => { setManualAttendanceOpen(open); if (!open) setManualAttendance(initManualAttendance); }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2 text-xs sm:text-sm border-dashed border-gray-400 hover:border-gray-600 self-start sm:self-auto">
                      <PlusCircle size={14} /> Add Previous Entry
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto mx-3 sm:mx-auto">
                    <DialogHeader><DialogTitle>Manual Attendance Entry</DialogTitle></DialogHeader>
                    <div className="space-y-4 mt-1">
                      <div>
  <label className="text-xs font-semibold text-gray-700 mb-1 block">Employee <span className="text-red-500">*</span></label>
  <select
    className="border p-2 rounded w-full text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
    value={manualAttendance.employeeId}
    onChange={e => {
      const u = allUsersList.find(x => x._id === e.target.value);
      setManualAttendance(f => ({
        ...f,
        employeeId:   e.target.value,
        employeeName: u?.name || "",
        employeeRole: u?.role || "employee",
      }));
    }}
  >
    <option value="">— Select employee —</option>
    {allUsersList.map(u => (
      <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
    ))}
  </select>
</div>
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">Date Range <span className="text-red-500">*</span> <span className="font-normal text-gray-400 ml-1">(previous dates only)</span></label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] text-gray-500 mb-1 block">From</label>
                            <input type="date" max={format(new Date(Date.now() - 86400000), "yyyy-MM-dd")}
                              className="border p-2 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                              value={manualAttendance.startDate} onChange={e => setMA("startDate", e.target.value)} />
                          </div>
                          <div>
                            <label className="text-[11px] text-gray-500 mb-1 block">To</label>
                            <input type="date" max={format(new Date(Date.now() - 86400000), "yyyy-MM-dd")}
                              className="border p-2 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                              value={manualAttendance.endDate} onChange={e => setMA("endDate", e.target.value)} />
                          </div>
                        </div>
                        {manualAttendance.startDate && manualAttendance.endDate && manualAttendance.startDate <= manualAttendance.endDate && (
                          <p className="text-[11px] text-slate-600 mt-1.5 font-medium">
                            📅 {eachDayOfInterval({ start: parseISO(manualAttendance.startDate), end: parseISO(manualAttendance.endDate) }).length} day(s) will be saved to database
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">Check-In / Check-Out Time</label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] text-gray-500 mb-1 block">Check In <span className="text-red-500">*</span></label>
                            <input type="time" className="border p-2 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                              value={manualAttendance.checkIn} onChange={e => setMA("checkIn", e.target.value)} />
                          </div>
                          <div>
                            <label className="text-[11px] text-gray-500 mb-1 block">Check Out</label>
                            <input type="time" className="border p-2 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                              value={manualAttendance.checkOut} onChange={e => setMA("checkOut", e.target.value)} />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">Tagline <span className="font-normal text-gray-400 ml-1">(optional)</span></label>
                        <input className="border p-2 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                          placeholder='e.g. "Working from home due to travel"' value={manualAttendance.tagline} onChange={e => setMA("tagline", e.target.value)} />
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
                        ℹ️ This entry will be <strong>saved to MongoDB</strong> and included in all reports and calendars.
                      </div>
                      <Button onClick={submitManualAttendance} disabled={manualSubmitting} className="w-full bg-slate-800 hover:bg-slate-900 text-white">
                        {manualSubmitting ? <span className="flex items-center gap-2 justify-center"><RefreshCw size={14} className="animate-spin" /> Saving…</span> : "Save to Database"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5 px-3 sm:px-6">
            {isAdmin && manualDbRecords.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-3 sm:px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-700">🗄️ MongoDB Manual Records ({manualDbRecords.length} total)</span>
                </div>
                <div className="overflow-x-auto max-h-52 overflow-y-auto">
                  <table className="w-full text-xs min-w-[600px]">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Name</th>
                        <th className="text-left px-3 py-2 font-medium">Role</th>
                        <th className="text-left px-3 py-2 font-medium">Date</th>
                        <th className="text-left px-3 py-2 font-medium">Check In</th>
                        <th className="text-left px-3 py-2 font-medium">Check Out</th>
                        <th className="text-left px-3 py-2 font-medium">Tagline</th>
                        <th className="text-left px-3 py-2 font-medium">Added By</th>
                        <th className="text-left px-3 py-2 font-medium">Delete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {manualDbRecords.map(r => (
                        <tr key={r._id} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">{r.manualEmployeeName}</td>
                          <td className="px-3 py-2"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium text-white ${roleColor(r.manualEmployeeRole)}`}>{r.manualEmployeeRole}</span></td>
                          <td className="px-3 py-2">{r.date}</td>
                          <td className="px-3 py-2">{r.checkIn}</td>
                          <td className="px-3 py-2">{r.checkOut || "—"}</td>
                          <td className="px-3 py-2 text-gray-500 italic max-w-[120px] truncate" title={r.tagline}>{r.tagline || "—"}</td>
                          <td className="px-3 py-2 text-gray-500">{r.enteredByName}</td>
                          <td className="px-3 py-2"><button onClick={() => deleteManualRecord(r._id)} className="text-red-500 hover:text-red-700 font-medium">✕</button></td>
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
                  { value: "this_week",  label: "This Week"  },
                  { value: "last_week",  label: "Last Week"  },
                  { value: "this_month", label: "This Month" },
                  { value: "last_month", label: "Last Month" },
                  { value: "custom",     label: "Custom"     },
                ] as const).map(opt => (
                  <button key={opt.value} onClick={() => setReportFilter(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${reportFilter === opt.value ? "bg-slate-800 text-white border-slate-800" : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {reportFilter === "custom" && (
              <div className="flex flex-wrap gap-3 sm:gap-4">
                <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                  <label className="text-xs text-gray-500">From</label>
                  <input type="date" value={reportStart} onChange={e => setReportStart(e.target.value)} className="border p-2 rounded text-sm w-full" />
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                  <label className="text-xs text-gray-500">To</label>
                  <input type="date" value={reportEnd} onChange={e => setReportEnd(e.target.value)} className="border p-2 rounded text-sm w-full" />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 sm:gap-4">
              <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
                <label className="text-xs text-gray-500">Filter by Role</label>
                <select value={reportRole} onChange={e => setReportRole(e.target.value)} className="border p-2 rounded text-sm bg-white w-full">
                  <option value="all">All Roles</option>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="hr">HR</option>
                  {isAdmin && <option value="admin">Admin</option>}
                </select>
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                <label className="text-xs text-gray-500">Filter by Name</label>
                <input type="text" placeholder="Search name…" value={reportName} onChange={e => setReportName(e.target.value)} className="border p-2 rounded text-sm w-full" />
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">{previewCount} record{previewCount !== 1 ? "s" : ""} matched</span>
              <Button onClick={downloadAttendance} className={`${ACCENT_DARK} hover:bg-black rounded-full text-white flex items-center gap-2 text-xs sm:text-sm`}>
                <Download size={14} /> Download CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </div>
  );
}
