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
  Plus, Pencil, Trash2, Download, ClipboardList, Building2,
  Calendar, Wallet, TrendingUp, Users, UserCheck, BarChart3,
  Flame, Upload, FileText, Eye, X, Send, ChevronDown, ChevronUp,
  Clock, Paperclip, Shield, CheckCircle2, AlertCircle, Search,
  Lock, RefreshCw, Layers, FolderOpen, Activity, MessageSquare,
  Smile, Meh, Frown, Coffee, Target,
  Circle, CheckCircle, Database,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { projectApi } from "@/services/api";

/* ══════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════ */
type ProjectStatus   = "planning" | "in-progress" | "completed" | "on-hold";
type ProjectPriority = "low" | "medium" | "high" | "critical";
type ActiveTab       = "overview" | "team" | "docs" | "dailystatus" | "submissions";
type MoodType        = "great" | "good" | "neutral" | "struggling";

interface UserOption {
  _id: string; name: string; email: string; role: string;
  department?: string; designation?: string;
}
interface Milestone {
  _id: string; title: string; dueDate: string;
  completed: boolean; completedAt: string | null;
}
interface ProjectDocument {
  _id: string; name: string; url: string; fileType: string;
  size: number; category: string;
  uploadedBy: { _id: string; name: string; role: string };
  uploadedAt: string;
}
interface DailyStatus {
  _id: string;
  submittedBy: { _id: string; name: string; role: string };
  date: string; summary: string; hoursWorked: number;
  blockers: string; nextPlan: string; mood: MoodType;
  managerComment: string;
  commentedBy: { _id: string; name: string; role: string } | null;
  commentedAt: string | null;
}
interface WorkSubmission {
  _id: string;
  submittedBy: { _id: string; name: string; role: string };
  description: string; hoursWorked: number; date: string;
}
interface Project {
  _id: string; name: string; description: string; clientName: string;
  deadline: string; status: ProjectStatus; priority: ProjectPriority;
  budget: number; spent: number; progress: number;
  managerId: any; teamMembers: any[]; createdAt: string; tags: string[];
  milestones: Milestone[]; documents: ProjectDocument[];
  dailyStatuses: DailyStatus[]; workSubmissions: WorkSubmission[];
}

/* ══════════════════════════════════════════════════════════
   CONFIG
══════════════════════════════════════════════════════════ */
const STATUS_CFG = {
  planning:      { label: "Planning",     dot: "bg-slate-400",   text: "text-slate-700",   bg: "bg-slate-50",   border: "border-slate-200",  accent: "#64748b", gradient: "from-slate-400 to-slate-500"   },
  "in-progress": { label: "In Progress",  dot: "bg-indigo-500",  text: "text-indigo-700",  bg: "bg-indigo-50",  border: "border-indigo-200", accent: "#6366f1", gradient: "from-indigo-400 to-indigo-600" },
  completed:     { label: "Completed",    dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200",accent: "#10b981", gradient: "from-emerald-400 to-emerald-600"},
  "on-hold":     { label: "On Hold",      dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200",  accent: "#f59e0b", gradient: "from-amber-400 to-amber-500"   },
} as const;

const PRIORITY_CFG = {
  low:      { label: "Low",      icon: "↓", cls: "bg-gray-100 text-gray-600",       dot: "bg-gray-400"    },
  medium:   { label: "Medium",   icon: "→", cls: "bg-sky-100 text-sky-700",          dot: "bg-sky-400"     },
  high:     { label: "High",     icon: "↑", cls: "bg-orange-100 text-orange-700",    dot: "bg-orange-400"  },
  critical: { label: "Critical", icon: "⚡", cls: "bg-red-100 text-red-700",          dot: "bg-red-500"     },
} as const;

const MOOD_CFG: Record<MoodType, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  great:      { icon: <Smile  className="h-3.5 w-3.5" />, label: "Great",      color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  good:       { icon: <Coffee className="h-3.5 w-3.5" />, label: "Good",       color: "text-sky-700",     bg: "bg-sky-50 border-sky-200"         },
  neutral:    { icon: <Meh    className="h-3.5 w-3.5" />, label: "Neutral",    color: "text-amber-700",   bg: "bg-amber-50 border-amber-200"     },
  struggling: { icon: <Frown  className="h-3.5 w-3.5" />, label: "Struggling", color: "text-rose-700",    bg: "bg-rose-50 border-rose-200"       },
};

const DOC_CATEGORY_CFG = {
  contract:      { label: "Contract",      color: "bg-blue-100 text-blue-800",     border: "border-blue-200",   icon: "📜", accent: "#3b82f6"  },
  specification: { label: "Specification", color: "bg-violet-100 text-violet-800", border: "border-violet-200", icon: "📋", accent: "#8b5cf6"  },
  design:        { label: "Design",        color: "bg-pink-100 text-pink-800",      border: "border-pink-200",   icon: "🎨", accent: "#ec4899"  },
  report:        { label: "Report",        color: "bg-amber-100 text-amber-800",    border: "border-amber-200",  icon: "📊", accent: "#f59e0b"  },
  invoice:       { label: "Invoice",       color: "bg-emerald-100 text-emerald-800",border: "border-emerald-200",icon: "🧾", accent: "#10b981"  },
  other:         { label: "Other",         color: "bg-gray-100 text-gray-700",      border: "border-gray-200",   icon: "📎", accent: "#6b7280"  },
} as const;

const ROLE_BADGE: Record<string, string> = {
  admin:    "bg-rose-100 text-rose-700 border border-rose-200",
  manager:  "bg-indigo-100 text-indigo-700 border border-indigo-200",
  hr:       "bg-violet-100 text-violet-700 border border-violet-200",
  employee: "bg-emerald-100 text-emerald-700 border border-emerald-200",
};

const FILE_ICONS: Record<string, string> = {
  "application/pdf": "📄",
  "application/msword": "📝",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "📝",
  "application/vnd.ms-excel": "📊",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "📊",
  "application/vnd.ms-powerpoint": "📑",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "📑",
  "image/png": "🖼️", "image/jpeg": "🖼️", "image/jpg": "🖼️",
  "image/gif": "🖼️", "image/webp": "🖼️",
  "text/plain": "📃", "application/zip": "🗜️",
};
const ALLOWED_MIME = Object.keys(FILE_ICONS);
const MAX_FILE     = 10 * 1024 * 1024;   // 10 MB

/* ══════════════════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════════════════ */
const fmtBytes = (b: number) =>
  b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtTime = (d: string) =>
  d ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "";

const initials = (n: string) =>
  n?.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("") || "?";

const getFileIcon = (t: string) => FILE_ICONS[t] ?? "📎";

const PROGRESS_COLOR = (p: number) =>
  p >= 80 ? "from-emerald-400 to-emerald-500" :
  p >= 50 ? "from-indigo-400 to-indigo-500" :
  p >= 25 ? "from-amber-400 to-amber-500" : "from-rose-400 to-rose-500";

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-700",
  "bg-rose-100 text-rose-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
];

const getAvatarColor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};

/** Estimate decoded byte size from a base64 data-URL */
const estimateBase64Bytes = (dataUrl: string): number => {
  const b64     = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const padding = (b64.match(/=+$/) || [""])[0].length;
  return Math.ceil((b64.length * 3) / 4) - padding;
};

function exportToCSV(projects: Project[]) {
  if (!projects.length) { alert("No projects to export."); return; }
  const rows = projects.map(p => [
    p.name, p.clientName, p.status, p.priority, p.budget, p.spent, p.progress,
    p.managerId?.name ?? "-", (p.teamMembers ?? []).length,
    (p.documents ?? []).length, (p.dailyStatuses ?? []).length,
    (p.workSubmissions ?? []).length, fmtDate(p.createdAt),
  ]);
  const csv = "\uFEFF" + [
    ["Name","Client","Status","Priority","Budget","Spent","Progress","Manager","Team","Docs","Daily Status","Submissions","Created"],
    ...rows
  ].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" })),
    download: `projects-${new Date().toISOString().slice(0, 10)}.csv`,
  });
  a.click();
}

/* ══════════════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════════════ */
function Toast({ msg, type }: { msg: string; type: "ok" | "err" }) {
  if (!msg) return null;
  return (
    <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 px-5 py-3.5
      rounded-2xl shadow-2xl text-white text-sm max-w-sm
      ${type === "err"
        ? "bg-gradient-to-r from-rose-600 to-rose-500"
        : "bg-gradient-to-r from-gray-900 to-gray-800"
      }`}
      style={{ animation: "slideInRight 0.25s ease-out" }}>
      {type === "err"
        ? <AlertCircle className="h-4 w-4 flex-shrink-0" />
        : <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
      }
      <span className="font-medium">{msg}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   AVATAR
══════════════════════════════════════════════════════════ */
function Avatar({ name, size = "sm" }: { name: string; size?: "xs" | "sm" | "md" | "lg" }) {
  const sz = {
    xs: "w-6 h-6 text-[9px]",
    sm: "w-8 h-8 text-[11px]",
    md: "w-10 h-10 text-xs",
    lg: "w-12 h-12 text-sm",
  }[size];
  return (
    <div className={`${sz} ${getAvatarColor(name || "?")} rounded-xl flex items-center justify-center font-bold flex-shrink-0 ring-2 ring-white`}>
      {initials(name)}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MEMBER PICKER
══════════════════════════════════════════════════════════ */
function MemberPicker({
  list, selected, onToggle,
}: { list: UserOption[]; selected: string[]; onToggle: (id: string) => void }) {
  const [q, setQ] = useState("");
  const filtered = list.filter(m =>
    m.name.toLowerCase().includes(q.toLowerCase()) ||
    m.email.toLowerCase().includes(q.toLowerCase()) ||
    m.role.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 bg-gray-50">
        <Search className="h-3.5 w-3.5 text-gray-400" />
        <input
          className="flex-1 text-xs outline-none bg-transparent placeholder-gray-400"
          placeholder={`Search ${list.length} users…`}
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        {q && <button onClick={() => setQ("")}><X className="h-3 w-3 text-gray-400" /></button>}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-gray-100 bg-indigo-50/40">
          {selected.map(id => {
            const u = list.find(m => m._id === id);
            if (!u) return null;
            return (
              <span key={id} className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200">
                {u.name}
                <button onClick={() => onToggle(id)} className="ml-0.5 hover:text-indigo-900">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
        {filtered.length === 0
          ? <p className="text-xs text-gray-400 text-center py-6">No users found</p>
          : filtered.map(m => {
            const sel = selected.includes(m._id);
            return (
              <div key={m._id} onClick={() => onToggle(m._id)}
                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors
                  ${sel ? "bg-indigo-50" : "hover:bg-gray-50"}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all
                  ${sel ? "bg-indigo-500 text-white ring-2 ring-indigo-200" : `${getAvatarColor(m.name)}`}`}>
                  {sel ? "✓" : initials(m.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate ${sel ? "text-indigo-700" : "text-gray-800"}`}>{m.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{m.email}</p>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold capitalize flex-shrink-0 ${ROLE_BADGE[m.role] ?? "bg-gray-100 text-gray-600"}`}>
                  {m.role}
                </span>
              </div>
            );
          })
        }
      </div>

      <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
        <span className="text-[10px] text-gray-400">{filtered.length} available</span>
        {selected.length > 0 && (
          <span className="text-[10px] font-bold text-indigo-600">{selected.length} selected</span>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   FORM STATE
══════════════════════════════════════════════════════════ */
interface FormState {
  name: string; description: string; clientName: string; deadline: string;
  status: ProjectStatus; priority: ProjectPriority;
  budget: string; spent: string; progress: string;
  managerId: string; createdAt: string; tags: string;
}
const EMPTY_FORM: FormState = {
  name: "", description: "", clientName: "", deadline: "",
  status: "planning", priority: "medium",
  budget: "", spent: "", progress: "", managerId: "", createdAt: "", tags: "",
};
const EMPTY_MANUAL: FormState = { ...EMPTY_FORM, status: "completed", progress: "100" };

/* ══════════════════════════════════════════════════════════
   PROJECT FORM FIELDS
══════════════════════════════════════════════════════════ */
function ProjectFormFields({
  form, setForm, managers, allUsers, selectedMembers, onToggleMember, isManual = false,
}: {
  form: FormState; setForm: (f: FormState) => void;
  managers: UserOption[]; allUsers: UserOption[];
  selectedMembers: string[]; onToggleMember: (id: string) => void;
  isManual?: boolean;
}) {
  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-600">Project Name *</Label>
          <Input className="h-9 text-sm" placeholder="e.g. HRMS Redesign" value={form.name} onChange={set("name")} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-600">Client *</Label>
          <Input className="h-9 text-sm" placeholder="e.g. Quibo Tech" value={form.clientName} onChange={set("clientName")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-gray-600">Description</Label>
        <Textarea className="text-sm resize-none" rows={2} placeholder="Brief project overview…" value={form.description} onChange={set("description")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-600">Deadline</Label>
          <Input type="date" className="h-9 text-sm" value={form.deadline} onChange={set("deadline")} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-600">Status</Label>
          <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as ProjectStatus })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CFG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-600">Priority</Label>
          <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v as ProjectPriority })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PRIORITY_CFG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-600">Budget (₹) *</Label>
          <Input type="number" className="h-9 text-sm" placeholder="500000" value={form.budget} onChange={set("budget")} />
        </div>
      </div>

      {isManual && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Spent (₹)</Label>
            <Input type="number" className="h-9 text-sm" placeholder="0" value={form.spent} onChange={set("spent")} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Progress %</Label>
            <Input type="number" className="h-9 text-sm" placeholder="100" value={form.progress} onChange={set("progress")} />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-gray-600">Tags <span className="text-gray-400 font-normal">(comma-separated)</span></Label>
        <Input className="h-9 text-sm" placeholder="frontend, api, design…" value={form.tags} onChange={set("tags")} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-gray-600">
          Record Date {isManual && <span className="text-gray-400 font-normal">(backdatable)</span>}
        </Label>
        <Input type="date" className="h-9 text-sm" value={form.createdAt} onChange={set("createdAt")} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-gray-600">Manager {!isManual && "*"}</Label>
        <Select value={form.managerId || "__none__"} onValueChange={v => setForm({ ...form, managerId: v === "__none__" ? "" : v })}>
          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select manager…" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Select —</SelectItem>
            {managers.map(m => (
              <SelectItem key={m._id} value={m._id}>{m.name} ({m.role})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-gray-600">Team Members</Label>
        <MemberPicker list={allUsers} selected={selectedMembers} onToggle={onToggleMember} />
        {selectedMembers.length > 0 && (
          <p className="text-[10px] text-emerald-600 font-semibold">
            ✓ {selectedMembers.length} member{selectedMembers.length !== 1 ? "s" : ""} selected
          </p>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   DOCUMENT PANEL
   ─────────────────────────────────────────────────────────
   Upload flow (frontend side):
     1. User selects or drops a file
     2. processFile() validates mime type & size
     3. FileReader.readAsDataURL() converts file → base64 data-URL
     4. onUpload() passes { name, url (base64), fileType, size, category }
        up to handleUploadDoc() in ProjectManagement
     5. projectApi.uploadDocument() POSTs to /projects/:id/documents
     6. Backend stores url (base64 string) in MongoDB Atlas
        → projects collection → documents[] array → url field
   
   To view in Atlas:
     Open Atlas UI → Collections → your_db → projects
     Click a document → documents[] → url field
     (Value starts with "data:application/pdf;base64,..." etc.)
══════════════════════════════════════════════════════════ */
function DocumentPanel({
  project, canUpload, canView, onUpload, onDelete,
}: {
  project: Project; canUpload: boolean; canView: boolean;
  onUpload: (d: { name: string; url: string; fileType: string; size: number; category: string }) => void;
  onDelete: (docId: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy,     setBusy]     = useState(false);
  const [drag,     setDrag]     = useState(false);
  const [error,    setError]    = useState("");
  const [progress, setProgress] = useState(0);
  const [category, setCategory] = useState<keyof typeof DOC_CATEGORY_CFG>("contract");
  const [preview,  setPreview]  = useState<ProjectDocument | null>(null);

  /* Employees are locked out */
  if (!canView) return (
    <div className="flex flex-col items-center gap-5 py-16 text-center">
      <div className="relative">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-inner">
          <Lock className="h-8 w-8 text-gray-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-rose-100 rounded-full flex items-center justify-center">
          <Shield className="h-3.5 w-3.5 text-rose-500" />
        </div>
      </div>
      <div>
        <p className="text-sm font-bold text-gray-800">Restricted Access</p>
        <p className="text-xs text-gray-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
          Project documents are confidential. Only Admin, Manager & HR personnel can view and manage project files.
        </p>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-gray-500 bg-gray-50 border border-gray-200 px-4 py-2 rounded-full">
        <Shield className="h-3 w-3 text-gray-400" />
        Role-based access control (RBAC) enforced
      </div>
    </div>
  );

  const processFile = (file: File) => {
    setError("");

    if (!ALLOWED_MIME.includes(file.type)) {
      setError(`"${file.type || file.name.split(".").pop()}" is not supported. Use PDF, Word, Excel, PowerPoint, images, or ZIP.`);
      return;
    }
    if (file.size > MAX_FILE) {
      setError(`File too large: ${fmtBytes(file.size)}. Maximum is 10 MB.`);
      return;
    }

    setBusy(true);
    setProgress(0);

    const iv = setInterval(() => setProgress(p => Math.min(p + 12, 85)), 120);

    const reader = new FileReader();

    reader.onload = () => {
      clearInterval(iv);
      setProgress(100);

      const dataUrl    = reader.result as string;
      // Use accurate byte count from the actual base64 content
      const actualSize = estimateBase64Bytes(dataUrl);

      onUpload({
        name:     file.name,
        url:      dataUrl,       // full base64 data-URL → stored in MongoDB Atlas
        fileType: file.type,
        size:     actualSize,    // actual decoded bytes
        category,
      });

      setTimeout(() => { setBusy(false); setProgress(0); }, 400);
      if (fileRef.current) fileRef.current.value = "";
    };

    reader.onerror = () => {
      clearInterval(iv);
      setError("Failed to read file. Please try again.");
      setBusy(false);
      setProgress(0);
    };

    reader.readAsDataURL(file);
  };

  const docs      = project.documents ?? [];
  const totalSize = docs.reduce((s, d) => s + (d.size || 0), 0);
  // 14 MB project storage cap (matches backend guard)
  const storageUsedPct = Math.min(Math.round((totalSize / (14 * 1024 * 1024)) * 100), 100);

  return (
    <div className="space-y-5">

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-[500] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreview(null)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 bg-gray-50/80">
              <div className="w-10 h-10 bg-white rounded-xl border border-gray-200 flex items-center justify-center text-xl shadow-sm">
                {getFileIcon(preview.fileType)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{preview.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {fmtBytes(preview.size)} · {preview.uploadedBy?.name} · {fmtDate(preview.uploadedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const a = Object.assign(document.createElement("a"), { href: preview.url, download: preview.name });
                    a.click();
                  }}
                  className="flex items-center gap-1.5 h-9 px-4 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors">
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
                <button onClick={() => setPreview(null)}
                  className="p-2 rounded-xl text-gray-400 hover:bg-gray-200 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-gray-50 p-4">
              {preview.fileType === "application/pdf" ? (
                <iframe src={preview.url} className="w-full h-full min-h-[500px] rounded-2xl border border-gray-200 bg-white" title={preview.name} />
              ) : preview.fileType.startsWith("image/") ? (
                <img src={preview.url} alt={preview.name} className="max-w-full max-h-[560px] mx-auto rounded-2xl object-contain shadow-md" />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <span className="text-6xl">{getFileIcon(preview.fileType)}</span>
                  <p className="text-sm text-gray-600 font-medium">Preview not available for this file type</p>
                  <button
                    onClick={() => {
                      const a = Object.assign(document.createElement("a"), { href: preview.url, download: preview.name });
                      a.click();
                    }}
                    className="flex items-center gap-2 h-10 px-5 text-sm font-bold bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors">
                    <Download className="h-4 w-4" /> Download to View
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload section */}
      {canUpload ? (
        <div className="space-y-3">
          {/* Storage meter + category selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Label className="text-xs font-semibold text-gray-600 flex-shrink-0">Category</Label>
              <Select value={category} onValueChange={v => setCategory(v as keyof typeof DOC_CATEGORY_CFG)}>
                <SelectTrigger className="h-8 text-xs flex-1 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOC_CATEGORY_CFG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {docs.length > 0 && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                  <Database className="h-2.5 w-2.5" />
                  {fmtBytes(totalSize)} / 14 MB
                </div>
                {/* Storage bar */}
                <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${storageUsedPct > 80 ? "bg-rose-400" : "bg-indigo-400"}`}
                    style={{ width: `${storageUsedPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <input ref={fileRef} type="file" className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.txt,.zip"
            onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
            onClick={() => !busy && fileRef.current?.click()}
            className={`relative flex flex-col items-center gap-3 py-9 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 overflow-hidden group
              ${drag ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30"}
              ${busy ? "pointer-events-none" : ""}`}>
            {busy && (
              <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gray-100">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-200 rounded-full"
                  style={{ width: `${progress}%` }} />
              </div>
            )}
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200
              ${drag ? "bg-indigo-100 scale-110" : busy ? "bg-sky-50" : "bg-gray-100 group-hover:bg-indigo-100 group-hover:scale-105"}`}>
              {busy
                ? <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                : <Upload className={`h-6 w-6 ${drag ? "text-indigo-500" : "text-gray-400 group-hover:text-indigo-500"} transition-colors`} />
              }
            </div>
            <div className="text-center px-4">
              <p className="text-sm font-bold text-gray-700">
                {busy ? `Reading file… ${progress}%` : drag ? "Release to upload" : "Click or drag & drop"}
              </p>
              <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, PowerPoint, Images, ZIP · Max 10 MB · Stored in MongoDB Atlas</p>
            </div>
            {!busy && (
              <div className="flex items-center gap-1.5 flex-wrap justify-center px-4">
                {["📄 PDF", "📝 DOC", "📊 XLS", "📑 PPT", "🖼️ IMG", "🗜️ ZIP"].map(t => (
                  <span key={t} className="text-[9px] px-2 py-0.5 bg-white border border-gray-200 rounded-full text-gray-500 font-medium">{t}</span>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2.5 px-3.5 py-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError("")}><X className="h-3.5 w-3.5" /></button>
            </div>
          )}

          {/* Atlas storage info banner */}
          <div className="flex items-center gap-2 px-3.5 py-2.5 bg-sky-50 border border-sky-100 rounded-xl text-[10px] text-sky-700">
            <Database className="h-3 w-3 flex-shrink-0" />
            <span>Files are stored as base64 in <strong>MongoDB Atlas</strong> → projects → documents[].url</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-indigo-50 rounded-xl border border-indigo-100">
          <Shield className="h-4 w-4 text-indigo-400" />
          <p className="text-xs text-indigo-700">View only — uploads restricted to Admin, Manager & HR</p>
        </div>
      )}

      {/* Document list */}
      {docs.length === 0 ? (
        <div className="text-center py-14 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-3 border border-gray-100">
            <FileText className="h-8 w-8 text-gray-300" />
          </div>
          <p className="text-sm font-bold text-gray-500">No documents uploaded yet</p>
          <p className="text-xs text-gray-400 mt-1">Upload contracts, specs, designs, reports, or invoices</p>
        </div>
      ) : (
        <div className="space-y-5">
          {(Object.keys(DOC_CATEGORY_CFG) as (keyof typeof DOC_CATEGORY_CFG)[]).map(cat => {
            const catDocs = docs.filter(d => d.category === cat);
            if (!catDocs.length) return null;
            const cfg = DOC_CATEGORY_CFG[cat];
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-base">{cfg.icon}</span>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${cfg.color} border ${cfg.border}`}>
                    {cfg.label}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">{catDocs.length} file{catDocs.length !== 1 ? "s" : ""}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <div className="space-y-2">
                  {catDocs.map(doc => (
                    <div key={doc._id}
                      className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-xl group hover:border-indigo-200 hover:shadow-sm transition-all duration-150">
                      <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                        {getFileIcon(doc.fileType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{doc.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[9px] text-gray-400 font-medium bg-gray-100 px-1.5 py-0.5 rounded">{fmtBytes(doc.size || 0)}</span>
                          <span className="text-[9px] text-gray-500">{doc.uploadedBy?.name ?? "Unknown"}</span>
                          <span className="text-[9px] text-gray-400">{fmtDate(doc.uploadedAt)}</span>
                          {/* Atlas indicator */}
                          <span className="text-[9px] text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-sky-100">
                            <Database className="h-2 w-2" /> Atlas
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setPreview(doc)}
                          className="flex items-center gap-1 h-7 px-2.5 text-[10px] font-bold rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                          <Eye className="h-3 w-3" /> View
                        </button>
                        <button
                          onClick={() => {
                            const a = Object.assign(document.createElement("a"), { href: doc.url, download: doc.name });
                            a.click();
                          }}
                          className="h-7 w-7 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors"
                          title="Download">
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        {canUpload && (
                          <button onClick={() => onDelete(doc._id)}
                            className="h-7 w-7 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                            title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   DAILY STATUS PANEL
══════════════════════════════════════════════════════════ */
function DailyStatusPanel({
  project, currentUserId, isAdmin, isManager, canSubmit, canViewAll,
  onSubmit, onDelete, onComment,
}: {
  project: Project; currentUserId: string;
  isAdmin: boolean; isManager: boolean;
  canSubmit: boolean; canViewAll: boolean;
  onSubmit: (d: { summary: string; hoursWorked: number; blockers: string; nextPlan: string; mood: MoodType }) => Promise<void>;
  onDelete: (id: string) => void;
  onComment: (statusId: string, comment: string) => Promise<void>;
}) {
  const [formOpen,      setFormOpen]      = useState(false);
  const [summary,       setSummary]       = useState("");
  const [hours,         setHours]         = useState("");
  const [blockers,      setBlockers]      = useState("");
  const [nextPlan,      setNextPlan]      = useState("");
  const [mood,          setMood]          = useState<MoodType>("good");
  const [submitting,    setSubmitting]    = useState(false);
  const [commentingId,  setCommentingId]  = useState<string | null>(null);
  const [commentText,   setCommentText]   = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const [expandedId,    setExpandedId]    = useState<string | null>(null);

  const allEntries = project.dailyStatuses ?? [];
  const visible = canViewAll
    ? allEntries
    : allEntries.filter(d => d.submittedBy?._id === currentUserId);

  const totalHours = visible.reduce((s, d) => s + (d.hoursWorked || 0), 0);
  const todayStr = new Date().toISOString().split("T")[0];
  const submittedToday = canSubmit && visible.some(d =>
    new Date(d.date).toISOString().split("T")[0] === todayStr &&
    d.submittedBy?._id === currentUserId
  );

  const handleSubmit = async () => {
    if (!summary.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({ summary, hoursWorked: Number(hours) || 0, blockers, nextPlan, mood });
      setSummary(""); setHours(""); setBlockers(""); setNextPlan(""); setMood("good");
      setFormOpen(false);
    } finally { setSubmitting(false); }
  };

  const handleComment = async (id: string) => {
    if (!commentText.trim()) return;
    setCommentSaving(true);
    try { await onComment(id, commentText); setCommentingId(null); setCommentText(""); }
    finally { setCommentSaving(false); }
  };

  return (
    <div className="space-y-4">
      {visible.length > 0 && (
        <div className="flex items-center gap-5 px-1 pb-4 border-b border-gray-100 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Activity className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <span className="font-bold text-gray-900">{visible.length}</span>
            <span>entr{visible.length !== 1 ? "ies" : "y"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className="w-6 h-6 rounded-lg bg-violet-50 flex items-center justify-center">
              <Clock className="h-3.5 w-3.5 text-violet-500" />
            </div>
            <span className="font-bold text-gray-900">{totalHours}h</span>
            <span>logged</span>
          </div>
          {canViewAll && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Users className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <span className="font-bold text-gray-900">
                {new Set(visible.map(d => d.submittedBy?._id)).size}
              </span>
              <span>contributors</span>
            </div>
          )}
          {!canViewAll && (
            <span className="ml-auto text-[10px] text-gray-400 flex items-center gap-1 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200">
              <Shield className="h-2.5 w-2.5" /> Your entries only
            </span>
          )}
        </div>
      )}

      {canSubmit && !formOpen && (
        submittedToday ? (
          <div className="flex items-center gap-3 px-4 py-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
            <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-800">Today's status submitted ✓</p>
              <p className="text-[10px] text-emerald-600 mt-0.5">Great work! Come back tomorrow to submit again.</p>
            </div>
          </div>
        ) : (
          <button onClick={() => setFormOpen(true)}
            className="flex items-center justify-center gap-2.5 w-full h-12 text-sm font-bold border-2 border-dashed border-indigo-200 rounded-2xl text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 transition-all group">
            <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
              <Activity className="h-4 w-4" />
            </div>
            Submit Today's Status Update
          </button>
        )
      )}

      {formOpen && canSubmit && (
        <div className="border border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-violet-50/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-indigo-900">Daily Status Update</p>
              <p className="text-[10px] text-indigo-500 mt-0.5">
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <button onClick={() => setFormOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-white/70 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2.5">How are you feeling today?</p>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(MOOD_CFG) as [MoodType, any][]).map(([k, v]) => (
                <button key={k} onClick={() => setMood(k)}
                  className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold transition-all border
                    ${mood === k
                      ? `${v.bg} ${v.color} shadow-sm ring-2 ring-offset-1 ring-current`
                      : `bg-white border-gray-200 text-gray-500 hover:border-gray-300`
                    }`}>
                  <span className={mood === k ? v.color : "text-gray-400"}>{v.icon}</span>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
              What did you accomplish today? *
            </Label>
            <Textarea
              className="text-xs resize-none bg-white border-indigo-200 focus:border-indigo-400 rounded-xl min-h-[90px]"
              placeholder="e.g. Completed API integration for the login module, reviewed PR #42…"
              value={summary}
              onChange={e => setSummary(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">🚧 Blockers</Label>
              <Textarea className="text-xs resize-none bg-white border-gray-200 rounded-xl" rows={3}
                placeholder="Any blockers? (leave blank if none)"
                value={blockers} onChange={e => setBlockers(e.target.value)} />
            </div>
            <div>
              <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">📅 Tomorrow's Plan</Label>
              <Textarea className="text-xs resize-none bg-white border-gray-200 rounded-xl" rows={3}
                placeholder="What will you work on tomorrow?"
                value={nextPlan} onChange={e => setNextPlan(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-lg border border-gray-200 flex items-center justify-center">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
              </div>
              <Input type="number" min={0} max={24} step={0.5}
                className="h-8 text-xs w-20 bg-white"
                placeholder="0" value={hours} onChange={e => setHours(e.target.value)} />
              <span className="text-xs text-gray-500 font-medium">hours worked</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleSubmit} disabled={submitting || !summary.trim()}
                className="h-9 px-6 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm">
                {submitting ? "Submitting…" : "Submit Status"}
              </button>
              <button onClick={() => { setFormOpen(false); setSummary(""); setBlockers(""); setNextPlan(""); setHours(""); }}
                className="h-9 px-4 text-xs border border-gray-200 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="text-center py-14 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-3 border border-gray-100">
            <Activity className="h-8 w-8 text-gray-300" />
          </div>
          <p className="text-sm font-bold text-gray-500">No status updates yet</p>
          <p className="text-xs text-gray-400 mt-1">
            {canViewAll
              ? "Team members haven't submitted any updates for this project yet."
              : "Submit your first daily update to keep the team informed!"}
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[560px] overflow-y-auto pr-0.5">
          {[...visible].reverse().map(ds => {
            const isExpanded = expandedId === ds._id;
            const moodCfg = MOOD_CFG[ds.mood] ?? MOOD_CFG.good;
            return (
              <div key={ds._id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-sm transition-all">
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/80">
                  <Avatar name={ds.submittedBy?.name ?? "?"} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-900">{ds.submittedBy?.name ?? "Unknown"}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold capitalize ${ROLE_BADGE[ds.submittedBy?.role] ?? "bg-gray-100 text-gray-600"}`}>
                        {ds.submittedBy?.role}
                      </span>
                      <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold border ${moodCfg.bg} ${moodCfg.color}`}>
                        {moodCfg.icon} {moodCfg.label}
                      </span>
                      {ds.hoursWorked > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-violet-700 font-bold bg-violet-50 px-1.5 py-0.5 rounded-full border border-violet-100">
                          <Clock className="h-2.5 w-2.5" /> {ds.hoursWorked}h
                        </span>
                      )}
                      {ds.managerComment && (
                        <span className="flex items-center gap-0.5 text-[9px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded-full">
                          <MessageSquare className="h-2.5 w-2.5" /> Note
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(ds.date)} · {fmtTime(ds.date)}</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => setExpandedId(isExpanded ? null : ds._id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                    {(isAdmin || isManager) && (
                      <button
                        onClick={() => { setCommentingId(ds._id); setCommentText(ds.managerComment || ""); setExpandedId(ds._id); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        title="Add note">
                        <MessageSquare className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {(isAdmin || isManager || ds.submittedBy?._id === currentUserId) && (
                      <button onClick={() => onDelete(ds._id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="px-4 py-3">
                  <p className={`text-xs text-gray-700 leading-relaxed ${!isExpanded ? "line-clamp-2" : ""}`}>
                    {ds.summary}
                  </p>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
                    {ds.blockers && (
                      <div className="bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-3">
                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-1.5">🚧 Blockers</p>
                        <p className="text-xs text-rose-800 leading-relaxed">{ds.blockers}</p>
                      </div>
                    )}
                    {ds.nextPlan && (
                      <div className="bg-sky-50 border border-sky-100 rounded-xl px-3.5 py-3">
                        <p className="text-[10px] font-bold text-sky-600 uppercase tracking-wider mb-1.5">📅 Tomorrow's Plan</p>
                        <p className="text-xs text-sky-800 leading-relaxed">{ds.nextPlan}</p>
                      </div>
                    )}
                    {ds.managerComment && commentingId !== ds._id && (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-3">
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1.5">💬 Manager's Note</p>
                        <p className="text-xs text-amber-800 leading-relaxed">{ds.managerComment}</p>
                        {ds.commentedBy && (
                          <p className="text-[10px] text-amber-500 mt-2 font-medium">
                            — {ds.commentedBy.name} · {fmtDate(ds.commentedAt || "")}
                          </p>
                        )}
                      </div>
                    )}
                    {commentingId === ds._id && (isAdmin || isManager) && (
                      <div className="space-y-2.5">
                        <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Manager's Note</Label>
                        <Textarea
                          className="text-xs resize-none bg-amber-50 border-amber-200 focus:border-amber-400 rounded-xl"
                          rows={3}
                          placeholder="Add feedback or guidance for this team member…"
                          value={commentText}
                          onChange={e => setCommentText(e.target.value)}
                          autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => handleComment(ds._id)} disabled={commentSaving || !commentText.trim()}
                            className="h-8 px-5 text-[11px] font-bold bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-colors">
                            {commentSaving ? "Saving…" : "Save Note"}
                          </button>
                          <button onClick={() => { setCommentingId(null); setCommentText(""); }}
                            className="h-8 px-3 text-[11px] border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
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

/* ══════════════════════════════════════════════════════════
   SUBMISSION FORM
══════════════════════════════════════════════════════════ */
function SubmissionForm({ onSubmit }: { onSubmit: (d: any) => Promise<void> }) {
  const [open,   setOpen]   = useState(false);
  const [desc,   setDesc]   = useState("");
  const [hours,  setHours]  = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center justify-center gap-2.5 w-full h-11 text-sm font-bold border-2 border-dashed border-emerald-200 rounded-2xl text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400 transition-all group">
      <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
        <Send className="h-3.5 w-3.5" />
      </div>
      Submit Work Update
    </button>
  );

  return (
    <div className="border border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-teal-50/30 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-emerald-900">Work Submission</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Log your work contribution to this project</p>
        </div>
        <button onClick={() => { setOpen(false); setDesc(""); setHours(""); }}>
          <X className="h-4 w-4 text-gray-400" />
        </button>
      </div>
      <Textarea
        className="text-xs resize-none bg-white border-emerald-200 rounded-xl" rows={3}
        placeholder="Describe your work contribution in detail…"
        value={desc} onChange={e => setDesc(e.target.value)} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-gray-400" />
          <Input type="number" min={0} step={0.5} className="h-8 text-xs w-20 bg-white"
            placeholder="0" value={hours} onChange={e => setHours(e.target.value)} />
          <span className="text-xs text-gray-500">hours</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              if (!desc.trim()) return;
              setSaving(true);
              try { await onSubmit({ description: desc, hoursWorked: Number(hours) || 0 }); setDesc(""); setHours(""); setOpen(false); }
              finally { setSaving(false); }
            }}
            disabled={saving || !desc.trim()}
            className="h-8 px-5 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            {saving ? "Saving…" : "Submit"}
          </button>
          <button onClick={() => { setOpen(false); setDesc(""); setHours(""); }}
            className="h-8 px-3 text-xs border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PROJECT CARD
══════════════════════════════════════════════════════════ */
function ProjectCard({
  project, role, currentUserId, isAdmin, isManager, isHR,
  onEdit, onDelete, onProgressUpdate, onSpentUpdate,
  onUploadDoc, onDeleteDoc,
  onSubmitDailyStatus, onDeleteDailyStatus, onCommentDailyStatus,
  onSubmitWork, onDeleteSubmission,
}: {
  project: Project; role: string; currentUserId: string;
  isAdmin: boolean; isManager: boolean; isHR: boolean;
  onEdit: () => void; onDelete: () => void;
  onProgressUpdate: (v: number) => void; onSpentUpdate: (v: number) => void;
  onUploadDoc: (d: any) => void; onDeleteDoc: (docId: string) => void;
  onSubmitDailyStatus: (d: any) => Promise<void>;
  onDeleteDailyStatus: (id: string) => void;
  onCommentDailyStatus: (statusId: string, comment: string) => Promise<void>;
  onSubmitWork: (d: any) => Promise<void>;
  onDeleteSubmission: (id: string) => void;
}) {
  const [expanded,  setExpanded]  = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [progVal,   setProgVal]   = useState(String(project.progress));
  const [spentVal,  setSpentVal]  = useState(String(project.spent));

  const isEmployee = !isAdmin && !isManager && !isHR;
  const canViewDoc = isAdmin || isManager || isHR;
  const canUpload  = isAdmin || isManager || isHR;
  const canViewAll = isAdmin || isManager;
  const canSubmit  = !isAdmin && (isManager || isHR || isEmployee);

  const sc = STATUS_CFG[project.status] ?? STATUS_CFG["planning"];
  const pc = PRIORITY_CFG[project.priority] ?? PRIORITY_CFG["medium"];
  const budgetPct = project.budget > 0 ? Math.min(Math.round((project.spent / project.budget) * 100), 100) : 0;

  const docCount  = project.documents?.length ?? 0;
  const dsCount   = canViewAll
    ? (project.dailyStatuses?.length ?? 0)
    : (project.dailyStatuses ?? []).filter(d => d.submittedBy?._id === currentUserId).length;
  const subCount  = canViewAll
    ? (project.workSubmissions?.length ?? 0)
    : (project.workSubmissions ?? []).filter(s => s.submittedBy?._id === currentUserId).length;
  const teamCount = project.teamMembers?.length ?? 0;
  const doneMilestones  = (project.milestones ?? []).filter(m => m.completed).length;
  const totalMilestones = project.milestones?.length ?? 0;

  const tabs: { key: ActiveTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "overview",    label: "Overview",     icon: <BarChart3 className="h-3 w-3" /> },
    { key: "team",        label: "Team",         icon: <Users     className="h-3 w-3" />, count: teamCount },
    ...(canViewDoc ? [{ key: "docs" as ActiveTab, label: "Documents", icon: <FileText className="h-3 w-3" />, count: docCount }] : []),
    { key: "dailystatus", label: "Daily Status", icon: <Activity  className="h-3 w-3" />, count: dsCount },
    { key: "submissions", label: "Submissions",  icon: <Send      className="h-3 w-3" />, count: subCount },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${sc.accent}cc, ${sc.accent}44)` }} />

      <div className="px-6 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
              <h3 className="text-base font-bold text-gray-900 leading-tight">{project.name}</h3>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${pc.cls} border border-current/20`}>
                {pc.icon} {pc.label}
              </span>
              {project.tags?.slice(0, 3).map(tag => (
                <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                  #{tag}
                </span>
              ))}
            </div>
            {project.description && (
              <p className="text-xs text-gray-400 line-clamp-1 leading-relaxed">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs px-3 py-1.5 rounded-full font-semibold border flex items-center gap-1.5 ${sc.bg} ${sc.text} ${sc.border}`}>
              <span className={`w-2 h-2 rounded-full ${sc.dot} inline-block`} />
              {sc.label}
            </span>
            {isAdmin && (
              <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-0.5">
                <button onClick={onEdit}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={onDelete}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3">
          {project.clientName && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <Building2 className="h-3.5 w-3.5 text-gray-400" />
              {project.clientName}
            </span>
          )}
          {project.deadline && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              {project.deadline}
            </span>
          )}
          {project.managerId?.name && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <UserCheck className="h-3.5 w-3.5 text-gray-400" />
              {project.managerId.name}
            </span>
          )}
          {totalMilestones > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <Target className="h-3.5 w-3.5 text-gray-400" />
              {doneMilestones}/{totalMilestones} milestones
            </span>
          )}
          <span className="ml-auto text-[10px] text-gray-300">{fmtDate(project.createdAt)}</span>
        </div>
      </div>

      <div className="px-6 pb-4 grid grid-cols-2 gap-6">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Progress</span>
            <span className="text-xs font-bold text-gray-800">{project.progress}%</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full bg-gradient-to-r ${PROGRESS_COLOR(project.progress)} transition-all duration-700`}
              style={{ width: `${project.progress}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Budget Used</span>
            <span className={`text-xs font-bold ${budgetPct > 85 ? "text-rose-600" : "text-gray-800"}`}>{budgetPct}%</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full bg-gradient-to-r ${budgetPct > 85 ? "from-rose-400 to-rose-500" : "from-orange-400 to-orange-500"} transition-all duration-700`}
              style={{ width: `${budgetPct}%` }} />
          </div>
          <p className="text-[10px] text-gray-400 mt-1 text-right">
            ₹{project.spent.toLocaleString()} of ₹{project.budget.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="px-6 pb-5 flex items-center gap-2 flex-wrap border-t border-gray-50 pt-4">
        {[
          { label: `${teamCount} member${teamCount !== 1 ? "s" : ""}`,   icon: <Users     className="h-2.5 w-2.5" />, tab: "team"        as ActiveTab, cls: "bg-gray-100 text-gray-600 hover:bg-gray-200"       },
          ...(canViewDoc ? [
            { label: `${docCount} doc${docCount !== 1 ? "s" : ""}`,     icon: <Paperclip className="h-2.5 w-2.5" />, tab: "docs"        as ActiveTab, cls: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"   },
          ] : []),
          { label: `${dsCount} status`,                                   icon: <Activity  className="h-2.5 w-2.5" />, tab: "dailystatus" as ActiveTab, cls: "bg-violet-50 text-violet-600 hover:bg-violet-100"   },
          { label: `${subCount} submission${subCount !== 1 ? "s" : ""}`, icon: <Send      className="h-2.5 w-2.5" />, tab: "submissions" as ActiveTab, cls: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" },
        ].map(b => (
          <button key={b.tab}
            onClick={() => { setExpanded(true); setActiveTab(b.tab); }}
            className={`flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-full font-semibold transition-colors ${b.cls}`}>
            {b.icon}{b.label}
          </button>
        ))}
        <button onClick={() => setExpanded(o => !o)}
          className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 font-medium transition-colors">
          {expanded ? <><ChevronUp className="h-3.5 w-3.5" />Less</> : <><ChevronDown className="h-3.5 w-3.5" />Details</>}
        </button>
      </div>

      {isManager && (
        <div className="mx-6 mb-5 p-4 bg-gray-50 rounded-2xl border border-gray-100 grid grid-cols-2 gap-4">
          <div>
            <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Update Progress %</Label>
            <Input type="number" min={0} max={100} className="h-8 text-xs bg-white" value={progVal}
              onChange={e => setProgVal(e.target.value)}
              onBlur={() => { const v = Number(progVal); if (!isNaN(v) && v >= 0 && v <= 100) onProgressUpdate(v); else setProgVal(String(project.progress)); }} />
          </div>
          <div>
            <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Update Spent (₹)</Label>
            <Input type="number" min={0} className="h-8 text-xs bg-white" value={spentVal}
              onChange={e => setSpentVal(e.target.value)}
              onBlur={() => { const v = Number(spentVal); if (!isNaN(v) && v >= 0) onSpentUpdate(v); else setSpentVal(String(project.spent)); }} />
          </div>
        </div>
      )}

      {expanded && (
        <div className="border-t border-gray-100">
          <div className="flex overflow-x-auto bg-gray-50/80 border-b border-gray-100">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-5 py-3.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 flex-shrink-0
                  ${activeTab === t.key
                    ? "border-indigo-500 text-indigo-600 bg-white shadow-sm"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/70"
                  }`}>
                {t.icon}
                {t.label}
                {t.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-0.5
                    ${activeTab === t.key ? "bg-indigo-100 text-indigo-600" : "bg-gray-200 text-gray-500"}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === "overview" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Budget",   value: `₹${project.budget.toLocaleString()}`,  sub: "Allocated",     icon: <Wallet     className="h-4 w-4 text-sky-500" />,     bg: "bg-sky-50"     },
                    { label: "Spent",    value: `₹${project.spent.toLocaleString()}`,   sub: `${budgetPct}% used`, icon: <TrendingUp className="h-4 w-4 text-orange-500" />, bg: "bg-orange-50"  },
                    { label: "Progress", value: `${project.progress}%`,                sub: "Complete",      icon: <BarChart3  className="h-4 w-4 text-emerald-500" />, bg: "bg-emerald-50" },
                    { label: "Team",     value: String(teamCount),                     sub: "Members",       icon: <Users      className="h-4 w-4 text-violet-500" />,  bg: "bg-violet-50"  },
                  ].map((s, i) => (
                    <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-sm transition-shadow">
                      <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>{s.icon}</div>
                      <p className="text-xl font-bold text-gray-900">{s.value}</p>
                      <p className="text-[10px] text-gray-500 font-medium mt-0.5">{s.label}</p>
                      <p className="text-[9px] text-gray-300 mt-0.5">{s.sub}</p>
                    </div>
                  ))}
                </div>

                {totalMilestones > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <div className="w-6 h-6 bg-amber-50 rounded-lg flex items-center justify-center">
                        <Target className="h-3.5 w-3.5 text-amber-500" />
                      </div>
                      Milestones
                      <span className="text-[10px] text-gray-400 font-normal">{doneMilestones}/{totalMilestones}</span>
                    </h4>
                    <div className="space-y-2">
                      {project.milestones.map(m => (
                        <div key={m._id} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-colors
                          ${m.completed ? "bg-emerald-50 border-emerald-100" : "bg-white border-gray-100"}`}>
                          {m.completed
                            ? <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                            : <Circle      className="h-4 w-4 text-gray-300 flex-shrink-0" />
                          }
                          <span className={`text-xs flex-1 ${m.completed ? "line-through text-gray-400" : "text-gray-700 font-medium"}`}>
                            {m.title}
                          </span>
                          {m.dueDate && (
                            <span className="text-[10px] text-gray-400 flex-shrink-0">{m.dueDate}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(project.dailyStatuses?.length ?? 0) > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <div className="w-6 h-6 bg-indigo-50 rounded-lg flex items-center justify-center">
                        <Activity className="h-3.5 w-3.5 text-indigo-500" />
                      </div>
                      Recent Activity
                    </h4>
                    <div className="space-y-2">
                      {[...project.dailyStatuses].reverse().slice(0, 3).map(ds => (
                        <div key={ds._id}
                          className="flex items-start gap-3 px-3.5 py-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <Avatar name={ds.submittedBy?.name ?? "?"} size="xs" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-gray-800">{ds.submittedBy?.name}</p>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold border ${MOOD_CFG[ds.mood]?.bg} ${MOOD_CFG[ds.mood]?.color}`}>
                                {MOOD_CFG[ds.mood]?.icon}
                              </span>
                              {ds.hoursWorked > 0 && (
                                <span className="text-[9px] text-violet-600 font-semibold">{ds.hoursWorked}h</span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-500 truncate mt-0.5">{ds.summary}</p>
                          </div>
                          <span className="text-[9px] text-gray-400 flex-shrink-0">{fmtDate(ds.date)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "team" && (
              <div>
                {(!project.teamMembers || project.teamMembers.length === 0) ? (
                  <div className="text-center py-14">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-gray-100">
                      <Users className="h-8 w-8 text-gray-300" />
                    </div>
                    <p className="text-sm font-bold text-gray-500">No team members assigned</p>
                    <p className="text-xs text-gray-400 mt-1">Edit the project to add team members</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {project.teamMembers.map((m: any) => (
                      <div key={m._id ?? m}
                        className="flex items-center gap-3 px-4 py-3.5 bg-white border border-gray-100 rounded-2xl hover:border-indigo-200 hover:shadow-sm transition-all">
                        <Avatar name={m.name ?? "?"} size="md" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-900 truncate">{m.name ?? "—"}</p>
                          <p className="text-[10px] text-gray-400 truncate">{m.email ?? "—"}</p>
                          {m.designation && (
                            <p className="text-[10px] text-gray-400 truncate mt-0.5">{m.designation}</p>
                          )}
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold capitalize flex-shrink-0 ${ROLE_BADGE[m.role] ?? "bg-gray-100 text-gray-600"}`}>
                          {m.role ?? "—"}
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

            {activeTab === "dailystatus" && (
              <DailyStatusPanel
                project={project}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                isManager={isManager}
                canSubmit={canSubmit}
                canViewAll={canViewAll}
                onSubmit={onSubmitDailyStatus}
                onDelete={onDeleteDailyStatus}
                onComment={onCommentDailyStatus}
              />
            )}

            {activeTab === "submissions" && (
              <div className="space-y-4">
                {canSubmit && <SubmissionForm onSubmit={onSubmitWork} />}
                {(() => {
                  const subs = canViewAll
                    ? (project.workSubmissions ?? [])
                    : (project.workSubmissions ?? []).filter(s => s.submittedBy?._id === currentUserId);
                  if (subs.length === 0) return (
                    <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
                      <Send className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-gray-400">No submissions yet</p>
                    </div>
                  );
                  return (
                    <div className="space-y-2.5 max-h-72 overflow-y-auto">
                      {[...subs].reverse().map(sub => (
                        <div key={sub._id}
                          className="p-4 bg-white border border-gray-100 rounded-2xl group hover:border-gray-200 hover:shadow-sm transition-all">
                          <div className="flex items-start gap-3">
                            <Avatar name={sub.submittedBy?.name ?? "?"} size="sm" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-gray-900">{sub.submittedBy?.name ?? "Unknown"}</span>
                                  {sub.hoursWorked > 0 && (
                                    <span className="flex items-center gap-0.5 text-[10px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded-full border border-indigo-100">
                                      <Clock className="h-2.5 w-2.5" />{sub.hoursWorked}h
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-gray-400">{fmtDate(sub.date)}</span>
                                  {canViewAll && (
                                    <button onClick={() => onDeleteSubmission(sub._id)}
                                      className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all">
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-gray-600 leading-relaxed">{sub.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export function ProjectManagement() {
  const { currentUser } = useAuth();
  const role      = (currentUser as any)?.role?.toLowerCase?.() ?? "";
  const isAdmin   = role === "admin";
  const isManager = role === "manager";
  const isHR      = role === "hr";
  const userId    = (currentUser as any)?._id ?? "";

  const [projects,   setProjects]   = useState<Project[]>([]);
  const [managers,   setManagers]   = useState<UserOption[]>([]);
  const [allUsers,   setAllUsers]   = useState<UserOption[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [open,       setOpen]       = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [isEdit,     setIsEdit]     = useState(false);
  const [editId,     setEditId]     = useState<string | null>(null);
  const [toastMsg,   setToastMsg]   = useState("");
  const [toastType,  setToastType]  = useState<"ok" | "err">("ok");
  const [submitting, setSubmitting] = useState(false);
  const [selMembers, setSelMembers] = useState<string[]>([]);
  const [manMembers, setManMembers] = useState<string[]>([]);
  const [form,       setForm]       = useState<FormState>(EMPTY_FORM);
  const [manForm,    setManForm]    = useState<FormState>(EMPTY_MANUAL);
  const [search,         setSearch]         = useState("");
  const [filterStatus,   setFilterStatus]   = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  const showToast = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    setToastMsg(msg); setToastType(type);
    setTimeout(() => setToastMsg(""), 3500);
  }, []);

  const loadProjects = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true); else setRefreshing(true);
      const data = (isAdmin || isManager || isHR)
        ? await projectApi.getAll()
        : await projectApi.getMy();
      setProjects(data.projects ?? []);
    } catch (err: any) {
      showToast("❌ " + (err?.message ?? "Error loading projects"), "err");
    } finally { setLoading(false); setRefreshing(false); }
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
    } catch (err: any) { console.error("loadUsers:", err?.message); }
  }, [isAdmin, isManager, isHR]);

  useEffect(() => {
    if (!currentUser) return;
    Promise.all([loadProjects(), loadUsers()]);
  }, [currentUser]);

  const toggle = (id: string, manual = false) => {
    if (manual) setManMembers(p => p.includes(id) ? p.filter(m => m !== id) : [...p, id]);
    else        setSelMembers(p => p.includes(id) ? p.filter(m => m !== id) : [...p, id]);
  };

  const resetForm = () => {
    setIsEdit(false); setEditId(null);
    setSelMembers([]); setForm(EMPTY_FORM); setOpen(false);
  };

  const handleSubmit = async () => {
    if (!form.name)       return showToast("❌ Project name required", "err");
    if (!form.clientName) return showToast("❌ Client name required", "err");
    if (!form.budget)     return showToast("❌ Budget required", "err");
    if (!form.managerId)  return showToast("❌ Manager required", "err");
    setSubmitting(true);
    try {
      const payload: any = {
        name: form.name, description: form.description, clientName: form.clientName,
        deadline: form.deadline, status: form.status, priority: form.priority,
        budget: Number(form.budget), managerId: form.managerId, teamMembers: selMembers,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
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
    } catch (err: any) { showToast("❌ " + (err?.message ?? "Error"), "err"); }
    finally { setSubmitting(false); }
  };

  const handleManualSubmit = async () => {
    if (!manForm.name)       return showToast("❌ Project name required", "err");
    if (!manForm.clientName) return showToast("❌ Client name required", "err");
    setSubmitting(true);
    try {
      const payload: any = {
        name: manForm.name, description: manForm.description, clientName: manForm.clientName,
        deadline: manForm.deadline, status: manForm.status, priority: manForm.priority,
        budget: Number(manForm.budget) || 0, spent: Number(manForm.spent) || 0,
        progress: Number(manForm.progress) || 0, teamMembers: manMembers,
        tags: manForm.tags ? manForm.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      };
      if (manForm.managerId) payload.managerId = manForm.managerId;
      if (manForm.createdAt) payload.createdAt = manForm.createdAt;
      await projectApi.createManual(payload);
      showToast("✅ Historical record saved");
      await loadProjects(true);
      setManForm(EMPTY_MANUAL); setManMembers([]); setManualOpen(false);
    } catch (err: any) { showToast("❌ " + (err?.message ?? "Error"), "err"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Permanently delete this project and all its data?")) return;
    try { await projectApi.delete(id); showToast("✅ Project deleted"); await loadProjects(true); }
    catch (err: any) { showToast("❌ " + (err?.message ?? "Error"), "err"); }
  };

  const handleEdit = (p: Project) => {
    setIsEdit(true); setEditId(p._id);
    setForm({
      name: p.name, description: p.description, clientName: p.clientName,
      deadline: p.deadline, status: p.status, priority: p.priority || "medium",
      budget: String(p.budget), spent: String(p.spent), progress: String(p.progress),
      managerId: p.managerId?._id ?? p.managerId ?? "", createdAt: "", tags: (p.tags ?? []).join(", "),
    });
    setSelMembers(Array.isArray(p.teamMembers) ? p.teamMembers.map((m: any) => m._id ?? m) : []);
    setOpen(true);
  };

  const handleProgressUpdate = async (id: string, v: number) => {
    try { await projectApi.update(id, { progress: v }); showToast("✅ Progress updated"); await loadProjects(true); }
    catch (err: any) { showToast("❌ " + (err?.message ?? "Error"), "err"); }
  };
  const handleSpentUpdate = async (id: string, v: number) => {
    try { await projectApi.update(id, { spent: v }); showToast("✅ Spent updated"); await loadProjects(true); }
    catch (err: any) { showToast("❌ " + (err?.message ?? "Error"), "err"); }
  };
  const handleUploadDoc = async (projectId: string, doc: any) => {
    try { await projectApi.uploadDocument(projectId, doc); showToast("✅ Document uploaded to MongoDB Atlas"); await loadProjects(true); }
    catch (err: any) { showToast("❌ " + (err?.message ?? "Upload failed"), "err"); }
  };
  const handleDeleteDoc = async (projectId: string, docId: string) => {
    if (!window.confirm("Permanently delete this document?")) return;
    try { await projectApi.deleteDocument(projectId, docId); showToast("✅ Document deleted"); await loadProjects(true); }
    catch (err: any) { showToast("❌ " + (err?.message ?? "Error"), "err"); }
  };
  const handleSubmitDailyStatus = async (projectId: string, data: any): Promise<void> => {
    await projectApi.submitDailyStatus(projectId, data);
    showToast("✅ Daily status submitted");
    await loadProjects(true);
  };
  const handleDeleteDailyStatus = async (projectId: string, id: string) => {
    if (!window.confirm("Delete this status entry?")) return;
    try { await projectApi.deleteDailyStatus(projectId, id); showToast("✅ Entry deleted"); await loadProjects(true); }
    catch (err: any) { showToast("❌ " + (err?.message ?? "Error"), "err"); }
  };
  const handleCommentDailyStatus = async (projectId: string, statusId: string, comment: string): Promise<void> => {
    await projectApi.commentDailyStatus(projectId, statusId, comment);
    showToast("✅ Note saved");
    await loadProjects(true);
  };
  const handleSubmitWork = async (projectId: string, data: any): Promise<void> => {
    await projectApi.submitWork(projectId, data);
    showToast("✅ Submission saved");
    await loadProjects(true);
  };
  const handleDeleteSubmission = async (projectId: string, subId: string) => {
    if (!window.confirm("Delete this submission?")) return;
    try { await projectApi.deleteSubmission(projectId, subId); showToast("✅ Deleted"); await loadProjects(true); }
    catch (err: any) { showToast("❌ " + (err?.message ?? "Error"), "err"); }
  };

  const filtered = projects.filter(p => {
    const q  = search.toLowerCase();
    const ms = !search ||
      p.name.toLowerCase().includes(q) ||
      p.clientName.toLowerCase().includes(q) ||
      p.managerId?.name?.toLowerCase?.()?.includes(q);
    const st = filterStatus   === "all" || p.status   === filterStatus;
    const pr = filterPriority === "all" || p.priority === filterPriority;
    return ms && st && pr;
  });

  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent  = projects.reduce((s, p) => s + p.spent, 0);
  const burnRate    = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : "0";
  const avgProgress = projects.length > 0
    ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0;
  const byStatus = Object.keys(STATUS_CFG).reduce((a, k) => {
    a[k] = projects.filter(p => p.status === k).length; return a;
  }, {} as Record<string, number>);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-72 gap-4">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-indigo-100 rounded-full" />
        <div className="absolute inset-0 w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-sm text-gray-400 font-medium">Loading projects…</p>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      <div className="space-y-6 max-w-5xl mx-auto px-3 sm:px-4 pb-16">
        <Toast msg={toastMsg} type={toastType} />

        {/* Manual Entry Dialog */}
        <Dialog open={manualOpen} onOpenChange={setManualOpen}>
          <DialogContent className="max-w-lg w-[95vw] max-h-[92vh] overflow-y-auto rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Historical Project Entry</DialogTitle>
              <DialogDescription className="text-xs text-gray-500">Backdate a completed project with full details.</DialogDescription>
            </DialogHeader>
            <div className="text-xs bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 text-amber-700 flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              Saved directly to MongoDB Atlas with your specified record date.
            </div>
            <ProjectFormFields
              form={manForm} setForm={setManForm}
              managers={managers} allUsers={allUsers}
              selectedMembers={manMembers}
              onToggleMember={id => toggle(id, true)}
              isManual
            />
            <button onClick={handleManualSubmit} disabled={submitting}
              className="w-full mt-4 h-11 text-sm font-bold bg-gray-900 text-white rounded-2xl hover:bg-gray-800 disabled:opacity-50 transition-colors">
              {submitting ? "Saving…" : "💾 Save Historical Record"}
            </button>
          </DialogContent>
        </Dialog>

        {/* Create / Edit Dialog */}
        <Dialog open={open} onOpenChange={v => { if (!v) resetForm(); else setOpen(true); }}>
          <DialogContent className="max-w-lg w-[95vw] max-h-[92vh] overflow-y-auto rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">{isEdit ? "Edit Project" : "New Project"}</DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                {isEdit ? "Update project details." : "Create a new project and assign your team."}
              </DialogDescription>
            </DialogHeader>
            <ProjectFormFields
              form={form} setForm={setForm}
              managers={managers} allUsers={allUsers}
              selectedMembers={selMembers}
              onToggleMember={id => toggle(id, false)}
            />
            <button onClick={handleSubmit} disabled={submitting}
              className="w-full mt-4 h-11 text-sm font-bold bg-gray-900 text-white rounded-2xl hover:bg-gray-800 disabled:opacity-50 transition-colors">
              {submitting ? "Saving…" : isEdit ? "Update Project" : "Create Project"}
            </button>
          </DialogContent>
        </Dialog>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-md shadow-orange-200">
                <FolderOpen className="h-4.5 w-4.5 text-white" />
              </div>
              Project Management
            </h1>
            <p className="text-xs text-gray-400 mt-1 ml-12">
              {projects.length} project{projects.length !== 1 ? "s" : ""}
              {filtered.length !== projects.length && ` · ${filtered.length} shown`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => loadProjects(true)} disabled={refreshing}
              className="h-9 w-9 flex items-center justify-center border border-gray-200 rounded-xl bg-white hover:bg-gray-50 text-gray-500 disabled:opacity-50 transition-colors">
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            {isAdmin && (
              <>
                <button onClick={() => setManualOpen(true)}
                  className="h-9 px-3.5 flex items-center gap-1.5 text-xs font-semibold border border-gray-200 rounded-xl bg-white hover:bg-gray-50 text-gray-700 transition-colors">
                  <ClipboardList className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Manual Entry</span>
                </button>
                <button onClick={() => { resetForm(); setOpen(true); }}
                  className="h-9 px-4 flex items-center gap-1.5 text-xs font-bold bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors shadow-sm">
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">New Project</span>
                </button>
                <button onClick={() => exportToCSV(projects)}
                  className="h-9 w-9 flex items-center justify-center border border-gray-200 rounded-xl bg-white hover:bg-gray-50 text-gray-500 transition-colors">
                  <Download className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: <BarChart3    className="h-5 w-5 text-indigo-500" />, bg: "bg-indigo-50",  label: "Avg Progress", value: `${avgProgress}%`,   sub: `${projects.length} total`                         },
            { icon: <Flame        className="h-5 w-5 text-orange-500" />, bg: "bg-orange-50",  label: "Budget Burn",  value: `${burnRate}%`,       sub: `₹${(totalSpent/100000).toFixed(1)}L spent`         },
            { icon: <CheckCircle2 className="h-5 w-5 text-emerald-500"/>, bg: "bg-emerald-50", label: "Completed",    value: String(byStatus.completed ?? 0), sub: `${byStatus["in-progress"] ?? 0} in progress` },
            {
              icon: <Wallet className="h-5 w-5 text-violet-500" />, bg: "bg-violet-50", label: "Total Budget",
              value: totalBudget >= 100000 ? `₹${(totalBudget/100000).toFixed(1)}L` : `₹${totalBudget.toLocaleString()}`,
              sub: `${byStatus["on-hold"] ?? 0} on hold`,
            },
          ].map((s, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-2.5 mb-3">
                <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center`}>{s.icon}</div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-[10px] text-gray-400 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Status filter chips */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            {Object.entries(STATUS_CFG).map(([k, v]) => (
              <button key={k} onClick={() => setFilterStatus(filterStatus === k ? "all" : k)}
                className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold border transition-all
                  ${filterStatus === k
                    ? `${v.bg} ${v.text} ${v.border} ring-2 ring-offset-1 ring-current shadow-sm`
                    : `${v.bg} ${v.text} ${v.border} opacity-60 hover:opacity-100`
                  }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />
                {v.label} ({byStatus[k] ?? 0})
              </button>
            ))}
            {filterStatus !== "all" && (
              <button onClick={() => setFilterStatus("all")}
                className="text-xs px-2.5 py-1.5 rounded-full text-gray-400 hover:bg-gray-100 border border-gray-200 flex items-center gap-0.5 transition-colors">
                <X className="h-2.5 w-2.5" />Clear
              </button>
            )}
          </div>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-8 text-xs w-40 rounded-full border-gray-200">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {Object.entries(PRIORITY_CFG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 border border-gray-200 rounded-2xl px-4 py-3 bg-white focus-within:border-indigo-300 focus-within:shadow-sm transition-all">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            className="flex-1 text-sm outline-none placeholder-gray-400 text-gray-800"
            placeholder="Search by project name, client, or manager…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
            </button>
          )}
        </div>

        {/* Project list */}
        {filtered.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl py-24 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
              <Layers className="h-10 w-10 text-gray-300" />
            </div>
            <p className="text-base font-bold text-gray-600">
              {search || filterStatus !== "all" || filterPriority !== "all"
                ? "No projects match your filters"
                : "No projects yet"
              }
            </p>
            {isAdmin && !search && filterStatus === "all" && filterPriority === "all" && (
              <p className="text-sm text-gray-400 mt-2">Click "New Project" above to get started.</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(project => (
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
                onProgressUpdate={v => handleProgressUpdate(project._id, v)}
                onSpentUpdate={v => handleSpentUpdate(project._id, v)}
                onUploadDoc={d => handleUploadDoc(project._id, d)}
                onDeleteDoc={docId => handleDeleteDoc(project._id, docId)}
                onSubmitDailyStatus={d => handleSubmitDailyStatus(project._id, d)}
                onDeleteDailyStatus={id => handleDeleteDailyStatus(project._id, id)}
                onCommentDailyStatus={(sid, c) => handleCommentDailyStatus(project._id, sid, c)}
                onSubmitWork={d => handleSubmitWork(project._id, d)}
                onDeleteSubmission={subId => handleDeleteSubmission(project._id, subId)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
