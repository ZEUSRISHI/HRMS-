import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { FolderKanban, Users, DollarSign, Calendar, CheckCircle2, Plus } from 'lucide-react';
import { mockProjects, mockClients, mockUsers } from '../../data/mockData';
import { format } from 'date-fns';

export function ProjectManagement() {
  const activeProjects = mockProjects.filter(p => p.status === 'in-progress').length;
  const completedProjects = mockProjects.filter(p => p.status === 'completed').length;
  const totalBudget = mockProjects.reduce((sum, p) => sum + p.budget, 0);
  const totalSpent = mockProjects.reduce((sum, p) => sum + p.spent, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in-progress': return 'secondary';
      case 'planning': return 'outline';
      case 'on-hold': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold mb-2">Project Management</h1>
          <p className="text-sm text-muted-foreground">Track projects, milestones, and team progress</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Project Name</Label>
                <Input placeholder="Enter project name..." />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea placeholder="Enter project description..." rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Client</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockClients.map(client => (
                        <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" />
                </div>
              </div>
              <div>
                <Label>Budget</Label>
                <Input type="number" placeholder="0.00" />
              </div>
              <div>
                <Label>Team Members</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team members" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full">Create Project</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold">{activeProjects}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-green-600">{completedProjects}</div>
            <p className="text-xs text-muted-foreground">Successfully delivered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold">${(totalBudget / 1000).toFixed(0)}K</div>
            <p className="text-xs text-muted-foreground">Allocated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-orange-600">${(totalSpent / 1000).toFixed(0)}K</div>
            <p className="text-xs text-muted-foreground">{((totalSpent / totalBudget) * 100).toFixed(0)}% utilized</p>
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {mockProjects.map(project => {
          const client = mockClients.find(c => c.id === project.clientId);
          const budgetUtilization = (project.spent / project.budget) * 100;
          
          return (
            <Card key={project.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{client?.company}</p>
                  </div>
                  <Badge variant={getStatusColor(project.status)} className="capitalize">
                    {project.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{project.description}</p>
                
                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm">Project Progress</Label>
                    <span className="text-sm font-medium">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-2" />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Start Date</p>
                    <p className="text-sm font-medium">{format(new Date(project.startDate), 'MMM d, yyyy')}</p>
                  </div>
                  {project.endDate && (
                    <div>
                      <p className="text-xs text-muted-foreground">End Date</p>
                      <p className="text-sm font-medium">{format(new Date(project.endDate), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Budget</p>
                    <p className="text-sm font-medium">${(project.budget / 1000).toFixed(0)}K</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Spent</p>
                    <p className="text-sm font-medium text-orange-600">${(project.spent / 1000).toFixed(0)}K</p>
                  </div>
                </div>

                {/* Budget Utilization */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm">Budget Utilization</Label>
                    <span className="text-sm font-medium">{budgetUtilization.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={budgetUtilization} 
                    className="h-2" 
                  />
                </div>

                {/* Team Members */}
                <div>
                  <Label className="text-sm mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Team Members ({project.teamMembers.length})
                  </Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {project.teamMembers.map(memberId => {
                      const member = mockUsers.find(u => u.id === memberId);
                      return (
                        <Badge key={memberId} variant="outline">
                          {member?.name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                {/* Milestones */}
                <div>
                  <Label className="text-sm mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Milestones ({project.milestones.filter(m => m.status === 'completed').length}/{project.milestones.length} completed)
                  </Label>
                  <div className="space-y-2 mt-2">
                    {project.milestones.map(milestone => (
                      <div key={milestone.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          {milestone.status === 'completed' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2" />
                          )}
                          <span className="text-sm">{milestone.title}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {milestone.status === 'completed' && milestone.completedDate ? (
                            <span className="text-green-600">
                              Completed {format(new Date(milestone.completedDate), 'MMM d')}
                            </span>
                          ) : (
                            <span>Due {format(new Date(milestone.dueDate), 'MMM d')}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm">Edit Project</Button>
                  <Button variant="outline" size="sm">View Details</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
