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

const attendanceData = [
  { day: "Mon", present: 120 },
  { day: "Tue", present: 132 },
  { day: "Wed", present: 128 },
  { day: "Thu", present: 140 },
  { day: "Fri", present: 138 },
  { day: "Sat", present: 98 },
  { day: "Sun", present: 60 },
];

const departmentData = [
  { name: "Design", value: 24 },
  { name: "Development", value: 40 },
  { name: "HR", value: 12 },
  { name: "Marketing", value: 18 },
];

const COLORS = ["#f97316", "#6366f1", "#22c55e", "#ef4444"];

export function EmployeeDashboard() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  return (
    <div className="space-y-6">

      {/* ===== PROFILE CARD ===== */}
      <div className="bg-white rounded-xl shadow p-6 flex items-center gap-6">
        <div className="h-20 w-20 rounded-full bg-orange-500 text-white flex items-center justify-center text-2xl font-bold">
          {currentUser.name.charAt(0)}
        </div>

        <div>
          <h2 className="text-xl font-semibold">{currentUser.name}</h2>
          <p className="text-gray-500 capitalize">{currentUser.role}</p>
          <p className="text-sm text-gray-400">{currentUser.email}</p>
        </div>
      </div>

      {/* ===== KPI CARDS ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Today Hours" value="8.5h" />
        <StatCard title="Week Hours" value="38h" />
        <StatCard title="Tasks Completed" value="12" />
        <StatCard title="Performance" value="87%" />
      </div>

      {/* ===== CHARTS ===== */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Attendance Line Chart */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="font-semibold mb-4">Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={attendanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="present" stroke="#f97316" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Department Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="font-semibold mb-4">Department Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={departmentData}
                dataKey="value"
                nameKey="name"
                outerRadius={90}
              >
                {departmentData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* ===== WORK HOURS SUMMARY ===== */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h3 className="font-semibold mb-4">Work Hours Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Working" value="160h" />
          <StatCard title="Productive" value="120h" />
          <StatCard title="Break" value="10h" />
          <StatCard title="Overtime" value="15h" />
        </div>
      </div>

    </div>
  );
}

function StatCard({ title, value }: any) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <p className="text-gray-500 text-sm">{title}</p>
      <p className="text-xl font-semibold text-orange-600">{value}</p>
    </div>
  );
}
