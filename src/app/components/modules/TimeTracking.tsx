import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Clock, Plus, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { mockTimeEntries, mockProjects, mockUsers } from '../../data/mockData';
import { format } from 'date-fns';

export function TimeTracking() {
  const { currentUser } = useAuth();
  const isManager = currentUser.role === 'manager' || currentUser.role === 'admin';

  const timeEntries = isManager 
    ? mockTimeEntries 
    : mockTimeEntries.filter(t => t.userId === currentUser.id);

  // Calculate statistics
  const totalHoursToday = timeEntries
    .filter(t => t.date === format(new Date(), 'yyyy-MM-dd'))
    .reduce((sum, t) => sum + t.hours, 0);

  const totalHoursWeek = timeEntries.reduce((sum, t) => sum + t.hours, 0);

  const projectHours = mockProjects.map(project => {
    const hours = timeEntries
      .filter(t => t.projectId === project.id)
      .reduce((sum, t) => sum + t.hours, 0);
    return { project: project.name, hours };
  }).filter(p => p.hours > 0);

  const categoryBreakdown = [
    { category: 'Project', hours: timeEntries.filter(t => t.category === 'project').reduce((s, t) => s + t.hours, 0) },
    { category: 'Meeting', hours: timeEntries.filter(t => t.category === 'meeting').reduce((s, t) => s + t.hours, 0) },
    { category: 'Admin', hours: timeEntries.filter(t => t.category === 'admin').reduce((s, t) => s + t.hours, 0) },
    { category: 'Other', hours: timeEntries.filter(t => t.category === 'other').reduce((s, t) => s + t.hours, 0) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold mb-2">Time Tracking</h1>
          <p className="text-sm text-muted-foreground">Log work hours and track productivity</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Log Time
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Work Hours</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Date</Label>
                <Input type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} />
              </div>
              <div>
                <Label>Project (Optional)</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Project</SelectItem>
                    {mockProjects.map(project => (
                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Hours</Label>
                <Input type="number" step="0.5" placeholder="0.0" />
              </div>
              <div>
                <Label>Category</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">Project Work</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="admin">Administrative</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea placeholder="Describe what you worked on..." rows={3} />
              </div>
              <Button className="w-full">Log Time Entry</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold">{totalHoursToday.toFixed(1)} hrs</div>
            <p className="text-xs text-muted-foreground">{format(new Date(), 'MMMM d, yyyy')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold">{totalHoursWeek.toFixed(1)} hrs</div>
            <p className="text-xs text-muted-foreground">Avg {(totalHoursWeek / 5).toFixed(1)} hrs/day</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilization</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-green-600">{((totalHoursWeek / 40) * 100).toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">Of 40 hrs/week</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Time by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {categoryBreakdown.map(item => (
              <div key={item.category} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{item.category}</Badge>
                </div>
                <span className="font-medium">{item.hours.toFixed(1)} hrs</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Project Hours */}
      {projectHours.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Time by Project</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {projectHours.map(item => (
                <div key={item.project} className="flex items-center justify-between">
                  <span className="text-sm">{item.project}</span>
                  <span className="font-medium">{item.hours.toFixed(1)} hrs</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Time Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {isManager && <TableHead>Employee</TableHead>}
                <TableHead>Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeEntries.map(entry => {
                const user = mockUsers.find(u => u.id === entry.userId);
                const project = mockProjects.find(p => p.id === entry.projectId);
                return (
                  <TableRow key={entry.id}>
                    {isManager && <TableCell>{user?.name}</TableCell>}
                    <TableCell>{format(new Date(entry.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{project?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{entry.category}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{entry.hours} hrs</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{entry.description}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">Edit</Button>
                        <Button variant="ghost" size="sm">Delete</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
