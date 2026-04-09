import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";
import { Plus, Pencil, Trash } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { taskApi } from "@/services/api";

type TaskStatus = "pending" | "in-progress" | "completed";
type Priority   = "low" | "medium" | "high";

interface AssignableUser {
  _id:   string;
  name:  string;
  email: string;
  role:  string;
}

interface Task {
  _id:         string;
  title:       string;
  description: string;
  assignedTo:  any;
  assignedBy:  any;
  priority:    Priority;
  dueDate:     string;
  status:      TaskStatus;
  updates:     any[];
}

export function TaskManagement() {
  const { currentUser } = useAuth();

  // ✅ FIX: AuthContext User type uses 'id' or '_id' — handle both
  const myId = (currentUser as any)?._id ?? (currentUser as any)?.id;

  const isAdmin   = currentUser?.role === "admin";
  const isManager = currentUser?.role === "manager";
  const isHR      = currentUser?.role === "hr";
  const canCreate = isAdmin || isManager || isHR;

  const [tasks,           setTasks]           = useState<Task[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [open,            setOpen]            = useState(false);
  const [editId,          setEditId]          = useState<string | null>(null);
  const [toast,           setToast]           = useState("");

  const [form, setForm] = useState({
    title:       "",
    description: "",
    assignedTo:  "",
    priority:    "medium" as Priority,
    dueDate:     "",
    status:      "pending" as TaskStatus,
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  /* ===== LOAD ===== */
  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = isAdmin
        ? await taskApi.getAll()
        : await taskApi.getMy();
      setTasks(data.tasks || []);
    } catch (err: any) {
      console.error("Load tasks error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignableUsers = async () => {
    if (!canCreate) return;
    try {
      const data = await taskApi.getAssignable();
      setAssignableUsers(data.users || []);
    } catch (err: any) {
      console.error("Load assignable users error:", err.message);
    }
  };

  useEffect(() => {
    loadTasks();
    loadAssignableUsers();
  }, []);

  /* ===== CREATE / UPDATE ===== */
  const handleSubmit = async () => {
    if (!form.title) return showToast("Title is required");
    try {
      const payload = {
        ...form,
        assignedTo: form.assignedTo || undefined,
      };
      if (editId) {
        await taskApi.update(editId, payload);
        showToast("✅ Task updated successfully");
      } else {
        await taskApi.create(payload);
        showToast("✅ Task created successfully");
      }
      await loadTasks();
      resetForm();
    } catch (err: any) {
      showToast("❌ " + err.message);
    }
  };

  /* ===== DELETE ===== */
  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await taskApi.delete(id);
      showToast("✅ Task deleted");
      await loadTasks();
    } catch (err: any) {
      showToast("❌ " + err.message);
    }
  };

  /* ===== EDIT ===== */
  const handleEdit = (task: Task) => {
    setEditId(task._id);
    setForm({
      title:       task.title,
      description: task.description,
      assignedTo:  task.assignedTo?._id || task.assignedTo || "",
      priority:    task.priority,
      dueDate:     task.dueDate || "",
      status:      task.status,
    });
    setOpen(true);
  };

  /* ===== STATUS CHANGE ===== */
  const handleStatusChange = async (id: string, status: TaskStatus) => {
    try {
      await taskApi.update(id, { status });
      showToast("✅ Status updated");
      await loadTasks();
    } catch (err: any) {
      showToast("❌ " + err.message);
    }
  };

  const resetForm = () => {
    setEditId(null);
    setForm({ title: "", description: "", assignedTo: "", priority: "medium", dueDate: "", status: "pending" });
    setOpen(false);
  };

  /* ===== HELPERS ===== */
  const priorityColor = (p: string) => {
    if (p === "high")   return "bg-red-100 text-red-700";
    if (p === "medium") return "bg-yellow-100 text-yellow-700";
    return "bg-green-100 text-green-700";
  };

  const statusColor = (s: string) => {
    if (s === "completed")   return "bg-green-500 text-white";
    if (s === "in-progress") return "bg-blue-500 text-white";
    return "bg-gray-400 text-white";
  };

  const roleColor = (r: string) => {
    if (r === "admin")   return "bg-red-500 text-white";
    if (r === "hr")      return "bg-blue-500 text-white";
    if (r === "manager") return "bg-purple-500 text-white";
    return "bg-gray-500 text-white";
  };

  const userChip = (user: any, label: string) => {
    if (!user?.name) return null;
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-gray-400">{label}:</span>
        <span className="font-medium text-gray-700">{user.name}</span>
        <Badge className={`${roleColor(user.role)} text-[10px] px-1.5 py-0`}>
          {user.role}
        </Badge>
      </div>
    );
  };

  // ✅ FIX: use myId instead of currentUser?._id
  const isAssignedToMe = (task: Task) =>
    task.assignedTo?._id === myId ||
    task.assignedTo === myId;

  const isAssignedByMe = (task: Task) =>
    task.assignedBy?._id === myId ||
    task.assignedBy === myId;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* TOAST */}
      {toast && (
        <div className="fixed top-5 right-5 bg-black text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm">
          {toast}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Task Management</h1>
          <p className="text-sm text-gray-500">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} total
          </p>
        </div>

        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()} className="gap-2">
                <Plus className="h-4 w-4" /> New Task
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editId ? "Edit Task" : "Create New Task"}</DialogTitle>
              </DialogHeader>

              <div className="text-xs bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-blue-700">
                {isAdmin   && "📋 You can assign tasks to Managers"}
                {isManager && "📋 You can assign tasks to HR & Employees"}
                {isHR      && "📋 You can assign tasks to Employees"}
              </div>

              <div className="space-y-4 mt-2">

                <div>
                  <Label>Title *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Task title"
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Task description"
                  />
                </div>

                <div>
                  <Label>Assign To</Label>
                  <Select
                    value={form.assignedTo}
                    onValueChange={(v) => setForm({ ...form, assignedTo: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {assignableUsers.length === 0 ? (
                        <SelectItem value="none" disabled>No users available</SelectItem>
                      ) : (
                        assignableUsers.map((u) => (
                          <SelectItem key={u._id} value={u._id}>
                            {u.name} ({u.role})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Priority</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(v: Priority) => setForm({ ...form, priority: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v: TaskStatus) => setForm({ ...form, status: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full" onClick={handleSubmit}>
                  {editId ? "Update Task" : "Create Task"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* TASK LIST */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-400">
            No tasks found. {canCreate && "Create your first task!"}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => (
            <Card key={task._id} className="hover:shadow-md transition">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base">{task.title}</CardTitle>
                    {isAssignedToMe(task) && !isAdmin && (
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                        Assigned to me
                      </span>
                    )}
                    {isAssignedByMe(task) && !isAssignedToMe(task) && !isAdmin && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                        Assigned by me
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-500">{task.description}</p>
                  )}
                </div>

                <div className="flex gap-2 items-center ml-3 shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${priorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(task.status)}`}>
                    {task.status}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-3">
                  {userChip(task.assignedTo, "Assigned to")}
                  {userChip(task.assignedBy, "Assigned by")}
                  {task.dueDate && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <span>📅</span>
                      <span>Due: {task.dueDate}</span>
                    </div>
                  )}
                  {task.updates?.length > 0 && (
                    <div className="text-xs text-gray-400">
                      📝 {task.updates.length} update{task.updates.length !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>

                {task.updates?.length > 0 && task.updates[0].note && (
                  <div className="text-xs bg-gray-50 border rounded-md px-3 py-2 text-gray-600">
                    <span className="font-medium">Latest note: </span>
                    {task.updates[0].note}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {isAssignedToMe(task) && (
                    <Select
                      value={task.status}
                      onValueChange={(v: TaskStatus) => handleStatusChange(task._id, v)}
                    >
                      <SelectTrigger className="w-36 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {(isAdmin || isAssignedByMe(task)) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(task)}
                      className="h-8"
                    >
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                  )}

                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(task._id)}
                      className="h-8"
                    >
                      <Trash className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
