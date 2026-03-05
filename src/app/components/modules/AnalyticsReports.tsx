import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

import {
  Download,
  TrendingUp,
  Users,
  DollarSign,
  CheckCircle,
} from "lucide-react";

import {
  mockAttendance,
  mockTasks,
  mockTimeEntries,
  mockPayroll,
  mockInvoices,
  mockProjects,
} from "../../data/mockData";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

export function AnalyticsReports() {
  /* ---------------- Attendance ---------------- */

  const attendanceRate =
    (mockAttendance.filter((a) => a.status === "present").length /
      mockAttendance.length) *
    100;

  const attendanceByDay = [
    { day: "Mon", present: 4, absent: 1 },
    { day: "Tue", present: 5, absent: 0 },
    { day: "Wed", present: 4, absent: 1 },
    { day: "Thu", present: 5, absent: 0 },
    { day: "Fri", present: 3, absent: 2 },
  ];

  /* ---------------- Tasks ---------------- */

  const taskStats = [
    { name: "Pending", value: mockTasks.filter((t) => t.status === "pending").length },
    { name: "In Progress", value: mockTasks.filter((t) => t.status === "in-progress").length },
    { name: "Completed", value: mockTasks.filter((t) => t.status === "completed").length },
  ];

  const taskCompletionRate = (taskStats[2].value / mockTasks.length) * 100;

  /* ---------------- Productivity ---------------- */

  const totalHours = mockTimeEntries.reduce((sum, t) => sum + t.hours, 0);

  const productivityByCategory = [
    {
      category: "Project",
      hours: mockTimeEntries
        .filter((t) => t.category === "project")
        .reduce((s, t) => s + t.hours, 0),
    },
    {
      category: "Meeting",
      hours: mockTimeEntries
        .filter((t) => t.category === "meeting")
        .reduce((s, t) => s + t.hours, 0),
    },
    {
      category: "Admin",
      hours: mockTimeEntries
        .filter((t) => t.category === "admin")
        .reduce((s, t) => s + t.hours, 0),
    },
    {
      category: "Other",
      hours: mockTimeEntries
        .filter((t) => t.category === "other")
        .reduce((s, t) => s + t.hours, 0),
    },
  ];

  /* ---------------- Financial ---------------- */

  const totalPayroll = mockPayroll.reduce((sum, p) => sum + p.netSalary, 0);

  const processedPayroll = mockPayroll
    .filter((p) => p.status === "processed")
    .reduce((sum, p) => sum + p.netSalary, 0);

  const pendingPayroll = mockPayroll
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.netSalary, 0);

  const revenueData = [
    { month: "Jan", invoiced: 160, collected: 155, outstanding: 5 },
    { month: "Feb", invoiced: 0, collected: 75, outstanding: 85 },
  ];

  /* ---------------- Projects ---------------- */

  const projectStatusData = [
    { status: "Planning", count: mockProjects.filter((p) => p.status === "planning").length },
    { status: "In Progress", count: mockProjects.filter((p) => p.status === "in-progress").length },
    { status: "Completed", count: mockProjects.filter((p) => p.status === "completed").length },
    { status: "On Hold", count: mockProjects.filter((p) => p.status === "on-hold").length },
  ].filter((p) => p.count > 0);

  const budgetUtilization = mockProjects.map((p) => ({
    name: p.name.substring(0, 12),
    budget: p.budget / 1000,
    spent: p.spent / 1000,
  }));

  return (
    <div className="space-y-6 px-3 sm:px-4 md:px-6">

      {/* HEADER */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

        <div>
          <h1 className="text-lg md:text-xl font-semibold">
            Analytics & Reports
          </h1>
          <p className="text-sm text-muted-foreground">
            Comprehensive insights and downloadable reports
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">

          <Select defaultValue="this-week">
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>

        </div>
      </div>

      {/* METRIC CARDS */}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        <Card>
          <CardHeader className="flex flex-row justify-between pb-2">
            <CardTitle className="text-sm">Attendance Rate</CardTitle>
            <Users size={16} />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {attendanceRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between flex-row pb-2">
            <CardTitle className="text-sm">Task Completion</CardTitle>
            <CheckCircle size={16} className="text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-green-600">
              {taskCompletionRate.toFixed(0)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between flex-row pb-2">
            <CardTitle className="text-sm">Work Hours</CardTitle>
            <TrendingUp size={16} />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {totalHours.toFixed(1)} hrs
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between flex-row pb-2">
            <CardTitle className="text-sm">Revenue</CardTitle>
            <DollarSign size={16} className="text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-green-600">
              $
              {(mockInvoices.reduce((s, i) => s + i.paidAmount, 0) / 1000).toFixed(
                0
              )}
              K
            </div>
          </CardContent>
        </Card>

      </div>

      {/* TABS */}

      <Tabs defaultValue="attendance">

        <TabsList className="flex overflow-x-auto w-full">
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>

        {/* ATTENDANCE */}

        <TabsContent value="attendance">

          <Card>

            <CardHeader className="flex flex-row justify-between">

              <CardTitle>Weekly Attendance</CardTitle>

              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>

            </CardHeader>

            <CardContent className="h-[300px]">

              <ResponsiveContainer width="100%" height="100%">

                <BarChart data={attendanceByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="present" fill="#10b981" />
                  <Bar dataKey="absent" fill="#ef4444" />
                </BarChart>

              </ResponsiveContainer>

            </CardContent>

          </Card>

        </TabsContent>

        {/* TASKS */}

        <TabsContent value="tasks">

          <Card>

            <CardHeader>
              <CardTitle>Task Status</CardTitle>
            </CardHeader>

            <CardContent className="h-[300px]">

              <ResponsiveContainer width="100%" height="100%">

                <PieChart>

                  <Pie
                    data={taskStats}
                    dataKey="value"
                    label
                    outerRadius={100}
                  >

                    {taskStats.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}

                  </Pie>

                  <Tooltip />

                </PieChart>

              </ResponsiveContainer>

            </CardContent>

          </Card>

        </TabsContent>

        {/* PRODUCTIVITY */}

        <TabsContent value="productivity">

          <Card>

            <CardHeader>
              <CardTitle>Time Distribution</CardTitle>
            </CardHeader>

            <CardContent className="h-[300px]">

              <ResponsiveContainer width="100%" height="100%">

                <BarChart data={productivityByCategory}>

                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="hours" fill="#3b82f6" />

                </BarChart>

              </ResponsiveContainer>

            </CardContent>

          </Card>

        </TabsContent>

        {/* FINANCIAL */}

        <TabsContent value="financial">

          <Card>

            <CardHeader>
              <CardTitle>Revenue & Collections</CardTitle>
            </CardHeader>

            <CardContent className="h-[300px]">

              <ResponsiveContainer width="100%" height="100%">

                <LineChart data={revenueData}>

                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />

                  <Line type="monotone" dataKey="invoiced" stroke="#3b82f6" />
                  <Line type="monotone" dataKey="collected" stroke="#10b981" />
                  <Line type="monotone" dataKey="outstanding" stroke="#f59e0b" />

                </LineChart>

              </ResponsiveContainer>

            </CardContent>

          </Card>

        </TabsContent>

      </Tabs>
    </div>
  );
}