import { useState, useEffect } from "react";
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

import { mockUsers } from "../../data/mockData";
import { Task } from "../../types";

export function TaskManagement() {
  const { currentUser } = useAuth();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  /* ================= LOAD TASKS ================= */

  const [tasks, setTasks] = useState<Task[]>(() => {
    const stored = localStorage.getItem("tasks");
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  if (!currentUser) return null;

  const isManager = currentUser.role === "manager";
  const isAdmin = currentUser.role === "admin";
  const isHR = currentUser.role === "hr";

  /* ================= ROLE BASED FILTER ================= */

  const myTasks = tasks.filter(
    (task) => task.assignedTo === currentUser.id
  );

  const assignedByMe = tasks.filter(
    (task) => task.assignedBy === currentUser.id
  );

  const allTasks =
    isManager || isAdmin || isHR
      ? tasks
      : myTasks;

  /* ================= NEW TASK STATE ================= */

  const [newTask, setNewTask] = useState<{
    title: string;
    description: string;
    assignedTo: string;
    priority: "low" | "medium" | "high" | "";
    dueDate: string;
    frequency: "daily" | "weekly" | "monthly" | "one-time";
  }>({
    title: "",
    description: "",
    assignedTo: "",
    priority: "",
    dueDate: "",
    frequency: "one-time",
  });

  /* ================= CREATE TASK ================= */

  const handleCreateTask = () => {
    if (!isManager) {
      alert("Only Manager can create tasks");
      return;
    }

    if (
      !newTask.title ||
      !newTask.description ||
      !newTask.assignedTo ||
      !newTask.priority ||
      !newTask.dueDate
    ) {
      alert("All fields are required");
      return;
    }

    const task: Task = {
      id: crypto.randomUUID(),
      title: newTask.title,
      description: newTask.description,
      assignedTo: newTask.assignedTo,
      assignedBy: currentUser.id,
      priority: newTask.priority,
      status: "pending",
      dueDate: newTask.dueDate,
      createdAt: new Date().toISOString(),
      frequency: newTask.frequency,
      comments: [],
    };

    setTasks((prev) => [...prev, task]);

    setNewTask({
      title: "",
      description: "",
      assignedTo: "",
      priority: "",
      dueDate: "",
      frequency: "one-time",
    });
  };

  /* ================= TASK CARD ================= */

  const TaskCard = ({ task }: { task: Task }) => {
    const assignedUser = mockUsers.find((u) => u.id === task.assignedTo);

    return (
      <Card
        className="cursor-pointer hover:shadow-lg transition-all"
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

          <div className="flex justify-between">
            <Badge variant="outline">{task.status}</Badge>
            <Badge variant="secondary">{task.frequency}</Badge>
          </div>
        </CardContent>
      </Card>
    );
  };

  /* ================= UI ================= */

  return (
    <div className="space-y-6">
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
                  <Input
                    value={newTask.title}
                    onChange={(e) =>
                      setNewTask({ ...newTask, title: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newTask.description}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        description: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Assign To</Label>
                    <Select
                      onValueChange={(value) =>
                        setNewTask({ ...newTask, assignedTo: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Priority</Label>
                    <Select
                      onValueChange={(value) =>
                        setNewTask({
                          ...newTask,
                          priority: value as "low" | "medium" | "high",
                        })
                      }
                    >
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
                  <Label>Frequency</Label>
                  <Select
                    value={newTask.frequency}
                    onValueChange={(value) =>
                      setNewTask({
                        ...newTask,
                        frequency: value as
                          | "daily"
                          | "weekly"
                          | "monthly"
                          | "one-time",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one-time">One Time</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        dueDate: e.target.value,
                      })
                    }
                  />
                </div>

                <Button className="w-full" onClick={handleCreateTask}>
                  Create Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="my">
        <TabsList
          className={`grid w-full ${
            isManager ? "grid-cols-3" : "grid-cols-1"
          }`}
        >
          <TabsTrigger value="my">My Tasks</TabsTrigger>
          {isManager && <TabsTrigger value="assigned">Assigned</TabsTrigger>}
          {(isManager || isAdmin || isHR) && (
            <TabsTrigger value="all">All Tasks</TabsTrigger>
          )}
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

        {(isManager || isAdmin || isHR) && (
          <TabsContent value="all">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {allTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}