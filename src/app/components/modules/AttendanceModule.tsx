// src/app/components/modules/AttendanceModule.tsx

import { useEffect, useState, useRef, useCallback } from "react";
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
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  subWeeks, subMonths, eachDayOfInterval, parseISO, getDaysInMonth,
  startOfDay,
} from "date-fns";
import {
  LogIn, LogOut, Download, Users, Calendar, Clock,
  PlusCircle, RefreshCw, CheckCircle2, XCircle, UserX,
  AlertCircle, Search, ShieldCheck, ChevronLeft, ChevronRight,
  TrendingUp,
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

const initManualAttendance = {
  employeeName: "",
  employeeRole: "employee",
  startDate:    "",
  endDate:      "",
  checkIn:      "",
  checkOut:     "",
  tagline:      "",
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
   MONTHLY ATTENDANCE CALENDAR COMPONENT
   ============================================================ */
interface MonthlyAttendanceProps {
  records: any[];
  leaveRecords: any[];
  userId?: string;
  userName?: string;
  isAdminView?: boolean;
  allUsers?: any[];       // ← NEW: full user list for name-based matching
  currentUserName?: string; // ← NEW: current user's name for own calendar
}

const MonthlyAttendanceCalendar = ({
  records,
  leaveRecords,
  userId,
  userName,
  isAdminView = false,
  allUsers = [],
  currentUserName = "",
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

    // ── FIX: find attendance record including manual records ──
    const attRecord = records.find(r => {
      if (userId) {
        // ── Admin/HR viewing a specific selected user ──
        if (r.isManual) {
          // Try userId match first (newer manual records may have userId)
          const manualUserId = r.userId
            ? (typeof r.userId === "object" ? r.userId?._id : String(r.userId))
            : null;
          if (manualUserId && r.date === dateStr) return manualUserId === userId;

          // ── KEY FIX: fall back to name match for older records without userId ──
          if (!manualUserId && r.date === dateStr) {
            const selectedUser = allUsers.find((u: any) => u._id === userId);
            if (selectedUser && r.manualEmployeeName) {
              return r.manualEmployeeName.trim().toLowerCase() ===
                     selectedUser.name.trim().toLowerCase();
            }
          }
          return false;
        }
        // Normal (non-manual) record
        return r.date === dateStr && r.userId?._id === userId;
      }

      // ── Own calendar (no userId prop passed) ──
      if (r.isManual) {
        // Match manual records by employee name = current user's name
        if (!currentUserName) return r.date === dateStr; // fallback: show all
        return r.date === dateStr &&
          r.manualEmployeeName?.trim().toLowerCase() ===
          currentUserName.trim().toLowerCase();
      }
      return r.date === dateStr;
    });

    const leaveRecord = leaveRecords.find(l => {
      const approved = l.status === "approved" || l.status === "emergency_approved";
      if (!approved) return false;
      if (userId) return dateStr >= l.startDate && dateStr <= l.endDate && l.userId?._id === userId;
      return dateStr >= l.startDate && dateStr <= l.endDate;
    });

    let status: "present" | "absent" | "leave" | "weekend" | "future" | "partial" = "absent";
    if (isFuture)         status = "future";
    else if (isWeekend)   status = "weekend";
    else if (leaveRecord) status = "leave";
    else if (attRecord?.checkIn && attRecord?.checkOut) status = "present";
    else if (attRecord?.checkIn && !attRecord?.checkOut) status = "partial";
    else                  status = "absent";

    return {
      day, dateStr, isToday, isFuture, isWeekend, status,
      checkIn:   attRecord?.checkIn  ?? null,
      checkOut:  attRecord?.checkOut ?? null,
      tagline:   attRecord?.tagline  ?? null,
      leaveType: leaveRecord?.type   ?? null,
      isManual:  attRecord?.isManual ?? false,
    };
  });

  const workingDays = dayData.filter(d => !d.isWeekend && !d.isFuture).length;
  const presentDays = dayData.filter(d => d.status === "present" || d.status === "partial").length;
  const absentDays  = dayData.filter(d => d.status === "absent").length;
  const leaveDays   = dayData.filter(d => d.status === "leave").length;
  const percentage  = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;

  const isCurrentMonth =
    format(viewMonth, "yyyy-MM") === format(new Date(), "yyyy-MM");

  const cellBg = (status: string) => {
    switch (status) {
      case "present": return "bg-emerald-100 border border-emerald-200";
      case "partial":  return "bg-blue-50 border border-blue-200";
      case "absent":   return "bg-red-50 border border-red-200";
      case "leave":    return "bg-amber-50 border border-amber-200";
      case "weekend":  return "bg-gray-50 border border-gray-100";
      default:         return "bg-white border border-gray-100";
    }
  };

  const cellTextColor = (status: string) => {
    switch (status) {
      case "present": return "text-emerald-800";
      case "partial":  return "text-blue-700";
      case "absent":   return "text-red-700";
      case "leave":    return "text-amber-700";
      case "weekend":
      case "future":   return "text-gray-300";
      default:         return "text-gray-700";
    }
  };

  return (
    <div className="w-full space-y-3">

      {/* Header */}
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

      {/* Stats */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Rate",    value: `${percentage}%`, bg: "bg-slate-800",    text: "text-white"         },
          { label: "Present", value: presentDays,       bg: "bg-emerald-50",  text: "text-emerald-800"   },
          { label: "Absent",  value: absentDays,        bg: "bg-red-50",      text: "text-red-800"       },
          { label: "Leave",   value: leaveDays,         bg: "bg-amber-50",    text: "text-amber-800"     },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-lg py-2 px-1 text-center border border-gray-100`}>
            <p className={`text-sm font-black leading-none ${s.text}`}>{s.value}</p>
            <p className={`text-[9px] mt-1 font-semibold uppercase tracking-wide ${s.text} opacity-70`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Progress */}
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

      {/* Calendar */}
      <div className="w-full">
        {/* Weekday headers */}
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

        {/* Day grid */}
        <div className="grid grid-cols-7" style={{ gap: "2px" }}>
          {/* Empty leading cells */}
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

                  {/* Status micro-indicator */}
                  {d.status === "present" && !d.isManual && (
                    <span className="w-1 h-1 rounded-full bg-emerald-500 mt-0.5 opacity-80" />
                  )}
                  {/* ── Manual entry indicator: show "M" dot ── */}
                  {d.status === "present" && d.isManual && (
                    <span className="text-[6px] font-black text-emerald-600 mt-0.5 leading-none">M</span>
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

                {/* Tooltip */}
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
                    <div className="bg-gray-900 text-white rounded-xl shadow-2xl px-3 py-2 text-left whitespace-nowrap">
                      <p className="text-[11px] font-bold mb-1">
                        {format(parseISO(d.dateStr), "d MMM yyyy")}
                      </p>
                      <p className={`text-[10px] font-semibold capitalize mb-1 ${
                        d.status === "present" ? "text-emerald-400" :
                        d.status === "partial"  ? "text-blue-400"    :
                        d.status === "leave"    ? "text-amber-400"   :
                        "text-red-400"
                      }`}>
                        {d.status === "partial" ? "Partial day" : d.status}
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
                      {d.leaveType && (
                        <p className="text-[10px] text-amber-400 mt-0.5">{d.leaveType}</p>
                      )}
                      {d.tagline && (
                        <p className="text-[10px] text-gray-400 italic mt-0.5 max-w-[150px] truncate">
                          "{d.tagline}"
                        </p>
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

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 pt-2 border-t border-gray-100">
        {[
          { color: "bg-emerald-100 border border-emerald-200", label: "Present"  },
          { color: "bg-blue-50 border border-blue-200",        label: "Partial"  },
          { color: "bg-red-50 border border-red-200",          label: "Absent"   },
          { color: "bg-amber-50 border border-amber-200",      label: "Leave"    },
          { color: "bg-gray-50 border border-gray-200",        label: "Weekend"  },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1 text-[10px] text-gray-500">
            <span className={`w-2.5 h-2.5 rounded-sm ${l.color} flex-shrink-0`} />
            <span className="font-medium">{l.label}</span>
          </div>
        ))}
        {/* Manual entry legend item */}
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
  const [todayAllRecords,  setTodayAllRecords]  = useState<any[]>([]);
  const [manualDbRecords,  setManualDbRecords]  = useState<any[]>([]);
  const [leaves,           setLeaves]           = useState<any>(null);
  const [myLeaves,         setMyLeaves]         = useState<any[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [checkInLoading,   setCheckInLoading]   = useState(false);
  const [checkOutLoading,  setCheckOutLoading]  = useState(false);
  const [toast,            setToast]            = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [form,             setForm]             = useState(initForm);
  const [dialogOpen,       setDialogOpen]       = useState(false);
  const [activeTab,        setActiveTab]        = useState<"pending" | "all">("pending");

  const [checkInTagline,    setCheckInTagline]    = useState("");
  const [taglineDialogOpen, setTaglineDialogOpen] = useState(false);

  const [manualAttendanceOpen, setManualAttendanceOpen] = useState(false);
  const [manualAttendance,     setManualAttendance]     = useState(initManualAttendance);
  const [manualSubmitting,     setManualSubmitting]     = useState(false);

  const [manualLeaveOpen,    setManualLeaveOpen]    = useState(false);
  const [manualLeave,        setManualLeave]        = useState(initManualLeave);
  const [manualLeaveRecords, setManualLeaveRecords] = useState<any[]>([]);

  const [reportFilter, setReportFilter] = useState<"custom"|"this_week"|"last_week"|"this_month"|"last_month">("custom");
  const [reportStart,  setReportStart]  = useState("");
  const [reportEnd,    setReportEnd]    = useState("");
  const [reportRole,   setReportRole]   = useState("all");
  const [reportName,   setReportName]   = useState("");

  const [leaveReportFilter, setLeaveReportFilter] = useState<"custom"|"this_month"|"last_month"|"this_year"|"last_year">("this_month");
  const [leaveReportStart,  setLeaveReportStart]  = useState("");
  const [leaveReportEnd,    setLeaveReportEnd]    = useState("");

  const [overviewTab,  setOverviewTab]  = useState<"present" | "absent">("present");

  const [adminCheckInDialog,  setAdminCheckInDialog]  = useState(false);
  const [adminCheckInUser,    setAdminCheckInUser]    = useState<any>(null);
  const [adminCheckInTagline, setAdminCheckInTagline] = useState("");
  const [adminActionLoading,  setAdminActionLoading]  = useState<string | null>(null);

  const [userSearch, setUserSearch] = useState("");
  const [calendarSelectedUser, setCalendarSelectedUser] = useState<any>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── helpers ── */
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const setF  = (k: keyof typeof initForm, v: any)             => setForm(f => ({ ...f, [k]: v }));
  const setMA = (k: keyof typeof initManualAttendance, v: any) => setManualAttendance(f => ({ ...f, [k]: v }));
  const setML = (k: keyof typeof initManualLeave, v: any)      => setManualLeave(f => ({ ...f, [k]: v }));

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
  const loadTodayOnly = useCallback(async () => {
    try {
      const todayRes = await attendanceApi.getToday();
      setTodayRecord(todayRes.record || null);

      if (isAdmin || isHR || isManager) {
        const allRes = await attendanceApi.getAll();
        setAllAttendance(allRes.records || []);
      }
    } catch (err: any) {
      console.error("loadTodayOnly error:", err.message);
    }
  }, [isAdmin, isHR, isManager]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const todayRes = await attendanceApi.getToday();
      setTodayRecord(todayRes.record || null);

      const myRes = await attendanceApi.getMy();
      setMyAttendance(myRes.records || []);

      if (isAdmin || isHR || isManager) {
        const allRes = await attendanceApi.getAll();
        setAllAttendance(allRes.records || []);
      }

      if (canAdminControl) {
        const usersRes = await attendanceApi.getUsersList();
        setAllUsersList(usersRes.users || []);
      }

      if (isAdmin) {
        const manualRes = await attendanceApi.getManual();
        setManualDbRecords(manualRes.records || []);
      }

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
  }, [isAdmin, isHR, isManager, canAdminControl]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    pollingRef.current = setInterval(() => {
      loadTodayOnly();
    }, 30000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [loadTodayOnly]);

  if (!currentUser) return null;

  const displayLeaves: any[] = isAdmin
    ? (activeTab === "pending" ? leaves?.pending ?? [] : leaves?.all ?? [])
    : (leaves ?? []);

  /* ============================================================
     TODAY's OVERVIEW
     ============================================================ */
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const todayPresentRecords = allAttendance.filter(
    r => r.date === todayStr && !r.isManual
  );

  const knownUserMap: Record<string, any> = {};
  allAttendance.forEach(r => {
    if (r.userId?._id && !knownUserMap[r.userId._id]) {
      knownUserMap[r.userId._id] = r.userId;
    }
  });
  allUsersList.forEach(u => {
    if (u._id && !knownUserMap[u._id]) {
      knownUserMap[u._id] = u;
    }
  });

  const presentUserIds = new Set(todayPresentRecords.map(r => r.userId?._id));
  const absentUsers = Object.values(knownUserMap).filter(u => !presentUserIds.has(u._id));

  /* ── get today's record for a specific user (admin panel) ── */
  const getUserTodayRecord = (userId: string) => {
    return todayPresentRecords.find(r => r.userId?._id === userId) || null;
  };

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

  /* ============================================================
     CHECK IN / CHECK OUT — own
     ============================================================ */
  const handleCheckIn = async (tagline?: string) => {
    try {
      setCheckInLoading(true);
      const res = await attendanceApi.checkIn({ tagline: tagline || checkInTagline || "" });
      setTodayRecord(res.record);
      showToast("✅ Checked in at " + res.record.checkIn);
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
      const res = await attendanceApi.checkOut();
      setTodayRecord(res.record);
      showToast("✅ Checked out at " + res.record.checkOut);
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

  /* ============================================================
     MANUAL ATTENDANCE ENTRY
     ============================================================ */
  const submitManualAttendance = async () => {
    if (!manualAttendance.employeeName.trim()) {
      showToast("Employee name is required", "error"); return;
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
     MANUAL LEAVE ENTRY
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
    let f = rows.filter(r => !r.isManual);
    if (start)                f = f.filter(r => r.date >= start);
    if (end)                  f = f.filter(r => r.date <= end);
    if (reportRole !== "all") f = f.filter(r => r.userId?.role === reportRole);
    if (reportName.trim())    f = f.filter(r =>
      r.userId?.name?.toLowerCase().includes(reportName.trim().toLowerCase()));
    return f;
  };

  const filterManualDbAttendance = (rows: any[], start: string, end: string) => {
    let f = rows;
    if (start)                f = f.filter(r => r.date >= start);
    if (end)                  f = f.filter(r => r.date <= end);
    if (reportRole !== "all") f = f.filter(r => r.manualEmployeeRole === reportRole);
    if (reportName.trim())    f = f.filter(r =>
      r.manualEmployeeName?.toLowerCase().includes(reportName.trim().toLowerCase()));
    return f;
  };

  /* ============================================================
     DOWNLOAD ATTENDANCE — FIX: strict ascending sort
     ============================================================ */
  const downloadAttendance = () => {
    const { start, end } = getReportDateRange();
    const apiFiltered    = filterApiAttendance(allAttendance, start, end);
    const manualFiltered = filterManualDbAttendance(manualDbRecords, start, end);

    const apiRows = apiFiltered.map(r => ({
      date:     r.date     ?? "",
      name:     r.userId?.name ?? "Unknown",
      role:     r.userId?.role ?? "",
      checkIn:  r.checkIn  ?? "",
      checkOut: r.checkOut ?? "",
      tagline:  r.tagline  ?? "",
      source:   "System",
    }));

    const manualRows = manualFiltered.map(r => ({
      date:     r.date     ?? "",
      name:     r.manualEmployeeName ?? "",
      role:     r.manualEmployeeRole ?? "",
      checkIn:  r.checkIn  ?? "",
      checkOut: r.checkOut ?? "",
      tagline:  r.tagline  ?? "",
      source:   `Manual (by ${r.enteredByName ?? "Admin"})`,
    }));

    const combined = [...apiRows, ...manualRows];

    if (combined.length === 0) {
      showToast("No records match the selected filters", "error");
      return;
    }

    // ── FIX: strict ascending sort by date (yyyy-MM-dd string compare is safe), then name ──
    combined.sort((a, b) => {
      if (a.date < b.date) return -1;
      if (a.date > b.date) return  1;
      return (a.name || "").localeCompare(b.name || "");
    });

    const header = "Date,Name,Role,Check In,Check Out,Tagline,Source";
    const rows   = combined.map(r =>
      `${r.date},${r.name},${r.role},${r.checkIn},${r.checkOut},"${(r.tagline || "").replace(/"/g, '""')}",${r.source}`
    );

    triggerDownload(
      [header, ...rows].join("\n"),
      `attendance_report_${start || "all"}_to_${end || "all"}.csv`
    );
  };

  const previewCount = (() => {
    const { start, end } = getReportDateRange();
    return (
      filterApiAttendance(allAttendance, start, end).length +
      filterManualDbAttendance(manualDbRecords, start, end).length
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
    if (start) f = f.filter(l => l.startDate >= start);
    if (end)   f = f.filter(l => l.endDate   <= end);
    return f;
  };

  const downloadLeaveReport = () => {
    const { start, end }  = getLeaveReportDateRange();
    const allApiLeaves    = isAdmin
      ? (leaves?.all ?? [])
      : (Array.isArray(leaves) ? leaves : []);

    const apiFiltered    = filterLeaveRows(allApiLeaves,       start, end);
    const manualFiltered = filterLeaveRows(manualLeaveRecords, start, end);

    const apiRows = apiFiltered.map(l => ({
      name:      l.userId?.name ?? "Unknown",
      role:      l.userId?.role ?? "",
      type:      l.type      ?? "",
      startDate: l.startDate ?? "",
      endDate:   l.endDate   ?? "",
      days:      l.days      ?? "",
      status:    l.status    ?? "",
      reason:    l.reason    ?? "",
      source:    "System",
    }));

    const manualRows = manualFiltered.map(l => ({
      name:      l.employeeName ?? "",
      role:      "Manual",
      type:      l.type      ?? "",
      startDate: l.startDate ?? "",
      endDate:   l.endDate   ?? "",
      days:      l.days      ?? "",
      status:    l.status    ?? "",
      reason:    l.reason    ?? "",
      source:    `Manual (by ${l.enteredBy})`,
    }));

    const all = [...apiRows, ...manualRows];

    if (all.length === 0) {
      showToast("No leave records match the selected filters", "error");
      return;
    }

    // Sort ascending by startDate then name
    all.sort((a, b) => {
      if (a.startDate < b.startDate) return -1;
      if (a.startDate > b.startDate) return  1;
      return (a.name || "").localeCompare(b.name || "");
    });

    const header = "Name,Role,Type,Start Date,End Date,Days,Status,Reason,Source";
    const rows   = all.map(l =>
      `${l.name},${l.role},${l.type},${l.startDate},${l.endDate},${l.days},${l.status},"${(l.reason || "").replace(/"/g, '""')}",${l.source}`
    );

    triggerDownload(
      [header, ...rows].join("\n"),
      `leave_report_${start || "all"}_to_${end || "all"}.csv`
    );
  };

  const leavePreviewCount = (() => {
    const { start, end } = getLeaveReportDateRange();
    const allApiLeaves = isAdmin ? (leaves?.all ?? []) : (Array.isArray(leaves) ? leaves : []);
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
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
            ✕ Rejected
          </span>
        )}
      </div>
    );
  };

  /* ── filtered users for admin control panel ── */
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

  // ── FIX: combined records for own calendar (real + manual DB records) ──
  const myCalendarRecords = isAdmin
    ? [...myAttendance, ...manualDbRecords]
    : myAttendance;

  // ── FIX: combined records for team calendar (real + manual DB records) ──
  const teamCalendarRecords = [...allAttendance, ...manualDbRecords];

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
          TODAY'S ATTENDANCE — CHECK IN / CHECK OUT (own)
          ══════════════════════════════════════════════════════ */}
      {canCheckInOut && (
        <Card className="border-2 border-gray-100">
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
            <p className="text-xs text-gray-400 sm:hidden mt-0.5">
              {format(new Date(), "MMMM d, yyyy")}
            </p>
            {(isHR || isAdmin) && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  isAdmin ? "bg-slate-700 text-white" : "bg-slate-500 text-white"
                }`}>
                  {isAdmin ? "Admin" : "HR"}
                </span>
                <span className="text-[11px] text-gray-500">
                  — Your attendance is tracked too
                </span>
              </div>
            )}
          </CardHeader>

          <CardContent className="px-3 sm:px-6">
            <div className="flex flex-col gap-4">
              <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                <div className={`flex-shrink-0 flex flex-col items-center justify-center w-28 sm:w-36 h-20 sm:h-24 rounded-2xl border-2 transition-all ${
                  checkedIn ? "border-slate-400 bg-slate-50" : "border-dashed border-gray-300 bg-gray-50"
                }`}>
                  <CheckCircle2 size={20} className={checkedIn ? "text-slate-600" : "text-gray-300"} />
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Check In</p>
                  <p className={`text-xs sm:text-sm font-bold mt-0.5 ${checkedIn ? "text-slate-700" : "text-gray-400"}`}>
                    {todayRecord?.checkIn ?? "—"}
                  </p>
                </div>
                <div className={`flex-shrink-0 flex flex-col items-center justify-center w-28 sm:w-36 h-20 sm:h-24 rounded-2xl border-2 transition-all ${
                  checkedOut ? "border-slate-500 bg-slate-100" : "border-dashed border-gray-300 bg-gray-50"
                }`}>
                  <XCircle size={20} className={checkedOut ? "text-slate-600" : "text-gray-300"} />
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Check Out</p>
                  <p className={`text-xs sm:text-sm font-bold mt-0.5 ${checkedOut ? "text-slate-700" : "text-gray-400"}`}>
                    {todayRecord?.checkOut ?? "—"}
                  </p>
                </div>
                <div className="flex-shrink-0 flex flex-col items-center justify-center w-28 sm:w-36 h-20 sm:h-24 rounded-2xl border-2 border-gray-200 bg-white">
                  <span className="text-[10px] sm:text-xs text-gray-500">Status</span>
                  <span className={`mt-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold capitalize ${
                    checkedOut ? "bg-slate-100 text-slate-700" :
                    checkedIn  ? "bg-green-100 text-green-700" :
                    "bg-gray-100 text-gray-500"
                  }`}>
                    {checkedOut ? "Completed" : checkedIn ? "Present" : "Not In"}
                  </span>
                  {checkedIn && !checkedOut && (
                    <span className="text-[10px] text-gray-400 mt-1">Working…</span>
                  )}
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

              <div className="flex gap-2 sm:gap-3 flex-wrap items-center">
                {!checkedIn && (
                  <Button
                    onClick={() => setTaglineDialogOpen(true)}
                    disabled={checkInLoading}
                    className="bg-slate-700 text-white hover:bg-slate-800 h-10 sm:h-11 px-4 sm:px-6 text-xs sm:text-sm"
                  >
                    {checkInLoading
                      ? <span className="flex items-center gap-1.5"><RefreshCw size={13} className="animate-spin" /> Checking in…</span>
                      : <span className="flex items-center gap-1.5"><LogIn size={14} /> Check In</span>
                    }
                  </Button>
                )}
                {checkedIn && !checkedOut && (
                  <Button
                    onClick={handleCheckOut}
                    disabled={checkOutLoading}
                    className="bg-slate-600 text-white hover:bg-slate-700 h-10 sm:h-11 px-4 sm:px-6 text-xs sm:text-sm"
                  >
                    {checkOutLoading
                      ? <span className="flex items-center gap-1.5"><RefreshCw size={13} className="animate-spin" /> Checking out…</span>
                      : <span className="flex items-center gap-1.5"><LogOut size={14} /> Check Out</span>
                    }
                  </Button>
                )}
                {checkedIn && checkedOut && (
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 sm:px-4 py-2 rounded-xl">
                    <CheckCircle2 size={16} className="text-slate-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-700">Day Complete</p>
                      <p className="text-[10px] sm:text-xs text-slate-500">
                        {todayRecord.checkIn} → {todayRecord.checkOut}
                      </p>
                    </div>
                  </div>
                )}
                <button
                  onClick={loadTodayOnly}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors"
                  title="Refresh attendance"
                >
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
      <Dialog open={taglineDialogOpen} onOpenChange={open => {
        setTaglineDialogOpen(open);
        if (!open) setCheckInTagline("");
      }}>
        <DialogContent className="max-w-sm mx-3 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <LogIn size={17} /> Check In
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setTaglineDialogOpen(false); setCheckInTagline(""); }} className="flex-1 text-sm">
                Cancel
              </Button>
              <Button onClick={() => handleCheckIn(checkInTagline)} disabled={checkInLoading} className="flex-1 bg-slate-700 hover:bg-slate-800 text-white text-sm">
                {checkInLoading
                  ? <span className="flex items-center gap-1.5 justify-center"><RefreshCw size={13} className="animate-spin" /> Checking in…</span>
                  : <span className="flex items-center gap-1.5 justify-center"><LogIn size={14} /> Check In</span>
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════
          MONTHLY ATTENDANCE CALENDAR — OWN (all roles)
          FIX: uses myCalendarRecords = myAttendance + manualDbRecords
          ══════════════════════════════════════════════════════ */}
      <Card className="border-2 border-gray-100">
        <CardHeader className="px-3 sm:px-6 pb-3">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Calendar size={17} />
            <span>My Monthly Attendance</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-normal ml-1">
              MongoDB
            </span>
          </CardTitle>
          <p className="text-xs text-gray-400 mt-0.5">
            Day-by-day attendance from your records stored in the database
          </p>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <MonthlyAttendanceCalendar
            records={myCalendarRecords}
            leaveRecords={myLeaves}
            currentUserName={currentUser?.name ?? ""}
          />
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════
          ADMIN / HR: TEAM MONTHLY ATTENDANCE CALENDAR
          FIX: uses teamCalendarRecords = allAttendance + manualDbRecords
          ══════════════════════════════════════════════════════ */}
      {(isAdmin || isHR) && (
        <Card className="border-2 border-slate-200">
          <CardHeader className="px-3 sm:px-6 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Users size={17} />
              <span>Team Monthly Attendance</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                isAdmin ? "bg-slate-700 text-white" : "bg-slate-500 text-white"
              }`}>
                {isAdmin ? "Admin" : "HR"}
              </span>
            </CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">
              Select a team member to view their monthly attendance calendar
            </p>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 space-y-4">
            {/* User selector */}
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
              {allUsersList.map(u => (
                <button
                  key={u._id}
                  onClick={() => setCalendarSelectedUser(
                    calendarSelectedUser?._id === u._id ? null : u
                  )}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                    calendarSelectedUser?._id === u._id
                      ? "bg-slate-700 text-white border-slate-700"
                      : "bg-white text-gray-600 border-gray-200 hover:border-slate-400"
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-[10px] flex-shrink-0">
                    {u.name?.[0]?.toUpperCase()}
                  </span>
                  <span className="truncate max-w-[100px]">{u.name}</span>
                  <span className={`text-[9px] px-1 py-0.5 rounded ${
                    calendarSelectedUser?._id === u._id
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}>{u.role}</span>
                </button>
              ))}
              {allUsersList.length === 0 && (
                <p className="text-xs text-gray-400">No users found</p>
              )}
            </div>

            {/* Calendar for selected user */}
            {calendarSelectedUser ? (
              <div className="border border-slate-100 rounded-xl p-3 sm:p-4 bg-slate-50/30">
                <MonthlyAttendanceCalendar
                  records={teamCalendarRecords}
                  leaveRecords={isAdmin ? (leaves?.all ?? []) : (Array.isArray(leaves) ? leaves : [])}
                  userId={calendarSelectedUser._id}
                  userName={calendarSelectedUser.name}
                  isAdminView
                  allUsers={allUsersList}
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
          ADMIN / HR: USER ATTENDANCE CONTROL PANEL
          ══════════════════════════════════════════════════════ */}
      {canAdminControl && (
        <Card className="border-2 border-slate-200">
          <CardHeader className="px-3 sm:px-6 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <ShieldCheck size={17} className="text-slate-600" />
                <span>User Attendance Control</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ml-1 ${
                  isAdmin ? "bg-slate-700 text-white" : "bg-slate-500 text-white"
                }`}>
                  {isAdmin ? "Admin" : "HR"}
                </span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                  {allUsersList.length} users
                </span>
                <button
                  onClick={async () => {
                    try {
                      const [usersRes, allRes] = await Promise.all([
                        attendanceApi.getUsersList(),
                        attendanceApi.getAll(),
                      ]);
                      setAllUsersList(usersRes.users || []);
                      setAllAttendance(allRes.records || []);
                      showToast("Refreshed");
                    } catch {}
                  }}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw size={13} />
                </button>
              </div>
            </div>

            <div className="relative mt-2">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, role, department…"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 bg-gray-50"
              />
            </div>
          </CardHeader>

          <CardContent className="px-3 sm:px-6">
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
                    <div
                      key={u._id}
                      className={`border rounded-xl p-3 sm:p-4 bg-white shadow-sm hover:shadow-md transition-all ${
                        isOut  ? "border-slate-200 bg-slate-50/50" :
                        isIn   ? "border-green-200 bg-green-50/30" :
                        "border-gray-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-gray-800 truncate">{u.name}</p>
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">
                            {u.department || u.designation || u.email || "—"}
                          </p>
                        </div>
                        <Badge className={`${roleColor(u.role)} text-[10px] flex-shrink-0`}>
                          {u.role}
                        </Badge>
                      </div>

                      <div className="flex gap-3 text-xs text-gray-500 mb-3">
                        <span className="flex items-center gap-1">
                          <LogIn size={10} className={isIn ? "text-green-600" : "text-gray-300"} />
                          {isIn ? todayRec.checkIn : "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <LogOut size={10} className={isOut ? "text-slate-500" : "text-gray-300"} />
                          {isOut ? todayRec.checkOut : "—"}
                        </span>
                      </div>

                      {todayRec?.tagline && (
                        <p className="text-[11px] text-slate-500 italic mb-2 truncate">
                          💬 "{todayRec.tagline}"
                        </p>
                      )}

                      <div className="mb-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          isOut ? "bg-slate-100 text-slate-600" :
                          isIn  ? "bg-green-100 text-green-700" :
                          "bg-red-50 text-red-500"
                        }`}>
                          {isOut ? "✓ Completed" : isIn ? "● Working" : "✕ Not In"}
                        </span>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {!isIn && (
                          <Button
                            size="sm"
                            disabled={isProcessing}
                            onClick={() => {
                              setAdminCheckInUser(u);
                              setAdminCheckInDialog(true);
                            }}
                            className="flex-1 bg-slate-700 hover:bg-slate-800 text-white text-xs h-8 px-3 min-w-0"
                          >
                            {isProcessing
                              ? <RefreshCw size={11} className="animate-spin mx-auto" />
                              : <span className="flex items-center gap-1 justify-center">
                                  <LogIn size={11} /> Check In
                                </span>
                            }
                          </Button>
                        )}
                        {isIn && !isOut && (
                          <Button
                            size="sm"
                            disabled={isProcessing}
                            onClick={() => handleAdminCheckOut(u)}
                            className="flex-1 bg-slate-500 hover:bg-slate-600 text-white text-xs h-8 px-3 min-w-0"
                          >
                            {isProcessing
                              ? <RefreshCw size={11} className="animate-spin mx-auto" />
                              : <span className="flex items-center gap-1 justify-center">
                                  <LogOut size={11} /> Check Out
                                </span>
                            }
                          </Button>
                        )}
                        {isOut && (
                          <span className="flex-1 flex items-center justify-center gap-1 text-[11px] text-slate-500 bg-slate-100 rounded-lg h-8 px-2">
                            <CheckCircle2 size={11} /> Done
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Admin Check-In for User Dialog ── */}
      <Dialog open={adminCheckInDialog} onOpenChange={open => {
        setAdminCheckInDialog(open);
        if (!open) { setAdminCheckInTagline(""); setAdminCheckInUser(null); }
      }}>
        <DialogContent className="max-w-sm mx-3 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldCheck size={17} /> Check In for {adminCheckInUser?.name}
            </DialogTitle>
          </DialogHeader>
          {adminCheckInUser && (
            <div className="space-y-4 mt-1">
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm flex-shrink-0">
                  {adminCheckInUser.name?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{adminCheckInUser.name}</p>
                  <p className="text-xs text-gray-500">{adminCheckInUser.role} · {adminCheckInUser.department || adminCheckInUser.email}</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">
                  Tagline <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  className="border p-2 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder='e.g. "WFH today" or "Client meeting"'
                  value={adminCheckInTagline}
                  onChange={e => setAdminCheckInTagline(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAdminCheckIn(adminCheckInUser, adminCheckInTagline)}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setAdminCheckInDialog(false); setAdminCheckInTagline(""); }} className="flex-1 text-sm">
                  Cancel
                </Button>
                <Button
                  onClick={() => handleAdminCheckIn(adminCheckInUser, adminCheckInTagline)}
                  disabled={adminActionLoading === adminCheckInUser._id}
                  className="flex-1 bg-slate-700 hover:bg-slate-800 text-white text-sm"
                >
                  {adminActionLoading === adminCheckInUser._id
                    ? <span className="flex items-center gap-1.5 justify-center"><RefreshCw size={13} className="animate-spin" /> Checking in…</span>
                    : <span className="flex items-center gap-1.5 justify-center"><LogIn size={14} /> Check In</span>
                  }
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
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Users size={17} />
                Today's Attendance Overview
              </CardTitle>
              <div className="flex rounded-lg border overflow-hidden text-xs self-start sm:self-auto">
                <button
                  onClick={() => setOverviewTab("present")}
                  className={`px-3 py-1.5 font-medium transition-colors flex items-center gap-1.5 ${
                    overviewTab === "present" ? "bg-green-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <CheckCircle2 size={12} />
                  Present
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    overviewTab === "present" ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600"
                  }`}>
                    {todayPresentRecords.length}
                  </span>
                </button>
                <button
                  onClick={() => setOverviewTab("absent")}
                  className={`px-3 py-1.5 font-medium transition-colors flex items-center gap-1.5 ${
                    overviewTab === "absent" ? "bg-red-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <UserX size={12} />
                  Absent
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    overviewTab === "absent" ? "bg-red-400 text-white" : "bg-gray-100 text-gray-600"
                  }`}>
                    {absentUsers.length}
                  </span>
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {overviewTab === "present" ? (
              todayPresentRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <Users size={32} className="mb-2 opacity-30" />
                  <p className="text-sm">No one has checked in yet today.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {todayPresentRecords.map(r => (
                    <div key={r._id} className="border rounded-xl p-3 sm:p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{r.userId?.name}</p>
                          <div className="flex gap-2 sm:gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                            <span className="flex items-center gap-1">
                              <LogIn size={10} className="text-slate-500 flex-shrink-0" />
                              {r.checkIn ?? "—"}
                            </span>
                            <span className="flex items-center gap-1">
                              <LogOut size={10} className="text-slate-400 flex-shrink-0" />
                              {r.checkOut ?? "—"}
                            </span>
                          </div>
                          {r.tagline && (
                            <p className="text-[11px] text-slate-500 italic mt-1.5 truncate">
                              💬 "{r.tagline}"
                            </p>
                          )}
                        </div>
                        <Badge className={`${roleColor(r.userId?.role)} text-[10px] flex-shrink-0`}>
                          {r.userId?.role}
                        </Badge>
                      </div>
                      <div className="mt-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          r.checkOut ? "bg-slate-100 text-slate-700" :
                          r.checkIn  ? "bg-green-100 text-green-700" :
                          "bg-gray-100 text-gray-500"
                        }`}>
                          {r.checkOut ? "✓ Completed" : r.checkIn ? "● Working" : "Absent"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              absentUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <CheckCircle2 size={32} className="mb-2 opacity-30 text-green-400" />
                  <p className="text-sm">Everyone has checked in today! 🎉</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {absentUsers.map((u: any) => (
                    <div key={u._id} className="border border-red-100 rounded-xl p-3 sm:p-4 bg-red-50/40 hover:bg-red-50 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-gray-800 truncate">{u.name}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{u.department || u.designation || "—"}</p>
                        </div>
                        <Badge className={`${roleColor(u.role)} text-[10px] flex-shrink-0`}>
                          {u.role}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-600">
                          ✕ Absent Today
                        </span>
                        {canAdminControl && (
                          <button
                            onClick={() => {
                              setAdminCheckInUser(u);
                              setAdminCheckInDialog(true);
                            }}
                            className="text-[10px] flex items-center gap-1 text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors font-medium"
                          >
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
        <Card>
          <CardHeader className="px-3 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Calendar size={17} /> Attendance Report
              </CardTitle>

              {isAdmin && (
                <Dialog open={manualAttendanceOpen} onOpenChange={open => {
                  setManualAttendanceOpen(open);
                  if (!open) setManualAttendance(initManualAttendance);
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2 text-xs sm:text-sm border-dashed border-gray-400 hover:border-gray-600 self-start sm:self-auto">
                      <PlusCircle size={14} /> Add Previous Entry
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto mx-3 sm:mx-auto">
                    <DialogHeader>
                      <DialogTitle>Manual Attendance Entry</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-1">
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">
                          Employee Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          className="border p-2 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                          placeholder="e.g. Ravi Kumar"
                          value={manualAttendance.employeeName}
                          onChange={e => setMA("employeeName", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">
                          Role <span className="text-red-500">*</span>
                        </label>
                        <select
                          className="border p-2 rounded w-full text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                          value={manualAttendance.employeeRole}
                          onChange={e => setMA("employeeRole", e.target.value)}
                        >
                          <option value="employee">Employee</option>
                          <option value="manager">Manager</option>
                          <option value="hr">HR</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
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
                              className="border p-2 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                              value={manualAttendance.startDate}
                              onChange={e => setMA("startDate", e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-gray-500 mb-1 block">To</label>
                            <input
                              type="date"
                              max={format(new Date(Date.now() - 86400000), "yyyy-MM-dd")}
                              className="border p-2 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                              value={manualAttendance.endDate}
                              onChange={e => setMA("endDate", e.target.value)}
                            />
                          </div>
                        </div>
                        {manualAttendance.startDate && manualAttendance.endDate &&
                          manualAttendance.startDate <= manualAttendance.endDate && (
                          <p className="text-[11px] text-slate-600 mt-1.5 font-medium">
                            📅 {eachDayOfInterval({
                              start: parseISO(manualAttendance.startDate),
                              end:   parseISO(manualAttendance.endDate),
                            }).length} day(s) will be saved to database
                          </p>
                        )}
                      </div>
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
                              className="border p-2 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                              value={manualAttendance.checkIn}
                              onChange={e => setMA("checkIn", e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-gray-500 mb-1 block">Check Out</label>
                            <input
                              type="time"
                              className="border p-2 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                              value={manualAttendance.checkOut}
                              onChange={e => setMA("checkOut", e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1 block">
                          Tagline
                          <span className="font-normal text-gray-400 ml-1">(optional)</span>
                        </label>
                        <input
                          className="border p-2 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                          placeholder='e.g. "Working from home due to travel"'
                          value={manualAttendance.tagline}
                          onChange={e => setMA("tagline", e.target.value)}
                        />
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
                        ℹ️ This entry will be <strong>saved to MongoDB</strong> and included in all reports and calendars.
                      </div>
                      <Button
                        onClick={submitManualAttendance}
                        disabled={manualSubmitting}
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white"
                      >
                        {manualSubmitting
                          ? <span className="flex items-center gap-2 justify-center"><RefreshCw size={14} className="animate-spin" /> Saving…</span>
                          : "Save to Database"
                        }
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
                  <span className="text-xs font-semibold text-slate-700">
                    🗄️ MongoDB Manual Records ({manualDbRecords.length} total)
                  </span>
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
                          <td className="px-3 py-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium text-white ${roleColor(r.manualEmployeeRole)}`}>
                              {r.manualEmployeeRole}
                            </span>
                          </td>
                          <td className="px-3 py-2">{r.date}</td>
                          <td className="px-3 py-2">{r.checkIn}</td>
                          <td className="px-3 py-2">{r.checkOut || "—"}</td>
                          <td className="px-3 py-2 text-gray-500 italic max-w-[120px] truncate" title={r.tagline}>
                            {r.tagline || "—"}
                          </td>
                          <td className="px-3 py-2 text-gray-500">{r.enteredByName}</td>
                          <td className="px-3 py-2">
                            <button onClick={() => deleteManualRecord(r._id)} className="text-red-500 hover:text-red-700 font-medium">✕</button>
                          </td>
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
                  <button
                    key={opt.value}
                    onClick={() => setReportFilter(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      reportFilter === opt.value
                        ? "bg-slate-800 text-white border-slate-800"
                        : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
                    }`}
                  >
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
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                {previewCount} record{previewCount !== 1 ? "s" : ""} matched
              </span>
              <Button onClick={downloadAttendance} className="bg-slate-800 text-white flex items-center gap-2 text-xs sm:text-sm">
                <Download size={14} /> Download CSV
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
          <CardHeader className="px-3 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Download size={17} /> Leave Report
              </CardTitle>

              {isAdmin && (
                <Dialog open={manualLeaveOpen} onOpenChange={open => {
                  setManualLeaveOpen(open);
                  if (!open) setManualLeave(initManualLeave);
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2 text-xs sm:text-sm border-dashed border-gray-400 hover:border-gray-600 self-start sm:self-auto">
                      <PlusCircle size={14} /> Add Previous Leave Entry
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto mx-3 sm:mx-auto">
                    <DialogHeader>
                      <DialogTitle>Manual Leave Entry</DialogTitle>
                    </DialogHeader>
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
                      <Button onClick={submitManualLeave} className="w-full bg-slate-800 hover:bg-slate-900 text-white">
                        Save Leave Entry
                      </Button>
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
                  <span className="text-xs font-semibold text-slate-700">
                    📋 Manually Added Leave Records ({manualLeaveRecords.length})
                  </span>
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
                          <td className="px-3 py-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor(l.status)}`}>
                              {statusLabel(l.status)}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <button onClick={() => setManualLeaveRecords(prev => prev.filter(x => x.id !== l.id))} className="text-red-500 hover:text-red-700 font-medium">✕</button>
                          </td>
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
                  <button
                    key={opt.value}
                    onClick={() => setLeaveReportFilter(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      leaveReportFilter === opt.value
                        ? "bg-slate-800 text-white border-slate-800"
                        : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
                    }`}
                  >
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
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                {leavePreviewCount} record{leavePreviewCount !== 1 ? "s" : ""} matched
              </span>
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
              <Button className="bg-slate-700 text-white hover:bg-slate-800 w-fit text-sm">
                + Request Leave
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto mx-3 sm:mx-auto">
              <DialogHeader>
                <DialogTitle>Submit Leave Request</DialogTitle>
              </DialogHeader>
              <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-600 space-y-0.5">
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
                <Button onClick={submitLeave} className="w-full bg-slate-700 hover:bg-slate-800 text-white">
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
        <CardHeader className="px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-sm sm:text-base">
              {isAdmin   ? "Leave Requests"              :
               isManager ? "Pending Approvals (Manager)" :
               isHR      ? "Pending Approvals (HR)"      :
               "My Leave Requests"}
            </CardTitle>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {isAdmin && (
                <div className="flex rounded-lg border overflow-hidden text-xs sm:text-sm">
                  <button
                    onClick={() => setActiveTab("pending")}
                    className={`px-2.5 sm:px-3 py-1.5 font-medium transition-colors ${
                      activeTab === "pending" ? "bg-slate-700 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Pending
                    {(leaves?.pending ?? []).length > 0 && (
                      <span className="ml-1 sm:ml-1.5 bg-slate-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                        {leaves.pending.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab("all")}
                    className={`px-2.5 sm:px-3 py-1.5 font-medium transition-colors ${
                      activeTab === "all" ? "bg-slate-700 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    All
                  </button>
                </div>
              )}
              <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                {displayLeaves.length} record{displayLeaves.length !== 1 ? "s" : ""}
              </span>
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
                        <Badge className={`${roleColor(l.userId?.role)} text-[10px] mt-1`}>
                          {l.userId?.role}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span>{l.type}</span>
                        {l.isEmergency && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full w-fit">
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
                    <TableCell className="min-w-[160px] sm:min-w-[180px]">
                      <Badge className={statusColor(l.status)}>{statusLabel(l.status)}</Badge>
                      {(isEmployee || (isAdmin && activeTab === "all")) && (
                        <FlowTracker leave={l} />
                      )}
                    </TableCell>
                    <TableCell className="max-w-[120px] sm:max-w-[160px] truncate" title={l.reason}>
                      {l.reason}
                    </TableCell>
                    {(isManager || isHR || isAdmin) && (
                      <TableCell>
                        {canActOnLeave(l) ? (
                          <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                            <Button size="sm" className="bg-slate-700 hover:bg-slate-800 text-white text-xs h-7 sm:h-8 px-2 sm:px-3" onClick={() => approveLeave(l._id)}>
                              Approve
                            </Button>
                            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white text-xs h-7 sm:h-8 px-2 sm:px-3" onClick={() => rejectLeave(l._id)}>
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
