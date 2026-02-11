import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Download, TrendingUp, Users, DollarSign, CheckCircle } from 'lucide-react';
import { mockAttendance, mockTasks, mockTimeEntries, mockPayroll, mockInvoices, mockProjects } from '../../data/mockData';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function AnalyticsReports() {
  // Attendance Analytics
  const attendanceRate = (mockAttendance.filter(a => a.status === 'present').length / mockAttendance.length) * 100;
  const attendanceByDay = [
    { day: 'Mon', present: 4, absent: 1 },
    { day: 'Tue', present: 5, absent: 0 },
    { day: 'Wed', present: 4, absent: 1 },
    { day: 'Thu', present: 5, absent: 0 },
    { day: 'Fri', present: 3, absent: 2 },
  ];

  // Task Analytics
  const taskStats = [
    { name: 'Pending', value: mockTasks.filter(t => t.status === 'pending').length },
    { name: 'In Progress', value: mockTasks.filter(t => t.status === 'in-progress').length },
    { name: 'Completed', value: mockTasks.filter(t => t.status === 'completed').length },
  ];
  const taskCompletionRate = (taskStats[2].value / mockTasks.length) * 100;

  // Productivity Analytics
  const totalHours = mockTimeEntries.reduce((sum, t) => sum + t.hours, 0);
  const avgHoursPerDay = totalHours / 5;
  const productivityByCategory = [
    { category: 'Project', hours: mockTimeEntries.filter(t => t.category === 'project').reduce((s, t) => s + t.hours, 0) },
    { category: 'Meeting', hours: mockTimeEntries.filter(t => t.category === 'meeting').reduce((s, t) => s + t.hours, 0) },
    { category: 'Admin', hours: mockTimeEntries.filter(t => t.category === 'admin').reduce((s, t) => s + t.hours, 0) },
    { category: 'Other', hours: mockTimeEntries.filter(t => t.category === 'other').reduce((s, t) => s + t.hours, 0) },
  ];

  // Financial Analytics
  const totalPayroll = mockPayroll.reduce((sum, p) => sum + p.netSalary, 0);
  const processedPayroll = mockPayroll.filter(p => p.status === 'processed').reduce((sum, p) => sum + p.netSalary, 0);
  const pendingPayroll = mockPayroll.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.netSalary, 0);

  const revenueData = [
    { month: 'Jan', invoiced: 160, collected: 155, outstanding: 5 },
    { month: 'Feb', invoiced: 0, collected: 75, outstanding: 85 },
  ];

  // Project Analytics
  const projectStatusData = [
    { status: 'Planning', count: mockProjects.filter(p => p.status === 'planning').length },
    { status: 'In Progress', count: mockProjects.filter(p => p.status === 'in-progress').length },
    { status: 'Completed', count: mockProjects.filter(p => p.status === 'completed').length },
    { status: 'On Hold', count: mockProjects.filter(p => p.status === 'on-hold').length },
  ].filter(p => p.count > 0);

  const budgetUtilization = mockProjects.map(p => ({
    name: p.name.substring(0, 15),
    budget: p.budget / 1000,
    spent: p.spent / 1000,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold mb-2">Analytics & Reports</h1>
          <p className="text-sm text-muted-foreground">Comprehensive insights and downloadable reports</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="this-week">
            <SelectTrigger className="w-[180px]">
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
            Export All
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold">{attendanceRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Task Completion</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-green-600">{taskCompletionRate.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">{taskStats[2].value} completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Work Hours</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold">{avgHoursPerDay.toFixed(1)} hrs/day</div>
            <p className="text-xs text-muted-foreground">{totalHours.toFixed(1)} hrs total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-green-600">${(mockInvoices.reduce((s, i) => s + i.paidAmount, 0) / 1000).toFixed(0)}K</div>
            <p className="text-xs text-muted-foreground">Collected</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="attendance" className="w-full">
        <TabsList>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>

        {/* Attendance Report */}
        <TabsContent value="attendance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Weekly Attendance</CardTitle>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={attendanceByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="present" fill="#10b981" name="Present" />
                    <Bar dataKey="absent" fill="#ef4444" name="Absent" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attendance Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <p className="text-sm text-muted-foreground">Present</p>
                    <p className="font-semibold">
                      {mockAttendance.filter(a => a.status === 'present').length} days
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">{attendanceRate.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <p className="text-sm text-muted-foreground">Absent</p>
                    <p className="font-semibold">
                      {mockAttendance.filter(a => a.status === 'absent').length} days
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <p className="text-sm text-muted-foreground">On Leave</p>
                    <p className="font-semibold">
                      {mockAttendance.filter(a => a.status === 'leave').length} days
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tasks Report */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Task Status Distribution</CardTitle>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={taskStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {taskStats.map((entry, index) => (
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
                <CardTitle>Task Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Tasks</p>
                    <p className="font-semibold">{mockTasks.length}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <p className="text-sm text-muted-foreground">Completion Rate</p>
                    <p className="font-semibold text-green-600">{taskCompletionRate.toFixed(0)}%</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <p className="text-sm text-muted-foreground">High Priority</p>
                    <p className="font-semibold text-orange-600">
                      {mockTasks.filter(t => t.priority === 'high').length} tasks
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Productivity Report */}
        <TabsContent value="productivity" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Time Distribution by Category</CardTitle>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productivityByCategory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="hours" fill="#3b82f6" name="Hours" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Report */}
        <TabsContent value="financial" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Revenue & Collections</CardTitle>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="invoiced" stroke="#3b82f6" strokeWidth={2} name="Invoiced (K)" />
                    <Line type="monotone" dataKey="collected" stroke="#10b981" strokeWidth={2} name="Collected (K)" />
                    <Line type="monotone" dataKey="outstanding" stroke="#f59e0b" strokeWidth={2} name="Outstanding (K)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payroll Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Payroll</p>
                    <p className="font-semibold">${totalPayroll.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <p className="text-sm text-muted-foreground">Processed</p>
                    <p className="font-semibold text-green-600">${processedPayroll.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="font-semibold text-orange-600">${pendingPayroll.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Projects Report */}
        <TabsContent value="projects" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Project Status</CardTitle>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={projectStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, count }) => `${status}: ${count}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {projectStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Budget Utilization</CardTitle>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={budgetUtilization}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="budget" fill="#3b82f6" name="Budget (K)" />
                    <Bar dataKey="spent" fill="#f59e0b" name="Spent (K)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
