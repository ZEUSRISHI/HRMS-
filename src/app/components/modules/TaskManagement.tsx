import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Plus, Calendar, User, Flag, MessageSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { mockTasks, mockUsers } from '../../data/mockData';
import { Task } from '../../types';
import { format } from 'date-fns';

export function TaskManagement() {
  const { currentUser } = useAuth();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const isManager = currentUser.role === 'manager' || currentUser.role === 'admin';

  const myTasks = mockTasks.filter(t => t.assignedTo === currentUser.id);
  const assignedByMe = mockTasks.filter(t => t.assignedBy === currentUser.id);

  const TaskCard = ({ task }: { task: Task }) => {
    const assignedUser = mockUsers.find(u => u.id === task.assignedTo);
    const creator = mockUsers.find(u => u.id === task.assignedBy);
    
    return (
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedTask(task)}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-base">{task.title}</CardTitle>
            <Badge
              variant={
                task.priority === 'high' ? 'destructive' :
                task.priority === 'medium' ? 'default' : 'secondary'
              }
            >
              {task.priority}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {assignedUser?.name}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(task.dueDate), 'MMM d, yyyy')}
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {task.comments.length} comments
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {task.frequency}
            </Badge>
            <Badge
              variant={
                task.status === 'completed' ? 'default' :
                task.status === 'in-progress' ? 'secondary' : 'outline'
              }
            >
              {task.status}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold mb-2">Task Management</h1>
          <p className="text-sm text-muted-foreground">Create, assign, and track tasks across teams</p>
        </div>
        {isManager && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Task Title</Label>
                  <Input placeholder="Enter task title..." />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea placeholder="Enter task description..." rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Assign To</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockUsers.filter(u => u.status === 'active').map(user => (
                          <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Due Date</Label>
                    <Input type="date" />
                  </div>
                  <div>
                    <Label>Frequency</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one-time">One-time</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full">Create Task</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="my-tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="my-tasks">My Tasks</TabsTrigger>
          {isManager && <TabsTrigger value="assigned">Assigned by Me</TabsTrigger>}
          <TabsTrigger value="all">All Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="my-tasks" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
          {myTasks.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No tasks assigned to you
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {isManager && (
          <TabsContent value="assigned" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assignedByMe.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </TabsContent>
        )}

        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mockTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Task Detail Dialog */}
      {selectedTask && (
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                {selectedTask.title}
                <Badge
                  variant={
                    selectedTask.status === 'completed' ? 'default' :
                    selectedTask.status === 'in-progress' ? 'secondary' : 'outline'
                  }
                >
                  {selectedTask.status}
                </Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Description</Label>
                <p className="text-sm text-muted-foreground mt-1">{selectedTask.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Assigned To</Label>
                  <p className="text-sm mt-1">{mockUsers.find(u => u.id === selectedTask.assignedTo)?.name}</p>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Badge variant={selectedTask.priority === 'high' ? 'destructive' : 'default'}>
                    {selectedTask.priority}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Due Date</Label>
                  <p className="text-sm mt-1">{format(new Date(selectedTask.dueDate), 'MMMM d, yyyy')}</p>
                </div>
                <div>
                  <Label>Frequency</Label>
                  <p className="text-sm mt-1 capitalize">{selectedTask.frequency}</p>
                </div>
              </div>
              
              {/* Comments Section */}
              <div>
                <Label>Comments ({selectedTask.comments.length})</Label>
                <div className="mt-2 space-y-3 max-h-60 overflow-y-auto">
                  {selectedTask.comments.map(comment => {
                    const commenter = mockUsers.find(u => u.id === comment.userId);
                    return (
                      <div key={comment.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">{commenter?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(comment.timestamp), 'MMM d, h:mm a')}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">{comment.comment}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex gap-2">
                  <Textarea placeholder="Add a comment..." rows={2} />
                  <Button>Post</Button>
                </div>
              </div>

              {/* Update Status */}
              {selectedTask.assignedTo === currentUser.id && (
                <div>
                  <Label>Update Status</Label>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm">Mark as Pending</Button>
                    <Button variant="outline" size="sm">Mark as In Progress</Button>
                    <Button variant="default" size="sm">Mark as Completed</Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
