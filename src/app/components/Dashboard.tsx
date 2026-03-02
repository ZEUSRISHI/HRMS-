import UserInfoCard from "../components/common/UserInfoCard";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

import {
  Users,
  CheckCircle,
  Clock,
  DollarSign,
  FolderKanban,
  TrendingUp,
  Briefcase,
  UserPlus,
  Mail,
  Shield,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { useWorkforce } from "../contexts/WorkforceContext";

import {
  mockUsers,
  mockTasks,
  mockProjects,
  mockInvoices,
} from "../data/mockData";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/* ================= ATTENDANCE HELPERS ================= */

const ATT_RECORDS_KEY = "startup_attendance_records";
const ATT_STATS_KEY = "startup_attendance_stats";

function safeJSONParse<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "") || fallback;
  } catch {
    return fallback;
  }
}

function getUserAttendancePercentage(userId: string): number {
  const stats = safeJSONParse<Record<string, any>>(ATT_STATS_KEY, {});
  return stats[userId]?.percentage || 0;
}

function getWeeklyAttendance(userId: string) {
  const records = safeJSONParse<any[]>(ATT_RECORDS_KEY, []);

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 0,
    Wed: 0,
    Thu: 0,
    Fri: 0,
  };

  records.forEach((rec) => {
    if (rec.userId !== userId || !rec.checkIn) return;

    const date = new Date(rec.date);
    const day = date.toLocaleDateString("en-US", { weekday: "short" });

    if (map[day] !== undefined) map[day] += 1;
  });

  return weekDays.map((d) => ({
    day: d,
    present: map[d],
    total: 1,
  }));
}

/* ================= TYPES ================= */

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle: string;
  icon: any;
};

type MiniStatProps = {
  icon: any;
  label: string;
  value: number;
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

/* ================= MAIN DASHBOARD ================= */

export function Dashboard() {
  const { currentUser } = useAuth();
  const { vendors, freelancers } = useWorkforce();

  if (!currentUser) return <div className="p-6">Loading user...</div>;

  /* ===== STATS ===== */

  const totalEmployees = mockUsers.filter((u) => u.status === "active").length;
  const myTasks = mockTasks.filter((t) => t.assignedTo === currentUser.id);
  const completedTasks = myTasks.filter((t) => t.status === "completed").length;
  const activeProjects = mockProjects.filter((p) => p.status === "in-progress").length;

  const totalRevenue = mockInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const outstandingAmount = mockInvoices.reduce(
    (sum, inv) => sum + (inv.amount - inv.paidAmount),
    0
  );

  const attendanceRate = getUserAttendancePercentage(currentUser.id);
  const weeklyAttendance = getWeeklyAttendance(currentUser.id);

  const taskStatusData = [
    { name: "Pending", value: mockTasks.filter((t) => t.status === "pending").length },
    { name: "In Progress", value: mockTasks.filter((t) => t.status === "in-progress").length },
    { name: "Completed", value: mockTasks.filter((t) => t.status === "completed").length },
  ];

  const projectData = mockProjects.map((p) => ({
    name: p.name.substring(0, 20),
    progress: p.progress,
    budget: p.budget / 1000,
    spent: p.spent / 1000,
  }));

  return (
    <div className="space-y-6">

      {/* ===== USER HEADER ===== */}
      <Card className="border-none shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <img
              src={`https://ui-avatars.com/api/?name=${currentUser.name}`}
              className="w-14 h-14 rounded-full border"
            />

            <div>
              <h2 className="text-lg font-semibold">{currentUser.name}</h2>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Shield size={14} /> {currentUser.role}
                </span>
                <span className="flex items-center gap-1">
                  <Mail size={14} /> {currentUser.email}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden md:block text-right">
            <p className="text-sm text-gray-500">Attendance</p>
            <p className="text-2xl font-semibold text-blue-600">
              {attendanceRate.toFixed(1)}%
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ===== STATS GRID ===== */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <StatCard title="Total Employees" value={totalEmployees} icon={Users} subtitle="Active employees" />
        <StatCard title="Active Projects" value={activeProjects} icon={FolderKanban} subtitle="In progress" />
        <StatCard title="Attendance Rate" value={`${attendanceRate.toFixed(1)}%`} icon={CheckCircle} subtitle="Real-time attendance" />
        <StatCard title="Revenue" value={`$${(totalRevenue / 1000).toFixed(0)}K`} icon={DollarSign} subtitle={`${(outstandingAmount / 1000).toFixed(0)}K outstanding`} />
        <StatCard title="Vendors" value={vendors.length} icon={Briefcase} subtitle="Registered vendors" />
        <StatCard title="Freelancers" value={freelancers.length} icon={UserPlus} subtitle="Active freelancers" />
      </div>

      <DashboardStats />

      {/* ===== CHARTS ===== */}
      <div className="grid gap-4 md:grid-cols-2">

        <Card>
          <CardHeader>
            <CardTitle>Task Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={taskStatusData} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                  {taskStatusData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyAttendance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="total" stroke="#cbd5e1" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Project Progress & Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="progress" fill="#3b82f6" />
                <Bar dataKey="budget" fill="#10b981" />
                <Bar dataKey="spent" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ===== EMPLOYEE TASK SUMMARY ===== */}
      {currentUser.role === "employee" && (
        <Card>
          <CardHeader>
            <CardTitle>My Tasks Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <MiniStat icon={Clock} label="Pending" value={myTasks.filter(t => t.status === "pending").length} />
              <MiniStat icon={TrendingUp} label="In Progress" value={myTasks.filter(t => t.status === "in-progress").length} />
              <MiniStat icon={CheckCircle} label="Completed" value={completedTasks} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ================= WORKFORCE STATS ================= */

export function DashboardStats() {
  const { vendors, freelancers } = useWorkforce();

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="bg-white shadow rounded p-4">
        <h3 className="text-sm text-gray-500">Total Vendors</h3>
        <p className="text-2xl font-semibold">{vendors.length}</p>
      </div>

      <div className="bg-white shadow rounded p-4">
        <h3 className="text-sm text-gray-500">Total Freelancers</h3>
        <p className="text-2xl font-semibold">{freelancers.length}</p>
      </div>
    </div>
  );
}

/* ================= REUSABLE ================= */

function StatCard({ title, value, subtitle, icon: Icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{title}</p>
        <Icon className="h-4 w-4 text-gray-400" />
      </div>
      <p className="text-xl font-semibold mt-2">{value}</p>
      <p className="text-xs text-gray-400">{subtitle}</p>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: MiniStatProps) {
  return (
    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
      <Icon className="h-6 w-6 text-orange-500" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}