import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";
import {
  Plus, Pencil, Trash2, Download, ClipboardList,
  Building2, Calendar, Wallet, TrendingUp, Users, UserCheck,
  BarChart3, Flame,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { projectApi } from "@/services/api";

type ProjectStatus = "planning" | "in-progress" | "completed" | "on-hold";

interface UserOption { _id: string; name: string; email: string; role: string; }

interface Project {
  _id: string; name: string; description: string; clientName: string;
  deadline: string; status: ProjectStatus; budget: number; spent: number;
  progress: number; managerId: any; teamMembers: any[]; createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  "planning":    { label: "Planning",    dot: "bg-gray-400",  text: "text-gray-600",  bg: "bg-gray-100"  },
  "in-progress": { label: "In Progress", dot: "bg-blue-500",  text: "text-blue-700",  bg: "bg-blue-50"   },
  "completed":   { label: "Completed",   dot: "bg-green-500", text: "text-green-700", bg: "bg-green-50"  },
  "on-hold":     { label: "On Hold",     dot: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50"  },
};

const PROGRESS_COLOR = (p: number) => {
  if (p >= 80) return "bg-green-500";
  if (p >= 50) return "bg-blue-500";
  if (p >= 25) return "bg-amber-400";
  return "bg-red-400";
};

function exportToCSV(projects: Project[]) {
  if (!projects.length) return alert("No projects to export.");
  const BOM = "\uFEFF";
  const headers = ["Project Name","Client","Description","Deadline","Status","Budget (₹)","Spent (₹)","Progress (%)","Manager","Team Members","Created At"];
  const rows = projects.map((p) => [
    p.name, p.clientName, (p.description||"").replace(/,/g,";"),
    p.deadline, p.status, p.budget, p.spent, p.progress,
    p.managerId?.name||"-",
    Array.isArray(p.teamMembers) ? p.teamMembers.map((m:any)=>m.name||m).join("; ") : "-",
    new Date(p.createdAt).toLocaleDateString(),
  ]);
  const csv = BOM + [headers,...rows].map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `projects-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

const EMPTY_FORM = {
  name:"", description:"", clientName:"", deadline:"",
  status:"planning" as ProjectStatus, budget:"", spent:"", progress:"", managerId:"", createdAt:"",
};
const EMPTY_MANUAL = {
  name:"", description:"", clientName:"", deadline:"",
  status:"completed" as ProjectStatus, budget:"", spent:"", progress:"100", managerId:"", createdAt:"",
};

function MemberPicker({ list, selected, onToggle }: { list: UserOption[]; selected: string[]; onToggle:(id:string)=>void }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden max-h-32 overflow-y-auto">
      {list.length === 0
        ? <p className="text-xs text-gray-400 p-3">No members available</p>
        : list.map((m) => {
          const sel = selected.includes(m._id);
          return (
            <div key={m._id} onClick={() => onToggle(m._id)}
              className={`flex items-center justify-between px-3 py-2 cursor-pointer text-xs border-b border-gray-100 last:border-0 transition-colors
                ${sel ? "bg-orange-50 text-orange-700" : "hover:bg-gray-50 text-gray-600"}`}>
              <span className="font-medium">{m.name}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${sel ? "bg-orange-200 text-orange-800" : "bg-gray-100 text-gray-500"}`}>
                {sel ? "✓" : m.role}
              </span>
            </div>
          );
        })}
    </div>
  );
}

function ProjectFormFields({ form, setForm, managers, members, selectedMembers, onToggleMember, isManual = false }: any) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-600">Project Name *</Label>
          <Input className="h-8 text-sm" placeholder="e.g. HRMS Redesign"
            value={form.name} onChange={(e:any) => setForm({...form, name: e.target.value})} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-600">Client *</Label>
          <Input className="h-8 text-sm" placeholder="e.g. Quibo Tech"
            value={form.clientName} onChange={(e:any) => setForm({...form, clientName: e.target.value})} />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-medium text-gray-600">Description</Label>
        <Textarea className="text-sm resize-none" rows={2} placeholder="Brief project overview..."
          value={form.description} onChange={(e:any) => setForm({...form, description: e.target.value})} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-600">Deadline</Label>
          <Input type="date" className="h-8 text-sm"
            value={form.deadline} onChange={(e:any) => setForm({...form, deadline: e.target.value})} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-600">Status</Label>
          <Select value={form.status} onValueChange={(v: ProjectStatus) => setForm({...form, status: v})}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="on-hold">On Hold</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isManual ? (
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-600">Budget (₹)</Label>
            <Input type="number" className="h-8 text-sm" placeholder="500000"
              value={form.budget} onChange={(e:any) => setForm({...form, budget: e.target.value})} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-600">Spent (₹)</Label>
            <Input type="number" className="h-8 text-sm" placeholder="0"
              value={form.spent} onChange={(e:any) => setForm({...form, spent: e.target.value})} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-600">Progress %</Label>
            <Input type="number" min={0} max={100} className="h-8 text-sm" placeholder="100"
              value={form.progress} onChange={(e:any) => setForm({...form, progress: e.target.value})} />
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-600">Budget (₹) *</Label>
          <Input type="number" className="h-8 text-sm" placeholder="500000"
            value={form.budget} onChange={(e:any) => setForm({...form, budget: e.target.value})} />
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-xs font-medium text-gray-600">Record Date {isManual && <span className="text-gray-400">(backdatable)</span>}</Label>
        <Input type="date" className="h-8 text-sm"
          value={form.createdAt} onChange={(e:any) => setForm({...form, createdAt: e.target.value})} />
        {isManual && <p className="text-[10px] text-gray-400">Leave blank to use today</p>}
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-medium text-gray-600">Manager {!isManual && "*"}</Label>
        <Select value={form.managerId || "none"} onValueChange={(v) => setForm({...form, managerId: v === "none" ? "" : v})}>
          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select manager..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— Select —</SelectItem>
            {managers.map((m: UserOption) => (
              <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-medium text-gray-600">
          Team Members
          {selectedMembers.length > 0 && (
            <span className="ml-1.5 text-orange-600">({selectedMembers.length} selected)</span>
          )}
        </Label>
        <MemberPicker list={members} selected={selectedMembers} onToggle={onToggleMember} />
      </div>
    </div>
  );
}

export function ProjectManagement() {
  const { currentUser } = useAuth();
  const role      = (currentUser as any)?.role?.toLowerCase?.() ?? "";
  const isAdmin   = role === "admin";
  const isManager = role === "manager";

  const [projects,        setProjects]        = useState<Project[]>([]);
  const [managers,        setManagers]        = useState<UserOption[]>([]);
  const [members,         setMembers]         = useState<UserOption[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [open,            setOpen]            = useState(false);
  const [manualOpen,      setManualOpen]      = useState(false);
  const [isEdit,          setIsEdit]          = useState(false);
  const [editId,          setEditId]          = useState<string | null>(null);
  const [toast,           setToast]           = useState("");
  const [submitting,      setSubmitting]      = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [manualMembers,   setManualMembers]   = useState<string[]>([]);
  const [form,            setForm]            = useState(EMPTY_FORM);
  const [manualForm,      setManualForm]      = useState(EMPTY_MANUAL);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = isAdmin || isManager ? await projectApi.getAll() : await projectApi.getMy();
      setProjects(data.projects || []);
    } catch (err: any) { showToast("❌ " + err.message); }
    finally { setLoading(false); }
  };

  const loadUserOptions = async () => {
    if (!isAdmin) return;
    try {
      const [mgrData, memData] = await Promise.all([projectApi.getManagers(), projectApi.getMembers()]);
      setManagers(mgrData.users || []);
      setMembers(memData.users  || []);
    } catch (err: any) { console.error(err.message); }
  };

  useEffect(() => { if (!currentUser) return; loadProjects(); loadUserOptions(); }, [currentUser]);

  const toggleMember = (id: string, manual = false) => {
    if (manual) setManualMembers(p => p.includes(id) ? p.filter(m => m !== id) : [...p, id]);
    else        setSelectedMembers(p => p.includes(id) ? p.filter(m => m !== id) : [...p, id]);
  };

  const resetForm = () => {
    setIsEdit(false); setEditId(null); setSelectedMembers([]); setForm(EMPTY_FORM); setOpen(false);
  };

  const handleSubmit = async () => {
    if (!form.name)       return showToast("❌ Project name required");
    if (!form.clientName) return showToast("❌ Client name required");
    if (!form.deadline)   return showToast("❌ Deadline required");
    if (!form.budget)     return showToast("❌ Budget required");
    if (!form.managerId)  return showToast("❌ Manager required");
    setSubmitting(true);
    try {
      const payload: any = {
        name: form.name, description: form.description, clientName: form.clientName,
        deadline: form.deadline, status: form.status, budget: Number(form.budget),
        managerId: form.managerId, teamMembers: selectedMembers,
      };
      if (form.createdAt) payload.createdAt = form.createdAt;
      if (isEdit && editId) { await projectApi.update(editId, payload); showToast("✅ Updated"); }
      else                  { await projectApi.create(payload);         showToast("✅ Created"); }
      await loadProjects(); resetForm();
    } catch (err: any) { showToast("❌ " + err.message); }
    finally { setSubmitting(false); }
  };

  const handleManualSubmit = async () => {
    if (!manualForm.name)       return showToast("❌ Project name required");
    if (!manualForm.clientName) return showToast("❌ Client name required");
    setSubmitting(true);
    try {
      const payload: any = {
        name: manualForm.name, description: manualForm.description, clientName: manualForm.clientName,
        deadline: manualForm.deadline, status: manualForm.status,
        budget: Number(manualForm.budget)||0, spent: Number(manualForm.spent)||0,
        progress: Number(manualForm.progress)||0, teamMembers: manualMembers,
      };
      if (manualForm.managerId) payload.managerId = manualForm.managerId;
      if (manualForm.createdAt) payload.createdAt = manualForm.createdAt;
      await projectApi.createManual(payload);
      showToast("✅ Historical record saved");
      await loadProjects();
      setManualForm(EMPTY_MANUAL); setManualMembers([]); setManualOpen(false);
    } catch (err: any) { showToast("❌ " + err.message); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this project?")) return;
    try { await projectApi.delete(id); showToast("✅ Deleted"); await loadProjects(); }
    catch (err: any) { showToast("❌ " + err.message); }
  };

  const handleEdit = (p: Project) => {
    setIsEdit(true); setEditId(p._id);
    setForm({
      name: p.name, description: p.description, clientName: p.clientName,
      deadline: p.deadline, status: p.status, budget: String(p.budget),
      spent: String(p.spent), progress: String(p.progress),
      managerId: p.managerId?._id||p.managerId||"", createdAt: "",
    });
    setSelectedMembers(Array.isArray(p.teamMembers) ? p.teamMembers.map((m:any) => m._id||m) : []);
    setOpen(true);
  };

  const handleProgressUpdate = async (id: string, v: number) => {
    if (isNaN(v)||v<0||v>100) return;
    try { await projectApi.update(id, { progress: v }); showToast("✅ Progress updated"); await loadProjects(); }
    catch (err:any) { showToast("❌ "+err.message); }
  };

  const handleSpentUpdate = async (id: string, v: number) => {
    if (isNaN(v)||v<0) return;
    try { await projectApi.update(id, { spent: v }); showToast("✅ Spent updated"); await loadProjects(); }
    catch (err:any) { showToast("❌ "+err.message); }
  };

  const totalBudget = projects.reduce((s,p) => s+p.budget, 0);
  const totalSpent  = projects.reduce((s,p) => s+p.spent, 0);
  const burnRate    = totalBudget > 0 ? ((totalSpent/totalBudget)*100).toFixed(1) : "0";
  const velocity    = projects.length > 0
    ? (projects.reduce((s,p) => s+p.progress, 0)/projects.length).toFixed(0) : "0";
  const byStatus    = Object.keys(STATUS_CONFIG).reduce((acc, k) => {
    acc[k] = projects.filter(p => p.status === k).length; return acc;
  }, {} as Record<string, number>);

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4 max-w-5xl mx-auto">

      {/* TOAST */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl">
          {toast}
        </div>
      )}

      {/* ── MANUAL DIALOG ── no asChild, no Button wrapper */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">📋 Historical Project Entry</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Enter past project data with backdated record date.
            </DialogDescription>
          </DialogHeader>
          <div className="text-xs bg-amber-50 border border-amber-200 rounded px-2.5 py-2 text-amber-700 mb-3">
            Data saved directly to MongoDB with your specified date.
          </div>
          <ProjectFormFields
            form={manualForm} setForm={setManualForm}
            managers={managers} members={members}
            selectedMembers={manualMembers}
            onToggleMember={(id: string) => toggleMember(id, true)}
            isManual={true}
          />
          <button
            onClick={handleManualSubmit}
            disabled={submitting}
            className="w-full mt-4 h-9 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {submitting ? "Saving..." : "💾 Save Historical Record"}
          </button>
        </DialogContent>
      </Dialog>

      {/* ── CREATE / EDIT DIALOG ── no asChild */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); else setOpen(true); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">{isEdit ? "Edit Project" : "New Project"}</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              {isEdit ? "Update project details below." : "Fill in the details to create a new project."}
            </DialogDescription>
          </DialogHeader>
          <ProjectFormFields
            form={form} setForm={setForm}
            managers={managers} members={members}
            selectedMembers={selectedMembers}
            onToggleMember={(id: string) => toggleMember(id, false)}
            isManual={false}
          />
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full mt-4 h-9 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {submitting ? "Saving..." : isEdit ? "Update Project" : "Create Project"}
          </button>
        </DialogContent>
      </Dialog>

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Project Management</h1>
          <p className="text-xs text-gray-400">{projects.length} project{projects.length !== 1 ? "s" : ""} total</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setManualOpen(true)}
              className="flex items-center gap-1.5 h-8 px-3 text-xs border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-700 transition-colors"
            >
              <ClipboardList className="h-3.5 w-3.5" /> Manual Entry
            </button>
            <button
              onClick={() => { resetForm(); setOpen(true); }}
              className="flex items-center gap-1.5 h-8 px-3 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> New Project
            </button>
            <button
              onClick={() => exportToCSV(projects)}
              className="flex items-center gap-1.5 h-8 px-3 text-xs border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-700 transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Report
            </button>
          </div>
        )}
      </div>

      {/* ── STATS ROW ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { icon: <BarChart3 className="h-3.5 w-3.5 text-blue-500" />, bg: "bg-blue-50",   label: "Avg Progress",  value: `${velocity}%` },
          { icon: <Flame      className="h-3.5 w-3.5 text-orange-500" />, bg: "bg-orange-50", label: "Burn Rate",     value: `${burnRate}%` },
          { icon: <TrendingUp className="h-3.5 w-3.5 text-green-500" />, bg: "bg-green-50",  label: "Completed",     value: String(byStatus["completed"]||0) },
          { icon: <Wallet     className="h-3.5 w-3.5 text-purple-500" />, bg: "bg-purple-50", label: "Total Budget",
            value: totalBudget >= 100000 ? `₹${(totalBudget/100000).toFixed(1)}L` : `₹${totalBudget.toLocaleString()}` },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-6 h-6 ${s.bg} rounded flex items-center justify-center`}>{s.icon}</div>
              <span className="text-[11px] text-gray-500">{s.label}</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── STATUS PILLS ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
          <span key={k} className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${v.bg} ${v.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />
            {v.label} ({byStatus[k]||0})
          </span>
        ))}
      </div>

      {/* ── PROJECT LIST ── */}
      {projects.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-lg py-12 text-center">
          <p className="text-sm text-gray-400">No projects yet. {isAdmin && "Create your first project!"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => {
            const sc = STATUS_CONFIG[project.status] || STATUS_CONFIG["planning"];
            const budgetPct = project.budget > 0 ? Math.min((project.spent/project.budget)*100, 100) : 0;
            return (
              <div key={project._id}
                className="bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all">

                {/* Header row */}
                <div className="flex items-start justify-between px-4 pt-3 pb-2">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`} />
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 leading-tight truncate">{project.name}</h3>
                      {project.description && (
                        <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{project.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}>
                      {sc.label}
                    </span>
                    {isAdmin && (
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => handleEdit(project)}
                          className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(project._id)}
                          className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Metadata row */}
                <div className="px-4 pb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1 text-[11px] text-gray-500">
                    <Building2 className="h-3 w-3 text-gray-400" /> {project.clientName}
                  </span>
                  {project.deadline && (
                    <span className="flex items-center gap-1 text-[11px] text-gray-500">
                      <Calendar className="h-3 w-3 text-gray-400" /> {project.deadline}
                    </span>
                  )}
                  {project.managerId?.name && (
                    <span className="flex items-center gap-1 text-[11px] text-gray-500">
                      <UserCheck className="h-3 w-3 text-gray-400" /> {project.managerId.name}
                    </span>
                  )}
                  {project.teamMembers?.length > 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-gray-500">
                      <Users className="h-3 w-3 text-gray-400" />
                      {project.teamMembers.map((m:any) => m.name||m).join(", ")}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-300 ml-auto">
                    Added {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Progress + Budget dual bars */}
                <div className="px-4 pb-3 grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Progress</span>
                      <span className="text-[11px] font-semibold text-gray-700">{project.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${PROGRESS_COLOR(project.progress)}`}
                        style={{ width: `${project.progress}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Budget</span>
                      <span className="text-[11px] font-semibold text-gray-700">
                        ₹{project.spent.toLocaleString()} / ₹{project.budget.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${budgetPct > 80 ? "bg-red-400" : "bg-orange-400"}`}
                        style={{ width: `${budgetPct}%` }} />
                    </div>
                  </div>
                </div>

                {/* Manager inline update */}
                {isManager && (
                  <div className="px-4 pb-3 pt-2 border-t border-gray-100 grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-gray-500 uppercase tracking-wide">Update Progress %</Label>
                      <Input type="number" min={0} max={100} className="h-7 text-xs mt-1"
                        placeholder={String(project.progress)}
                        onBlur={(e) => handleProgressUpdate(project._id, Number(e.target.value))} />
                    </div>
                    <div>
                      <Label className="text-[10px] text-gray-500 uppercase tracking-wide">Update Spent (₹)</Label>
                      <Input type="number" min={0} className="h-7 text-xs mt-1"
                        placeholder={String(project.spent)}
                        onBlur={(e) => handleSpentUpdate(project._id, Number(e.target.value))} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
