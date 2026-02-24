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

import { Plus, Calendar, User, Trash, Pencil } from "lucide-react";
import { format } from "date-fns";

import { mockUsers } from "../../data/mockData";
import { Task } from "../../types";

/* ✅ FORM TYPE (allows empty priority while editing) */
type FormTask = {
  title: string;
  description: string;
  assignedTo: string;
  priority: "" | "low" | "medium" | "high";
  dueDate: string;
  frequency: "daily" | "weekly" | "monthly" | "one-time";
};

export function TaskManagement() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  const isManager = currentUser.role === "manager";
  const isAdmin = currentUser.role === "admin";
  const isHR = currentUser.role === "hr";

  /* ================= POPUP ================= */
  const [popup, setPopup] = useState<string>("");

  const showPopup = (msg: string) => {
    setPopup(msg);
    setTimeout(() => setPopup(""), 2500);
  };

  /* ================= TASK STORAGE ================= */

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
  const allTasks = isManager || isAdmin || isHR ? tasks : myTasks;

  /* ================= FORM ================= */

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const [form, setForm] = useState<FormTask>({
    title: "",
    description: "",
    assignedTo: "",
    priority: "",
    dueDate: "",
    frequency: "one-time",
  });

  /* ================= CREATE / UPDATE ================= */

  const handleSave = () => {
    if (!isManager) return showPopup("Only Manager can manage tasks");

    if (
      !form.title ||
      !form.description ||
      !form.assignedTo ||
      !form.priority ||
      !form.dueDate
    ) {
      return showPopup("Please fill all fields");
    }

    /* ✅ Safe conversion to Task type */
    const baseTask: Omit<Task, "id" | "createdAt"> = {
      title: form.title,
      description: form.description,
      assignedTo: form.assignedTo,
      assignedBy: currentUser.id,
      priority: form.priority as "low" | "medium" | "high",
      status: "pending",
      dueDate: form.dueDate,
      frequency: form.frequency,
      comments: [],
    };

    if (editingTaskId) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTaskId
            ? { ...t, ...baseTask }
            : t
        )
      );
      showPopup("Task updated ✅");
      setEditingTaskId(null);
    } else {
      const newTask: Task = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        ...baseTask,
      };
      setTasks((prev) => [...prev, newTask]);
      showPopup("Task created 🎉");
    }

    setForm({
      title: "",
      description: "",
      assignedTo: "",
      priority: "",
      dueDate: "",
      frequency: "one-time",
    });
  };

  /* ================= DELETE ================= */

  const handleDelete = (id: string) => {
    if (!isManager) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    showPopup("Task deleted 🗑️");
  };

  /* ================= CARD ================= */

  const TaskCard = ({ task }: { task: Task }) => {
    const user = mockUsers.find((u) => u.id === task.assignedTo);

    return (
      <Card className="hover:shadow-lg transition-all">
        <CardHeader>
          <div className="flex justify-between">
            <CardTitle className="text-base">{task.title}</CardTitle>
            <Badge>{task.priority}</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          <p className="text-sm text-gray-500">{task.description}</p>

          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <User className="h-3 w-3" />
              {user?.name}
            </span>

            <span className="text-xs text-gray-500">
              {format(new Date(task.dueDate), "MMM d")}
            </span>
          </div>

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
                    dueDate: task.dueDate,
                    frequency: task.frequency,
                  });
                  setEditingTaskId(task.id);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleDelete(task.id)}
              >
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
    <div className="space-y-6 relative">
      {popup && (
        <div className="fixed top-6 right-6 bg-green-500 text-white px-4 py-2 rounded">
          {popup}
        </div>
      )}

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

            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingTaskId ? "Update Task" : "Create Task"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <Input
                  placeholder="Title"
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                />

                <Textarea
                  placeholder="Description"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />

                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm({ ...form, dueDate: e.target.value })
                  }
                />

                <Button className="w-full" onClick={handleSave}>
                  Save Task
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