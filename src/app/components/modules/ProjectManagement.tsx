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
import { Plus, Pencil, Trash, Download } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { projectApi } from "@/services/api";

type ProjectStatus = "planning" | "in-progress" | "completed" | "on-hold";

interface Project {
  _id: string;
  name: string;
  description: string;
  clientName: string;
  deadline: string;
  status: ProjectStatus;
  budget: number;
  spent: number;
  progress: number;
  managerId: any;
  teamMembers: any[];
}

export function ProjectManagement() {
  const { currentUser } = useAuth();
  const isAdmin   = currentUser?.role === "admin";
  const isManager = currentUser?.role === "manager";

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [open, setOpen]         = useState(false);
  const [isEdit, setIsEdit]     = useState(false);
  const [toast, setToast]       = useState("");

  const [form, setForm] = useState({
    name: "", description: "", clientName: "",
    deadline: "", status: "planning" as ProjectStatus,
    budget: "", managerId: "", teamMembers: "",
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

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

  useEffect(() => { loadProjects(); }, []);

  const [editId, setEditId] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!form.name)       return showToast("Project name required");
    if (!form.clientName) return showToast("Client name required");
    if (!form.deadline)   return showToast("Deadline required");
    if (!form.budget)     return showToast("Budget required");

    try {
      const payload = {
        ...form,
        budget:      Number(form.budget),
        teamMembers: form.teamMembers
          ? form.teamMembers.split(",").map((id) => id.trim())
          : [],
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

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete project?")) return;
    try {
      await projectApi.delete(id);
      showToast("✅ Project deleted");
      await loadProjects();
    } catch (err: any) {
      showToast("❌ " + err.message);
    }
  };

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
      teamMembers: Array.isArray(p.teamMembers)
        ? p.teamMembers.map((m: any) => m._id || m).join(", ")
        : "",
    });
    setOpen(true);
  };

  const handleProgressUpdate = async (id: string, progress: number) => {
    try {
      await projectApi.update(id, { progress });
      await loadProjects();
    } catch (err: any) {
      showToast("❌ " + err.message);
    }
  };

  const handleSpentUpdate = async (id: string, spent: number) => {
    try {
      await projectApi.update(id, { spent });
      await loadProjects();
    } catch (err: any) {
      showToast("❌ " + err.message);
    }
  };

  const resetForm = () => {
    setIsEdit(false);
    setEditId(null);
    setForm({
      name: "", description: "", clientName: "",
      deadline: "", status: "planning",
      budget: "", managerId: "", teamMembers: "",
    });
    setOpen(false);
  };

  const totalBudget  = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent   = projects.reduce((s, p) => s + p.spent, 0);
  const burnRate     = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : "0";
  const velocity     = projects.length > 0
    ? (projects.reduce((s, p) => s + p.progress, 0) / projects.length).toFixed(0)
    : "0";

  const downloadReport = () => {
    if (!projects.length) return alert("No projects to download.");
    const headers = ["Name","Client","Deadline","Status","Budget","Spent","Progress"];
    const rows = projects.map((p) => [
      p.name, p.clientName, p.deadline,
      p.status, p.budget, p.spent, p.progress,
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

      {toast && (
        <div className="fixed top-5 right-5 bg-black text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm">
          {toast}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Project Management</h1>
          <p className="text-sm text-gray-500">{projects.length} projects</p>
        </div>

        <div className="flex gap-2">
          {isAdmin && (
            <>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="h-4 w-4 mr-2" /> New Project
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit Project" : "Create Project"}</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-3 mt-2">
                    <Input placeholder="Project Name *" value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    <Input placeholder="Client Name *" value={form.clientName}
                      onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
                    <Textarea placeholder="Description" value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    <Input type="date" value={form.deadline}
                      onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
                    <Input type="number" placeholder="Budget *" value={form.budget}
                      onChange={(e) => setForm({ ...form, budget: e.target.value })} />
                    <Select value={form.status}
                      onValueChange={(v: ProjectStatus) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="on-hold">On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Manager ID" value={form.managerId}
                      onChange={(e) => setForm({ ...form, managerId: e.target.value })} />
                    <Input placeholder="Team Member IDs (comma separated)" value={form.teamMembers}
                      onChange={(e) => setForm({ ...form, teamMembers: e.target.value })} />
                    <Button className="w-full" onClick={handleSubmit}>
                      {isEdit ? "Update Project" : "Create Project"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" onClick={downloadReport}>
                <Download className="h-4 w-4 mr-2" /> Report
              </Button>
            </>
          )}
        </div>
      </div>

      {/* KPI */}
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
            No projects found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <Card key={project._id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{project.name}</CardTitle>
                <Badge>{project.status}</Badge>
              </CardHeader>

              <CardContent className="space-y-3">
                <p className="text-sm text-gray-500">{project.description}</p>
                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                  <span>📅 Deadline: {project.deadline}</span>
                  <span>💰 Budget: ₹{project.budget?.toLocaleString()}</span>
                  <span>💸 Spent: ₹{project.spent?.toLocaleString()}</span>
                  {project.managerId?.name && (
                    <span>👤 Manager: {project.managerId.name}</span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Progress</span>
                    <span>{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} />
                </div>

                {/* MANAGER: update progress & spent */}
                {isManager && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="number" placeholder="Update Progress %"
                      onBlur={(e) => handleProgressUpdate(project._id, Number(e.target.value))} />
                    <Input type="number" placeholder="Update Spent"
                      onBlur={(e) => handleSpentUpdate(project._id, Number(e.target.value))} />
                  </div>
                )}

                {isAdmin && (
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" onClick={() => handleEdit(project)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="destructive" onClick={() => handleDelete(project._id)}>
                      <Trash className="h-4 w-4" />
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