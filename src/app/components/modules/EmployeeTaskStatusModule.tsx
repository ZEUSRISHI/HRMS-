import { useEffect, useState } from "react";

/* ===== UI ===== */
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../ui/select";

/* ================= TYPES ================= */

type Role = "employee" | "manager" | "hr";
type TaskStatus = "pending" | "in-progress" | "completed";

interface TaskUpdate {
  id: string;
  date: string;
  status: TaskStatus;
  progress: number;
  hoursWorked: number;
  note: string;
  blocker?: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  priority: "low" | "medium" | "high";
  status: TaskStatus;
  updates: TaskUpdate[];
}

/* ===== Replace with useAuth() in your app ===== */
const currentUser = {
  id: "emp-1",
  role: "employee" as Role,
  name: "Startup Employee",
};

/* ================= STORAGE ================= */

const STORAGE_KEY = "startup_dev_task_updates";

/* ================= MODULE ================= */

export default function EmployeeTaskStatusModule() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const [form, setForm] = useState({
    status: "in-progress" as TaskStatus,
    progress: "",
    hours: "",
    note: "",
    blocker: "",
  });

  const isEmployee = currentUser.role === "employee";
  const isViewer = currentUser.role === "manager" || currentUser.role === "hr";

  /* ================= LOAD ================= */

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      setTasks(JSON.parse(stored));
      return;
    }

    const sample: Task[] = [
      {
        id: crypto.randomUUID(),
        title: "Startup HRMS UI Build",
        description: "Develop employee dashboard screens",
        assignedTo: "emp-1",
        priority: "high",
        status: "pending",
        updates: [],
      },
    ];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(sample));
    setTasks(sample);
  }, []);

  const save = (data: Task[]) => {
    setTasks(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  /* ================= SUBMIT ================= */

  const submitUpdate = () => {
    if (!activeTaskId) return;

    if (!form.note.trim()) return alert("Work note required");
    if (!form.progress) return alert("Progress % required");
    if (!form.hours) return alert("Hours required");

    const update: TaskUpdate = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      status: form.status,
      progress: Number(form.progress),
      hoursWorked: Number(form.hours),
      note: form.note,
      blocker: form.blocker || undefined,
    };

    const updated = tasks.map(t =>
      t.id === activeTaskId
        ? {
            ...t,
            status: form.status,
            updates: [update, ...t.updates],
          }
        : t
    );

    save(updated);

    setActiveTaskId(null);
    setForm({
      status: "in-progress",
      progress: "",
      hours: "",
      note: "",
      blocker: "",
    });
  };

  const visibleTasks = isViewer
    ? tasks
    : tasks.filter(t => t.assignedTo === currentUser.id);

  /* ================= UI ================= */

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-50 to-cyan-50 p-5 border">
        <h1 className="text-lg font-semibold">
          Developer Task Status Updates
        </h1>
        <p className="text-sm text-muted-foreground">
          Manual progress tracking module for startup employees
        </p>
      </div>

      {/* TASK LIST */}
      {visibleTasks.map(task => (
        <Card key={task.id} className="rounded-2xl shadow-sm">
          <CardHeader className="flex justify-between">
            <CardTitle className="text-base">{task.title}</CardTitle>
            <Badge>{task.status}</Badge>
          </CardHeader>

          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {task.description}
            </p>

            <div className="flex gap-3">
              <Badge variant="outline">
                Priority: {task.priority}
              </Badge>

              <Badge variant="secondary">
                Updates: {task.updates.length}
              </Badge>
            </div>

            {/* EMPLOYEE ACTION */}
            {isEmployee && task.assignedTo === currentUser.id && (
              <Button
                size="sm"
                onClick={() => setActiveTaskId(task.id)}
                className="rounded-xl"
              >
                Manual Update
              </Button>
            )}

            {/* UPDATE HISTORY */}
            {task.updates.length > 0 && (
              <div className="space-y-2 pt-3 border-t">
                <p className="text-sm font-medium">
                  Progress History
                </p>

                {task.updates.map(u => (
                  <div
                    key={u.id}
                    className="rounded-xl border p-3 bg-muted/40 text-sm"
                  >
                    <div className="flex justify-between mb-1">
                      <Badge>{u.status}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(u.date).toLocaleString()}
                      </span>
                    </div>

                    <div>Progress: {u.progress}%</div>
                    <div>Hours: {u.hoursWorked}</div>
                    <div>Note: {u.note}</div>
                    {u.blocker && (
                      <div className="text-orange-600">
                        Blocker: {u.blocker}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* ================= FORM ================= */}

      {activeTaskId && isEmployee && (
        <Card className="rounded-2xl border-2 shadow-md">
          <CardHeader>
            <CardTitle>Manual Task Update Form</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">

            <div>
              <Label>Status *</Label>
              <Select
                value={form.status}
                onValueChange={(v: TaskStatus) =>
                  setForm({ ...form, status: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Progress % *</Label>
                <Input
                  type="number"
                  value={form.progress}
                  onChange={e =>
                    setForm({ ...form, progress: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Hours Worked *</Label>
                <Input
                  type="number"
                  value={form.hours}
                  onChange={e =>
                    setForm({ ...form, hours: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Work Note *</Label>
              <Textarea
                rows={3}
                value={form.note}
                onChange={e =>
                  setForm({ ...form, note: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Blocker (optional)</Label>
              <Textarea
                rows={2}
                value={form.blocker}
                onChange={e =>
                  setForm({ ...form, blocker: e.target.value })
                }
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={submitUpdate} className="rounded-xl">
                Save Update
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveTaskId(null)}
              >
                Cancel
              </Button>
            </div>

          </CardContent>
        </Card>
      )}
    </div>
  );
}