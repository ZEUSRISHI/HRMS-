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
import { Plus, User, Trash, Pencil, ClipboardList } from "lucide-react";
import { format } from "date-fns";

import { Task, TaskStatus } from "../../types";

/* ================= TYPES ================= */

type FormTask = {
  title: string;
  description: string;
  assignedRole: "" | "manager" | "hr" | "employee";
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

  const isAdmin = currentUser.role === "admin";
  const isManager = currentUser.role === "manager";
  const isHR = currentUser.role === "hr";
  const isEmployee = currentUser.role === "employee";

  /* ================= STORAGE ================= */

  const [tasks, setTasks] = useState<Task[]>(() => {
    const stored = localStorage.getItem("tasks");
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  /* ================= FILTERS ================= */

  const myTasks = tasks.filter(
    (t) => t.assignedTo === currentUser.role
  );

  const assignedByMe = tasks.filter(
    (t) => t.assignedBy === currentUser.id
  );

  /* ================= FORM ================= */

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const [form, setForm] = useState<FormTask>({
    title: "",
    description: "",
    assignedRole: "",
    priority: "",
    category: "",
    startDate: "",
    dueDate: "",
    estimatedHours: "",
    frequency: "one-time",
    notes: "",
  });

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      assignedRole: "",
      priority: "",
      category: "",
      startDate: "",
      dueDate: "",
      estimatedHours: "",
      frequency: "one-time",
      notes: "",
    });
    setEditingTaskId(null);
  };

  const handleSave = () => {
    if (!isAdmin && !isManager) return;
    if (!form.title || !form.assignedRole || !form.priority || !form.dueDate)
      return;

    const baseTask: Omit<Task, "id" | "createdAt"> = {
      title: form.title,
      description: form.description,
      assignedTo: form.assignedRole,
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
        prev.map((t) =>
          t.id === editingTaskId ? { ...t, ...baseTask } : t
        )
      );
    } else {
      const newTask: Task = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        ...baseTask,
      };
      setTasks((prev) => [...prev, newTask]);
    }

    resetForm();
  };

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

  const handleDelete = (id: string) => {
    if (!isAdmin && !isManager) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  /* ================= TASK CARD ================= */

  const TaskCard = ({ task }: { task: Task }) => (
    <Card className="shadow-md hover:shadow-xl transition-all rounded-2xl border">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-base font-semibold">
            {task.title}
          </CardTitle>
          <Badge variant="outline">{task.status}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground line-clamp-2">
          {task.description}
        </p>

        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {task.assignedTo.toUpperCase()}
          </span>
          <span>{format(new Date(task.dueDate), "MMM d, yyyy")}</span>
        </div>

        {task.status !== "completed" && (
          <Button size="sm" className="w-full" onClick={() => advanceStatus(task)}>
            Move to Next Stage
          </Button>
        )}

        {(isAdmin || isManager) && (
          <div className="flex justify-end gap-2 pt-2">
            <Button size="icon" variant="ghost" onClick={() => {
              setForm({
                title: task.title,
                description: task.description,
                assignedRole: task.assignedTo as any,
                priority: task.priority,
                category: task.category || "",
                startDate: task.startDate || "",
                dueDate: task.dueDate,
                estimatedHours: String(task.estimatedHours || ""),
                frequency: task.frequency,
                notes: task.notes || "",
              });
              setEditingTaskId(task.id);
            }}>
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

  /* ================= TAB CONTROL ================= */

  const defaultTab = isAdmin
    ? "assigned"
    : isHR || isEmployee
    ? "my"
    : "my";

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Task Management
        </h1>

        {(isAdmin || isManager) && (
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {editingTaskId ? "Edit Task" : "Create Task"}
              </Button>
            </DialogTrigger>

            <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingTaskId ? "Update Task" : "Create New Task"}
                </DialogTitle>
              </DialogHeader>

              {/* ===== Improved Professional Form ===== */}
              <div className="space-y-6">

                {/* Basic Info */}
                <div className="space-y-4">
                  <Input
                    placeholder="Task Title"
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                  />

                  <Textarea
                    placeholder="Task Description"
                    rows={3}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>

                {/* Assignment & Priority */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Select
                    value={form.assignedRole}
                    onValueChange={(v) =>
                      setForm({ ...form, assignedRole: v as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assign Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {isAdmin && (
                        <SelectItem value="manager">Manager</SelectItem>
                      )}
                      {isManager && (
                        <>
                          <SelectItem value="hr">HR</SelectItem>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>

                  <Select
                    value={form.priority}
                    onValueChange={(v) =>
                      setForm({ ...form, priority: v as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Priority Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Dates & Hours */}
                <div className="grid md:grid-cols-3 gap-4">
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm({ ...form, startDate: e.target.value })
                    }
                  />

                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm({ ...form, dueDate: e.target.value })
                    }
                  />

                  <Input
                    type="number"
                    placeholder="Estimated Hours"
                    value={form.estimatedHours}
                    onChange={(e) =>
                      setForm({ ...form, estimatedHours: e.target.value })
                    }
                  />
                </div>

                {/* Category & Frequency */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Category"
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                  />

                  <Select
                    value={form.frequency}
                    onValueChange={(v: any) =>
                      setForm({ ...form, frequency: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Task Frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="one-time">One Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Textarea
                  placeholder="Additional Notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                />

                <Button className="w-full mt-2" size="lg" onClick={handleSave}>
                  {editingTaskId ? "Update Task" : "Save Task"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* ================= TABS ================= */}

      <Tabs defaultValue={defaultTab}>
        <TabsList className="grid w-full grid-cols-2">
          {(isManager || isHR || isEmployee) && (
            <TabsTrigger value="my">My Tasks</TabsTrigger>
          )}
          {(isAdmin || isManager) && (
            <TabsTrigger value="assigned">Assigned By Me</TabsTrigger>
          )}
        </TabsList>

        {(isManager || isHR || isEmployee) && (
          <TabsContent value="my">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </TabsContent>
        )}

        {(isAdmin || isManager) && (
          <TabsContent value="assigned">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assignedByMe.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}