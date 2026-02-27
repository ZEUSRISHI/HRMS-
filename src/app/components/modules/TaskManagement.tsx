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

import { Plus, User, Trash, Pencil } from "lucide-react";
import { format } from "date-fns";

import { mockUsers } from "../../data/mockData";
import { Task, TaskStatus } from "../../types";

/* ================= FORM TYPE ================= */

type FormTask = {
  title: string;
  description: string;
  assignedTo: string;
  priority: "" | "low" | "medium" | "high";
  category: string;
  startDate: string;
  dueDate: string;
  estimatedHours: string;
  frequency: "daily" | "weekly" | "monthly" | "one-time";
  notes: string;
};

export function TaskManagement() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  const isManager = currentUser.role === "manager";
  const isAdmin = currentUser.role === "admin";

  /* ================= STORAGE ================= */

  const [tasks, setTasks] = useState<Task[]>(() => {
    const stored = localStorage.getItem("tasks");
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  /* ================= FILTERS ================= */

  const myTasks = tasks.filter((t) => t.assignedTo === currentUser.id);
  const assignedByMe = tasks.filter((t) => t.assignedBy === currentUser.id);

  /* ================= FORM ================= */

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const [form, setForm] = useState<FormTask>({
    title: "",
    description: "",
    assignedTo: "",
    priority: "",
    category: "",
    startDate: "",
    dueDate: "",
    estimatedHours: "",
    frequency: "one-time",
    notes: "",
  });

  /* ================= SAVE ================= */

  const handleSave = () => {
    if (!isManager) return;

    if (!form.title || !form.assignedTo || !form.priority || !form.dueDate) {
      return;
    }

    const baseTask: Omit<Task, "id" | "createdAt"> = {
      title: form.title,
      description: form.description,
      assignedTo: form.assignedTo,
      assignedBy: currentUser.id,
      priority: form.priority as any,
      status: "pending",
      dueDate: form.dueDate,
      frequency: form.frequency,
      comments: [],
      category: form.category || undefined,
      startDate: form.startDate || undefined,
      estimatedHours: form.estimatedHours
        ? Number(form.estimatedHours)
        : undefined,
      notes: form.notes || undefined,
    };

    if (editingTaskId) {
      setTasks((prev) =>
        prev.map((t) => (t.id === editingTaskId ? { ...t, ...baseTask } : t))
      );
      setEditingTaskId(null);
    } else {
      const newTask: Task = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        ...baseTask,
      };
      setTasks((prev) => [...prev, newTask]);
    }

    setForm({
      title: "",
      description: "",
      assignedTo: "",
      priority: "",
      category: "",
      startDate: "",
      dueDate: "",
      estimatedHours: "",
      frequency: "one-time",
      notes: "",
    });
  };

  /* ================= STATUS WORKFLOW ================= */

  const advanceStatus = (task: Task) => {
    const next: Record<TaskStatus, TaskStatus> = {
      pending: "in-progress",
      "in-progress": "completed",
      completed: "completed",
    };

    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, status: next[t.status] } : t
      )
    );
  };

  /* ================= DELETE ================= */

  const handleDelete = (id: string) => {
    if (!isManager) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  /* ================= USERS ================= */

  const assignableUsers = mockUsers.filter((u) =>
    ["manager", "hr", "employee"].includes(u.role)
  );

  /* ================= CARD ================= */

  const TaskCard = ({ task }: { task: Task }) => {
    const user = mockUsers.find((u) => u.id === task.assignedTo);

    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between">
            <CardTitle>{task.title}</CardTitle>
            <Badge>{task.status}</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          <p className="text-sm text-gray-500">{task.description}</p>

          <div className="flex justify-between text-xs">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {user?.name}
            </span>
            <span>{format(new Date(task.dueDate), "MMM d")}</span>
          </div>

          {task.status !== "completed" && (
            <Button size="sm" onClick={() => advanceStatus(task)}>
              Next Stage
            </Button>
          )}

          {isManager && (
            <div className="flex gap-2 justify-end">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setForm({
                    title: task.title,
                    description: task.description,
                    assignedTo: task.assignedTo,
                    priority: task.priority,
                    category: task.category || "",
                    startDate: task.startDate || "",
                    dueDate: task.dueDate,
                    estimatedHours: String(task.estimatedHours || ""),
                    frequency: task.frequency,
                    notes: task.notes || "",
                  });
                  setEditingTaskId(task.id);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>

              <Button size="icon" variant="ghost" onClick={() => handleDelete(task.id)}>
                <Trash className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  /* ================= UI ================= */

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="font-semibold text-lg">Task Management</h1>

        {isManager && (
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {editingTaskId ? "Update Task" : "Create Task"}
              </Button>
            </DialogTrigger>

            <DialogContent className="max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTaskId ? "Update Task" : "Create Task"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                <Input placeholder="Title" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })} />

                <Textarea placeholder="Description" value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />

                <Select value={form.assignedTo}
                  onValueChange={(v) => setForm({ ...form, assignedTo: v })}>
                  <SelectTrigger><SelectValue placeholder="Assign To" /></SelectTrigger>
                  <SelectContent>
                    {assignableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v as any })}>
                  <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>

                <Input placeholder="Category" value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })} />

                <Input type="date" value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })} />

                <Input type="date" value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />

                <Input placeholder="Estimated Hours" value={form.estimatedHours}
                  onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })} />

                <Select value={form.frequency}
                  onValueChange={(v) => setForm({ ...form, frequency: v as any })}>
                  <SelectTrigger><SelectValue placeholder="Frequency" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one-time">One Time</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>

                <Textarea placeholder="Notes" value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} />

                <Button className="w-full" onClick={handleSave}>
                  Save Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="my">
        <TabsList className={`grid w-full ${isManager ? "grid-cols-3" : "grid-cols-1"}`}>
          <TabsTrigger value="my">My Tasks</TabsTrigger>
          {isManager && <TabsTrigger value="assigned">Assigned</TabsTrigger>}
          {isAdmin && <TabsTrigger value="all">All Tasks</TabsTrigger>}
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

        {isAdmin && (
          <TabsContent value="all">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}