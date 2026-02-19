import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { FolderKanban, DollarSign, CheckCircle2, Plus } from 'lucide-react';
import { mockProjects, mockClients, mockUsers } from '../../data/mockData';
import { useAuth } from "../../contexts/AuthContext";

type StatusVariant = "default" | "secondary" | "outline" | "destructive";
type Project = typeof mockProjects[number];

export function ProjectManagement() {

  const { currentUser } = useAuth();
  const userId = currentUser?.id ?? ""; // ✅ SAFE STRING

  /* ================= STATE ================= */

  const [projects, setProjects] = useState<Project[]>([]);

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("planning");
  const [budget, setBudget] = useState("");
  const [memberId, setMemberId] = useState("");

  /* ================= LOAD / SAVE ================= */

  useEffect(() => {
    const saved = localStorage.getItem("projects");
    if (saved) setProjects(JSON.parse(saved));
    else setProjects(mockProjects);
  }, []);

  useEffect(() => {
    localStorage.setItem("projects", JSON.stringify(projects));
  }, [projects]);

  /* ================= ADMIN CREATE ================= */

  const handleCreate = () => {

    if (currentUser?.role !== "admin") {
      alert("Only ADMIN can create projects");
      return;
    }

    if (!name) {
      alert("Project name required");
      return;
    }

    const newProject: Project = {
      id: Date.now().toString(),
      name,
      description: desc,
      clientId,
      status: status as any,
      startDate: new Date().toISOString(),
      endDate: undefined, // ✅ fix null error
      budget: Number(budget) || 0,
      spent: 0,
      progress: 0,
      teamMembers: memberId ? [memberId] : [],
      milestones: []
    };

    setProjects(prev => [newProject, ...prev]);

    setName("");
    setDesc("");
    setBudget("");
    setClientId("");
    setMemberId("");
  };

  /* ================= FILTER BY ASSIGNMENT ================= */

  const visibleProjects =
    currentUser?.role === "admin"
      ? projects
      : projects.filter(p =>
          Array.isArray(p.teamMembers) &&
          userId !== "" &&
          p.teamMembers.includes(userId)
        );

  /* ================= SUMMARY ================= */

  const activeProjects = visibleProjects.filter(p => p.status === 'in-progress').length;
  const completedProjects = visibleProjects.filter(p => p.status === 'completed').length;

  const totalBudget = visibleProjects.reduce((s, p) => s + (p.budget || 0), 0);
  const totalSpent = visibleProjects.reduce((s, p) => s + (p.spent || 0), 0);

  const totalUtilization =
    totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(0) : "0";

  const getStatusColor = (status: string): StatusVariant => {
    switch (status) {
      case 'completed': return 'default';
      case 'in-progress': return 'secondary';
      case 'planning': return 'outline';
      case 'on-hold': return 'destructive';
      default: return 'outline';
    }
  };

  /* ================= UI ================= */

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold mb-2">Project Management</h1>
          <p className="text-sm text-muted-foreground">
            Track projects, milestones, and team progress
          </p>
        </div>

        {currentUser?.role === "admin" && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">

                <Input placeholder="Project Name" value={name} onChange={e => setName(e.target.value)} />
                <Textarea placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} />

                <Select onValueChange={setClientId}>
                  <SelectTrigger><SelectValue placeholder="Client" /></SelectTrigger>
                  <SelectContent>
                    {mockClients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select onValueChange={setStatus}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>

                <Input type="number" placeholder="Budget" value={budget} onChange={e => setBudget(e.target.value)} />

                <Select onValueChange={setMemberId}>
                  <SelectTrigger><SelectValue placeholder="Assign User" /></SelectTrigger>
                  <SelectContent>
                    {mockUsers.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button className="w-full" onClick={handleCreate}>
                  Create Project
                </Button>

              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* SUMMARY */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle>Active Projects</CardTitle></CardHeader><CardContent>{activeProjects}</CardContent></Card>
        <Card><CardHeader><CardTitle>Completed</CardTitle></CardHeader><CardContent>{completedProjects}</CardContent></Card>
        <Card><CardHeader><CardTitle>Total Budget</CardTitle></CardHeader><CardContent>${(totalBudget/1000).toFixed(0)}K</CardContent></Card>
        <Card><CardHeader><CardTitle>Total Spent</CardTitle></CardHeader><CardContent>{totalUtilization}%</CardContent></Card>
      </div>

      {/* PROJECT LIST */}
      <div className="space-y-4">
        {visibleProjects.map(project => {
          const safeProgress = Math.min(project.progress ?? 0, 100);

          return (
            <Card key={project.id}>
              <CardHeader className="flex justify-between">
                <CardTitle>{project.name}</CardTitle>
                <Badge variant={getStatusColor(project.status)}>
                  {project.status}
                </Badge>
              </CardHeader>

              <CardContent>
                <p>{project.description}</p>
                <Progress value={safeProgress} />
              </CardContent>
            </Card>
          );
        })}
      </div>

    </div>
  );
}
