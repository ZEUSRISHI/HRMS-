import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "../ui/select";
import { Plus, Pencil, Trash } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { mockProjects, mockUsers } from "../../data/mockData";

/* ================= TYPES ================= */

type ProjectStatus = "planning" | "in-progress" | "completed" | "on-hold";

type Project = {
  id: string;
  name: string;
  description: string;
  clientId: string;
  status: ProjectStatus;
  startDate: string;
  budget: number;
  spent: number;
  progress: number;
  teamMembers: string[];
  milestones: any[];
};

type FormState = {
  id: string;
  name: string;
  description: string;
  clientId: string;
  status: ProjectStatus;
  budget: string;
  memberId: string;
};

export function ProjectManagement() {

  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const userId = currentUser?.id ?? "";

  const [projects, setProjects] = useState<Project[]>([]);
  const [popup, setPopup] = useState("");
  const [isEdit, setIsEdit] = useState(false);

  const [form, setForm] = useState<FormState>({
    id: "",
    name: "",
    description: "",
    clientId: "",
    status: "planning",
    budget: "",
    memberId: ""
  });

  /* ================= LOAD ================= */

  useEffect(() => {
    const saved = localStorage.getItem("projects");
    if (saved) setProjects(JSON.parse(saved));
    else setProjects(mockProjects);
  }, []);

  useEffect(() => {
    localStorage.setItem("projects", JSON.stringify(projects));
  }, [projects]);

  /* ================= POPUP ================= */

  const showPopup = (msg: string) => {
    setPopup(msg);
    setTimeout(() => setPopup(""), 2500);
  };

  /* ================= VALIDATION ================= */

  const validate = () => {
    if (!form.name.trim()) return "Project name is required";
    if (!form.description.trim()) return "Description is required";
    if (!form.budget) return "Budget is required";
    return "";
  };

  /* ================= CREATE / UPDATE ================= */

  const handleSubmit = () => {
    const error = validate();
    if (error) return alert(error);

    if (isEdit) {
      setProjects(prev =>
        prev.map(p =>
          p.id === form.id
            ? {
                ...p,
                name: form.name,
                description: form.description,
                clientId: form.clientId,
                status: form.status,
                budget: Number(form.budget),
                teamMembers: form.memberId ? [form.memberId] : []
              }
            : p
        )
      );
      showPopup("Project updated successfully ✅");
    } else {
      const newProject: Project = {
        id: Date.now().toString(),
        name: form.name,
        description: form.description,
        clientId: form.clientId,
        status: form.status,
        startDate: new Date().toISOString(),
        budget: Number(form.budget),
        spent: 0,
        progress: 0,
        teamMembers: form.memberId ? [form.memberId] : [],
        milestones: []
      };

      setProjects(prev => [newProject, ...prev]);
      showPopup("New project created 🎉");
    }

    resetForm();
  };

  /* ================= DELETE ================= */

  const handleDelete = (id: string) => {
    if (!confirm("Delete project?")) return;
    setProjects(prev => prev.filter(p => p.id !== id));
    showPopup("Project deleted 🗑️");
  };

  /* ================= EDIT ================= */

  const handleEdit = (p: Project) => {
    setIsEdit(true);
    setForm({
      id: p.id,
      name: p.name,
      description: p.description,
      clientId: p.clientId,
      status: p.status,
      budget: String(p.budget),
      memberId: p.teamMembers[0] ?? ""
    });
  };

  const resetForm = () => {
    setForm({
      id: "",
      name: "",
      description: "",
      clientId: "",
      status: "planning",
      budget: "",
      memberId: ""
    });
    setIsEdit(false);
  };

  /* ================= ROLE FILTER ================= */

  const visibleProjects = isAdmin
    ? projects
    : projects.filter(p => p.teamMembers.includes(userId));

  /* ================= UI ================= */

  return (
    <div className="space-y-6">

      {popup && (
        <div className="fixed top-6 right-6 bg-green-600 text-white px-4 py-2 rounded shadow">
          {popup}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Project Management</h1>

        {isAdmin && (
          <Dialog>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> New Project</Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isEdit ? "Edit Project" : "Create Project"}</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                <Input
                  placeholder="Project Name *"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />

                <Textarea
                  placeholder="Description *"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />

                <Select onValueChange={(v: ProjectStatus) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  placeholder="Budget *"
                  value={form.budget}
                  onChange={e => setForm({ ...form, budget: e.target.value })}
                />

                <Select onValueChange={v => setForm({ ...form, memberId: v })}>
                  <SelectTrigger><SelectValue placeholder="Assign User" /></SelectTrigger>
                  <SelectContent>
                    {mockUsers.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button className="w-full" onClick={handleSubmit}>
                  {isEdit ? "Update Project" : "Create Project"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {visibleProjects.map(project => (
        <Card key={project.id}>
          <CardHeader className="flex justify-between">
            <CardTitle>{project.name}</CardTitle>
            <div className="flex gap-2">
              <Badge>{project.status}</Badge>

              {isAdmin && (
                <>
                  <Button size="icon" variant="outline" onClick={() => handleEdit(project)}>
                    <Pencil className="h-4 w-4" />
                  </Button>

                  <Button size="icon" variant="destructive" onClick={() => handleDelete(project.id)}>
                    <Trash className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <p className="text-sm mb-2">{project.description}</p>
            <Progress value={project.progress} />
          </CardContent>
        </Card>
      ))}

    </div>
  );
}