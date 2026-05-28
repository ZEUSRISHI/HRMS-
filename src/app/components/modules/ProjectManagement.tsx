import { useEffect, useRef, useState, useCallback } from "react";
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
  BarChart3, Flame, Upload, FileText, Eye, X, Send,
  ChevronDown, ChevronUp, Clock, Paperclip, Shield,
  CheckCircle2, AlertCircle, Search, Lock, RefreshCw,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { projectApi } from "@/services/api";

type ProjectStatus = "planning" | "in-progress" | "completed" | "on-hold";
type ActiveTab = "team" | "docs" | "submissions";

interface UserOption {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface ProjectDocument {
  _id: string;
  name: string;
  url: string;
  fileType: string;
  size: number;
  uploadedBy: { _id: string; name: string; role: string };
  uploadedAt: string;
}

interface WorkSubmission {
  _id: string;
  submittedBy: { _id: string; name: string; role: string };
  description: string;
  hoursWorked: number;
  date: string;
}

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
  createdAt: string;
  documents: ProjectDocument[];
  workSubmissions: WorkSubmission[];
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
  planning: { label: "Planning", dot: "bg-slate-400", text: "text-slate-700", bg: "bg-slate-100", border: "border-slate-200" },
  "in-progress": { label: "In Progress", dot: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  completed: { label: "Completed", dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  "on-hold": { label: "On Hold", dot: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
};

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  manager: "bg-blue-100 text-blue-700",
  hr: "bg-purple-100 text-purple-700",
  employee: "bg-emerald-100 text-emerald-700",
};

const PROGRESS_COLOR = (p: number) =>
  p >= 80 ? "bg-emerald-500" : p >= 50 ? "bg-blue-500" : p >= 25 ? "bg-amber-400" : "bg-red-400";

const FILE_TYPE_ICON: Record<string, string> = {
  "application/pdf": "📄",
  "application/msword": "📝",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "📝",
  "application/vnd.ms-excel": "📊",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "📊",
  "image/png": "🖼️",
  "image/jpeg": "🖼️",
  "image/jpg": "🖼️",
};

const getFileIcon = (type: string) => FILE_TYPE_ICON[type] ?? "📎";

const fmtBytes = (b: number) =>
  b < 1024 ? `${b} B` : b < 1_048_576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1_048_576).toFixed(1)} MB`;

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const initials = (name: string) =>
  name.split(" ").slice(0, 2).map((n) => n[0]?.toUpperCase() ?? "").join("");

function exportToCSV(projects: Project[]) {
  if (!projects.length) { alert("No projects to export."); return; }
  const BOM = "\uFEFF";
  const cols = [
    "Project Name", "Client", "Status", "Budget (₹)", "Spent (₹)",
    "Progress (%)", "Manager", "Team Size", "Documents", "Submissions", "Created",
  ];
  const rows = projects.map((p) => [
    p.name, p.clientName, p.status, p.budget, p.spent, p.progress,
    p.managerId?.name ?? "-",
    (p.teamMembers ?? []).length,
    (p.documents ?? []).length,
    (p.workSubmissions ?? []).length,
    fmtDate(p.createdAt),
  ]);
  const csv = BOM + [cols, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url, download: `projects-${new Date().toISOString().slice(0, 10)}.csv`,
  });
  a.click();
  URL.revokeObjectURL(url);
}

interface ToastState { msg: string; type: "ok" | "err" }

function Toast({ toast }: { toast: ToastState }) {
  if (!toast.msg) return null;
  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-white text-xs max-w-xs sm:max-w-sm animate-in slide-in-from-top-2 ${toast.type === "err" ? "bg-red-600" : "bg-gray-900"}`}>
      {toast.type === "err" ? <AlertCircle className="h-4 w-4 flex-shrink-0" /> : <CheckCircle2 className="h-4 w-4 flex-shrink-0" />}
      <span className="leading-snug">{toast.msg}</span>
    </div>
  );
}

function MemberPicker({ list, selected, onToggle }: { list: UserOption[]; selected: string[]; onToggle: (id: string) => void }) {
  const [q, setQ] = useState("");
  const filtered = list.filter(
    (m) =>
      m.name.toLowerCase().includes(q.toLowerCase()) ||
      m.email.toLowerCase().includes(q.toLowerCase()) ||
      m.role.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
        <Search className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
        <input
          className="flex-1 text-xs outline-none bg-transparent placeholder-gray-400 text-gray-700"
          placeholder={`Search ${list.length} users…`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && (
          <button onClick={() => setQ("")} className="text-gray-400 hover:text-gray-600">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-gray-100">
          {selected.map((id) => {
            const u = list.find((m) => m._id === id);
            if (!u) return null;
            return (
              <span key={id} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                {u.name}
                <button onClick={() => onToggle(id)} className="hover:text-orange-900"><X className="h-2.5 w-2.5" /></button>
              </span>
            );
          })}
        </div>
      )}

      <div className="max-h-44 overflow-y-auto divide-y divide-gray-50">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No users found</p>
        ) : (
          filtered.map((m) => {
            const sel = selected.includes(m._id);
            return (
              <div
                key={m._id}
                onClick={() => onToggle(m._id)}
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors select-none ${sel ? "bg-orange-50 hover:bg-orange-100" : "hover:bg-gray-50"}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 ${sel ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-600"}`}>
                  {sel ? "✓" : initials(m.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${sel ? "text-orange-700" : "text-gray-800"}`}>{m.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{m.email}</p>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium capitalize flex-shrink-0 ${ROLE_BADGE[m.role] ?? "bg-gray-100 text-gray-600"}`}>
                  {m.role}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <span className="text-[10px] text-gray-400">{filtered.length} shown</span>
        {selected.length > 0 && (
          <span className="text-[10px] font-medium text-orange-600">{selected.length} selected</span>
        )}
      </div>
    </div>
  );
}

interface FormState {
  name: string;
  description: string;
  clientName: string;
  deadline: string;
  status: ProjectStatus;
  budget: string;
  spent: string;
  progress: string;
  managerId: string;
  createdAt: string;
}

const EMPTY_FORM: FormState = {
  name: "", description: "", clientName: "", deadline: "",
  status: "planning", budget: "", spent: "", progress: "",
  managerId: "", createdAt: "",
};

const EMPTY_MANUAL: FormState = {
  name: "", description: "", clientName: "", deadline: "",
  status: "completed", budget: "", spent: "", progress: "100",
  managerId: "", createdAt: "",
};

function ProjectFormFields({
  form, setForm, managers, allUsers, selectedMembers, onToggleMember, isManual = false,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  managers: UserOption[];
  allUsers: UserOption[];
  selectedMembers: string[];
  onToggleMember: (id: string) => void;
  isManual?: boolean;
}) {
  const set = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [key]: e.target.value });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-600">Project Name *</Label>
          <Input className="h-9 text-sm" placeholder="e.g. HRMS Redesign" value={form.name} onChange={set("name")} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-600">Client *</Label>
          <Input className="h-9 text-sm" placeholder="e.g. Quibo Tech" value={form.clientName} onChange={set("clientName")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-gray-600">Description</Label>
        <Textarea className="text-sm resize-none" rows={2} placeholder="Brief project overview…" value={form.description} onChange={set("description")} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-600">Deadline</Label>
          <Input type="date" className="h-9 text-sm" value={form.deadline} onChange={set("deadline")} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-600">Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ProjectStatus })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isManual ? (
        <div className="grid grid-cols-3 gap-3">
          {([
            ["budget", "Budget (₹)", "500000"],
            ["spent", "Spent (₹)", "0"],
            ["progress", "Progress %", "100"],
          ] as [keyof FormState, string, string][]).map(([key, label, ph]) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-600">{label}</Label>
              <Input type="number" className="h-9 text-sm" placeholder={ph} value={form[key] as string} onChange={set(key)} />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-600">Budget (₹) *</Label>
          <Input type="number" className="h-9 text-sm" placeholder="500000" value={form.budget} onChange={set("budget")} />
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-gray-600">
          Record Date{isManual && <span className="ml-1 text-gray-400 font-normal">(backdatable)</span>}
        </Label>
        <Input type="date" className="h-9 text-sm" value={form.createdAt} onChange={set("createdAt")} />
        {isManual && <p className="text-[10px] text-gray-400">Leave blank to use today</p>}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-gray-600">Manager{!isManual && " *"}</Label>
        <Select value={form.managerId || "__none__"} onValueChange={(v) => setForm({ ...form, managerId: v === "__none__" ? "" : v })}>
          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select manager…" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Select —</SelectItem>
            {managers.map((m) => (
              <SelectItem key={m._id} value={m._id}>
                {m.name} <span className="text-gray-400 text-xs">({m.role})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-gray-600">Team Members</Label>
        <MemberPicker list={allUsers} selected={selectedMembers} onToggle={onToggleMember} />
      </div>
    </div>
  );
}

function DocumentPanel({
  project, canUpload, canView, onUpload, onDelete,
}: {
  project: Project;
  canUpload: boolean;
  canView: boolean;
  onUpload: (d: { name: string; url: string; fileType: string; size: number }) => void;
  onDelete: (docId: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  if (!canView) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
          <Lock className="h-5 w-5 text-gray-400" />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-700">Documents restricted</p>
          <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
            Only Admins, Managers and HR can view project documents.<br />
            Contact your manager for access.
          </p>
        </div>
      </div>
    );
  }

  const processFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) { alert("Max file size is 10 MB."); return; }
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      onUpload({ name: file.name, url: reader.result as string, fileType: file.type, size: file.size });
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    };
    reader.onerror = () => { alert("Failed to read file."); setBusy(false); };
    reader.readAsDataURL(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  return (
    <div className="space-y-3">
      {canUpload && (
        <>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.ppt,.pptx,.zip"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
          />
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => !busy && fileRef.current?.click()}
            className={`flex flex-col items-center gap-1.5 py-5 border-2 border-dashed rounded-xl cursor-pointer transition-all ${drag ? "border-orange-400 bg-orange-50" : "border-gray-200 hover:border-orange-300 hover:bg-orange-50/50"} ${busy ? "opacity-60 pointer-events-none" : ""}`}
          >
            <Upload className={`h-5 w-5 ${drag ? "text-orange-500" : "text-gray-400"}`} />
            <p className="text-xs font-medium text-gray-600">{busy ? "Uploading…" : "Click or drag & drop to upload"}</p>
            <p className="text-[10px] text-gray-400">PDF, Word, Excel, Images up to 10 MB</p>
          </div>
        </>
      )}

      {!canUpload && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
          <Shield className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
          <p className="text-[11px] text-blue-700">View only — upload restricted to Admin/Manager/HR</p>
        </div>
      )}

      {(!project.documents || project.documents.length === 0) ? (
        <div className="text-center py-6">
          <FileText className="h-8 w-8 text-gray-200 mx-auto mb-2" />
          <p className="text-xs text-gray-400">No documents uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {project.documents.map((doc) => (
            <div key={doc._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 group hover:border-gray-200 hover:bg-white transition-all">
              <span className="text-xl flex-shrink-0" role="img" aria-label="file type">
                {getFileIcon(doc.fileType)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{doc.name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {fmtBytes(doc.size || 0)} · {doc.uploadedBy?.name ?? "Unknown"} · {fmtDate(doc.uploadedAt)}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <a href={doc.url} target="_blank" rel="noreferrer" download={doc.name} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View / Download">
                  <Eye className="h-3.5 w-3.5" />
                </a>
                {canUpload && (
                  <button onClick={() => onDelete(doc._id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100" title="Delete document">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkSubmissionPanel({
  project, currentUserId, currentUserRole, canSubmit, canViewAll, onSubmit, onDelete,
}: {
  project: Project;
  currentUserId: string;
  currentUserRole: string;
  canSubmit: boolean;
  canViewAll: boolean;
  onSubmit: (d: { description: string; hoursWorked: number }) => Promise<void>;
  onDelete: (subId: string) => void;
}) {
  const [desc, setDesc] = useState("");
  const [hours, setHours] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const visible = canViewAll
    ? (project.workSubmissions ?? [])
    : (project.workSubmissions ?? []).filter((s) => s.submittedBy?._id === currentUserId);

  const totalHours = visible.reduce((sum, s) => sum + (s.hoursWorked || 0), 0);

  const handleSubmit = async () => {
    if (!desc.trim()) { alert("Please enter a description."); return; }
    setSubmitting(true);
    try {
      await onSubmit({ description: desc, hoursWorked: Number(hours) || 0 });
      setDesc(""); setHours(""); setFormOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {visible.length > 0 && (
        <div className="flex items-center gap-4 px-1">
          <div className="flex items-center gap-1 text-[11px] text-gray-500">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="font-medium text-gray-800">{visible.length}</span>
            {" "}submission{visible.length !== 1 ? "s" : ""}
          </div>
          {totalHours > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-gray-500">
              <Clock className="h-3.5 w-3.5 text-blue-500" />
              <span className="font-medium text-gray-800">{totalHours}h</span> logged
            </div>
          )}
          {!canViewAll && (
            <span className="ml-auto text-[10px] text-gray-400 flex items-center gap-1">
              <Shield className="h-3 w-3" />Showing your updates only
            </span>
          )}
        </div>
      )}

      {canSubmit && !formOpen && (
        <button onClick={() => setFormOpen(true)} className="flex items-center justify-center gap-1.5 w-full h-9 text-xs border-2 border-dashed border-emerald-200 rounded-xl text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400 transition-all font-medium">
          <Send className="h-3.5 w-3.5" />
          Submit Work Update
        </button>
      )}

      {formOpen && canSubmit && (
        <div className="border border-emerald-200 bg-emerald-50/60 rounded-xl p-3 space-y-3">
          <p className="text-xs font-semibold text-emerald-800">New Work Update</p>
          <Textarea
            className="text-xs resize-none bg-white border-emerald-200 focus:border-emerald-400"
            rows={3}
            placeholder="Describe what you worked on, blockers, or progress made…"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              <Input type="number" min={0} max={24} className="h-8 text-xs w-28" placeholder="Hours worked" value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={handleSubmit} disabled={submitting || !desc.trim()} className="h-8 px-4 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors font-medium">
                {submitting ? "Saving…" : "Submit"}
              </button>
              <button onClick={() => { setFormOpen(false); setDesc(""); setHours(""); }} className="h-8 px-3 text-xs border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="text-center py-6">
          <Send className="h-8 w-8 text-gray-200 mx-auto mb-2" />
          <p className="text-xs text-gray-400">
            {canViewAll ? "No work submissions yet." : "You haven't submitted any updates yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
          {[...visible].reverse().map((sub) => (
            <div key={sub._id} className="p-3 bg-white border border-gray-100 rounded-xl group hover:border-gray-200 transition-all">
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700 flex-shrink-0 mt-0.5">
                  {initials(sub.submittedBy?.name ?? "?")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-gray-800">{sub.submittedBy?.name ?? "Unknown"}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium capitalize ${ROLE_BADGE[sub.submittedBy?.role] ?? "bg-gray-100 text-gray-600"}`}>
                        {sub.submittedBy?.role}
                      </span>
                      {sub.hoursWorked > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-blue-600 font-medium">
                          <Clock className="h-2.5 w-2.5" />{sub.hoursWorked}h
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">{fmtDate(sub.date)}</span>
                      {canViewAll && (
                        <button onClick={() => onDelete(sub._id)} className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 ml-1" title="Delete submission">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">{sub.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  project, role, currentUserId, isAdmin, isManager, isHR,
  onEdit, onDelete, onProgressUpdate, onSpentUpdate,
  onUploadDoc, onDeleteDoc, onSubmitWork, onDeleteSubmission,
}: {
  project: Project;
  role: string;
  currentUserId: string;
  isAdmin: boolean;
  isManager: boolean;
  isHR: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onProgressUpdate: (v: number) => void;
  onSpentUpdate: (v: number) => void;
  onUploadDoc: (d: any) => void;
  onDeleteDoc: (docId: string) => void;
  onSubmitWork: (d: any) => Promise<void>;
  onDeleteSubmission: (subId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("team");
  const [progVal, setProgVal] = useState(String(project.progress));
  const [spentVal, setSpentVal] = useState(String(project.spent));

  const isEmployee = !isAdmin && !isManager && !isHR;
  const canViewDoc = isAdmin || isManager || isHR;
  const canUpload = isAdmin || isManager || isHR;
  const canViewAll = isAdmin || isManager;
  const canSubmit = isManager || isHR || isEmployee;
  const canEditDel = isAdmin;

  const sc = STATUS_CONFIG[project.status] ?? STATUS_CONFIG["planning"];
  const budgetPct = project.budget > 0 ? Math.min(Math.round((project.spent / project.budget) * 100), 100) : 0;
  const docCount = project.documents?.length ?? 0;
  const subCount = project.workSubmissions?.length ?? 0;
  const teamCount = project.teamMembers?.length ?? 0;

  const tabs = [
    { key: "team" as ActiveTab, label: `Team (${teamCount})`, icon: <Users className="h-3 w-3" /> },
    ...(canViewDoc ? [{ key: "docs" as ActiveTab, label: `Docs (${docCount})`, icon: <FileText className="h-3 w-3" /> }] : []),
    { key: "submissions" as ActiveTab, label: `Updates (${subCount})`, icon: <Send className="h-3 w-3" /> },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl hover:border-gray-300 hover:shadow-sm transition-all">
      <div className="flex items-start gap-3 px-4 pt-4 pb-2">
        <div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${sc.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-gray-900 leading-snug">{project.name}</h3>
              {project.description && (
                <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{project.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium border ${sc.bg} ${sc.text} ${sc.border}`}>
                {sc.label}
              </span>
              {canEditDel && (
                <div className="flex items-center">
                  <button onClick={onEdit} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" title="Edit project">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={onDelete} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete project">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {project.clientName && (
          <span className="flex items-center gap-1 text-[11px] text-gray-500">
            <Building2 className="h-3 w-3 text-gray-400" />{project.clientName}
          </span>
        )}
        {project.deadline && (
          <span className="flex items-center gap-1 text-[11px] text-gray-500">
            <Calendar className="h-3 w-3 text-gray-400" />{project.deadline}
          </span>
        )}
        {project.managerId?.name && (
          <span className="flex items-center gap-1 text-[11px] text-gray-500">
            <UserCheck className="h-3 w-3 text-gray-400" />{project.managerId.name}
          </span>
        )}
        <span className="ml-auto text-[10px] text-gray-300">{fmtDate(project.createdAt)}</span>
      </div>

      <div className="px-4 pb-3 grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Progress</span>
            <span className="text-[11px] font-bold text-gray-700">{project.progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${PROGRESS_COLOR(project.progress)}`} style={{ width: `${project.progress}%` }} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Budget</span>
            <span className="text-[11px] font-bold text-gray-700">{budgetPct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${budgetPct > 85 ? "bg-red-400" : "bg-orange-400"}`} style={{ width: `${budgetPct}%` }} />
          </div>
          <p className="text-[9px] text-gray-400 mt-0.5 text-right">
            ₹{project.spent.toLocaleString()} / ₹{project.budget.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
        <button onClick={() => { setExpanded(true); setActiveTab("team"); }} className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
          <Users className="h-2.5 w-2.5" />{teamCount} member{teamCount !== 1 ? "s" : ""}
        </button>
        {canViewDoc && (
          <button onClick={() => { setExpanded(true); setActiveTab("docs"); }} className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
            <Paperclip className="h-2.5 w-2.5" />{docCount} doc{docCount !== 1 ? "s" : ""}
          </button>
        )}
        <button onClick={() => { setExpanded(true); setActiveTab("submissions"); }} className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
          <CheckCircle2 className="h-2.5 w-2.5" />
          {canViewAll ? subCount : (project.workSubmissions ?? []).filter(s => s.submittedBy?._id === currentUserId).length} update{subCount !== 1 ? "s" : ""}
        </button>
        <button onClick={() => setExpanded((o) => !o)} className="ml-auto flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-gray-700 transition-colors">
          {expanded ? <><ChevronUp className="h-3 w-3" />Less</> : <><ChevronDown className="h-3 w-3" />More</>}
        </button>
      </div>

      {isManager && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Progress %</Label>
            <div className="flex items-center gap-1.5 mt-1">
              <Input
                type="number" min={0} max={100}
                className="h-8 text-xs flex-1"
                value={progVal}
                onChange={(e) => setProgVal(e.target.value)}
                onBlur={() => {
                  const v = Number(progVal);
                  if (!isNaN(v) && v >= 0 && v <= 100) onProgressUpdate(v);
                  else setProgVal(String(project.progress));
                }}
              />
            </div>
          </div>
          <div>
            <Label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Spent (₹)</Label>
            <div className="flex items-center gap-1.5 mt-1">
              <Input
                type="number" min={0}
                className="h-8 text-xs flex-1"
                value={spentVal}
                onChange={(e) => setSpentVal(e.target.value)}
                onBlur={() => {
                  const v = Number(spentVal);
                  if (!isNaN(v) && v >= 0) onSpentUpdate(v);
                  else setSpentVal(String(project.spent));
                }}
              />
            </div>
          </div>
        </div>
      )}

      {expanded && (
        <div className="border-t border-gray-100">
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-semibold whitespace-nowrap transition-colors border-b-2 flex-shrink-0 ${activeTab === t.key ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          <div className="p-4">
            {activeTab === "team" && (
              <div>
                {(!project.teamMembers || project.teamMembers.length === 0) ? (
                  <div className="text-center py-6">
                    <Users className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">No team members assigned yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {project.teamMembers.map((m: any) => (
                      <div key={m._id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-[11px] font-bold text-orange-700 flex-shrink-0">
                          {initials(m.name ?? "?")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-800 truncate">{m.name}</p>
                          <p className="text-[10px] text-gray-400 truncate">{m.email}</p>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold capitalize flex-shrink-0 ${ROLE_BADGE[m.role] ?? "bg-gray-100 text-gray-600"}`}>
                          {m.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "docs" && (
              <DocumentPanel
                project={project}
                canUpload={canUpload}
                canView={canViewDoc}
                onUpload={onUploadDoc}
                onDelete={onDeleteDoc}
              />
            )}

            {activeTab === "submissions" && (
              <WorkSubmissionPanel
                project={project}
                currentUserId={currentUserId}
                currentUserRole={role}
                canSubmit={canSubmit}
                canViewAll={canViewAll}
                onSubmit={onSubmitWork}
                onDelete={onDeleteSubmission}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ProjectManagement() {
  const { currentUser } = useAuth();
  const role = (currentUser as any)?.role?.toLowerCase?.() ?? "";
  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isHR = role === "hr";
  const userId = (currentUser as any)?._id ?? "";

  const [projects, setProjects] = useState<Project[]>([]);
  const [managers, setManagers] = useState<UserOption[]>([]);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({ msg: "", type: "ok" });
  const [submitting, setSubmitting] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [manualMembers, setManualMembers] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [manualForm, setManualForm] = useState<FormState>(EMPTY_MANUAL);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const showToast = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "ok" }), 3500);
  }, []);

  const loadProjects = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      const data = isAdmin || isManager || isHR
        ? await projectApi.getAll()
        : await projectApi.getMy();
      setProjects(data.projects ?? []);
    } catch (err: unknown) {
      showToast("❌ " + (err instanceof Error ? err.message : "Unknown error"), "err");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, isManager, isHR, showToast]);

  const loadUsers = useCallback(async () => {
    if (!isAdmin && !isManager && !isHR) return;
    try {
      const [mgr, all] = await Promise.all([
        projectApi.getManagers(),
        projectApi.getAllUsers(),
      ]);
      setManagers(mgr.users ?? []);
      setAllUsers(all.users ?? []);
    } catch (err: unknown) {
      console.error("loadUsers:", err instanceof Error ? err.message : err);
    }
  }, [isAdmin, isManager, isHR]);

  useEffect(() => {
    if (!currentUser) return;
    Promise.all([loadProjects(), loadUsers()]);
  }, [currentUser]);

  const toggleMember = (id: string, manual = false) => {
    if (manual) setManualMembers((p) => p.includes(id) ? p.filter((m) => m !== id) : [...p, id]);
    else setSelectedMembers((p) => p.includes(id) ? p.filter((m) => m !== id) : [...p, id]);
  };

  const resetForm = () => {
    setIsEdit(false); setEditId(null);
    setSelectedMembers([]); setForm(EMPTY_FORM); setOpen(false);
  };

  const handleSubmit = async () => {
    if (!form.name) return showToast("❌ Project name required", "err");
    if (!form.clientName) return showToast("❌ Client name required", "err");
    if (!form.deadline) return showToast("❌ Deadline required", "err");
    if (!form.budget) return showToast("❌ Budget required", "err");
    if (!form.managerId) return showToast("❌ Manager required", "err");
    setSubmitting(true);
    try {
      const payload: any = {
        name: form.name,
        description: form.description,
        clientName: form.clientName,
        deadline: form.deadline,
        status: form.status,
        budget: Number(form.budget),
        managerId: form.managerId,
        teamMembers: selectedMembers,
      };
      if (form.createdAt) payload.createdAt = form.createdAt;
      if (isEdit && editId) {
        await projectApi.update(editId, payload);
        showToast("✅ Project updated");
      } else {
        await projectApi.create(payload);
        showToast("✅ Project created");
      }
      await loadProjects(true);
      resetForm();
    } catch (err: unknown) {
      showToast("❌ " + (err instanceof Error ? err.message : "Unknown error"), "err");
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualForm.name) return showToast("❌ Project name required", "err");
    if (!manualForm.clientName) return showToast("❌ Client name required", "err");
    setSubmitting(true);
    try {
      const payload: any = {
        name: manualForm.name,
        description: manualForm.description,
        clientName: manualForm.clientName,
        deadline: manualForm.deadline,
        status: manualForm.status,
        budget: Number(manualForm.budget) || 0,
        spent: Number(manualForm.spent) || 0,
        progress: Number(manualForm.progress) || 0,
        teamMembers: manualMembers,
      };
      if (manualForm.managerId) payload.managerId = manualForm.managerId;
      if (manualForm.createdAt) payload.createdAt = manualForm.createdAt;
      await projectApi.createManual(payload);
      showToast("✅ Historical record saved");
      await loadProjects(true);
      setManualForm(EMPTY_MANUAL);
      setManualMembers([]);
      setManualOpen(false);
    } catch (err: unknown) {
      showToast("❌ " + (err instanceof Error ? err.message : "Unknown error"), "err");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Permanently delete this project?")) return;
    try {
      await projectApi.delete(id);
      showToast("✅ Project deleted");
      await loadProjects(true);
    } catch (err: unknown) {
      showToast("❌ " + (err instanceof Error ? err.message : "Unknown error"), "err");
    }
  };

  const handleEdit = (p: Project) => {
    setIsEdit(true); setEditId(p._id);
    setForm({
      name: p.name,
      description: p.description,
      clientName: p.clientName,
      deadline: p.deadline,
      status: p.status,
      budget: String(p.budget),
      spent: String(p.spent),
      progress: String(p.progress),
      managerId: p.managerId?._id ?? p.managerId ?? "",
      createdAt: "",
    });
    setSelectedMembers(
      Array.isArray(p.teamMembers) ? p.teamMembers.map((m: any) => m._id ?? m) : []
    );
    setOpen(true);
  };

  const handleProgressUpdate = async (id: string, v: number) => {
    if (isNaN(v) || v < 0 || v > 100) return;
    try {
      await projectApi.update(id, { progress: v });
      showToast("✅ Progress updated");
      await loadProjects(true);
    } catch (err: unknown) {
      showToast("❌ " + (err instanceof Error ? err.message : "Unknown error"), "err");
    }
  };

  const handleSpentUpdate = async (id: string, v: number) => {
    if (isNaN(v) || v < 0) return;
    try {
      await projectApi.update(id, { spent: v });
      showToast("✅ Spent updated");
      await loadProjects(true);
    } catch (err: unknown) {
      showToast("❌ " + (err instanceof Error ? err.message : "Unknown error"), "err");
    }
  };

  const handleUploadDoc = async (projectId: string, doc: any) => {
    try {
      await projectApi.uploadDocument(projectId, doc);
      showToast("✅ Document uploaded");
      await loadProjects(true);
    } catch (err: unknown) {
      showToast("❌ " + (err instanceof Error ? err.message : "Unknown error"), "err");
    }
  };

  const handleDeleteDoc = async (projectId: string, docId: string) => {
    if (!window.confirm("Delete this document?")) return;
    try {
      await projectApi.deleteDocument(projectId, docId);
      showToast("✅ Document deleted");
      await loadProjects(true);
    } catch (err: unknown) {
      showToast("❌ " + (err instanceof Error ? err.message : "Unknown error"), "err");
    }
  };

  const handleSubmitWork = async (projectId: string, data: any): Promise<void> => {
    await projectApi.submitWork(projectId, data);
    showToast("✅ Work update submitted");
    await loadProjects(true);
  };

  const handleDeleteSubmission = async (projectId: string, subId: string) => {
    if (!window.confirm("Delete this submission?")) return;
    try {
      await projectApi.deleteSubmission(projectId, subId);
      showToast("✅ Submission deleted");
      await loadProjects(true);
    } catch (err: unknown) {
      showToast("❌ " + (err instanceof Error ? err.message : "Unknown error"), "err");
    }
  };

  const filtered = projects.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      p.name.toLowerCase().includes(q) ||
      p.clientName.toLowerCase().includes(q) ||
      p.managerId?.name?.toLowerCase()?.includes(q);
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
  const burnRate = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : "0";
  const avgProgress = projects.length > 0
    ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length)
    : 0;
  const byStatus = Object.keys(STATUS_CONFIG).reduce(
    (acc, k) => { acc[k] = projects.filter((p) => p.status === k).length; return acc; },
    {} as Record<string, number>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-400">Loading projects…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto px-3 sm:px-4 pb-8">
      <Toast toast={toast} />

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">📋 Historical Project Entry</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Enter past project data with backdated records.
            </DialogDescription>
          </DialogHeader>
          <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-700 mb-2">
            ⚠️ This data is saved directly with your specified date to MongoDB.
          </div>
          <ProjectFormFields
            form={manualForm} setForm={setManualForm}
            managers={managers} allUsers={allUsers}
            selectedMembers={manualMembers}
            onToggleMember={(id) => toggleMember(id, true)}
            isManual={true}
          />
          <button onClick={handleManualSubmit} disabled={submitting} className="w-full mt-4 h-10 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors">
            {submitting ? "Saving…" : "💾 Save Historical Record"}
          </button>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); else setOpen(true); }}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">{isEdit ? "Edit Project" : "New Project"}</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              {isEdit ? "Update the project details below." : "Fill in the details to create a new project."}
            </DialogDescription>
          </DialogHeader>
          <ProjectFormFields
            form={form} setForm={setForm}
            managers={managers} allUsers={allUsers}
            selectedMembers={selectedMembers}
            onToggleMember={(id) => toggleMember(id, false)}
            isManual={false}
          />
          <button onClick={handleSubmit} disabled={submitting} className="w-full mt-4 h-10 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors">
            {submitting ? "Saving…" : isEdit ? "Update Project" : "Create Project"}
          </button>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-base font-bold text-gray-900">Project Management</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
            {filtered.length !== projects.length && ` · ${filtered.length} shown`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => loadProjects(true)} disabled={refreshing} className="flex items-center gap-1.5 h-9 px-3 text-xs border border-gray-200 rounded-xl bg-white hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-50" title="Refresh">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {isAdmin && (
            <>
              <button onClick={() => setManualOpen(true)} className="flex items-center gap-1.5 h-9 px-3 text-xs border border-gray-200 rounded-xl bg-white hover:bg-gray-50 text-gray-700 transition-colors">
                <ClipboardList className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Manual Entry</span>
              </button>
              <button onClick={() => { resetForm(); setOpen(true); }} className="flex items-center gap-1.5 h-9 px-3 text-xs bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium">
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New Project</span>
              </button>
              <button onClick={() => exportToCSV(projects)} className="flex items-center gap-1.5 h-9 px-3 text-xs border border-gray-200 rounded-xl bg-white hover:bg-gray-50 text-gray-700 transition-colors">
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { icon: <BarChart3 className="h-4 w-4 text-blue-500" />, bg: "bg-blue-50", label: "Avg Progress", value: `${avgProgress}%` },
          { icon: <Flame className="h-4 w-4 text-orange-500" />, bg: "bg-orange-50", label: "Budget Burn", value: `${burnRate}%` },
          { icon: <TrendingUp className="h-4 w-4 text-emerald-500" />, bg: "bg-emerald-50", label: "Completed", value: String(byStatus.completed ?? 0) },
          { icon: <Wallet className="h-4 w-4 text-purple-500" />, bg: "bg-purple-50", label: "Total Budget", value: totalBudget >= 100_000 ? `₹${(totalBudget / 100_000).toFixed(1)}L` : `₹${totalBudget.toLocaleString()}` },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-2xl p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 ${s.bg} rounded-lg flex items-center justify-center`}>{s.icon}</div>
              <span className="text-[10px] text-gray-500 font-medium">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 leading-none">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setFilterStatus(filterStatus === k ? "all" : k)}
            className={`inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full font-medium border transition-all ${filterStatus === k ? `${v.bg} ${v.text} ${v.border} ring-2 ring-offset-1 ring-current` : `${v.bg} ${v.text} ${v.border} hover:opacity-80`}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />
            {v.label} ({byStatus[k] ?? 0})
          </button>
        ))}
        {filterStatus !== "all" && (
          <button onClick={() => setFilterStatus("all")} className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-full text-gray-500 border border-gray-200 hover:bg-gray-50">
            <X className="h-2.5 w-2.5" />Clear
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="flex items-center gap-2 flex-1 border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus-within:border-gray-400 transition-colors">
          <Search className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          <input
            className="flex-1 text-xs outline-none placeholder-gray-400 bg-transparent text-gray-700"
            placeholder="Search by name, client, or manager…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-10 text-xs w-full sm:w-40 rounded-xl">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl py-16 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <ClipboardList className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600">
            {search || filterStatus !== "all" ? "No projects match your filters" : "No projects yet"}
          </p>
          {isAdmin && !search && filterStatus === "all" && (
            <p className="text-xs text-gray-400 mt-1">Create your first project using the button above.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              role={role}
              currentUserId={userId}
              isAdmin={isAdmin}
              isManager={isManager}
              isHR={isHR}
              onEdit={() => handleEdit(project)}
              onDelete={() => handleDelete(project._id)}
              onProgressUpdate={(v) => handleProgressUpdate(project._id, v)}
              onSpentUpdate={(v) => handleSpentUpdate(project._id, v)}
              onUploadDoc={(d) => handleUploadDoc(project._id, d)}
              onDeleteDoc={(docId) => handleDeleteDoc(project._id, docId)}
              onSubmitWork={(d) => handleSubmitWork(project._id, d)}
              onDeleteSubmission={(subId) => handleDeleteSubmission(project._id, subId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
