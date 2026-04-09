import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";
import { Plus, Pencil, Trash, Download } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { projectApi } from "@/services/api";

type ProjectStatus = "planning" | "in-progress" | "completed" | "on-hold";

interface UserOption {
  _id:   string;
  name:  string;
  email: string;
  role:  string;
}

interface Project {
  _id:         string;
  name:        string;
  description: string;
  clientName:  string;
  deadline:    string;
  status:      ProjectStatus;
  budget:      number;
  spent:       number;
  progress:    number;
  managerId:   any;
  teamMembers: any[];
}

const statusColor = (s: string) => {
  if (s === "completed")   return "bg-green-100 text-green-700";
  if (s === "in-progress") return "bg-blue-100 text-blue-700";
  if (s === "on-hold")     return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-700";
};

export function ProjectManagement() {
  const { currentUser } = useAuth();
  const role      = (currentUser as any)?.role?.toLowerCase?.() ?? "";
  const isAdmin   = role === "admin";
  const isManager = role === "manager";

  const [projects,  setProjects]  = useState<Project[]>([]);
  const [managers,  setManagers]  = useState<UserOption[]>([]);
  const [members,   setMembers]   = useState<UserOption[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [open,      setOpen]      = useState(false);
  const [isEdit,    setIsEdit]    = useState(false);
  const [editId,    setEditId]    = useState<string | null>(null);
  const [toast,     setToast]     = useState("");

  // selected team members (multi-select via toggle)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const [form, setForm] = useState({
    name:        "",
    description: "",
    clientName:  "",
    deadline:    "",
    status:      "planning" as ProjectStatus,
    budget:      "",
    managerId:   "",
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  /* ===== LOAD ===== */
  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = isAdmin || isManager
        ? await projectApi.getAll()
        : await projectApi.getMy();
      setProjects(data.projects || []);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadUserOptions = async () => {
    if (!isAdmin) return;
    try {
      const [mgrData, memData] = await Promise.all([
        projectApi.getManagers(),
        projectApi.getMembers(),
      ]);
      setManagers(mgrData.users  || []);
      setMembers(memData.users   || []);
    } catch (err: any) {
      console.error("Failed to load user options:", err.message);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    loadProjects();
    loadUserOptions();
  }, [currentUser]);

  /* ===== TEAM MEMBER TOGGLE ===== */
  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  /* ===== SUBMIT ===== */
  const handleSubmit = async () => {
    if (!form.name)       return showToast("❌ Project name is required");
    if (!form.clientName) return showToast("❌ Client name is required");
    if (!form.deadline)   return showToast("❌ Deadline is required");
    if (!form.budget)     return showToast("❌ Budget is required");
    if (!form.managerId)  return showToast("❌ Please select a manager");

    try {
      const payload = {
        name:        form.name,
        description: form.description,
        clientName:  form.clientName,
        deadline:    form.deadline,
        status:      form.status,
        budget:      Number(form.budget),
        managerId:   form.managerId,
        teamMembers: selectedMembers,
      };

      if (isEdit && editId) {
        await projectApi.update(editId, payload);
        showToast("✅ Project updated");
      } else {
        await projectApi.create(payload);
        showToast("✅ Project created");
      }

      await loadProjects();
      resetForm();
    } catch (err: any) {
      showToast("❌ " + err.message);
    }
  };

  /* ===== DELETE ===== */
  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this project?")) return;
    try {
      await projectApi.delete(id);
      showToast("✅ Project deleted");
      await loadProjects();
    } catch (err: any) {
      showToast("❌ " + err.message);
    }
  };

  /* ===== EDIT ===== */
  const handleEdit = (p: Project) => {
    setIsEdit(true);
    setEditId(p._id);
    setForm({
      name:        p.name,
      description: p.description,
      clientName:  p.clientName,
      deadline:    p.deadline,
      status:      p.status,
      budget:      String(p.budget),
      managerId:   p.managerId?._id || p.managerId || "",
    });
    setSelectedMembers(
      Array.isArray(p.teamMembers)
        ? p.teamMembers.map((m: any) => m._id || m)
        : []
    );
    setOpen(true);
  };

  /* ===== PROGRESS / SPENT ===== */
  const handleProgressUpdate = async (id: string, progress: number) => {
    if (isNaN(progress) || progress < 0 || progress > 100) return;
    try {
      await projectApi.update(id, { progress });
      showToast("✅ Progress updated");
      await loadProjects();
    } catch (err: any) {
      showToast("❌ " + err.message);
    }
  };

  const handleSpentUpdate = async (id: string, spent: number) => {
    if (isNaN(spent) || spent < 0) return;
    try {
      await projectApi.update(id, { spent });
      showToast("✅ Spent updated");
      await loadProjects();
    } catch (err: any) {
      showToast("❌ " + err.message);
    }
  };

  /* ===== RESET ===== */
  const resetForm = () => {
    setIsEdit(false);
    setEditId(null);
    setSelectedMembers([]);
    setForm({
      name: "", description: "", clientName: "",
      deadline: "", status: "planning", budget: "", managerId: "",
    });
    setOpen(false);
  };

  /* ===== STATS ===== */
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent  = projects.reduce((s, p) => s + p.spent,  0);
  const burnRate    = totalBudget > 0
    ? ((totalSpent / totalBudget) * 100).toFixed(1) : "0";
  const velocity    = projects.length > 0
    ? (projects.reduce((s, p) => s + p.progress, 0) / projects.length).toFixed(0)
    : "0";

  /* ===== CSV ===== */
  const downloadReport = () => {
    if (!projects.length) return alert("No projects to download.");
    const headers = ["Name", "Client", "Deadline", "Status", "Budget", "Spent", "Progress", "Manager"];
    const rows = projects.map((p) => [
      p.name, p.clientName, p.deadline, p.status,
      p.budget, p.spent, p.progress,
      p.managerId?.name || "-",
    ]);
    const csv = "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((r) => r.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `project_report_${Date.now()}.csv`;
    link.click();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

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
          <h1 className="text-xl font-semibold">Project Management</h1>
          <p className="text-sm text-gray-500">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
        </div>

        <div className="flex gap-2">
          {isAdmin && (
            <>
              {/* CREATE / EDIT DIALOG */}
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="h-4 w-4 mr-2" /> New Project
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit Project" : "Create Project"}</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4 mt-2">

                    {/* NAME */}
                    <div>
                      <Label>Project Name *</Label>
                      <Input
                        placeholder="e.g. HRMS Redesign"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                      />
                    </div>

                    {/* CLIENT */}
                    <div>
                      <Label>Client Name *</Label>
                      <Input
                        placeholder="e.g. Quibo Tech"
                        value={form.clientName}
                        onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                      />
                    </div>

                    {/* DESCRIPTION */}
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        rows={3}
                        placeholder="Project description..."
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                      />
                    </div>

                    {/* DEADLINE */}
                    <div>
                      <Label>Deadline *</Label>
                      <Input
                        type="date"
                        value={form.deadline}
                        onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                      />
                    </div>

                    {/* BUDGET */}
                    <div>
                      <Label>Budget (₹) *</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 500000"
                        value={form.budget}
                        onChange={(e) => setForm({ ...form, budget: e.target.value })}
                      />
                    </div>

                    {/* STATUS */}
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={form.status}
                        onValueChange={(v: ProjectStatus) => setForm({ ...form, status: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="planning">Planning</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="on-hold">On Hold</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* MANAGER DROPDOWN ✅ */}
                    <div>
                      <Label>Assign Manager *</Label>
                      <Select
                        value={form.managerId}
                        onValueChange={(v) => setForm({ ...form, managerId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a manager..." />
                        </SelectTrigger>
                        <SelectContent>
                          {managers.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No managers found
                            </SelectItem>
                          ) : (
                            managers.map((m) => (
                              <SelectItem key={m._id} value={m._id}>
                                {m.name} — {m.email}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* TEAM MEMBERS MULTI-SELECT ✅ */}
                    <div>
                      <Label>Team Members</Label>
                      <p className="text-xs text-gray-400 mb-2">
                        Click to select / deselect
                      </p>
                      <div className="border rounded-lg p-2 max-h-40 overflow-y-auto space-y-1">
                        {members.length === 0 ? (
                          <p className="text-xs text-gray-400 p-2">No members found</p>
                        ) : (
                          members.map((m) => {
                            const selected = selectedMembers.includes(m._id);
                            return (
                              <div
                                key={m._id}
                                onClick={() => toggleMember(m._id)}
                                className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-sm transition
                                  ${selected
                                    ? "bg-orange-100 text-orange-700 font-medium"
                                    : "hover:bg-gray-50 text-gray-700"
                                  }`}
                              >
                                <span>{m.name}</span>
                                <span className="text-xs text-gray-400">{m.role}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                      {selectedMembers.length > 0 && (
                        <p className="text-xs text-orange-600 mt-1">
                          {selectedMembers.length} member{selectedMembers.length !== 1 ? "s" : ""} selected
                        </p>
                      )}
                    </div>

                    <Button className="w-full" onClick={handleSubmit}>
                      {isEdit ? "Update Project" : "Create Project"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* REPORT */}
              <Button variant="outline" onClick={downloadReport}>
                <Download className="h-4 w-4 mr-2" /> Report
              </Button>
            </>
          )}
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Avg Progress (Velocity)</p>
            <p className="text-2xl font-semibold">{velocity}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Budget Burn Rate</p>
            <p className="text-2xl font-semibold">{burnRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* PROJECT LIST */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-400">
            No projects found. {isAdmin && "Create your first project!"}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <Card key={project._id} className="hover:shadow-md transition">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{project.name}</CardTitle>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(project.status)}`}>
                  {project.status}
                </span>
              </CardHeader>

              <CardContent className="space-y-3">
                {project.description && (
                  <p className="text-sm text-gray-500">{project.description}</p>
                )}

                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                  <span>🏢 Client: {project.clientName}</span>
                  <span>📅 Deadline: {project.deadline}</span>
                  <span>💰 Budget: ₹{project.budget?.toLocaleString()}</span>
                  <span>💸 Spent: ₹{project.spent?.toLocaleString()}</span>
                  {project.managerId?.name && (
                    <span>👤 Manager: {project.managerId.name}</span>
                  )}
                  {project.teamMembers?.length > 0 && (
                    <span>
                      👥 Team: {project.teamMembers
                        .map((m: any) => m.name || m)
                        .join(", ")}
                    </span>
                  )}
                </div>

                {/* PROGRESS BAR */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Progress</span>
                    <span>{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} />
                </div>

                {/* MANAGER: inline update inputs */}
                {isManager && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Update Progress %</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder={String(project.progress)}
                        onBlur={(e) =>
                          handleProgressUpdate(project._id, Number(e.target.value))
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Update Spent (₹)</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder={String(project.spent)}
                        onBlur={(e) =>
                          handleSpentUpdate(project._id, Number(e.target.value))
                        }
                      />
                    </div>
                  </div>
                )}

                {/* ADMIN ACTIONS */}
                {isAdmin && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(project)}
                    >
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(project._id)}
                    >
                      <Trash className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
