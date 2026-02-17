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
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import {
  mockUsers,
  mockTasks,
  mockProjects,
  mockAttendance,
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

import { useWorkforce } from "../contexts/WorkforceContext";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export function Dashboard() {
  const { currentUser } = useAuth();
  const { vendors, freelancers } = useWorkforce(); // ✅ Workforce data

  if (!currentUser) return <div className="p-6">Loading user...</div>;

  /* ================= STATS ================= */

  const totalEmployees = mockUsers.filter((u) => u.status === "active").length;
  const myTasks = mockTasks.filter((t) => t.assignedTo === currentUser.id);
  const completedTasks = myTasks.filter((t) => t.status === "completed").length;
  const activeProjects = mockProjects.filter((p) => p.status === "in-progress").length;

  const totalRevenue = mockInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const outstandingAmount = mockInvoices.reduce(
    (sum, inv) => sum + (inv.amount - inv.paidAmount),
    0
  );

  const attendanceRecords = mockAttendance.filter((a) => a.status === "present");
  const attendanceRate = (attendanceRecords.length / mockAttendance.length) * 100;

  /* ================= CHART DATA ================= */

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

  const weeklyAttendance = [
    { day: "Mon", present: 4, total: 5 },
    { day: "Tue", present: 5, total: 5 },
    { day: "Wed", present: 4, total: 5 },
    { day: "Thu", present: 5, total: 5 },
    { day: "Fri", present: 3, total: 5 },
  ];

  return (
    <div className="space-y-6">

      {/* USER INFO */}
      <UserInfoCard />

      {/* HEADER */}
      <div>
        <h1 className="font-semibold mb-2">
          Welcome back, {currentUser.name} 👋
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening with your organization today.
        </p>
      </div>

      {/* ================= STATS GRID ================= */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <StatCard title="Total Employees" value={totalEmployees} icon={Users} subtitle="Active employees" />
        <StatCard title="Active Projects" value={activeProjects} icon={FolderKanban} subtitle="In progress" />
        <StatCard title="Attendance Rate" value={`${attendanceRate.toFixed(1)}%`} icon={CheckCircle} subtitle="This week" />
        <StatCard title="Revenue" value={`$${(totalRevenue / 1000).toFixed(0)}K`} icon={DollarSign} subtitle={`${(outstandingAmount / 1000).toFixed(0)}K outstanding`} />

        {/* ✅ NEW WORKFORCE STATS */}
        <StatCard title="Vendors" value={vendors.length} icon={Briefcase} subtitle="Registered vendors" />
        <StatCard title="Freelancers" value={freelancers.length} icon={UserPlus} subtitle="Active freelancers" />
      </div>

      {/* ================= CHARTS ================= */}
      <div className="grid gap-4 md:grid-cols-2">

        {/* PIE */}
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

        {/* LINE */}
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

        {/* BAR */}
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

      {/* ================= EMPLOYEE SUMMARY ================= */}
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

/* ================= REUSABLE COMPONENTS ================= */

function StatCard({ title, value, subtitle, icon: Icon }: any) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{title}</p>
        <Icon className="h-4 w-4 text-gray-400" />
      </div>
      <p className="text-xl font-semibold mt-2">{value}</p>
      <p className="text-xs text-gray-400">{subtitle}</p>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: any) {
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
