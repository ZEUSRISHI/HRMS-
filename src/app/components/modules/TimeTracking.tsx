import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { timesheetApi } from "@/services/api";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";
import {
  Clock, Plus, Download, RefreshCw, CheckCircle2, XCircle,
  TrendingUp, Calendar, Filter, ChevronDown, ChevronUp,
  AlertCircle, Timer, Users, BarChart2,
} from "lucide-react";
import {
  format, subDays, startOfWeek, endOfWeek, startOfMonth,
  endOfMonth, parseISO, eachDayOfInterval,
} from "date-fns";

/* ================================================================
   TYPES
================================================================ */
type Category = "project" | "meeting" | "admin" | "other";
type SheetStatus = "pending" | "approved" | "rejected";

interface Sheet {
  _id: string;
  employeeId?: { _id: string; name: string; email: string; role: string };
  employeeName?: string;
  date: string;
  hours: number;
  category: Category;
  description: string;
  status: SheetStatus;
  createdAt: string;
}

/* ================================================================
   CONSTANTS
================================================================ */
const CATEGORY_COLORS: Record<Category, string> = {
  project: "#3b82f6",
  meeting: "#8b5cf6",
  admin:   "#10b981",
  other:   "#f59e0b",
};

const STATUS_STYLE: Record<SheetStatus, { bg: string; text: string; dot: string }> = {
  pending:  { bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-400" },
  approved: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" },
  rejected: { bg: "bg-red-50",    text: "text-red-600",    dot: "bg-red-400" },
};

const CATEGORY_LABELS: Record<Category, string> = {
  project: "Project Work",
  meeting: "Meetings",
  admin:   "Admin",
  other:   "Other",
};

/* ================================================================
   HELPERS
================================================================ */
const fmt = (d: string) => {
  try { return format(parseISO(d), "MMM d, yyyy"); } catch { return d; }
};

const buildLast7 = (sheets: Sheet[]) =>
  Array.from({ length: 7 }, (_, i) => {
    const d  = subDays(new Date(), 6 - i);
    const ds = format(d, "yyyy-MM-dd");
    const total = sheets.filter(s => s.date === ds).reduce((a, b) => a + b.hours, 0);
    return { day: format(d, "EEE"), date: ds, hours: parseFloat(total.toFixed(2)) };
  });

const buildCategoryBreakdown = (sheets: Sheet[]) => {
  const map: Record<string, number> = { project: 0, meeting: 0, admin: 0, other: 0 };
  sheets.forEach(s => { if (s.category) map[s.category] = (map[s.category] || 0) + s.hours; });
  return Object.entries(map)
    .map(([name, value]) => ({
      name: CATEGORY_LABELS[name as Category] || name,
      value: parseFloat(value.toFixed(2)),
      key: name,
    }))
    .filter(d => d.value > 0);
};

/* ================================================================
   LIVE CLOCK
================================================================ */
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col items-end">
      <span className="font-mono text-2xl font-bold text-gray-900 tabular-nums tracking-tight">
        {format(time, "hh:mm:ss")}
        <span className="text-sm font-normal text-gray-400 ml-1">{format(time, "aa")}</span>
      </span>
      <span className="text-xs text-gray-400">{format(time, "EEEE, MMM d, yyyy")}</span>
    </div>
  );
}

/* ================================================================
   ELAPSED TIMER — shows how long since check-in
================================================================ */
function ElapsedTimer({ since }: { since: string }) {
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const [h, m] = since.split(":").map(Number);
      const start = new Date();
      start.setHours(h, m, 0, 0);
      const diff = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000));
      const hh = Math.floor(diff / 3600);
      const mm = Math.floor((diff % 3600) / 60);
      const ss = diff % 60;
      setElapsed(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [since]);
  return (
    <span className="font-mono text-sm font-semibold text-emerald-600 tabular-nums">{elapsed}</span>
  );
}

/* ================================================================
   STAT CARD
================================================================ */
function StatCard({ label, value, sub, icon: Icon, accent = "#475569" }: {
  label: string; value: string | number; sub?: string;
  icon: any; accent?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: accent + "18" }}
        >
          <Icon size={18} style={{ color: accent }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5 font-medium">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ================================================================
   TOAST
================================================================ */
function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const id = setTimeout(onClose, 3500);
    return () => clearTimeout(id);
  }, [onClose]);
  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium animate-in slide-in-from-top-2
      ${type === "error" ? "bg-red-600 text-white" : "bg-gray-900 text-white"}`}>
      {type === "error" ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
      {msg}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
        <XCircle size={14} />
      </button>
    </div>
  );
}

/* ================================================================
   LOG TIME DIALOG
================================================================ */
function LogTimeDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [form, setForm] = useState({
    date: today, hours: "", category: "" as Category | "", description: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async () => {
    setErr("");
    if (!form.hours || isNaN(Number(form.hours)) || Number(form.hours) <= 0 || Number(form.hours) > 24) {
      setErr("Enter valid hours (0.5–24)"); return;
    }
    if (!form.category) { setErr("Select a category"); return; }
    try {
      setSaving(true);
      await timesheetApi.add({
        date: form.date,
        hours: parseFloat(Number(form.hours).toFixed(2)),
        category: form.category,
        description: form.description,
      });
      onSaved();
    } catch (e: any) {
      setErr(e.message || "Failed to save");
    } finally { setSaving(false); }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Timer size={16} className="text-blue-600" />
            </div>
            <h2 className="font-semibold text-gray-900">Log Work Hours</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
            <XCircle size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {err && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle size={14} className="flex-shrink-0" /> {err}
            </div>
          )}

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Date</label>
            <input
              type="date" max={today} value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
            />
          </div>

          {/* Hours */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Hours Worked <span className="text-red-400">*</span>
            </label>
            <input
              type="number" min="0.5" max="24" step="0.5"
              placeholder="e.g. 8"
              value={form.hours}
              onChange={e => setForm({ ...form, hours: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Category <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["project", "meeting", "admin", "other"] as Category[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setForm({ ...form, category: cat })}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                    form.category === cat
                      ? "border-transparent text-white"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                  style={form.category === cat ? { background: CATEGORY_COLORS[cat] } : {}}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Description</label>
            <textarea
              rows={3}
              placeholder="What did you work on?"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <><RefreshCw size={14} className="animate-spin" /> Saving…</> : "Save Entry"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   MAIN COMPONENT
================================================================ */
export function TimeTracking() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  const isAdmin    = currentUser.role === "admin";
  const isManager  = currentUser.role === "manager";
  const isHR       = currentUser.role === "hr";
  const canApprove = isAdmin || isManager;
  const canViewAll = isAdmin || isManager || isHR;

  /* state */
  const [sheets,       setSheets]       = useState<Sheet[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [logOpen,      setLogOpen]      = useState(false);
  const [toast,        setToast]        = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [filterCat,    setFilterCat]    = useState<Category | "">("");
  const [filterStatus, setFilterStatus] = useState<SheetStatus | "">("");
  const [filterRange,  setFilterRange]  = useState<"today" | "week" | "month" | "all">("week");
  const [showFilters,  setShowFilters]  = useState(false);
  const [activeTab,    setActiveTab]    = useState<"overview" | "entries" | "charts">("overview");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = canViewAll ? await timesheetApi.getAll() : await timesheetApi.getMy();
      setSheets(data.sheets || []);
    } catch (e: any) {
      if (!silent) showToast(e.message || "Failed to load", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canViewAll, showToast]);

  useEffect(() => {
    load();
    pollingRef.current = setInterval(() => load(true), 30000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [load]);

  const handleApprove = async (id: string) => {
    try { await timesheetApi.approve(id); showToast("Timesheet approved"); await load(true); }
    catch (e: any) { showToast(e.message, "error"); }
  };

  const handleReject = async (id: string) => {
    try { await timesheetApi.reject(id); showToast("Timesheet rejected"); await load(true); }
    catch (e: any) { showToast(e.message, "error"); }
  };

  const downloadCSV = () => {
    const rows = ["Employee,Date,Hours,Category,Description,Status"];
    filtered.forEach(s => {
      const name = s.employeeId?.name || s.employeeName || "—";
      rows.push(`"${name}","${s.date}","${s.hours}","${s.category}","${(s.description || "").replace(/"/g, "'")}","${s.status}"`);
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `timesheets_${format(new Date(), "yyyyMMdd")}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast("CSV downloaded");
  };

  /* filters */
  const dateFiltered = useMemo(() => {
    const now = new Date();
    return sheets.filter(s => {
      if (filterRange === "today") return s.date === format(now, "yyyy-MM-dd");
      if (filterRange === "week") {
        const ws = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
        const we = format(endOfWeek(now,   { weekStartsOn: 1 }), "yyyy-MM-dd");
        return s.date >= ws && s.date <= we;
      }
      if (filterRange === "month") {
        const ms = format(startOfMonth(now), "yyyy-MM-dd");
        const me = format(endOfMonth(now),   "yyyy-MM-dd");
        return s.date >= ms && s.date <= me;
      }
      return true;
    });
  }, [sheets, filterRange]);

  const filtered = useMemo(() => {
    return dateFiltered
      .filter(s => !filterCat    || s.category === filterCat)
      .filter(s => !filterStatus || s.status   === filterStatus)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [dateFiltered, filterCat, filterStatus]);

  /* stats */
  const stats = useMemo(() => {
    const totalHours    = filtered.reduce((a, s) => a + s.hours, 0);
    const approvedHours = filtered.filter(s => s.status === "approved").reduce((a, s) => a + s.hours, 0);
    const pendingCount  = filtered.filter(s => s.status === "pending").length;
    const uniqueEmps    = new Set(filtered.map(s => s.employeeId?._id || s.employeeName)).size;
    const byDate: Record<string, number> = {};
    filtered.forEach(s => { byDate[s.date] = (byDate[s.date] || 0) + s.hours; });
    const days = Object.keys(byDate).length;
    const avgHoursPerDay = days > 0 ? totalHours / days : 0;
    return { totalHours, approvedHours, pendingCount, uniqueEmps, avgHoursPerDay };
  }, [filtered]);

  /* chart data */
  const last7    = useMemo(() => buildLast7(sheets), [sheets]);
  const catBreak = useMemo(() => buildCategoryBreakdown(filtered), [filtered]);

  const employeeHours = useMemo(() => {
    if (!canViewAll) return [];
    const map: Record<string, { name: string; hours: number; approved: number }> = {};
    filtered.forEach(s => {
      const key  = s.employeeId?._id || s.employeeName || "unknown";
      const name = s.employeeId?.name || s.employeeName || "Unknown";
      if (!map[key]) map[key] = { name, hours: 0, approved: 0 };
      map[key].hours += s.hours;
      if (s.status === "approved") map[key].approved += s.hours;
    });
    return Object.values(map)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 8)
      .map(e => ({ ...e, hours: parseFloat(e.hours.toFixed(2)), approved: parseFloat(e.approved.toFixed(2)) }));
  }, [filtered, canViewAll]);

  const weekHeatmap = useMemo(() => {
    const now   = new Date();
    const start = subDays(now, 27);
    const days  = eachDayOfInterval({ start, end: now });
    return days.map(d => {
      const ds    = format(d, "yyyy-MM-dd");
      const hours = sheets.filter(s => s.date === ds).reduce((a, b) => a + b.hours, 0);
      return { date: ds, label: format(d, "MMM d"), hours };
    });
  }, [sheets]);

  /* today's log for employee */
  const todayStr   = format(new Date(), "yyyy-MM-dd");
  const todaySheet = sheets.find(s => s.date === todayStr &&
    (s.employeeId?._id === currentUser.id || (!s.employeeId && !canViewAll)));
  const todayHours = sheets
    .filter(s => s.date === todayStr)
    .reduce((a, b) => a + b.hours, 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading timesheets…</p>
      </div>
    </div>
  );

  const pendingAll = sheets.filter(s => s.status === "pending");

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-4 pb-8">

      {toast && (
        <Toast {...toast} onClose={() => setToast(null)} />
      )}

      {logOpen && (
        <LogTimeDialog
          onClose={() => setLogOpen(false)}
          onSaved={async () => { setLogOpen(false); showToast("Time logged successfully"); await load(true); }}
        />
      )}

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between flex-wrap gap-4 pt-1">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Clock size={18} className="text-white" />
            </div>
            Time Tracking
          </h1>
          <p className="text-sm text-gray-400 mt-1 ml-11">
            {filtered.length} entries
            {refreshing && (
              <span className="ml-2 inline-flex items-center gap-1 text-blue-400">
                <RefreshCw size={11} className="animate-spin" /> syncing
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          </button>
          {canViewAll && (
            <button
              onClick={downloadCSV}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Download size={15} /> Export CSV
            </button>
          )}
          {!canViewAll && (
            <button
              onClick={() => setLogOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
            >
              <Plus size={15} /> Log Time
            </button>
          )}
        </div>
      </div>

      {/* ── REAL-TIME CLOCK CARD ── */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <p className="text-gray-400 text-xs font-medium uppercase tracking-widest mb-1">Live Time</p>
              <LiveClock />
            </div>
            <div className="w-px h-12 bg-white/10 hidden sm:block" />
            <div className="hidden sm:flex flex-col">
              <p className="text-gray-400 text-xs font-medium uppercase tracking-widest mb-1">Today's Hours</p>
              <span className="font-mono text-2xl font-bold tabular-nums tracking-tight">
                {todayHours.toFixed(1)}
                <span className="text-sm font-normal text-gray-400 ml-1">hrs</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Today's progress bar */}
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Daily target (8h)</span>
                <span className="text-white font-medium">{Math.min(Math.round((todayHours / 8) * 100), 100)}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min((todayHours / 8) * 100, 100)}%`,
                    background: todayHours >= 8 ? "#10b981" : todayHours >= 4 ? "#3b82f6" : "#f59e0b",
                  }}
                />
              </div>
            </div>

            {!canViewAll && (
              <button
                onClick={() => setLogOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <Plus size={14} /> Log Time
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── DATE RANGE ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["today", "week", "month", "all"] as const).map(r => (
          <button
            key={r}
            onClick={() => setFilterRange(r)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
              filterRange === r
                ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700"
            }`}
          >
            {r === "today" ? "Today" : r === "week" ? "This Week" : r === "month" ? "This Month" : "All Time"}
          </button>
        ))}
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ml-auto ${
            showFilters || filterCat || filterStatus
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
          }`}
        >
          <Filter size={12} />
          Filters
          {(filterCat || filterStatus) && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
          {showFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* ── EXTRA FILTERS ── */}
      {showFilters && (
        <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</label>
            <select
              value={filterCat}
              onChange={e => setFilterCat(e.target.value as Category | "")}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[150px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">All Categories</option>
              {(["project", "meeting", "admin", "other"] as Category[]).map(c => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as SheetStatus | "")}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          {(filterCat || filterStatus) && (
            <button
              onClick={() => { setFilterCat(""); setFilterStatus(""); }}
              className="self-end px-4 py-2 text-xs font-medium text-red-500 hover:text-red-700 border border-red-200 rounded-xl bg-white hover:bg-red-50 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Total Hours"     value={`${stats.totalHours.toFixed(1)}h`}     icon={Clock}        accent="#3b82f6" />
        <StatCard label="Approved Hours"  value={`${stats.approvedHours.toFixed(1)}h`}  icon={CheckCircle2} accent="#10b981" />
        <StatCard label="Pending"         value={stats.pendingCount}                     icon={Timer}        accent="#f59e0b" />
        <StatCard label="Avg / Day"       value={`${stats.avgHoursPerDay.toFixed(1)}h`} icon={TrendingUp}   accent="#8b5cf6" />
        {canViewAll && <StatCard label="Contributors" value={stats.uniqueEmps} icon={Users} accent="#475569" />}
      </div>

      {/* ── TABS ── */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl w-fit">
        {(["overview", "entries", "charts"] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${
              activeTab === t
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          OVERVIEW TAB
      ══════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-5">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 7-day trend */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-800">Last 7 Days</h3>
                <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">Hours logged</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={last7}>
                  <defs>
                    <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: number) => [`${v}h`, "Hours"]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
                  />
                  <Area type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2.5} fill="url(#blueGrad)" dot={{ fill: "#3b82f6", strokeWidth: 0, r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Category breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-800">Category Breakdown</h3>
              </div>
              {catBreak.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-gray-300 text-sm flex-col gap-2">
                  <BarChart2 size={32} />
                  <p>No data for this period</p>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="55%" height={190}>
                    <PieChart>
                      <Pie data={catBreak} dataKey="value" outerRadius={78} innerRadius={44} paddingAngle={3}>
                        {catBreak.map((entry, i) => (
                          <Cell key={i} fill={CATEGORY_COLORS[entry.key as Category] || "#94a3b8"} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => [`${v}h`]}
                        contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2.5 flex-1">
                    {catBreak.map(d => (
                      <div key={d.key} className="flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ background: CATEGORY_COLORS[d.key as Category] || "#94a3b8" }}
                        />
                        <span className="text-xs text-gray-500 flex-1">{d.name}</span>
                        <span className="text-xs font-bold text-gray-900">{d.value}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Employee hours bar */}
          {canViewAll && employeeHours.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-4">Hours by Employee</h3>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={employeeHours} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} unit="h" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} width={90} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: number) => [`${v}h`]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }}
                  />
                  <Bar dataKey="hours"    name="Total"    fill="#e2e8f0" radius={4} />
                  <Bar dataKey="approved" name="Approved" fill="#3b82f6" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 28-day heatmap */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4">Activity — Last 28 Days</h3>
            <div className="flex flex-wrap gap-1.5">
              {weekHeatmap.map(d => {
                const intensity = Math.min(d.hours / 8, 1);
                const bg = d.hours === 0
                  ? "#f1f5f9"
                  : `rgba(59,130,246,${0.15 + intensity * 0.85})`;
                return (
                  <div
                    key={d.date}
                    title={`${d.label}: ${d.hours}h`}
                    style={{ width: 24, height: 24, borderRadius: 5, background: bg, cursor: "default" }}
                  />
                );
              })}
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
              <span>Less</span>
              {[0, 0.25, 0.5, 0.75, 1].map((i, idx) => (
                <div
                  key={idx}
                  style={{ width: 14, height: 14, borderRadius: 3, background: i === 0 ? "#f1f5f9" : `rgba(59,130,246,${0.15 + i * 0.85})` }}
                />
              ))}
              <span>More</span>
            </div>
          </div>

          {/* Pending approvals */}
          {canApprove && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  Pending Approvals
                  {pendingAll.length > 0 && (
                    <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      {pendingAll.length}
                    </span>
                  )}
                </h3>
              </div>
              <div className="space-y-2">
                {pendingAll.slice(0, 8).map(s => (
                  <div
                    key={s._id}
                    className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-100 hover:bg-amber-100/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {s.employeeId?.name || s.employeeName || "Unknown"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                        <Calendar size={10} />
                        {fmt(s.date)}
                        <span className="text-gray-300">·</span>
                        <Timer size={10} />
                        {s.hours}h
                        <span className="text-gray-300">·</span>
                        {CATEGORY_LABELS[s.category]}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-3 flex-shrink-0">
                      <button
                        onClick={() => handleApprove(s._id)}
                        className="px-3.5 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(s._id)}
                        className="px-3.5 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-xl transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
                {pendingAll.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                    <CheckCircle2 size={32} className="mb-2" />
                    <p className="text-sm">All caught up! No pending timesheets.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          ENTRIES TAB
      ══════════════════════════════════════════ */}
      {activeTab === "entries" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-300">
              <Clock size={40} className="mb-3" />
              <p className="text-sm font-medium">No entries match the selected filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[680px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {canViewAll && (
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
                    )}
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Hours</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    {canApprove && (
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(s => {
                    const ss = STATUS_STYLE[s.status];
                    return (
                      <tr key={s._id} className="hover:bg-gray-50/80 transition-colors">
                        {canViewAll && (
                          <td className="px-5 py-3.5">
                            <p className="font-semibold text-gray-900 text-xs">{s.employeeId?.name || s.employeeName || "—"}</p>
                            {s.employeeId?.role && (
                              <p className="text-[10px] text-gray-400 capitalize mt-0.5">{s.employeeId.role}</p>
                            )}
                          </td>
                        )}
                        <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">{fmt(s.date)}</td>
                        <td className="px-5 py-3.5">
                          <span className="font-bold text-gray-900">{s.hours}</span>
                          <span className="text-gray-400 text-xs">h</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                            style={{
                              background: CATEGORY_COLORS[s.category] + "18",
                              color: CATEGORY_COLORS[s.category],
                            }}
                          >
                            {CATEGORY_LABELS[s.category] || s.category}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-400 max-w-[200px] truncate">{s.description || "—"}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-semibold ${ss.bg} ${ss.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${ss.dot}`} />
                            {s.status}
                          </span>
                        </td>
                        {canApprove && (
                          <td className="px-5 py-3.5">
                            {s.status === "pending" ? (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => handleApprove(s._id)}
                                  className="px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(s._id)}
                                  className="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t border-gray-200">
                    {canViewAll && <td className="px-5 py-3" />}
                    <td className="px-5 py-3 text-xs font-semibold text-gray-500">{filtered.length} entries</td>
                    <td className="px-5 py-3 text-sm font-bold text-gray-900">
                      {filtered.reduce((a, s) => a + s.hours, 0).toFixed(1)}h
                    </td>
                    <td colSpan={10} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          CHARTS TAB
      ══════════════════════════════════════════ */}
      {activeTab === "charts" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4">Daily Hours — Last 7 Days</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={last7} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} unit="h" />
                <Tooltip
                  formatter={(v: number) => [`${v}h`, "Hours"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
                  cursor={{ fill: "#f8fafc" }}
                />
                <Bar dataKey="hours" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-4">Hours by Category</h3>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={catBreak} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} unit="h" />
                  <Tooltip
                    formatter={(v: number) => [`${v}h`]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }}
                    cursor={{ fill: "#f8fafc" }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {catBreak.map((entry, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[entry.key as Category] || "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {canViewAll && employeeHours.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-800 mb-4">Top Contributors</h3>
                <div className="space-y-3">
                  {employeeHours.slice(0, 6).map((e, i) => {
                    const pct = stats.totalHours > 0 ? (e.hours / stats.totalHours) * 100 : 0;
                    const colors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-gray-700 font-semibold">{e.name}</span>
                          <span className="text-gray-400">{e.hours}h · {Math.round(pct)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: colors[i % colors.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
