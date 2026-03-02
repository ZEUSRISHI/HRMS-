import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useAuth } from "../../contexts/AuthContext";
import { useEffect, useState } from "react";

/* ================= STORAGE KEYS ================= */

const ATT_KEY = "attendance_records_v2";
const THEME_KEY = "dashboard_theme";

/* ================= HELPERS ================= */

function getMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function getAttendanceStats(userId: string) {
  const records = JSON.parse(localStorage.getItem(ATT_KEY) || "[]");

  const monthKey = getMonthKey();
  const monthly = records.filter(
    (r: any) => r.userId === userId && r.monthKey === monthKey
  );

  const presentDays = monthly.length;
  const totalWorkingDays = new Date().getDate();

  const percentage =
    totalWorkingDays === 0 ? 0 : (presentDays / totalWorkingDays) * 100;

  return {
    percentage: Number(percentage.toFixed(1)),
    trend: monthly.map((r: any, i: number) => ({
      day: `Day ${i + 1}`,
      present: 1,
    })),
  };
}

/* ================= MOCK DEPARTMENT ================= */

const departmentData = [
  { name: "Design", value: 24 },
  { name: "Development", value: 40 },
  { name: "HR", value: 12 },
  { name: "Marketing", value: 18 },
];

const COLORS = ["#f97316", "#6366f1", "#22c55e", "#ef4444"];

/* ================= MAIN ================= */

export function EmployeeDashboard() {
  const { currentUser } = useAuth();
  const [dark, setDark] = useState(false);
  const [attendance, setAttendance] = useState({ percentage: 0, trend: [] });
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

    if (currentUser) {
      setAttendance(getAttendanceStats(currentUser.id));
    }
  }, [currentUser]);

  function toggleTheme() {
    const newTheme = !dark;
    setDark(newTheme);

    if (newTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem(THEME_KEY, "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem(THEME_KEY, "light");
    }
  }

  if (!currentUser) return null;

  return (
    <div className="space-y-6 dark:bg-gray-950 dark:text-gray-200">

      {/* ===== HEADER ===== */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 dark:from-gray-800 dark:to-gray-700 rounded-2xl shadow-lg p-6 text-white flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
            {currentUser.name.charAt(0)}
          </div>

          <div>
            <h2 className="text-xl font-semibold">{currentUser.name}</h2>
            <div className="text-sm opacity-90">
              {currentUser.role} • {currentUser.email}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="bg-white/20 px-3 py-2 rounded-lg text-sm"
          >
            {dark ? "☀️ Light" : "🌙 Dark"}
          </button>

          <div className="text-right">
            <p className="text-sm opacity-80">Attendance</p>
            <p className="text-lg font-semibold">
              {attendance.percentage}%
            </p>
          </div>
        </div>
      </div>

      {/* ===== NOTIFICATIONS ===== */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-5">
        <h3 className="font-semibold mb-3">🔔 Notifications</h3>
        <ul className="space-y-2 text-sm">
          {notifications.map((n, i) => (
            <li
              key={i}
              className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              {n}
            </li>
          ))}
        </ul>
      </div>

      {/* ===== KPI ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Attendance %" value={`${attendance.percentage}%`} />
        <StatCard title="Tasks Completed" value="12" />
        <StatCard title="Performance" value="87%" />
        <StatCard title="Month Progress" value={`${new Date().getDate()}d`} />
      </div>

      {/* ===== CHARTS ===== */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Attendance Trend */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-6">
          <h3 className="font-semibold mb-4">Monthly Attendance</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={attendance.trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="present"
                stroke="#f97316"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Department */}
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

/* ================= CARD ================= */

function StatCard({ title, value }: any) {
  return (
    <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl shadow-sm p-4">
      <p className="text-gray-500 text-sm">{title}</p>
      <p className="text-xl font-semibold text-orange-500 mt-1">{value}</p>
    </div>
  );
}