import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useAuth } from "../../contexts/AuthContext";
import { useEffect, useState } from "react";
import { attendanceApi } from "@/services/api";

const THEME_KEY = "dashboard_theme";

const departmentData = [
  { name: "Design", value: 24 },
  { name: "Development", value: 40 },
  { name: "HR", value: 12 },
  { name: "Marketing", value: 18 },
];

const COLORS = ["#f97316", "#6366f1", "#22c55e", "#ef4444"];

export function EmployeeDashboard() {
  const { currentUser } = useAuth();
  const [dark, setDark]               = useState(false);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [attendanceTrend, setAttendanceTrend] = useState<any[]>([]);
  const [myRecords, setMyRecords]     = useState<any[]>([]);
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [notifications] = useState([
    "Your timesheet was approved",
    "New company announcement",
    "Performance review scheduled",
  ]);

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
      setDark(true);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const loadAttendance = async () => {
      try {
        const [todayRes, myRes] = await Promise.all([
          attendanceApi.getToday(),
          attendanceApi.getMy(),
        ]);

        setTodayRecord(todayRes.record || null);

        const records = myRes.records || [];
        setMyRecords(records);

        // Calculate attendance percentage for current month
        const now = new Date();
        const monthRecords = records.filter((r: any) => {
          const d = new Date(r.date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });

        const workingDays = now.getDate();
        const pct = workingDays > 0
          ? Math.min((monthRecords.length / workingDays) * 100, 100)
          : 0;
        setAttendanceRate(Number(pct.toFixed(1)));

        // Build trend data for last 7 days
        const trend = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          const dateStr = d.toISOString().split("T")[0];
          const found = records.find((r: any) => r.date === dateStr);
          return {
            day: d.toLocaleDateString("en-US", { weekday: "short" }),
            present: found ? 1 : 0,
          };
        });
        setAttendanceTrend(trend);
      } catch (err) {
        console.error("Attendance load error:", err);
      }
    };

    loadAttendance();
  }, [currentUser]);

  const toggleTheme = () => {
    const newTheme = !dark;
    setDark(newTheme);
    if (newTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem(THEME_KEY, "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem(THEME_KEY, "light");
    }
  };

  if (!currentUser) return null;

  return (
    <div className="space-y-6 dark:bg-gray-950 dark:text-gray-200">

      {/* HEADER */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 dark:from-gray-800 dark:to-gray-700 rounded-2xl shadow-lg p-6 text-white flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{currentUser.name}</h2>
            <div className="text-sm opacity-90">{currentUser.role} • {currentUser.email}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme}
            className="bg-white/20 px-3 py-2 rounded-lg text-sm">
            {dark ? "☀️ Light" : "🌙 Dark"}
          </button>
          <div className="text-right">
            <p className="text-sm opacity-80">This Month</p>
            <p className="text-lg font-semibold">{attendanceRate}%</p>
          </div>
        </div>
      </div>

      {/* TODAY ATTENDANCE */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-5">
        <h3 className="font-semibold mb-3">📅 Today's Attendance</h3>
        {todayRecord ? (
          <div className="flex gap-6 text-sm">
            <p>✅ <strong>Check In:</strong> {todayRecord.checkIn}</p>
            <p>🚪 <strong>Check Out:</strong> {todayRecord.checkOut || "Not yet"}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Not checked in today</p>
        )}
      </div>

      {/* NOTIFICATIONS */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-5">
        <h3 className="font-semibold mb-3">🔔 Notifications</h3>
        <ul className="space-y-2 text-sm">
          {notifications.map((n, i) => (
            <li key={i} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800">{n}</li>
          ))}
        </ul>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Attendance %" value={`${attendanceRate}%`} />
        <StatCard title="Days Present" value={myRecords.length} />
        <StatCard title="Month Progress" value={`${new Date().getDate()}d`} />
        <StatCard title="Status" value={todayRecord ? "✅ Present" : "❌ Absent"} />
      </div>

      {/* CHARTS */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-6">
          <h3 className="font-semibold mb-4">Last 7 Days Attendance</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={attendanceTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis domain={[0, 1]} />
              <Tooltip />
              <Line type="monotone" dataKey="present" stroke="#f97316" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-6">
          <h3 className="font-semibold mb-4">Department Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={departmentData} dataKey="value" outerRadius={90}>
                {departmentData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }: any) {
  return (
    <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl shadow-sm p-4">
      <p className="text-gray-500 text-sm">{title}</p>
      <p className="text-xl font-semibold text-orange-500 mt-1">{value}</p>
    </div>
  );
}