import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

import { Plus, Calendar, User } from "lucide-react";
import { format } from "date-fns";

import { mockTasks, mockUsers } from "../../data/mockData";
import { Task } from "../../types";

export function TaskManagement() {
  const { currentUser } = useAuth();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  if (!currentUser) return null;

  const isManager = currentUser.role === "manager";

  /* ===== FILTER TASKS ===== */

  const myTasks = mockTasks.filter(
    (task) => task.assignedTo === currentUser.id
  );

  const assignedByMe = mockTasks.filter(
    (task) => task.assignedBy === currentUser.id
  );

  /* ===== TASK CARD ===== */

  const TaskCard = ({ task }: { task: Task }) => {
    const assignedUser = mockUsers.find((u) => u.id === task.assignedTo);

    return (
      <Card
        className="cursor-pointer hover:shadow-md transition"
        onClick={() => setSelectedTask(task)}
      >
        <CardHeader>
          <div className="flex justify-between">
            <CardTitle className="text-base">{task.title}</CardTitle>

            <Badge
              variant={
                task.priority === "high"
                  ? "destructive"
                  : task.priority === "medium"
                  ? "default"
                  : "secondary"
              }
            >
              {task.priority}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          <p className="text-sm text-gray-500 line-clamp-2">
            {task.description}
          </p>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {assignedUser?.name}
            </span>

            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(task.dueDate), "MMM d, yyyy")}
            </span>
          </div>

          <Badge variant="outline">{task.status}</Badge>
        </CardContent>
      </Card>
    );
  };

  /* ===== UI ===== */

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-semibold text-lg">Task Management</h1>
          <p className="text-sm text-gray-500">
            Track assigned tasks and deadlines
          </p>
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
                  <Label>Title</Label>
                  <Input placeholder="Task title" />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea placeholder="Task description" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Assign To</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Priority</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Due Date</Label>
                  <Input type="date" />
                </div>

                <Button className="w-full">Create Task</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* TABS */}
      <Tabs defaultValue="my">
        <TabsList className={`grid w-full ${isManager ? "grid-cols-3" : "grid-cols-1"}`}>
          <TabsTrigger value="my">My Tasks</TabsTrigger>
          {isManager && <TabsTrigger value="assigned">Assigned</TabsTrigger>}
          {isManager && <TabsTrigger value="all">All Tasks</TabsTrigger>}
        </TabsList>

        <TabsContent value="my">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </TabsContent>

        {isManager && (
          <TabsContent value="assigned">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assignedByMe.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </TabsContent>
        )}

        {isManager && (
          <TabsContent value="all">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {mockTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* TASK DETAILS */}
      {selectedTask && (
        <Dialog open onOpenChange={() => setSelectedTask(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedTask.title}</DialogTitle>
            </DialogHeader>

            <p className="text-sm text-gray-500">
              {selectedTask.description}
            </p>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
