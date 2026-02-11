import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Users, CheckCircle, Clock, DollarSign, FolderKanban, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { mockUsers, mockTasks, mockProjects, mockAttendance, mockInvoices } from '../data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export function Dashboard() {
  const { currentUser } = useAuth();

  // Calculate statistics
  const totalEmployees = mockUsers.filter(u => u.status === 'active').length;
  const myTasks = mockTasks.filter(t => t.assignedTo === currentUser.id);
  const completedTasks = myTasks.filter(t => t.status === 'completed').length;
  const activeProjects = mockProjects.filter(p => p.status === 'in-progress').length;
  const totalRevenue = mockInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const outstandingAmount = mockInvoices.reduce((sum, inv) => sum + (inv.amount - inv.paidAmount), 0);

  // Attendance rate
  const attendanceRecords = mockAttendance.filter(a => a.status === 'present');
  const attendanceRate = (attendanceRecords.length / mockAttendance.length) * 100;

  // Task completion data for chart
  const taskStatusData = [
    { name: 'Pending', value: mockTasks.filter(t => t.status === 'pending').length },
    { name: 'In Progress', value: mockTasks.filter(t => t.status === 'in-progress').length },
    { name: 'Completed', value: mockTasks.filter(t => t.status === 'completed').length },
  ];

  // Project progress data
  const projectData = mockProjects.map(p => ({
    name: p.name.substring(0, 20),
    progress: p.progress,
    budget: p.budget / 1000,
    spent: p.spent / 1000,
  }));

  // Weekly attendance trend
  const weeklyAttendance = [
    { day: 'Mon', present: 4, total: 5 },
    { day: 'Tue', present: 5, total: 5 },
    { day: 'Wed', present: 4, total: 5 },
    { day: 'Thu', present: 5, total: 5 },
    { day: 'Fri', present: 3, total: 5 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold mb-2">Welcome back, {currentUser.name}!</h1>
        <p className="text-muted-foreground">Here's what's happening with your organization today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold">{totalEmployees}</div>
            <p className="text-xs text-muted-foreground">Active employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold">{activeProjects}</div>
            <p className="text-xs text-muted-foreground">Currently in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold">{attendanceRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold">${(totalRevenue / 1000).toFixed(0)}K</div>
            <p className="text-xs text-muted-foreground">${(outstandingAmount / 1000).toFixed(0)}K outstanding</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Task Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={taskStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {taskStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
                <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} name="Present" />
                <Line type="monotone" dataKey="total" stroke="#cbd5e1" strokeWidth={2} name="Total" />
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
                <YAxis yAxisId="left" label={{ value: 'Progress %', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'Budget (K)', angle: 90, position: 'insideRight' }} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="progress" fill="#3b82f6" name="Progress %" />
                <Bar yAxisId="right" dataKey="budget" fill="#10b981" name="Budget (K)" />
                <Bar yAxisId="right" dataKey="spent" fill="#f59e0b" name="Spent (K)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      {currentUser.role === 'employee' && (
        <Card>
          <CardHeader>
            <CardTitle>My Tasks Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-4">
                <Clock className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="font-semibold">{myTasks.filter(t => t.status === 'pending').length} tasks</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <TrendingUp className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="font-semibold">{myTasks.filter(t => t.status === 'in-progress').length} tasks</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="font-semibold">{completedTasks} tasks</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
