import { useEffect, useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

import { Plus, Pencil, Trash } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { mockProjects } from "../../data/mockData";

/* ================= TYPES ================= */

type ProjectStatus = "planning" | "in-progress" | "completed" | "on-hold";

type Project = {
  id: string;
  name: string;
  description: string;
  clientName: string;
  deadline: string;
  status: ProjectStatus;
  budget: number;
  spent: number;
  progress: number;
  managerId: string;
  teamMembers: string[];
};

type FormState = {
  id: string;
  name: string;
  description: string;
  clientName: string;
  deadline: string;
  status: ProjectStatus;
  budget: string;
  managerId: string;
  teamMembers: string;
};

/* ================= COMPONENT ================= */

export function ProjectManagement() {

  const { currentUser, users } = useAuth();

  const role = currentUser?.role;
  const userId = currentUser?.id ?? "";

  const isAdmin = role === "admin";
  const isManager = role === "manager";

  const [projects, setProjects] = useState<Project[]>([]);
  const [isEdit, setIsEdit] = useState(false);

  const [form, setForm] = useState<FormState>({
    id: "",
    name: "",
    description: "",
    clientName: "",
    deadline: "",
    status: "planning",
    budget: "",
    managerId: "",
    teamMembers: ""
  });

  /* ================= LOAD ================= */

  useEffect(() => {
    const saved = localStorage.getItem("projects");
    setProjects(saved ? JSON.parse(saved) : mockProjects);
  }, []);

  useEffect(() => {
    localStorage.setItem("projects", JSON.stringify(projects));
  }, [projects]);

  /* ================= KPI ================= */

  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0);

  const burnRate =
    totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : "0";

  const velocity =
    projects.length > 0
      ? (
          projects.reduce((s, p) => s + p.progress, 0) / projects.length
        ).toFixed(0)
      : "0";

  /* ================= VALIDATION ================= */

  const validate = () => {
    if (!form.name) return "Project name required";
    if (!form.clientName) return "Client required";
    if (!form.deadline) return "Deadline required";
    if (!form.budget) return "Budget required";
    return "";
  };

  /* ================= CREATE / UPDATE ================= */

  const handleSubmit = () => {
    const err = validate();
    if (err) {
      window.alert(err);
      return;
    }

    const projectData: Project = {
      id: form.id || Date.now().toString(),
      name: form.name,
      description: form.description,
      clientName: form.clientName,
      deadline: form.deadline,
      status: form.status,
      budget: Number(form.budget),
      spent: 0,
      progress: 0,
      managerId: form.managerId,
      teamMembers: form.teamMembers
        ? form.teamMembers.split(",").map(id => id.trim())
        : []
    };

    if (isEdit) {
      setProjects(prev =>
        prev.map(p => (p.id === form.id ? { ...p, ...projectData } : p))
      );
    } else {
      setProjects(prev => [projectData, ...prev]);
    }

    resetForm();
  };

  /* ================= DELETE ================= */

  const handleDelete = (id: string) => {
    if (!window.confirm("Delete project?")) return;
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  /* ================= EDIT ================= */

  const handleEdit = (p: Project) => {
    setIsEdit(true);
    setForm({
      id: p.id,
      name: p.name,
      description: p.description,
      clientName: p.clientName,
      deadline: p.deadline,
      status: p.status,
      budget: String(p.budget),
      managerId: p.managerId,
      teamMembers: p.teamMembers.join(", ")
    });
  };

  const resetForm = () => {
    setIsEdit(false);
    setForm({
      id: "",
      name: "",
      description: "",
      clientName: "",
      deadline: "",
      status: "planning",
      budget: "",
      managerId: "",
      teamMembers: ""
    });
  };

  /* ================= ROLE FILTER ================= */

  const visibleProjects = isAdmin
    ? projects
    : isManager
    ? projects.filter(p => p.managerId === userId)
    : projects.filter(p => p.teamMembers.includes(userId));

  /* ================= UI ================= */

  return (
    <div className="space-y-6">

      <div className="flex justify-between">
        <h1 className="text-xl font-semibold">Project Management</h1>

        {isAdmin && (
          <Dialog>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2"/> New Project</Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isEdit ? "Edit Project" : "Create Project"}</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">

                <Input placeholder="Project Name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}/>

                <Input placeholder="Client Name"
                  value={form.clientName}
                  onChange={e => setForm({ ...form, clientName: e.target.value })}/>

                <Textarea placeholder="Description"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}/>

                <Input type="date"
                  value={form.deadline}
                  onChange={e => setForm({ ...form, deadline: e.target.value })}/>

                <Input type="number" placeholder="Budget"
                  value={form.budget}
                  onChange={e => setForm({ ...form, budget: e.target.value })}/>

                {/* ASSIGN MANAGER */}
                <Select
                  value={form.managerId}
                  onValueChange={v => setForm({ ...form, managerId: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Assign Manager"/></SelectTrigger>
                  <SelectContent>
                    {users
                      ?.filter(u => u.role === "manager")
                      .map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {/* TEAM MEMBERS (comma separated ids) */}
                <Input
                  placeholder="Team Member IDs (comma separated)"
                  value={form.teamMembers}
                  onChange={e => setForm({ ...form, teamMembers: e.target.value })}
                />

                <Button className="w-full" onClick={handleSubmit}>
                  {isEdit ? "Update Project" : "Create Project"}
                </Button>

              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* KPI */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-sm text-gray-500">Velocity</p>
          <p className="text-2xl font-semibold">{velocity}%</p>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <p className="text-sm text-gray-500">Burn Rate</p>
          <p className="text-2xl font-semibold">{burnRate}%</p>
        </CardContent></Card>
      </div>

      {/* LIST */}
      {visibleProjects.map(project => (
        <Card key={project.id}>
          <CardHeader className="flex justify-between">
            <CardTitle>{project.name}</CardTitle>
            <Badge>{project.status}</Badge>
          </CardHeader>

          <CardContent className="space-y-2">
            <p className="text-sm">{project.description}</p>
            <p className="text-xs">Deadline: {project.deadline}</p>

            <Progress value={project.progress}/>

            {isManager && (
              <>
                <Input type="number" placeholder="Update Progress %"
                  onBlur={e =>
                    setProjects(prev =>
                      prev.map(p =>
                        p.id === project.id
                          ? { ...p, progress: Number(e.target.value) }
                          : p
                      )
                    )
                  }/>

                <Input type="number" placeholder="Update Spent"
                  onBlur={e =>
                    setProjects(prev =>
                      prev.map(p =>
                        p.id === project.id
                          ? { ...p, spent: Number(e.target.value) }
                          : p
                      )
                    )
                  }/>
              </>
            )}

            {isAdmin && (
              <div className="flex gap-2">
                <Button size="icon" variant="outline" onClick={()=> handleEdit(project)}>
                  <Pencil className="h-4 w-4"/>
                </Button>
                <Button size="icon" variant="destructive" onClick={()=> handleDelete(project.id)}>
                  <Trash className="h-4 w-4"/>
                </Button>
              </div>
            )}

          </CardContent>
        </Card>
      ))}

    </div>
  );
}