// src/app/components/modules/EmailCommunicationModule.tsx
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { emailCommApi } from "@/services/api";
import {
  Mail, Send, Users, Search, X, Plus, CheckCheck,
  Info, Loader2, Wifi, WifiOff, Building2,
  Inbox, Clock, RefreshCw, Zap, Shield,
  TrendingUp, CheckCircle2, XCircle, Sparkles,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────── */
interface TeamUser {
  _id: string; name: string; email: string;
  role: string; department?: string; designation?: string;
}
interface Recipient { name: string; email: string; }
type Priority   = "normal" | "medium" | "high";
type ComposeTab = "compose" | "team";
type Panel      = "compose" | "history" | "directory";

/* ─── Config ─────────────────────────────────────────────── */
const ROLE: Record<string, { label: string; chip: string; dot: string; bg: string }> = {
  admin:    { label: "Admin",    chip: "bg-rose-100 text-rose-700 border-rose-200",          dot: "bg-rose-500",    bg: "bg-rose-50"    },
  manager:  { label: "Manager",  chip: "bg-blue-100 text-blue-700 border-blue-200",          dot: "bg-blue-500",    bg: "bg-blue-50"    },
  hr:       { label: "HR",       chip: "bg-violet-100 text-violet-700 border-violet-200",    dot: "bg-violet-500",  bg: "bg-violet-50"  },
  employee: { label: "Employee", chip: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", bg: "bg-emerald-50" },
};
const PRI: Record<Priority, { label: string; chip: string; dot: string; icon: string }> = {
  normal: { label: "Normal", chip: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400", icon: "🟢" },
  medium: { label: "Medium", chip: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-400", icon: "🟡" },
  high:   { label: "High",   chip: "bg-red-100 text-red-700 border-red-200",       dot: "bg-red-500",   icon: "🔴" },
};

const GRADIENTS = [
  "from-violet-500 to-purple-600","from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600","from-orange-500 to-red-500","from-pink-500 to-rose-600",
  "from-indigo-500 to-violet-600","from-teal-500 to-emerald-600",
];
const avatarGrad = (n: string) => GRADIENTS[n.charCodeAt(0) % GRADIENTS.length];
const getInitials = (n: string) => n.split(" ").map(x => x[0]).join("").toUpperCase().slice(0, 2);

/* ─── Avatar ── */
const Av = ({ name, size = "md" }: { name: string; size?: "xs"|"sm"|"md"|"lg" }) => {
  const s = { xs:"w-7 h-7 text-[10px]", sm:"w-9 h-9 text-xs", md:"w-11 h-11 text-sm", lg:"w-14 h-14 text-base" };
  return (
    <div className={`${s[size]} bg-gradient-to-br ${avatarGrad(name)} rounded-2xl flex items-center justify-center text-white font-black flex-shrink-0 shadow-md ring-2 ring-white`}>
      {getInitials(name)}
    </div>
  );
};

/* ─── Tag pill ── */
const RecipTag = ({ name, onRemove }: { name: string; onRemove: () => void }) => (
  <span className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1.5 rounded-xl">
    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
    {name}
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
      onClick={onRemove}
      className="hover:text-red-500 hover:bg-red-50 rounded-lg p-0.5 transition-all ml-0.5"
    >
      <X className="w-2.5 h-2.5" />
    </button>
  </span>
);

/* ─── Priority badge ── */
const PriBadge = ({ p }: { p: Priority }) => (
  <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wide ${PRI[p].chip}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${PRI[p].dot}`} />
    {PRI[p].label}
  </span>
);

/* ─── Stat card ── */
const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string|number; color: string }) => (
  <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-all">
    <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <p className="text-2xl font-black text-slate-800">{value}</p>
    <p className="text-xs text-slate-400 font-semibold mt-0.5">{label}</p>
    <div className={`absolute top-0 right-0 w-16 h-16 ${color} opacity-5 rounded-full -translate-y-4 translate-x-4`} />
  </div>
);

/* ─── Subject Input ── */
const SubjectInput = ({
  value, onChange, placeholder = "Email subject…"
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) => (
  <div>
    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
      Subject <span className="text-red-400">*</span>
    </label>
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white border-2 border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-500/10 transition-all placeholder:font-normal placeholder:text-slate-300 shadow-sm"
    />
  </div>
);

/* ─── Priority Picker ── */
const PriPicker = ({
  value, onChange
}: {
  value: Priority; onChange: (p: Priority) => void;
}) => (
  <div>
    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Priority</label>
    <div className="grid grid-cols-3 gap-2">
      {(["normal","medium","high"] as Priority[]).map(p => (
        <button key={p} type="button" onClick={() => onChange(p)}
          className={`flex flex-col items-center gap-1.5 py-3.5 rounded-2xl border-2 text-xs font-black transition-all ${
            value === p
              ? `${PRI[p].chip} shadow-md scale-[1.02]`
              : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50"
          }`}>
          <span className="text-lg">{PRI[p].icon}</span>
          <span>{PRI[p].label}</span>
        </button>
      ))}
    </div>
  </div>
);

/* ─── Message Area ── */
const MsgArea = ({
  value, onChange, rows = 8, placeholder = "Write your message here…"
}: {
  value: string; onChange: (v: string) => void; rows?: number; placeholder?: string;
}) => (
  <div>
    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
      Message <span className="text-red-400">*</span>
    </label>
    <div className="relative">
      <textarea
        rows={rows}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border-2 border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-500/10 transition-all placeholder:text-slate-300 resize-none leading-relaxed shadow-sm"
      />
      <span className={`absolute bottom-3 right-3 text-[10px] font-bold px-2 py-1 rounded-lg ${value.length > 0 ? "bg-slate-100 text-slate-500" : "bg-slate-50 text-slate-300"}`}>
        {value.length} chars
      </span>
    </div>
  </div>
);

/* ─── Send Row ── */
const SendRow = ({
  onSend, onClear, disabled, label, count, sending
}: {
  onSend: () => void; onClear: () => void; disabled: boolean;
  label: string; count: number; sending: boolean;
}) => (
  <div className="flex items-center justify-between pt-5 border-t-2 border-slate-100">
    <button type="button" onClick={onClear}
      className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-600 font-black px-4 py-2.5 rounded-xl hover:bg-slate-100 transition-all">
      <X className="w-3.5 h-3.5" /> Clear All
    </button>
    <div className="flex items-center gap-3">
      {count > 0 && (
        <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5">
          <Users className="w-3 h-3 text-slate-500" />
          <span className="text-xs font-black text-slate-600">{count} {label}{count > 1 ? "s" : ""}</span>
        </div>
      )}
      <button type="button" onClick={onSend} disabled={disabled || sending}
        className={`flex items-center gap-2.5 px-8 py-3 rounded-2xl text-sm font-black transition-all shadow-lg ${
          disabled || sending
            ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
            : "bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white shadow-slate-300 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
        }`}>
        {sending
          ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</>
          : <><Send className="w-4 h-4" />Send Email</>}
      </button>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   RECIPIENT FIELD — isolated to prevent parent re-render focus loss
═══════════════════════════════════════════════════════════ */
interface RecipFieldProps {
  label: string;
  required?: boolean;
  list: Recipient[];
  onRemove: (email: string) => void;
  onAdd: (u: TeamUser) => void;
  suggestions: TeamUser[];
  placeholder?: string;
}

function RecipField({ label, required, list, onRemove, onAdd, suggestions, placeholder }: RecipFieldProps) {
  const [query, setQuery] = useState("");
  const [open,  setOpen]  = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = useMemo(() =>
    suggestions.filter(u =>
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8),
  [suggestions, query]);

  const handleAdd = useCallback((u: TeamUser) => {
    onAdd(u);
    setQuery("");
    setOpen(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [onAdd]);

  return (
    <div ref={ref} className="relative">
      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
        className={`min-h-[52px] bg-white border-2 rounded-2xl px-3 py-2.5 flex flex-wrap gap-1.5 items-center cursor-text transition-all shadow-sm ${
          open ? "border-slate-400 ring-4 ring-slate-500/10" : "border-slate-200 hover:border-slate-300"
        }`}
      >
        {list.map(r => (
          <RecipTag key={r.email} name={r.name} onRemove={() => onRemove(r.email)} />
        ))}
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={list.length ? "Add more…" : (placeholder || "Search name or email…")}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="flex-1 min-w-[140px] outline-none text-sm text-slate-700 placeholder:text-slate-300 bg-transparent font-medium"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto">
          <div className="p-2 space-y-0.5">
            {filtered.map(u => (
              <button
                key={u._id}
                type="button"
                onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                onClick={() => handleAdd(u)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-xl text-left transition-all group"
              >
                <Av name={u.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{u.name}</p>
                  <p className="text-xs text-slate-400 truncate">{u.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${ROLE[u.role]?.chip}`}>
                    {ROLE[u.role]?.label}
                  </span>
                  {u.department && <span className="text-[9px] text-slate-400">{u.department}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export function EmailCommunicationModule() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;
  const isPriv = ["admin","manager","hr"].includes(currentUser.role);

  /* ── Core state ── */
  const [dir,      setDir]      = useState<TeamUser[]>([]);
  const [loadDir,  setLoadDir]  = useState(true);
  const [smtp,     setSmtp]     = useState<"unknown"|"ok"|"error">("unknown");
  const [toast,    setToast]    = useState<{ msg: string; type: "success"|"error"|"info"|"warning" }|null>(null);
  const [tab,      setTab]      = useState<ComposeTab>("compose");
  const [panel,    setPanel]    = useState<Panel>("compose");
  const [sending,  setSending]  = useState(false);
  const [hist,     setHist]     = useState<any[]>([]);
  const [loadHist, setLoadHist] = useState(false);

  /* ── Compose — direct ── */
  const [toList,  setToList]  = useState<Recipient[]>([]);
  const [ccList,  setCcList]  = useState<Recipient[]>([]);
  const [showCc,  setShowCc]  = useState(false);
  const [subj,    setSubj]    = useState("");
  const [msg,     setMsg]     = useState("");
  const [pri,     setPri]     = useState<Priority>("normal");

  /* ── Team ── */
  const [roles,   setRoles]   = useState<string[]>([]);
  const [tSubj,   setTSubj]   = useState("");
  const [tMsg,    setTMsg]    = useState("");
  const [tPri,    setTPri]    = useState<Priority>("normal");

  /* ── Directory search ── */
  const [dq,    setDq]    = useState("");
  const [drole, setDrole] = useState("all");

  /* ── Toast ── */
  const flash = useCallback((msg: string, type: "success"|"error"|"info"|"warning" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  /* ── Data loaders ── */
  const fetchDir = async () => {
    setLoadDir(true);
    try { const d = await emailCommApi.getDirectory(); setDir(d.users || []); }
    catch { flash("Could not load directory", "error"); }
    finally { setLoadDir(false); }
  };

  const fetchSmtp = async () => {
    setSmtp("unknown");
    try { await emailCommApi.testSmtp(); setSmtp("ok"); }
    catch { setSmtp("error"); }
  };

  const fetchHist = async () => {
    setLoadHist(true);
    try { const d = await emailCommApi.getLogs(); setHist(d.logs || []); }
    catch { /* silent */ }
    finally { setLoadHist(false); }
  };

  useEffect(() => {
    fetchDir();
    if (currentUser.role === "admin") { fetchSmtp(); fetchHist(); }
  }, []);

  /* ── Suggestion lists (memoised) ── */
  const toSuggestions = useMemo(() =>
    dir.filter(u => !toList.some(r => r.email === u.email)),
  [dir, toList]);

  const ccSuggestions = useMemo(() =>
    dir.filter(u => !ccList.some(r => r.email === u.email) && !toList.some(r => r.email === u.email)),
  [dir, ccList, toList]);

  /* ── Recipient handlers ── */
  const addTo = useCallback((u: TeamUser) => {
    setToList(p => p.some(r => r.email === u.email) ? p : [...p, { name: u.name, email: u.email }]);
  }, []);

  const addCc = useCallback((u: TeamUser) => {
    setCcList(p => p.some(r => r.email === u.email) ? p : [...p, { name: u.name, email: u.email }]);
  }, []);

  const removeFrom   = useCallback((email: string) => setToList(p => p.filter(r => r.email !== email)), []);
  const removeFromCc = useCallback((email: string) => setCcList(p => p.filter(r => r.email !== email)), []);

  /* ── Team preview ── */
  const preview = useMemo(() =>
    roles.length ? dir.filter(u => roles.includes(u.role)) : [],
  [roles, dir]);

  /* ── Reset ── */
  const resetDirect = () => { setToList([]); setCcList([]); setShowCc(false); setSubj(""); setMsg(""); setPri("normal"); };
  const resetTeam   = () => { setRoles([]); setTSubj(""); setTMsg(""); setTPri("normal"); };

  /* ── Send handlers ── */
  const handleSend = async () => {
    if (!toList.length) return flash("Add at least one recipient", "error");
    if (!subj.trim())   return flash("Subject is required", "error");
    if (!msg.trim())    return flash("Message body is required", "error");
    setSending(true);
    try {
      const res = await emailCommApi.send({
        to: toList.map(r => r.email), cc: ccList.map(r => r.email),
        subject: subj.trim(), body: msg.trim(), priority: pri,
      });
      setHist(p => [{
        _id: Date.now(), type: "direct", to: toList.map(r => r.email),
        subject: subj.trim(), body: msg.trim(), priority: pri,
        status: "sent", createdAt: new Date().toISOString(),
        sentBy: { name: currentUser.name },
      }, ...p]);
      flash(`Email delivered to ${toList.length} recipient(s)!`);
      resetDirect();
    } catch (e: any) { flash(e.message || "Failed to send", "error"); }
    finally { setSending(false); }
  };

  const handleTeam = async () => {
    if (!roles.length)   return flash("Select at least one role", "error");
    if (!tSubj.trim())   return flash("Subject is required", "error");
    if (!tMsg.trim())    return flash("Message body is required", "error");
    if (!preview.length) return flash("No members in selected roles", "error");
    setSending(true);
    try {
      const res = await emailCommApi.sendToTeam({ roles, subject: tSubj.trim(), body: tMsg.trim(), priority: tPri });
      setHist(p => [{
        _id: Date.now(), type: "team", roles,
        to: preview.map(u => u.email),
        subject: tSubj.trim(), body: tMsg.trim(), priority: tPri,
        status: "sent", createdAt: new Date().toISOString(),
        recipientCount: res.recipientCount, sentBy: { name: currentUser.name },
      }, ...p]);
      flash(`Broadcast delivered to ${res.recipientCount} members!`);
      resetTeam();
    } catch (e: any) { flash(e.message || "Failed to send", "error"); }
    finally { setSending(false); }
  };

  /* ── Directory filter ── */
  const filtDir = useMemo(() => {
    const q = dq.toLowerCase();
    return dir.filter(u =>
      (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.department?.toLowerCase().includes(q))
      && (drole === "all" || u.role === drole)
    );
  }, [dir, dq, drole]);

  const rGroups = useMemo(() =>
    ["admin","manager","hr","employee"]
      .map(r => ({ role: r, users: filtDir.filter(u => u.role === r) }))
      .filter(g => g.users.length > 0),
  [filtDir]);

  /* ── Stats ── */
  const sentCount   = hist.filter(h => h.status === "sent").length;
  const failedCount = hist.filter(h => h.status === "failed").length;
  const teamCount   = hist.filter(h => h.type === "team").length;

  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col bg-slate-50" style={{ height: "calc(100vh - 72px)" }}>
      <style>{`
        .email-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .email-scroll::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 99px; }
        .email-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
        .email-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      {/* ── TOAST ── */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[300] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border max-w-sm ${
          toast.type === "error"   ? "bg-white border-red-200 text-red-700" :
          toast.type === "warning" ? "bg-white border-amber-200 text-amber-700" :
          toast.type === "info"    ? "bg-white border-slate-200 text-slate-700" :
          "bg-white border-emerald-200 text-emerald-700"
        }`}>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
            toast.type === "error"   ? "bg-red-100" :
            toast.type === "warning" ? "bg-amber-100" :
            toast.type === "info"    ? "bg-slate-100" : "bg-emerald-100"
          }`}>
            {toast.type === "error"   ? <XCircle className="w-4 h-4" /> :
             toast.type === "info"    ? <Info className="w-4 h-4" /> :
             <CheckCircle2 className="w-4 h-4" />}
          </div>
          <span className="text-sm font-semibold flex-1">{toast.msg}</span>
          <button onClick={() => setToast(null)} className="opacity-40 hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-11 h-11 bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-black text-slate-900 leading-tight">Email Communication</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-slate-400">via</span>
                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">quibotechnologies@gmail.com</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {currentUser.role === "admin" && (
              <button onClick={fetchSmtp}
                className={`hidden sm:flex items-center gap-2 text-xs px-3 py-2 rounded-xl border font-bold transition-all ${
                  smtp === "ok"    ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                  smtp === "error" ? "bg-red-50 border-red-200 text-red-600" :
                  "bg-slate-50 border-slate-200 text-slate-500"
                }`}>
                {smtp === "ok"    ? <Wifi className="w-3.5 h-3.5" /> :
                 smtp === "error" ? <WifiOff className="w-3.5 h-3.5" /> :
                 <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {smtp === "ok" ? "Connected" : smtp === "error" ? "API Error" : "Checking…"}
              </button>
            )}
            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-black text-slate-700">{dir.length} members</span>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="flex sm:hidden gap-1 mt-3">
          {(["compose","history","directory"] as Panel[]).map(p => (
            <button key={p} onClick={() => setPanel(p)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all capitalize ${
                panel === p ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100"
              }`}>
              {p}
            </button>
          ))}
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── SIDEBAR ── */}
        <aside className="hidden sm:flex w-60 xl:w-64 flex-shrink-0 flex-col bg-white border-r border-slate-200 p-4 gap-1.5">
          {([
            { id: "compose",   label: "Compose",   icon: Mail,  sub: "New email",             badge: 0           },
            { id: "history",   label: "Sent Mail", icon: Inbox, sub: "Email history",         badge: hist.length },
            { id: "directory", label: "Directory", icon: Users, sub: `${dir.length} members`, badge: 0           },
          ] as { id: Panel; label: string; icon: any; sub: string; badge: number }[]).map(n => (
            <button key={n.id} onClick={() => setPanel(n.id)}
              className={`w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl text-left transition-all ${
                panel === n.id ? "bg-slate-800 text-white shadow-lg" : "text-slate-600 hover:bg-slate-50"
              }`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                panel === n.id ? "bg-white/20" : "bg-slate-100"
              }`}>
                <n.icon className={`w-4 h-4 ${panel === n.id ? "text-white" : "text-slate-500"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black truncate">{n.label}</p>
                <p className={`text-[10px] truncate mt-0.5 ${panel === n.id ? "text-white/60" : "text-slate-400"}`}>{n.sub}</p>
              </div>
              {n.badge > 0 && (
                <span className={`text-[10px] px-2 py-1 rounded-lg font-black ${panel === n.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                  {n.badge}
                </span>
              )}
            </button>
          ))}

          {/* Activity */}
          {hist.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Activity</p>
              {[
                { label: "Sent",   val: sentCount,   color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Team",   val: teamCount,   color: "text-slate-700",   bg: "bg-slate-100"  },
                { label: "Failed", val: failedCount, color: "text-red-500",     bg: "bg-red-50"     },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between px-3 py-2 rounded-xl mb-1 bg-slate-50">
                  <span className="text-xs text-slate-500 font-semibold">{s.label}</span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${s.bg} ${s.color}`}>{s.val}</span>
                </div>
              ))}
            </div>
          )}

          {/* Sender card */}
          <div className="mt-auto pt-3 border-t border-slate-100">
            <div className="bg-slate-800 rounded-2xl p-4 text-white">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Sending As</p>
              <div className="flex items-center gap-2 mb-3">
                <Av name={currentUser.name} size="sm" />
                <div className="min-w-0">
                  <p className="text-xs font-black truncate">{currentUser.name}</p>
                  <p className="text-[10px] text-slate-400 capitalize">{currentUser.role}</p>
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-2.5 border border-white/10">
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">From</p>
                <p className="text-[10px] font-mono text-slate-200 break-all leading-relaxed">quibotechnologies@gmail.com</p>
              </div>
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 overflow-hidden flex flex-col">

          {/* ══ COMPOSE ══ */}
          {panel === "compose" && (
            <div className="flex-1 overflow-hidden flex flex-col">

              {/* Tab bar */}
              <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 sm:px-6 flex gap-0 pt-3">
                {([
                  { id: "compose", label: "Direct Email",    icon: Mail },
                  ...(isPriv ? [{ id: "team" as ComposeTab, label: "Team Broadcast", icon: Zap }] : []),
                ]).map(t => (
                  <button key={t.id} onClick={() => setTab(t.id as ComposeTab)}
                    className={`flex items-center gap-2 px-5 py-2.5 border-b-2 -mb-px transition-all text-sm font-bold ${
                      tab === t.id
                        ? "border-slate-800 text-slate-900"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}>
                    <t.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{t.label}</span>
                    <span className="sm:hidden">{t.id === "compose" ? "Direct" : "Team"}</span>
                  </button>
                ))}
              </div>

              {/* ── DIRECT FORM ── */}
              {tab === "compose" && (
                <div className="flex-1 overflow-y-auto email-scroll">
                  <div className="max-w-2xl mx-auto p-5 sm:p-7 space-y-5">

                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                      <div className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Shield className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-700">Professional Email</p>
                        <p className="text-[11px] text-slate-400">Recipients receive a branded Quibo Tech HRMS email</p>
                      </div>
                    </div>

                    <RecipField
                      label="To" required
                      list={toList}
                      onRemove={removeFrom}
                      onAdd={addTo}
                      suggestions={toSuggestions}
                    />

                    <button type="button" onClick={() => setShowCc(v => !v)}
                      className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 font-bold transition-colors bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl">
                      <Plus className="w-3.5 h-3.5" />{showCc ? "Remove CC" : "Add CC field"}
                    </button>

                    {showCc && (
                      <RecipField
                        label="CC"
                        list={ccList}
                        onRemove={removeFromCc}
                        onAdd={addCc}
                        suggestions={ccSuggestions}
                      />
                    )}

                    <SubjectInput value={subj} onChange={setSubj} />
                    <PriPicker value={pri} onChange={setPri} />
                    <MsgArea value={msg} onChange={setMsg} />
                    <SendRow
                      onSend={handleSend}
                      onClear={resetDirect}
                      disabled={!toList.length || !subj.trim() || !msg.trim()}
                      count={toList.length}
                      label="recipient"
                      sending={sending}
                    />
                  </div>
                </div>
              )}

              {/* ── TEAM FORM ── */}
              {tab === "team" && (
                <div className="flex-1 overflow-y-auto email-scroll">
                  <div className="max-w-2xl mx-auto p-5 sm:p-7 space-y-5">

                    <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4">
                      <div className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Zap className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-700 mb-0.5">Team Broadcast</p>
                        <p className="text-[11px] text-slate-500 leading-relaxed">Send to all members of selected roles simultaneously. Each gets a personalised branded email.</p>
                      </div>
                    </div>

                    {/* Role selector */}
                    <div>
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">
                        Target Roles <span className="text-red-400">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {["admin","manager","hr","employee"].map(r => {
                          const cnt = dir.filter(u => u.role === r).length;
                          const sel = roles.includes(r);
                          return (
                            <button key={r} type="button"
                              onClick={() => setRoles(p => p.includes(r) ? p.filter(x => x !== r) : [...p, r])}
                              className={`flex items-center justify-between px-4 py-4 rounded-2xl border-2 font-black transition-all ${
                                sel
                                  ? "border-slate-800 bg-slate-800 text-white shadow-lg"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                              }`}>
                              <span className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                  sel ? "border-white bg-white" : "border-slate-300"
                                }`}>
                                  {sel && <CheckCheck className="w-3 h-3 text-slate-800" />}
                                </div>
                                <span className="text-sm">{ROLE[r]?.label}</span>
                              </span>
                              <span className={`text-xs font-black px-2.5 py-1 rounded-xl ${
                                sel ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
                              }`}>{cnt}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Preview */}
                    {preview.length > 0 && (
                      <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          <p className="text-xs font-black text-slate-600">
                            Broadcasting to <span className="text-slate-900">{preview.length} members</span>
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto email-scroll">
                          {preview.map(u => (
                            <span key={u._id} className={`text-[10px] px-2.5 py-1.5 rounded-xl font-bold border flex items-center gap-1 ${ROLE[u.role]?.chip}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${ROLE[u.role]?.dot}`} />{u.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <SubjectInput value={tSubj} onChange={setTSubj} placeholder="Broadcast subject…" />
                    <PriPicker value={tPri} onChange={setTPri} />
                    <MsgArea value={tMsg} onChange={setTMsg} rows={7} placeholder="Write your broadcast message…" />
                    <SendRow
                      onSend={handleTeam}
                      onClear={resetTeam}
                      disabled={!roles.length || !tSubj.trim() || !tMsg.trim() || !preview.length}
                      count={preview.length}
                      label="member"
                      sending={sending}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ HISTORY ══ */}
          {panel === "history" && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-shrink-0 px-5 sm:px-7 py-5 bg-white border-b border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-black text-slate-900 text-lg flex items-center gap-2">
                      <Inbox className="w-5 h-5 text-slate-600" /> Sent Mail
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Logged in MongoDB</p>
                  </div>
                  <button onClick={fetchHist} disabled={loadHist}
                    className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold transition-all">
                    <RefreshCw className={`w-3.5 h-3.5 ${loadHist ? "animate-spin" : ""}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                </div>
                {hist.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    <StatCard icon={CheckCircle2} label="Total Sent" value={sentCount}   color="bg-emerald-500" />
                    <StatCard icon={Zap}          label="Broadcasts" value={teamCount}   color="bg-slate-700"   />
                    <StatCard icon={XCircle}      label="Failed"     value={failedCount} color="bg-red-500"     />
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto email-scroll p-5 sm:p-7">
                {loadHist ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-slate-400 animate-spin mb-3" />
                    <p className="text-sm font-semibold text-slate-400">Loading history…</p>
                  </div>
                ) : hist.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-5">
                      <Send className="w-9 h-9 text-slate-300" />
                    </div>
                    <p className="text-sm font-black text-slate-500 mb-2">No emails sent yet</p>
                    <p className="text-xs text-slate-400 mb-5">Your sent history will appear here</p>
                    <button onClick={() => setPanel("compose")}
                      className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white text-sm font-black rounded-2xl shadow-lg hover:-translate-y-0.5 transition-all">
                      <Mail className="w-4 h-4" /> Compose Email
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 max-w-2xl mx-auto">
                    {hist.map((item: any) => (
                      <div key={item._id}
                        className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 hover:shadow-md transition-all">
                        <div className="flex items-start gap-4 mb-3">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                            item.type === "team" ? "bg-slate-700" : "bg-slate-800"
                          }`}>
                            {item.type === "team"
                              ? <Zap className="w-5 h-5 text-white" />
                              : <Mail className="w-5 h-5 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-start justify-between gap-2 mb-1.5">
                              <p className="font-black text-slate-900 text-sm truncate max-w-[260px]">{item.subject}</p>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <PriBadge p={item.priority as Priority} />
                                <span className={`text-[10px] px-2 py-1 rounded-xl font-black border ${
                                  item.type === "team"
                                    ? "bg-slate-100 text-slate-700 border-slate-200"
                                    : "bg-slate-50 text-slate-600 border-slate-200"
                                }`}>
                                  {item.type === "team" ? "📢 Broadcast" : "✉️ Direct"}
                                </span>
                                <span className={`text-[10px] px-2 py-1 rounded-xl font-black flex items-center gap-1 ${
                                  item.status === "sent"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                    : "bg-red-50 text-red-600 border border-red-100"
                                }`}>
                                  {item.status === "sent"
                                    ? <><CheckCheck className="w-2.5 h-2.5" /> Sent</>
                                    : <><X className="w-2.5 h-2.5" /> Failed</>}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-slate-400 truncate">
                              {item.type === "team"
                                ? `→ ${item.roles?.join(", ")} (${item.recipientCount || item.to?.length} members)`
                                : `→ ${item.to?.slice(0, 2).join(", ")}${(item.to?.length || 0) > 2 ? ` +${item.to.length - 2} more` : ""}`}
                            </p>
                          </div>
                        </div>
                        {item.body && (
                          <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 mb-3">
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                              {item.body.slice(0, 150)}{item.body.length > 150 ? "…" : ""}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <Clock className="w-3 h-3" />
                            {new Date(item.createdAt).toLocaleString("en-IN", {
                              day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit"
                            })}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            by <strong className="text-slate-600">{item.sentBy?.name || "—"}</strong>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ DIRECTORY ══ */}
          {panel === "directory" && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-shrink-0 px-5 sm:px-7 py-5 bg-white border-b border-slate-200 space-y-3">
                <h2 className="font-black text-slate-900 text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-slate-600" /> Team Directory
                  <span className="text-sm bg-slate-100 text-slate-700 px-3 py-1 rounded-xl font-black">{dir.length}</span>
                </h2>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input type="text" placeholder="Search name, email, department…"
                      value={dq} onChange={e => setDq(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-500/10 transition-all placeholder:text-slate-300 font-medium" />
                  </div>
                  <select value={drole} onChange={e => setDrole(e.target.value)}
                    className="border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-slate-400 transition-all font-bold text-slate-600">
                    <option value="all">All Roles</option>
                    {["admin","manager","hr","employee"].map(r => (
                      <option key={r} value={r}>{ROLE[r].label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto email-scroll p-5 sm:p-7">
                {loadDir ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-slate-400 animate-spin mb-3" />
                    <p className="text-sm font-semibold text-slate-400">Loading directory…</p>
                  </div>
                ) : filtDir.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Users className="w-12 h-12 text-slate-200 mb-3" />
                    <p className="text-sm font-black text-slate-400">No members found</p>
                  </div>
                ) : (
                  <div className="space-y-7 max-w-5xl mx-auto">
                    {rGroups.map(g => (
                      <div key={g.role}>
                        <div className="flex items-center gap-3 mb-4">
                          <span className={`text-xs font-black px-3 py-1.5 rounded-xl border flex items-center gap-2 ${ROLE[g.role]?.chip}`}>
                            <span className={`w-2 h-2 rounded-full ${ROLE[g.role]?.dot}`} />
                            {ROLE[g.role]?.label}s
                          </span>
                          <span className="text-xs text-slate-400 font-semibold">{g.users.length} member{g.users.length !== 1 ? "s" : ""}</span>
                          <div className="flex-1 h-px bg-slate-100" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                          {g.users.map(u => (
                            <div key={u._id}
                              className="group flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-300 hover:shadow-md transition-all">
                              <Av name={u.name} size="md" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-slate-900 truncate">{u.name}</p>
                                <p className="text-xs text-slate-400 truncate">{u.email}</p>
                                {u.department && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <Building2 className="w-2.5 h-2.5 text-slate-300" />
                                    <span className="text-[10px] text-slate-400 font-semibold">{u.department}</span>
                                  </div>
                                )}
                              </div>
                              <button type="button"
                                onClick={() => { addTo(u); setPanel("compose"); setTab("compose"); flash(`${u.name} added as recipient`, "info"); }}
                                className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-[11px] bg-slate-800 text-white px-3 py-2 rounded-xl font-black transition-all flex-shrink-0 hover:-translate-y-0.5 shadow-md">
                                <Mail className="w-3 h-3" /> Email
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
