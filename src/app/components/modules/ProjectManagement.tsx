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
  Smile, Meh, Frown, Coffee, Target, Tag, Flag, Zap,
  ChevronRight, Circle, CheckCircle, MoreHorizontal,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { projectApi } from "@/services/api";

/* ══════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════ */
type ProjectStatus   = "planning"|"in-progress"|"completed"|"on-hold";
type ProjectPriority = "low"|"medium"|"high"|"critical";
type ActiveTab       = "overview"|"team"|"docs"|"dailystatus"|"submissions";
type MoodType        = "great"|"good"|"neutral"|"struggling";

interface UserOption { _id:string; name:string; email:string; role:string; department?:string }
interface Milestone  { _id:string; title:string; dueDate:string; completed:boolean; completedAt:string|null }

interface ProjectDocument {
  _id:string; name:string; url:string; fileType:string; size:number; category:string;
  uploadedBy:{ _id:string; name:string; role:string }; uploadedAt:string;
}
interface DailyStatus {
  _id:string;
  submittedBy:{ _id:string; name:string; role:string };
  date:string; summary:string; hoursWorked:number;
  blockers:string; nextPlan:string; mood:MoodType;
  managerComment:string;
  commentedBy:{ _id:string; name:string; role:string }|null;
  commentedAt:string|null;
}
interface WorkSubmission {
  _id:string; submittedBy:{ _id:string; name:string; role:string };
  description:string; hoursWorked:number; date:string;
}
interface Project {
  _id:string; name:string; description:string; clientName:string;
  deadline:string; status:ProjectStatus; priority:ProjectPriority;
  budget:number; spent:number; progress:number;
  managerId:any; teamMembers:any[]; createdAt:string; tags:string[];
  milestones:Milestone[]; documents:ProjectDocument[];
  dailyStatuses:DailyStatus[]; workSubmissions:WorkSubmission[];
}

/* ══════════════════════════════════════════════════════════
   CONFIG
══════════════════════════════════════════════════════════ */
const STATUS_CFG = {
  planning:      { label:"Planning",    dot:"bg-slate-400",   text:"text-slate-700",   bg:"bg-slate-50",   border:"border-slate-200",  accent:"#64748b" },
  "in-progress": { label:"In Progress", dot:"bg-blue-500",    text:"text-blue-700",    bg:"bg-blue-50",    border:"border-blue-200",   accent:"#3b82f6" },
  completed:     { label:"Completed",   dot:"bg-emerald-500", text:"text-emerald-700", bg:"bg-emerald-50", border:"border-emerald-200", accent:"#10b981" },
  "on-hold":     { label:"On Hold",     dot:"bg-amber-400",   text:"text-amber-700",   bg:"bg-amber-50",   border:"border-amber-200",  accent:"#f59e0b" },
} as const;

const PRIORITY_CFG = {
  low:      { label:"Low",      icon:"↓", cls:"bg-gray-100 text-gray-600"    },
  medium:   { label:"Medium",   icon:"→", cls:"bg-blue-100 text-blue-700"    },
  high:     { label:"High",     icon:"↑", cls:"bg-orange-100 text-orange-700"},
  critical: { label:"Critical", icon:"⚡", cls:"bg-red-100 text-red-700"      },
} as const;

const MOOD_CFG: Record<MoodType,{ icon:React.ReactNode; label:string; color:string }> = {
  great:      { icon:<Smile  className="h-3.5 w-3.5"/>, label:"Great",      color:"text-emerald-600 bg-emerald-50" },
  good:       { icon:<Coffee className="h-3.5 w-3.5"/>, label:"Good",       color:"text-blue-600 bg-blue-50"       },
  neutral:    { icon:<Meh    className="h-3.5 w-3.5"/>, label:"Neutral",    color:"text-amber-600 bg-amber-50"     },
  struggling: { icon:<Frown  className="h-3.5 w-3.5"/>, label:"Struggling", color:"text-red-600 bg-red-50"         },
};

const DOC_CATEGORY_CFG = {
  contract:      { label:"Contract",      color:"bg-blue-100 text-blue-700"   },
  specification: { label:"Spec",          color:"bg-purple-100 text-purple-700"},
  design:        { label:"Design",        color:"bg-pink-100 text-pink-700"   },
  report:        { label:"Report",        color:"bg-amber-100 text-amber-700" },
  invoice:       { label:"Invoice",       color:"bg-emerald-100 text-emerald-700"},
  other:         { label:"Other",         color:"bg-gray-100 text-gray-600"   },
} as const;

const ROLE_BADGE: Record<string,string> = {
  admin:    "bg-red-100 text-red-700",
  manager:  "bg-blue-100 text-blue-700",
  hr:       "bg-purple-100 text-purple-700",
  employee: "bg-emerald-100 text-emerald-700",
};

const FILE_ICONS: Record<string,string> = {
  "application/pdf":"📄","application/msword":"📝",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":"📝",
  "application/vnd.ms-excel":"📊","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":"📊",
  "application/vnd.ms-powerpoint":"📑","application/vnd.openxmlformats-officedocument.presentationml.presentation":"📑",
  "image/png":"🖼️","image/jpeg":"🖼️","image/jpg":"🖼️","image/gif":"🖼️","image/webp":"🖼️",
  "text/plain":"📃","application/zip":"🗜️",
};
const ALLOWED_MIME = Object.keys(FILE_ICONS);
const MAX_FILE     = 10*1024*1024;

/* ══════════════════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════════════════ */
const fmtBytes  = (b:number) => b<1024?`${b} B`:b<1048576?`${(b/1024).toFixed(1)} KB`:`${(b/1048576).toFixed(1)} MB`;
const fmtDate   = (d:string) => d?new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"—";
const fmtTime   = (d:string) => d?new Date(d).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true}):"";
const initials  = (n:string) => n?.split(" ").slice(0,2).map(w=>w[0]?.toUpperCase()??"").join("")||"?";
const getFileIcon = (t:string) => FILE_ICONS[t]??"📎";

const PROGRESS_BAR = (p:number) =>
  p>=80?"from-emerald-400 to-emerald-500":p>=50?"from-blue-400 to-blue-500":p>=25?"from-amber-400 to-amber-500":"from-rose-400 to-rose-500";

function exportToCSV(projects:Project[]) {
  if (!projects.length) { alert("No projects to export."); return; }
  const rows = projects.map(p=>[
    p.name,p.clientName,p.status,p.priority,p.budget,p.spent,p.progress,
    p.managerId?.name??"-",(p.teamMembers??[]).length,(p.documents??[]).length,
    (p.dailyStatuses??[]).length,(p.workSubmissions??[]).length,fmtDate(p.createdAt),
  ]);
  const csv="\uFEFF"+[
    ["Name","Client","Status","Priority","Budget","Spent","Progress","Manager","Team","Docs","Daily Status","Submissions","Created"],
    ...rows
  ].map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
  const a=Object.assign(document.createElement("a"),{
    href:URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"})),
    download:`projects-${new Date().toISOString().slice(0,10)}.csv`,
  });
  a.click();
}

/* ══════════════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════════════ */
function Toast({msg,type}:{msg:string;type:"ok"|"err"}) {
  if (!msg) return null;
  return (
    <div className={`fixed top-5 right-5 z-[200] flex items-center gap-2.5 px-4 py-3
      rounded-2xl shadow-2xl text-white text-xs max-w-sm
      ${type==="err"?"bg-red-600":"bg-gray-900"}`}>
      {type==="err"?<AlertCircle className="h-4 w-4 flex-shrink-0"/>:<CheckCircle2 className="h-4 w-4 flex-shrink-0"/>}
      <span className="font-medium">{msg}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   AVATAR
══════════════════════════════════════════════════════════ */
function Avatar({name,size="sm",color="orange"}:{name:string;size?:"xs"|"sm"|"md";color?:string}) {
  const sz = size==="xs"?"w-5 h-5 text-[8px]":size==="sm"?"w-7 h-7 text-[10px]":"w-9 h-9 text-xs";
  const bg = color==="blue"?"bg-blue-100 text-blue-700":color==="purple"?"bg-purple-100 text-purple-700":"bg-orange-100 text-orange-700";
  return (
    <div className={`${sz} ${bg} rounded-full flex items-center justify-center font-bold flex-shrink-0`}>
      {initials(name)}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MEMBER PICKER
══════════════════════════════════════════════════════════ */
function MemberPicker({list,selected,onToggle}:{list:UserOption[];selected:string[];onToggle:(id:string)=>void}) {
  const [q,setQ]=useState("");
  const filtered=list.filter(m=>
    m.name.toLowerCase().includes(q.toLowerCase())||
    m.email.toLowerCase().includes(q.toLowerCase())||
    m.role.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50/80">
        <Search className="h-3.5 w-3.5 text-gray-400"/>
        <input className="flex-1 text-xs outline-none bg-transparent placeholder-gray-400"
          placeholder={`Search ${list.length} users…`} value={q} onChange={e=>setQ(e.target.value)}/>
        {q&&<button onClick={()=>setQ("")}><X className="h-3 w-3 text-gray-400 hover:text-gray-600"/></button>}
      </div>
      {selected.length>0&&(
        <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-gray-100 bg-orange-50/30">
          {selected.map(id=>{
            const u=list.find(m=>m._id===id);
            if(!u)return null;
            return (
              <span key={id} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold">
                {u.name}<button onClick={()=>onToggle(id)}><X className="h-2.5 w-2.5"/></button>
              </span>
            );
          })}
        </div>
      )}
      <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
        {filtered.length===0
          ?<p className="text-xs text-gray-400 text-center py-5">No users found</p>
          :filtered.map(m=>{
            const sel=selected.includes(m._id);
            return (
              <div key={m._id} onClick={()=>onToggle(m._id)}
                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors
                  ${sel?"bg-orange-50 hover:bg-orange-100":"hover:bg-gray-50"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0
                  ${sel?"bg-orange-500 text-white":"bg-gray-200 text-gray-600"}`}>
                  {sel?"✓":initials(m.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate ${sel?"text-orange-700":"text-gray-800"}`}>{m.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{m.email}</p>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold capitalize flex-shrink-0 ${ROLE_BADGE[m.role]??"bg-gray-100 text-gray-600"}`}>
                  {m.role}
                </span>
              </div>
            );
          })
        }
      </div>
      <div className="px-3 py-1.5 bg-gray-50/80 border-t border-gray-100 flex justify-between">
        <span className="text-[10px] text-gray-400">{filtered.length} shown</span>
        {selected.length>0&&<span className="text-[10px] font-semibold text-orange-600">{selected.length} selected</span>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   FORM STATE
══════════════════════════════════════════════════════════ */
interface FormState {
  name:string;description:string;clientName:string;deadline:string;
  status:ProjectStatus;priority:ProjectPriority;budget:string;spent:string;
  progress:string;managerId:string;createdAt:string;tags:string;
}
const EMPTY_FORM:FormState = {name:"",description:"",clientName:"",deadline:"",
  status:"planning",priority:"medium",budget:"",spent:"",progress:"",managerId:"",createdAt:"",tags:""};
const EMPTY_MANUAL:FormState = {...EMPTY_FORM,status:"completed",progress:"100"};

/* ══════════════════════════════════════════════════════════
   PROJECT FORM FIELDS
══════════════════════════════════════════════════════════ */
function ProjectFormFields({form,setForm,managers,allUsers,selectedMembers,onToggleMember,isManual=false}:{
  form:FormState;setForm:(f:FormState)=>void;managers:UserOption[];allUsers:UserOption[];
  selectedMembers:string[];onToggleMember:(id:string)=>void;isManual?:boolean;
}) {
  const set=(k:keyof FormState)=>(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>
    setForm({...form,[k]:e.target.value});
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-600">Project Name *</Label>
          <Input className="h-9 text-sm" placeholder="e.g. HRMS Redesign" value={form.name} onChange={set("name")}/>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-600">Client *</Label>
          <Input className="h-9 text-sm" placeholder="e.g. Quibo Tech" value={form.clientName} onChange={set("clientName")}/>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-gray-600">Description</Label>
        <Textarea className="text-sm resize-none" rows={2} placeholder="Brief project overview…" value={form.description} onChange={set("description")}/>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-600">Deadline</Label>
          <Input type="date" className="h-9 text-sm" value={form.deadline} onChange={set("deadline")}/>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-600">Status</Label>
          <Select value={form.status} onValueChange={v=>setForm({...form,status:v as ProjectStatus})}>
            <SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CFG).map(([k,v])=><SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-600">Priority</Label>
          <Select value={form.priority} onValueChange={v=>setForm({...form,priority:v as ProjectPriority})}>
            <SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
            <SelectContent>
              {Object.entries(PRIORITY_CFG).map(([k,v])=><SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-600">Budget (₹) *</Label>
          <Input type="number" className="h-9 text-sm" placeholder="500000" value={form.budget} onChange={set("budget")}/>
        </div>
      </div>
      {isManual&&(
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Spent (₹)</Label>
            <Input type="number" className="h-9 text-sm" placeholder="0" value={form.spent} onChange={set("spent")}/>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Progress %</Label>
            <Input type="number" className="h-9 text-sm" placeholder="100" value={form.progress} onChange={set("progress")}/>
          </div>
        </div>
      )}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-gray-600">Tags <span className="text-gray-400 font-normal">(comma-separated)</span></Label>
        <Input className="h-9 text-sm" placeholder="frontend, api, design…" value={form.tags} onChange={set("tags")}/>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-gray-600">
          Record Date{isManual&&<span className="ml-1 text-gray-400 font-normal">(backdatable)</span>}
        </Label>
        <Input type="date" className="h-9 text-sm" value={form.createdAt} onChange={set("createdAt")}/>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-gray-600">Manager{!isManual&&" *"}</Label>
        <Select value={form.managerId||"__none__"} onValueChange={v=>setForm({...form,managerId:v==="__none__"?"":v})}>
          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select manager…"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Select —</SelectItem>
            {managers.map(m=><SelectItem key={m._id} value={m._id}>{m.name} ({m.role})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-gray-600">Team Members</Label>
        <MemberPicker list={allUsers} selected={selectedMembers} onToggle={onToggleMember}/>
        {selectedMembers.length>0&&(
          <p className="text-[10px] text-emerald-600 font-semibold">✓ {selectedMembers.length} member{selectedMembers.length!==1?"s":""} selected</p>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   DOCUMENT PANEL
══════════════════════════════════════════════════════════ */
function DocumentPanel({project,canUpload,canView,onUpload,onDelete}:{
  project:Project;canUpload:boolean;canView:boolean;
  onUpload:(d:{name:string;url:string;fileType:string;size:number;category:string})=>void;
  onDelete:(docId:string)=>void;
}) {
  const fileRef=useRef<HTMLInputElement>(null);
  const [busy,setBusy]=useState(false);
  const [drag,setDrag]=useState(false);
  const [error,setError]=useState("");
  const [category,setCategory]=useState("other");

  if(!canView) return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
        <Lock className="h-6 w-6 text-gray-400"/>
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700">Restricted Access</p>
        <p className="text-xs text-gray-400 mt-1">Documents are visible to Admin, Manager, and HR only.</p>
      </div>
    </div>
  );

  const processFile=(file:File)=>{
    setError("");
    if(!ALLOWED_MIME.includes(file.type)){setError(`File type not supported.`);return;}
    if(file.size>MAX_FILE){setError(`File too large: ${fmtBytes(file.size)}. Max 10 MB.`);return;}
    setBusy(true);
    const reader=new FileReader();
    reader.onload=()=>{
      onUpload({name:file.name,url:reader.result as string,fileType:file.type,size:file.size,category});
      setBusy(false);
      if(fileRef.current)fileRef.current.value="";
    };
    reader.onerror=()=>{setError("Failed to read file.");setBusy(false);};
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      {canUpload&&(
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold text-gray-600 flex-shrink-0">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-8 text-xs flex-1"><SelectValue/></SelectTrigger>
              <SelectContent>
                {Object.entries(DOC_CATEGORY_CFG).map(([k,v])=><SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <input ref={fileRef} type="file" className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.txt,.zip"
            onChange={e=>{const f=e.target.files?.[0];if(f)processFile(f);}}/>
          <div
            onDragOver={e=>{e.preventDefault();setDrag(true);}}
            onDragLeave={()=>setDrag(false)}
            onDrop={e=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files[0];if(f)processFile(f);}}
            onClick={()=>!busy&&fileRef.current?.click()}
            className={`flex flex-col items-center gap-2 py-7 border-2 border-dashed rounded-2xl cursor-pointer transition-all
              ${drag?"border-orange-400 bg-orange-50":"border-gray-200 hover:border-orange-300 hover:bg-orange-50/40"}
              ${busy?"opacity-60 pointer-events-none":""}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${drag?"bg-orange-100":"bg-gray-100"}`}>
              <Upload className={`h-5 w-5 ${drag?"text-orange-500":"text-gray-400"}`}/>
            </div>
            <p className="text-xs font-semibold text-gray-600">{busy?"Uploading…":"Click or drag & drop to upload"}</p>
            <p className="text-[10px] text-gray-400">PDF, Word, Excel, PowerPoint, Images, ZIP — max 10 MB</p>
          </div>
          {error&&(
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[11px]">
              <AlertCircle className="h-3.5 w-3.5"/>{error}
            </div>
          )}
        </div>
      )}
      {!canUpload&&(
        <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 rounded-xl border border-blue-100">
          <Shield className="h-3.5 w-3.5 text-blue-500"/><p className="text-[11px] text-blue-700">View only — upload restricted to Admin / Manager / HR</p>
        </div>
      )}
      {(!project.documents||project.documents.length===0)?(
        <div className="text-center py-10">
          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FileText className="h-7 w-7 text-gray-300"/>
          </div>
          <p className="text-sm font-medium text-gray-500">No documents yet</p>
          <p className="text-xs text-gray-400 mt-1">Upload contracts, specs, or design files</p>
        </div>
      ):(
        <div className="space-y-2">
          {/* Group by category */}
          {Object.entries(DOC_CATEGORY_CFG).map(([cat,catCfg])=>{
            const docs=project.documents.filter(d=>d.category===cat);
            if(!docs.length)return null;
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${catCfg.color}`}>{catCfg.label}</span>
                  <div className="flex-1 h-px bg-gray-100"/>
                </div>
                {docs.map(doc=>(
                  <div key={doc._id}
                    className="flex items-center gap-3 px-3 py-2.5 bg-white border border-gray-100 rounded-xl group hover:border-gray-200 hover:shadow-sm transition-all mb-1.5">
                    <span className="text-2xl flex-shrink-0">{getFileIcon(doc.fileType)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{doc.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {fmtBytes(doc.size||0)} · {doc.uploadedBy?.name??"Unknown"} · {fmtDate(doc.uploadedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={()=>{
                          if(doc.url.startsWith("data:")){
                            const a=Object.assign(document.createElement("a"),{href:doc.url,download:doc.name});
                            a.click();
                          }else window.open(doc.url,"_blank","noreferrer");
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View / Download">
                        <Eye className="h-3.5 w-3.5"/>
                      </button>
                      {canUpload&&(
                        <button onClick={()=>onDelete(doc._id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                          <Trash2 className="h-3.5 w-3.5"/>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          {/* uncategorized docs that don't match any category */}
          {project.documents.filter(d=>!Object.keys(DOC_CATEGORY_CFG).includes(d.category)).map(doc=>(
            <div key={doc._id}
              className="flex items-center gap-3 px-3 py-2.5 bg-white border border-gray-100 rounded-xl group hover:border-gray-200 hover:shadow-sm transition-all">
              <span className="text-2xl flex-shrink-0">{getFileIcon(doc.fileType)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{doc.name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{fmtBytes(doc.size||0)} · {doc.uploadedBy?.name} · {fmtDate(doc.uploadedAt)}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                <button onClick={()=>{
                  if(doc.url.startsWith("data:")){const a=Object.assign(document.createElement("a"),{href:doc.url,download:doc.name});a.click();}
                  else window.open(doc.url,"_blank","noreferrer");
                }} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"><Eye className="h-3.5 w-3.5"/></button>
                {canUpload&&<button onClick={()=>onDelete(doc._id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5"/></button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   DAILY STATUS PANEL
══════════════════════════════════════════════════════════ */
function DailyStatusPanel({project,currentUserId,isAdmin,isManager,canSubmit,canViewAll,onSubmit,onDelete,onComment}:{
  project:Project;currentUserId:string;isAdmin:boolean;isManager:boolean;
  canSubmit:boolean;canViewAll:boolean;
  onSubmit:(d:{summary:string;hoursWorked:number;blockers:string;nextPlan:string;mood:MoodType})=>Promise<void>;
  onDelete:(id:string)=>void;
  onComment:(statusId:string,comment:string)=>Promise<void>;
}) {
  const [formOpen,setFormOpen]=useState(false);
  const [summary,setSummary]=useState("");
  const [hours,setHours]=useState("");
  const [blockers,setBlockers]=useState("");
  const [nextPlan,setNextPlan]=useState("");
  const [mood,setMood]=useState<MoodType>("good");
  const [submitting,setSubmitting]=useState(false);
  const [commentingId,setCommentingId]=useState<string|null>(null);
  const [commentText,setCommentText]=useState("");
  const [commentSaving,setCommentSaving]=useState(false);

  const visible=canViewAll
    ?(project.dailyStatuses??[])
    :(project.dailyStatuses??[]).filter(d=>d.submittedBy?._id===currentUserId);

  const totalHours=visible.reduce((s,d)=>s+(d.hoursWorked||0),0);

  const handleSubmit=async()=>{
    if(!summary.trim()){alert("Summary is required.");return;}
    setSubmitting(true);
    try{
      await onSubmit({summary,hoursWorked:Number(hours)||0,blockers,nextPlan,mood});
      setSummary("");setHours("");setBlockers("");setNextPlan("");setMood("good");setFormOpen(false);
    }finally{setSubmitting(false);}
  };

  const handleComment=async(id:string)=>{
    if(!commentText.trim())return;
    setCommentSaving(true);
    try{await onComment(id,commentText);setCommentingId(null);setCommentText("");}
    finally{setCommentSaving(false);}
  };

  return (
    <div className="space-y-4">
      {/* Summary row */}
      {visible.length>0&&(
        <div className="flex items-center gap-5 px-1 pb-2 border-b border-gray-100">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <Activity className="h-3.5 w-3.5 text-blue-500"/>
            <span className="font-semibold text-gray-800">{visible.length}</span> entr{visible.length!==1?"ies":"y"}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <Clock className="h-3.5 w-3.5 text-purple-500"/>
            <span className="font-semibold text-gray-800">{totalHours}h</span> logged
          </div>
          {!canViewAll&&<span className="ml-auto text-[10px] text-gray-400 flex items-center gap-1"><Shield className="h-3 w-3"/>Your entries only</span>}
        </div>
      )}

      {/* Submit button */}
      {canSubmit&&!formOpen&&(
        <button onClick={()=>setFormOpen(true)}
          className="flex items-center justify-center gap-2 w-full h-10 text-xs font-semibold border-2 border-dashed border-blue-200 rounded-2xl text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-all">
          <Activity className="h-3.5 w-3.5"/> Submit Today's Status
        </button>
      )}

      {/* Submit form */}
      {formOpen&&canSubmit&&(
        <div className="border border-blue-200 bg-blue-50/40 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-blue-900">📋 Daily Status Update</p>
            <button onClick={()=>setFormOpen(false)}><X className="h-3.5 w-3.5 text-gray-400"/></button>
          </div>

          {/* Mood selector */}
          <div>
            <Label className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider mb-1.5 block">How are you feeling today?</Label>
            <div className="flex gap-2">
              {(Object.entries(MOOD_CFG) as [MoodType,any][]).map(([k,v])=>(
                <button key={k} onClick={()=>setMood(k)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all
                    ${mood===k?v.color+" ring-2 ring-offset-1 ring-current":v.color+" opacity-50"}`}>
                  {v.icon}{v.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider mb-1 block">What did you accomplish? *</Label>
            <Textarea className="text-xs resize-none bg-white border-blue-200 focus:border-blue-400 rounded-xl" rows={3}
              placeholder="Describe what you worked on today…" value={summary} onChange={e=>setSummary(e.target.value)}/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider mb-1 block">Blockers / Issues</Label>
              <Textarea className="text-xs resize-none bg-white border-blue-200 rounded-xl" rows={2}
                placeholder="Any blockers? (leave blank if none)" value={blockers} onChange={e=>setBlockers(e.target.value)}/>
            </div>
            <div>
              <Label className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider mb-1 block">Tomorrow's Plan</Label>
              <Textarea className="text-xs resize-none bg-white border-blue-200 rounded-xl" rows={2}
                placeholder="What will you work on tomorrow?" value={nextPlan} onChange={e=>setNextPlan(e.target.value)}/>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-gray-400"/>
              <Input type="number" min={0} max={24} className="h-8 text-xs w-24 bg-white"
                placeholder="Hours" value={hours} onChange={e=>setHours(e.target.value)}/>
              <span className="text-[10px] text-gray-400">hrs worked</span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={handleSubmit} disabled={submitting||!summary.trim()}
                className="h-8 px-5 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {submitting?"Saving…":"Submit"}
              </button>
              <button onClick={()=>{setFormOpen(false);setSummary("");setBlockers("");setNextPlan("");setHours("");}}
                className="h-8 px-3 text-xs border border-gray-200 rounded-xl hover:bg-gray-100 text-gray-600">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entries */}
      {visible.length===0?(
        <div className="text-center py-12">
          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Activity className="h-7 w-7 text-gray-300"/>
          </div>
          <p className="text-sm font-medium text-gray-500">No daily status yet</p>
          <p className="text-xs text-gray-400 mt-1">{canViewAll?"Team members haven't submitted yet.":"Submit your first daily update."}</p>
        </div>
      ):(
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-0.5">
          {[...visible].reverse().map(ds=>(
            <div key={ds._id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-sm transition-shadow">
              {/* Header bar */}
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/80 border-b border-gray-100">
                <Avatar name={ds.submittedBy?.name??"?"} size="sm" color="blue"/>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-gray-900">{ds.submittedBy?.name??"Unknown"}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold capitalize ${ROLE_BADGE[ds.submittedBy?.role]??"bg-gray-100 text-gray-600"}`}>
                      {ds.submittedBy?.role}
                    </span>
                    <span className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${MOOD_CFG[ds.mood]?.color??"text-gray-600 bg-gray-50"}`}>
                      {MOOD_CFG[ds.mood]?.icon}{MOOD_CFG[ds.mood]?.label}
                    </span>
                    {ds.hoursWorked>0&&(
                      <span className="flex items-center gap-0.5 text-[10px] text-blue-600 font-semibold">
                        <Clock className="h-2.5 w-2.5"/>{ds.hoursWorked}h
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(ds.date)} {fmtTime(ds.date)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {(isAdmin||isManager)&&(
                    <button onClick={()=>{setCommentingId(ds._id);setCommentText(ds.managerComment||"");}}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Add comment">
                      <MessageSquare className="h-3.5 w-3.5"/>
                    </button>
                  )}
                  {(isAdmin||isManager||ds.submittedBy?._id===currentUserId)&&(
                    <button onClick={()=>onDelete(ds._id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                      <Trash2 className="h-3.5 w-3.5"/>
                    </button>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="px-4 py-3 space-y-2.5">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">✅ Accomplished</p>
                  <p className="text-xs text-gray-800 leading-relaxed">{ds.summary}</p>
                </div>
                {ds.blockers&&(
                  <div>
                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">🚧 Blockers</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{ds.blockers}</p>
                  </div>
                )}
                {ds.nextPlan&&(
                  <div>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">📅 Tomorrow</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{ds.nextPlan}</p>
                  </div>
                )}

                {/* Manager comment */}
                {ds.managerComment&&commentingId!==ds._id&&(
                  <div className="mt-1 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">💬 Manager Note</p>
                    <p className="text-xs text-amber-800 leading-relaxed">{ds.managerComment}</p>
                    {ds.commentedBy&&<p className="text-[9px] text-amber-500 mt-1">— {ds.commentedBy.name}, {fmtDate(ds.commentedAt||"")}</p>}
                  </div>
                )}

                {/* Comment form */}
                {commentingId===ds._id&&(isAdmin||isManager)&&(
                  <div className="mt-1 space-y-2">
                    <Textarea className="text-xs resize-none bg-amber-50 border-amber-200 rounded-xl" rows={2}
                      placeholder="Add a note or feedback…" value={commentText} onChange={e=>setCommentText(e.target.value)}/>
                    <div className="flex gap-2 justify-end">
                      <button onClick={()=>handleComment(ds._id)} disabled={commentSaving||!commentText.trim()}
                        className="h-7 px-4 text-[11px] font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50">
                        {commentSaving?"Saving…":"Save Note"}
                      </button>
                      <button onClick={()=>{setCommentingId(null);setCommentText("");}}
                        className="h-7 px-3 text-[11px] border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PROJECT CARD
══════════════════════════════════════════════════════════ */
function ProjectCard({project,role,currentUserId,isAdmin,isManager,isHR,
  onEdit,onDelete,onProgressUpdate,onSpentUpdate,
  onUploadDoc,onDeleteDoc,onSubmitDailyStatus,onDeleteDailyStatus,onCommentDailyStatus,
  onSubmitWork,onDeleteSubmission}:{
  project:Project;role:string;currentUserId:string;
  isAdmin:boolean;isManager:boolean;isHR:boolean;
  onEdit:()=>void;onDelete:()=>void;
  onProgressUpdate:(v:number)=>void;onSpentUpdate:(v:number)=>void;
  onUploadDoc:(d:any)=>void;onDeleteDoc:(docId:string)=>void;
  onSubmitDailyStatus:(d:any)=>Promise<void>;onDeleteDailyStatus:(id:string)=>void;
  onCommentDailyStatus:(statusId:string,comment:string)=>Promise<void>;
  onSubmitWork:(d:any)=>Promise<void>;onDeleteSubmission:(id:string)=>void;
}) {
  const [expanded,setExpanded]=useState(false);
  const [activeTab,setActiveTab]=useState<ActiveTab>("overview");
  const [progVal,setProgVal]=useState(String(project.progress));
  const [spentVal,setSpentVal]=useState(String(project.spent));

  const isEmployee=!isAdmin&&!isManager&&!isHR;
  const canViewDoc =isAdmin||isManager||isHR;
  const canUpload  =isAdmin||isManager||isHR;
  const canViewAll =isAdmin||isManager;
  const canSubmit  =!isAdmin&&(isManager||isHR||isEmployee);
  const canEditDel =isAdmin;

  const sc=STATUS_CFG[project.status]??STATUS_CFG["planning"];
  const pc=PRIORITY_CFG[project.priority]??PRIORITY_CFG["medium"];
  const budgetPct=project.budget>0?Math.min(Math.round((project.spent/project.budget)*100),100):0;

  const docCount   =project.documents?.length??0;
  const dsCount    =canViewAll?(project.dailyStatuses?.length??0):(project.dailyStatuses??[]).filter(d=>d.submittedBy?._id===currentUserId).length;
  const subCount   =canViewAll?(project.workSubmissions?.length??0):(project.workSubmissions??[]).filter(s=>s.submittedBy?._id===currentUserId).length;
  const teamCount  =project.teamMembers?.length??0;

  const tabs=[
    {key:"overview" as ActiveTab, label:"Overview",   icon:<BarChart3 className="h-3 w-3"/>},
    {key:"team"     as ActiveTab, label:`Team (${teamCount})`, icon:<Users className="h-3 w-3"/>},
    ...(canViewDoc?[{key:"docs" as ActiveTab, label:`Docs (${docCount})`, icon:<FileText className="h-3 w-3"/>}]:[]),
    {key:"dailystatus" as ActiveTab, label:`Daily Status (${dsCount})`, icon:<Activity className="h-3 w-3"/>},
    {key:"submissions" as ActiveTab, label:`Submissions (${subCount})`, icon:<Send className="h-3 w-3"/>},
  ];

  const completedMilestones=(project.milestones??[]).filter(m=>m.completed).length;
  const totalMilestones=(project.milestones??[]).length;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition-all duration-200 group">

      {/* ── Status stripe ── */}
      <div className="h-1" style={{background:`linear-gradient(90deg, ${sc.accent}, ${sc.accent}88)`}}/>

      {/* ── Header ── */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-sm font-bold text-gray-900 leading-tight">{project.name}</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${pc.cls}`}>{pc.icon} {pc.label}</span>
              {project.tags?.slice(0,3).map(tag=>(
                <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">#{tag}</span>
              ))}
            </div>
            {project.description&&(
              <p className="text-[11px] text-gray-400 line-clamp-1 leading-relaxed">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold border flex items-center gap-1 ${sc.bg} ${sc.text} ${sc.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} inline-block`}/>{sc.label}
            </span>
            {canEditDel&&(
              <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={onEdit} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><Pencil className="h-3.5 w-3.5"/></button>
                <button onClick={onDelete} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5"/></button>
              </div>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
          {project.clientName&&<span className="flex items-center gap-1 text-[11px] text-gray-500"><Building2 className="h-3 w-3 text-gray-400"/>{project.clientName}</span>}
          {project.deadline&&<span className="flex items-center gap-1 text-[11px] text-gray-500"><Calendar className="h-3 w-3 text-gray-400"/>{project.deadline}</span>}
          {project.managerId?.name&&<span className="flex items-center gap-1 text-[11px] text-gray-500"><UserCheck className="h-3 w-3 text-gray-400"/>{project.managerId.name}</span>}
          {totalMilestones>0&&<span className="flex items-center gap-1 text-[11px] text-gray-500"><Target className="h-3 w-3 text-gray-400"/>{completedMilestones}/{totalMilestones} milestones</span>}
          <span className="ml-auto text-[10px] text-gray-300">{fmtDate(project.createdAt)}</span>
        </div>
      </div>

      {/* ── Progress + Budget ── */}
      <div className="px-5 pb-3 grid grid-cols-2 gap-5">
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Progress</span>
            <span className="text-[11px] font-bold text-gray-800">{project.progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full bg-gradient-to-r ${PROGRESS_BAR(project.progress)} transition-all duration-700`}
              style={{width:`${project.progress}%`}}/>
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Budget Used</span>
            <span className="text-[11px] font-bold text-gray-800">{budgetPct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full bg-gradient-to-r ${budgetPct>85?"from-rose-400 to-rose-500":"from-orange-400 to-orange-500"} transition-all duration-700`}
              style={{width:`${budgetPct}%`}}/>
          </div>
          <p className="text-[9px] text-gray-400 mt-1 text-right">₹{project.spent.toLocaleString()} of ₹{project.budget.toLocaleString()}</p>
        </div>
      </div>

      {/* ── Quick stats bar ── */}
      <div className="px-5 pb-4 flex items-center gap-2 flex-wrap">
        {[
          {label:`${teamCount} member${teamCount!==1?"s":""}`, icon:<Users className="h-2.5 w-2.5"/>, tab:"team" as ActiveTab, style:"bg-gray-100 text-gray-600 hover:bg-gray-200"},
          ...(canViewDoc?[{label:`${docCount} doc${docCount!==1?"s":""}`, icon:<Paperclip className="h-2.5 w-2.5"/>, tab:"docs" as ActiveTab, style:"bg-blue-50 text-blue-600 hover:bg-blue-100"}]:[]),
          {label:`${dsCount} status`, icon:<Activity className="h-2.5 w-2.5"/>, tab:"dailystatus" as ActiveTab, style:"bg-purple-50 text-purple-600 hover:bg-purple-100"},
          {label:`${subCount} submission${subCount!==1?"s":""}`, icon:<Send className="h-2.5 w-2.5"/>, tab:"submissions" as ActiveTab, style:"bg-emerald-50 text-emerald-600 hover:bg-emerald-100"},
        ].map(b=>(
          <button key={b.tab} onClick={()=>{setExpanded(true);setActiveTab(b.tab);}}
            className={`flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors ${b.style}`}>
            {b.icon}{b.label}
          </button>
        ))}
        <button onClick={()=>setExpanded(o=>!o)}
          className="ml-auto flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-gray-700">
          {expanded?<><ChevronUp className="h-3 w-3"/>Less</>:<><ChevronDown className="h-3 w-3"/>Details</>}
        </button>
      </div>

      {/* ── Manager inline edit ── */}
      {isManager&&(
        <div className="px-5 pb-4 border-t border-gray-100 pt-3 grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Update Progress %</Label>
            <div className="flex items-center gap-1.5 mt-1">
              <Input type="number" min={0} max={100} className="h-8 text-xs flex-1" value={progVal}
                onChange={e=>setProgVal(e.target.value)}
                onBlur={()=>{const v=Number(progVal);if(!isNaN(v)&&v>=0&&v<=100)onProgressUpdate(v);else setProgVal(String(project.progress));}}/>
            </div>
          </div>
          <div>
            <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Update Spent (₹)</Label>
            <div className="flex items-center gap-1.5 mt-1">
              <Input type="number" min={0} className="h-8 text-xs flex-1" value={spentVal}
                onChange={e=>setSpentVal(e.target.value)}
                onBlur={()=>{const v=Number(spentVal);if(!isNaN(v)&&v>=0)onSpentUpdate(v);else setSpentVal(String(project.spent));}}/>
            </div>
          </div>
        </div>
      )}

      {/* ── Expanded Panel ── */}
      {expanded&&(
        <div className="border-t border-gray-100">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 overflow-x-auto bg-gray-50/50">
            {tabs.map(t=>(
              <button key={t.key} onClick={()=>setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-bold whitespace-nowrap transition-colors border-b-2 flex-shrink-0
                  ${activeTab===t.key?"border-orange-500 text-orange-600 bg-white":"border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/70"}`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* Overview tab */}
            {activeTab==="overview"&&(
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {label:"Budget",    value:`₹${project.budget.toLocaleString()}`,   sub:"Total allocated",      icon:<Wallet className="h-4 w-4 text-blue-500"/>,    bg:"bg-blue-50"},
                    {label:"Spent",     value:`₹${project.spent.toLocaleString()}`,    sub:`${budgetPct}% used`,   icon:<TrendingUp className="h-4 w-4 text-orange-500"/>, bg:"bg-orange-50"},
                    {label:"Progress",  value:`${project.progress}%`,                 sub:"Completion",           icon:<BarChart3 className="h-4 w-4 text-emerald-500"/>, bg:"bg-emerald-50"},
                    {label:"Team",      value:String(teamCount),                       sub:"Members assigned",     icon:<Users className="h-4 w-4 text-purple-500"/>,     bg:"bg-purple-50"},
                  ].map((s,i)=>(
                    <div key={i} className="bg-white border border-gray-100 rounded-xl p-3">
                      <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center mb-2`}>{s.icon}</div>
                      <p className="text-lg font-bold text-gray-900">{s.value}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
                      <p className="text-[9px] text-gray-300">{s.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Milestones */}
                {totalMilestones>0&&(
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5"><Target className="h-3.5 w-3.5 text-gray-500"/>Milestones</h4>
                    <div className="space-y-1.5">
                      {project.milestones.map(m=>(
                        <div key={m._id} className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${m.completed?"bg-emerald-50 border-emerald-100":"bg-white border-gray-100"}`}>
                          {m.completed?<CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0"/>:<Circle className="h-4 w-4 text-gray-300 flex-shrink-0"/>}
                          <span className={`text-xs flex-1 ${m.completed?"line-through text-gray-400":"text-gray-700 font-medium"}`}>{m.title}</span>
                          {m.dueDate&&<span className="text-[10px] text-gray-400 flex-shrink-0">{m.dueDate}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent activity */}
                {(project.dailyStatuses?.length||0)>0&&(
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-gray-500"/>Recent Activity</h4>
                    <div className="space-y-1.5">
                      {[...project.dailyStatuses].reverse().slice(0,3).map(ds=>(
                        <div key={ds._id} className="flex items-start gap-2.5 px-3 py-2 bg-gray-50 rounded-xl">
                          <Avatar name={ds.submittedBy?.name??"?"} size="xs" color="blue"/>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-gray-700 truncate">{ds.submittedBy?.name}</p>
                            <p className="text-[10px] text-gray-500 truncate">{ds.summary}</p>
                          </div>
                          <span className="text-[9px] text-gray-400 flex-shrink-0">{fmtDate(ds.date)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Team tab */}
            {activeTab==="team"&&(
              <div>
                {(!project.teamMembers||project.teamMembers.length===0)?(
                  <div className="text-center py-12">
                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Users className="h-7 w-7 text-gray-300"/>
                    </div>
                    <p className="text-sm font-medium text-gray-500">No team members yet</p>
                  </div>
                ):(
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {project.teamMembers.map((m:any)=>(
                      <div key={m._id??m} className="flex items-center gap-3 px-3 py-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-white transition-all">
                        <Avatar name={m.name??"?"} size="md" color="orange"/>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-gray-900 truncate">{m.name??"—"}</p>
                          <p className="text-[10px] text-gray-400 truncate">{m.email??"—"}</p>
                          {m.department&&<p className="text-[9px] text-gray-300 truncate">{m.department}</p>}
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold capitalize flex-shrink-0 ${ROLE_BADGE[m.role]??"bg-gray-100 text-gray-600"}`}>
                          {m.role??"—"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Docs tab */}
            {activeTab==="docs"&&(
              <DocumentPanel project={project} canUpload={canUpload} canView={canViewDoc}
                onUpload={onUploadDoc} onDelete={onDeleteDoc}/>
            )}

            {/* Daily Status tab */}
            {activeTab==="dailystatus"&&(
              <DailyStatusPanel
                project={project} currentUserId={currentUserId}
                isAdmin={isAdmin} isManager={isManager}
                canSubmit={canSubmit} canViewAll={canViewAll}
                onSubmit={onSubmitDailyStatus}
                onDelete={onDeleteDailyStatus}
                onComment={onCommentDailyStatus}
              />
            )}

            {/* Submissions tab */}
            {activeTab==="submissions"&&(
              <div className="space-y-3">
                {canSubmit&&(
                  <SubmissionForm onSubmit={onSubmitWork}/>
                )}
                {(canViewAll?(project.workSubmissions??[]):(project.workSubmissions??[]).filter(s=>s.submittedBy?._id===currentUserId)).length===0?(
                  <div className="text-center py-10">
                    <Send className="h-10 w-10 text-gray-200 mx-auto mb-2"/>
                    <p className="text-xs text-gray-400">No submissions yet</p>
                  </div>
                ):(
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {[...(canViewAll?project.workSubmissions:project.workSubmissions.filter(s=>s.submittedBy?._id===currentUserId))].reverse().map(sub=>(
                      <div key={sub._id} className="p-3 bg-white border border-gray-100 rounded-xl group hover:border-gray-200">
                        <div className="flex items-start gap-2">
                          <Avatar name={sub.submittedBy?.name??"?"} size="sm" color="blue"/>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-gray-800">{sub.submittedBy?.name??"Unknown"}</span>
                                {sub.hoursWorked>0&&<span className="flex items-center gap-0.5 text-[10px] text-blue-600 font-semibold"><Clock className="h-2.5 w-2.5"/>{sub.hoursWorked}h</span>}
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-gray-400">{fmtDate(sub.date)}</span>
                                {canViewAll&&<button onClick={()=>onDeleteSubmission(sub._id)} className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100"><Trash2 className="h-3 w-3"/></button>}
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SubmissionForm({onSubmit}:{onSubmit:(d:any)=>Promise<void>}) {
  const [open,setOpen]=useState(false);
  const [desc,setDesc]=useState("");
  const [hours,setHours]=useState("");
  const [saving,setSaving]=useState(false);
  if(!open)return(
    <button onClick={()=>setOpen(true)}
      className="flex items-center justify-center gap-2 w-full h-9 text-xs font-semibold border-2 border-dashed border-emerald-200 rounded-xl text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400 transition-all">
      <Send className="h-3.5 w-3.5"/>Submit Work Update
    </button>
  );
  return(
    <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-3 space-y-2">
      <Textarea className="text-xs resize-none bg-white" rows={2} placeholder="Describe your work…" value={desc} onChange={e=>setDesc(e.target.value)}/>
      <div className="flex items-center gap-2">
        <Input type="number" className="h-8 text-xs w-24" placeholder="Hours" value={hours} onChange={e=>setHours(e.target.value)}/>
        <div className="flex gap-2 ml-auto">
          <button onClick={async()=>{if(!desc.trim())return;setSaving(true);try{await onSubmit({description:desc,hoursWorked:Number(hours)||0});setDesc("");setHours("");setOpen(false);}finally{setSaving(false);}}}
            disabled={saving||!desc.trim()} className="h-8 px-4 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
            {saving?"Saving…":"Submit"}
          </button>
          <button onClick={()=>{setOpen(false);setDesc("");setHours("");}} className="h-8 px-3 text-xs border rounded-lg hover:bg-gray-50 text-gray-600">Cancel</button>
        </div>
      </div>
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
  const [editId,     setEditId]     = useState<string|null>(null);
  const [toastMsg,   setToastMsg]   = useState("");
  const [toastType,  setToastType]  = useState<"ok"|"err">("ok");
  const [submitting, setSubmitting] = useState(false);
  const [selMembers, setSelMembers] = useState<string[]>([]);
  const [manMembers, setManMembers] = useState<string[]>([]);
  const [form,       setForm]       = useState<FormState>(EMPTY_FORM);
  const [manForm,    setManForm]    = useState<FormState>(EMPTY_MANUAL);
  const [search,     setSearch]     = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  const showToast=useCallback((msg:string,type:"ok"|"err"="ok")=>{
    setToastMsg(msg);setToastType(type);setTimeout(()=>setToastMsg(""),3500);
  },[]);

  const loadProjects=useCallback(async(silent=false)=>{
    try{
      if(!silent)setLoading(true);else setRefreshing(true);
      const data=(isAdmin||isManager||isHR)?await projectApi.getAll():await projectApi.getMy();
      setProjects(data.projects??[]);
    }catch(err:any){showToast("❌ "+(err?.message??"Error"),"err");}
    finally{setLoading(false);setRefreshing(false);}
  },[isAdmin,isManager,isHR,showToast]);

  const loadUsers=useCallback(async()=>{
    if(!isAdmin&&!isManager&&!isHR)return;
    try{
      const [mgr,all]=await Promise.all([projectApi.getManagers(),projectApi.getAllUsers()]);
      setManagers(mgr.users??[]);setAllUsers(all.users??[]);
    }catch(err:any){console.error("loadUsers:",err?.message);}
  },[isAdmin,isManager,isHR]);

  useEffect(()=>{if(!currentUser)return;Promise.all([loadProjects(),loadUsers()]);},[currentUser]);

  const toggle=(id:string,manual=false)=>{
    if(manual)setManMembers(p=>p.includes(id)?p.filter(m=>m!==id):[...p,id]);
    else setSelMembers(p=>p.includes(id)?p.filter(m=>m!==id):[...p,id]);
  };

  const resetForm=()=>{setIsEdit(false);setEditId(null);setSelMembers([]);setForm(EMPTY_FORM);setOpen(false);};

  const handleSubmit=async()=>{
    if(!form.name)return showToast("❌ Project name required","err");
    if(!form.clientName)return showToast("❌ Client name required","err");
    if(!form.budget)return showToast("❌ Budget required","err");
    if(!form.managerId)return showToast("❌ Manager required","err");
    setSubmitting(true);
    try{
      const payload:any={
        name:form.name,description:form.description,clientName:form.clientName,
        deadline:form.deadline,status:form.status,priority:form.priority,
        budget:Number(form.budget),managerId:form.managerId,teamMembers:selMembers,
        tags:form.tags?form.tags.split(",").map(t=>t.trim()).filter(Boolean):[],
      };
      if(form.createdAt)payload.createdAt=form.createdAt;
      if(isEdit&&editId){await projectApi.update(editId,payload);showToast("✅ Project updated");}
      else{await projectApi.create(payload);showToast("✅ Project created");}
      await loadProjects(true);resetForm();
    }catch(err:any){showToast("❌ "+(err?.message??"Error"),"err");}
    finally{setSubmitting(false);}
  };

  const handleManualSubmit=async()=>{
    if(!manForm.name)return showToast("❌ Project name required","err");
    if(!manForm.clientName)return showToast("❌ Client name required","err");
    setSubmitting(true);
    try{
      const payload:any={
        name:manForm.name,description:manForm.description,clientName:manForm.clientName,
        deadline:manForm.deadline,status:manForm.status,priority:manForm.priority,
        budget:Number(manForm.budget)||0,spent:Number(manForm.spent)||0,
        progress:Number(manForm.progress)||0,teamMembers:manMembers,
        tags:manForm.tags?manForm.tags.split(",").map(t=>t.trim()).filter(Boolean):[],
      };
      if(manForm.managerId)payload.managerId=manForm.managerId;
      if(manForm.createdAt)payload.createdAt=manForm.createdAt;
      await projectApi.createManual(payload);
      showToast("✅ Historical record saved");
      await loadProjects(true);setManForm(EMPTY_MANUAL);setManMembers([]);setManualOpen(false);
    }catch(err:any){showToast("❌ "+(err?.message??"Error"),"err");}
    finally{setSubmitting(false);}
  };

  const handleDelete=async(id:string)=>{
    if(!window.confirm("Permanently delete this project?"))return;
    try{await projectApi.delete(id);showToast("✅ Project deleted");await loadProjects(true);}
    catch(err:any){showToast("❌ "+(err?.message??"Error"),"err");}
  };

  const handleEdit=(p:Project)=>{
    setIsEdit(true);setEditId(p._id);
    setForm({name:p.name,description:p.description,clientName:p.clientName,deadline:p.deadline,
      status:p.status,priority:p.priority||"medium",budget:String(p.budget),spent:String(p.spent),
      progress:String(p.progress),managerId:p.managerId?._id??p.managerId??"",createdAt:"",
      tags:(p.tags??[]).join(", ")});
    setSelMembers(Array.isArray(p.teamMembers)?p.teamMembers.map((m:any)=>m._id??m):[]);
    setOpen(true);
  };

  const handleProgressUpdate=async(id:string,v:number)=>{
    try{await projectApi.update(id,{progress:v});showToast("✅ Progress updated");await loadProjects(true);}
    catch(err:any){showToast("❌ "+(err?.message??"Error"),"err");}
  };
  const handleSpentUpdate=async(id:string,v:number)=>{
    try{await projectApi.update(id,{spent:v});showToast("✅ Spent updated");await loadProjects(true);}
    catch(err:any){showToast("❌ "+(err?.message??"Error"),"err");}
  };
  const handleUploadDoc=async(projectId:string,doc:any)=>{
    try{await projectApi.uploadDocument(projectId,doc);showToast("✅ Document uploaded");await loadProjects(true);}
    catch(err:any){showToast("❌ "+(err?.message??"Error"),"err");}
  };
  const handleDeleteDoc=async(projectId:string,docId:string)=>{
    if(!window.confirm("Delete this document?"))return;
    try{await projectApi.deleteDocument(projectId,docId);showToast("✅ Document deleted");await loadProjects(true);}
    catch(err:any){showToast("❌ "+(err?.message??"Error"),"err");}
  };
  const handleSubmitDailyStatus=async(projectId:string,data:any):Promise<void>=>{
    await (projectApi as any).submitDailyStatus(projectId,data);
    showToast("✅ Daily status submitted");await loadProjects(true);
  };
  const handleDeleteDailyStatus=async(projectId:string,id:string)=>{
    if(!window.confirm("Delete this status entry?"))return;
    try{await (projectApi as any).deleteDailyStatus(projectId,id);showToast("✅ Entry deleted");await loadProjects(true);}
    catch(err:any){showToast("❌ "+(err?.message??"Error"),"err");}
  };
  const handleCommentDailyStatus=async(projectId:string,statusId:string,comment:string):Promise<void>=>{
    await (projectApi as any).commentDailyStatus(projectId,statusId,comment);
    showToast("✅ Comment saved");await loadProjects(true);
  };
  const handleSubmitWork=async(projectId:string,data:any):Promise<void>=>{
    await projectApi.submitWork(projectId,data);showToast("✅ Submission saved");await loadProjects(true);
  };
  const handleDeleteSubmission=async(projectId:string,subId:string)=>{
    if(!window.confirm("Delete this submission?"))return;
    try{await projectApi.deleteSubmission(projectId,subId);showToast("✅ Submission deleted");await loadProjects(true);}
    catch(err:any){showToast("❌ "+(err?.message??"Error"),"err");}
  };

  const filtered=projects.filter(p=>{
    const q=search.toLowerCase();
    const ms=!search||p.name.toLowerCase().includes(q)||p.clientName.toLowerCase().includes(q)||p.managerId?.name?.toLowerCase?.()?.includes(q);
    const st=filterStatus==="all"||p.status===filterStatus;
    const pr=filterPriority==="all"||p.priority===filterPriority;
    return ms&&st&&pr;
  });

  const totalBudget=projects.reduce((s,p)=>s+p.budget,0);
  const totalSpent =projects.reduce((s,p)=>s+p.spent,0);
  const burnRate   =totalBudget>0?((totalSpent/totalBudget)*100).toFixed(1):"0";
  const avgProgress=projects.length>0?Math.round(projects.reduce((s,p)=>s+p.progress,0)/projects.length):0;
  const byStatus=Object.keys(STATUS_CFG).reduce((a,k)=>{a[k]=projects.filter(p=>p.status===k).length;return a;},{} as Record<string,number>);

  if(loading)return(
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="w-8 h-8 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin"/>
      <p className="text-xs text-gray-400 font-medium">Loading projects…</p>
    </div>
  );

  return (
    <div className="space-y-5 max-w-5xl mx-auto px-3 sm:px-4 pb-12">
      <Toast msg={toastMsg} type={toastType}/>

      {/* ── Historical Entry Dialog ── */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">📋 Historical Project Entry</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">Backdate a completed project with full details.</DialogDescription>
          </DialogHeader>
          <div className="text-xs bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-amber-700 mb-2">
            ⚠️ Saved directly to MongoDB with your specified record date.
          </div>
          <ProjectFormFields form={manForm} setForm={setManForm} managers={managers} allUsers={allUsers}
            selectedMembers={manMembers} onToggleMember={id=>toggle(id,true)} isManual/>
          <button onClick={handleManualSubmit} disabled={submitting}
            className="w-full mt-4 h-10 text-sm font-bold bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50">
            {submitting?"Saving…":"💾 Save Historical Record"}
          </button>
        </DialogContent>
      </Dialog>

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={open} onOpenChange={v=>{if(!v)resetForm();else setOpen(true);}}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">{isEdit?"Edit Project":"New Project"}</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              {isEdit?"Update project details.":"Create a new project and assign your team."}
            </DialogDescription>
          </DialogHeader>
          <ProjectFormFields form={form} setForm={setForm} managers={managers} allUsers={allUsers}
            selectedMembers={selMembers} onToggleMember={id=>toggle(id,false)}/>
          <button onClick={handleSubmit} disabled={submitting}
            className="w-full mt-4 h-10 text-sm font-bold bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50">
            {submitting?"Saving…":isEdit?"Update Project":"Create Project"}
          </button>
        </DialogContent>
      </Dialog>

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center">
              <FolderOpen className="h-4 w-4 text-orange-600"/>
            </div>
            Project Management
          </h1>
          <p className="text-xs text-gray-400 mt-0.5 ml-10">
            {projects.length} project{projects.length!==1?"s":""}
            {filtered.length!==projects.length&&` · ${filtered.length} shown`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={()=>loadProjects(true)} disabled={refreshing}
            className="h-9 px-3 flex items-center gap-1.5 text-xs border border-gray-200 rounded-xl bg-white hover:bg-gray-50 text-gray-600 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing?"animate-spin":""}`}/>
          </button>
          {isAdmin&&(
            <>
              <button onClick={()=>setManualOpen(true)}
                className="h-9 px-3 flex items-center gap-1.5 text-xs border border-gray-200 rounded-xl bg-white hover:bg-gray-50 text-gray-700 font-medium">
                <ClipboardList className="h-3.5 w-3.5"/><span className="hidden sm:inline">Manual Entry</span>
              </button>
              <button onClick={()=>{resetForm();setOpen(true);}}
                className="h-9 px-4 flex items-center gap-1.5 text-xs bg-gray-900 text-white rounded-xl hover:bg-gray-800 font-bold">
                <Plus className="h-3.5 w-3.5"/><span className="hidden sm:inline">New Project</span>
              </button>
              <button onClick={()=>exportToCSV(projects)}
                className="h-9 px-3 flex items-center gap-1.5 text-xs border border-gray-200 rounded-xl bg-white hover:bg-gray-50 text-gray-700">
                <Download className="h-3.5 w-3.5"/>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {icon:<BarChart3 className="h-4 w-4 text-blue-500"/>,  bg:"bg-blue-50",    label:"Avg Progress", value:`${avgProgress}%`, sub:`${projects.length} projects`},
          {icon:<Flame className="h-4 w-4 text-orange-500"/>,    bg:"bg-orange-50",  label:"Budget Burn",  value:`${burnRate}%`,   sub:`₹${(totalSpent/100000).toFixed(1)}L spent`},
          {icon:<CheckCircle2 className="h-4 w-4 text-emerald-500"/>, bg:"bg-emerald-50", label:"Completed", value:String(byStatus.completed??0), sub:`${byStatus["in-progress"]??0} in progress`},
          {icon:<Wallet className="h-4 w-4 text-purple-500"/>,   bg:"bg-purple-50",  label:"Total Budget",
            value:totalBudget>=100000?`₹${(totalBudget/100000).toFixed(1)}L`:`₹${totalBudget.toLocaleString()}`,
            sub:`${byStatus["on-hold"]??0} on hold`},
        ].map((s,i)=>(
          <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 ${s.bg} rounded-xl flex items-center justify-center`}>{s.icon}</div>
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 leading-none">{s.value}</p>
            <p className="text-[10px] text-gray-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {Object.entries(STATUS_CFG).map(([k,v])=>(
            <button key={k} onClick={()=>setFilterStatus(filterStatus===k?"all":k)}
              className={`inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full font-semibold border transition-all
                ${filterStatus===k?`${v.bg} ${v.text} ${v.border} ring-2 ring-offset-1 ring-current`:`${v.bg} ${v.text} ${v.border} opacity-70 hover:opacity-100`}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`}/>{v.label} ({byStatus[k]??0})
            </button>
          ))}
          {filterStatus!=="all"&&<button onClick={()=>setFilterStatus("all")} className="text-[11px] px-2 py-1.5 rounded-full text-gray-400 hover:bg-gray-100 border border-gray-200 flex items-center gap-0.5"><X className="h-2.5 w-2.5"/>Clear</button>}
        </div>
        {/* Priority filter */}
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="h-8 text-[11px] w-32 rounded-full border-gray-200"><SelectValue placeholder="Priority"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {Object.entries(PRIORITY_CFG).map(([k,v])=><SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* ── Search ── */}
      <div className="flex items-center gap-2 border border-gray-200 rounded-2xl px-4 py-2.5 bg-white focus-within:border-gray-400 focus-within:shadow-sm transition-all">
        <Search className="h-4 w-4 text-gray-400"/>
        <input className="flex-1 text-sm outline-none placeholder-gray-400 text-gray-700"
          placeholder="Search projects by name, client, or manager…"
          value={search} onChange={e=>setSearch(e.target.value)}/>
        {search&&<button onClick={()=>setSearch("")}><X className="h-4 w-4 text-gray-400 hover:text-gray-600"/></button>}
      </div>

      {/* ── Project List ── */}
      {filtered.length===0?(
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl py-20 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Layers className="h-8 w-8 text-gray-400"/>
          </div>
          <p className="text-base font-bold text-gray-600">{search||filterStatus!=="all"||filterPriority!=="all"?"No projects match your filters":"No projects yet"}</p>
          {isAdmin&&!search&&filterStatus==="all"&&filterPriority==="all"&&(
            <p className="text-xs text-gray-400 mt-2">Click "New Project" to get started.</p>
          )}
        </div>
      ):(
        <div className="space-y-3">
          {filtered.map(project=>(
            <ProjectCard key={project._id} project={project} role={role} currentUserId={userId}
              isAdmin={isAdmin} isManager={isManager} isHR={isHR}
              onEdit={()=>handleEdit(project)} onDelete={()=>handleDelete(project._id)}
              onProgressUpdate={v=>handleProgressUpdate(project._id,v)}
              onSpentUpdate={v=>handleSpentUpdate(project._id,v)}
              onUploadDoc={d=>handleUploadDoc(project._id,d)}
              onDeleteDoc={docId=>handleDeleteDoc(project._id,docId)}
              onSubmitDailyStatus={d=>handleSubmitDailyStatus(project._id,d)}
              onDeleteDailyStatus={id=>handleDeleteDailyStatus(project._id,id)}
              onCommentDailyStatus={(sid,c)=>handleCommentDailyStatus(project._id,sid,c)}
              onSubmitWork={d=>handleSubmitWork(project._id,d)}
              onDeleteSubmission={subId=>handleDeleteSubmission(project._id,subId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
