import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { freelancerApi } from "@/services/api";
import {
  User, Phone, Mail, Briefcase, CalendarDays, AlertTriangle,
  Plus, Pencil, Trash2, Download, Bell, X, ChevronDown, ChevronUp,
} from "lucide-react";

/* ─── helpers ─────────────────────────────────────────────── */
const getDaysBadge = (daysLeft?: number) => {
  if (daysLeft === undefined || daysLeft === null) return null;
  if (daysLeft <  0)  return { label: `Expired ${Math.abs(daysLeft)}d ago`, color: "#dc2626", bg: "#fef2f2" };
  if (daysLeft === 0) return { label: "Expires Today",                       color: "#dc2626", bg: "#fef2f2" };
  if (daysLeft <= 3)  return { label: `${daysLeft}d left`,                   color: "#dc2626", bg: "#fef2f2" };
  if (daysLeft <= 7)  return { label: `${daysLeft}d left`,                   color: "#d97706", bg: "#fffbeb" };
  if (daysLeft <= 14) return { label: `${daysLeft}d left`,                   color: "#ca8a04", bg: "#fefce8" };
  if (daysLeft <= 30) return { label: `${daysLeft}d left`,                   color: "#16a34a", bg: "#f0fdf4" };
  return null;
};

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/* ─── component ───────────────────────────────────────────── */
export default function FreelancerModule() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  const isAdmin   = currentUser.role === "admin";
  const isManager = currentUser.role === "manager";
  const isHR      = currentUser.role === "hr";
  if (!isAdmin && !isManager && !isHR) return null;

  const [freelancers, setFreelancers] = useState<any[]>([]);
  const [expiring,    setExpiring]    = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null);
  const [editId,      setEditId]      = useState<string | null>(null);
  const [showForm,    setShowForm]    = useState(false);
  const [showBell,    setShowBell]    = useState(false);
  const [search,      setSearch]      = useState("");
  const [expanded,    setExpanded]    = useState<string | null>(null);

  const emptyForm = {
    name: "", email: "", phone: "", skill: "",
    rate: "", contractStart: "", contractEnd: "", status: "active" as "active" | "expired",
  };
  const [form, setForm] = useState(emptyForm);

  const toast$ = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = async () => {
    try {
      setLoading(true);
      const [f, e] = await Promise.all([freelancerApi.getAll(), freelancerApi.getExpiring()]);
      setFreelancers(f.freelancers || []);
      setExpiring(e.freelancers   || []);
    } catch (err: any) {
      toast$(err.message, false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.name || !form.email || !form.skill) {
      toast$("Please fill required fields: Name, Email, Skill", false);
      return;
    }
    try {
      setSaving(true);
      editId
        ? await freelancerApi.update(editId, form)
        : await freelancerApi.create(form);
      toast$(editId ? "Freelancer updated" : "Freelancer added");
      setEditId(null); setForm(emptyForm); setShowForm(false);
      await load();
    } catch (err: any) {
      toast$(err.message, false);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (f: any) => {
    setEditId(f._id);
    setForm({
      name:          f.name          || "",
      email:         f.email         || "",
      phone:         f.phone         || "",
      skill:         f.skill         || "",
      rate:          f.rate          || "",
      contractStart: f.contractStart || "",
      contractEnd:   f.contractEnd   || "",
      status:        f.status        || "active",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this freelancer?")) return;
    try {
      await freelancerApi.delete(id);
      toast$("Freelancer deleted");
      await load();
    } catch (err: any) {
      toast$(err.message, false);
    }
  };

  const downloadCSV = () => {
    const rows = [
      "Name,Email,Phone,Skill,Rate,Contract Start,Contract End,Status,Days Left",
      ...freelancers.map((f) =>
        [f.name, f.email, f.phone, f.skill, f.rate,
         fmtDate(f.contractStart), fmtDate(f.contractEnd), f.status, f.daysLeft ?? ""].join(",")
      ),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement("a"), { href: url, download: `freelancers_${Date.now()}.csv` });
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const filtered = freelancers.filter((f) =>
    !search ||
    [f.name, f.email, f.skill].some((v) => v?.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = [
    { label: "Total",          value: freelancers.length,                                          color: "#2563eb" },
    { label: "Active",         value: freelancers.filter((f) => f.status === "active").length,     color: "#16a34a" },
    { label: "Expiring (30d)", value: expiring.length,                                             color: "#d97706" },
    { label: "Expired",        value: freelancers.filter((f) => f.status === "expired").length,    color: "#dc2626" },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50 min-h-screen">

      {/* TOAST */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium ${toast.ok ? "bg-gray-900" : "bg-red-600"}`}>
          <span>{toast.ok ? "✅" : "❌"}</span>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)}><X size={14} /></button>
        </div>
      )}

      {/* BELL PANEL */}
      {showBell && (
        <div className="fixed inset-0 z-40 flex items-start justify-end pt-16 pr-6" onClick={() => setShowBell(false)}>
          <div className="bg-white rounded-2xl shadow-2xl border w-96 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-bold text-gray-900">Contract Alerts</h3>
                <p className="text-xs text-gray-500 mt-0.5">Freelancers expiring within 30 days</p>
              </div>
              <button onClick={() => setShowBell(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            {expiring.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No expiring contracts 🎉</div>
            ) : (
              expiring.map((f) => {
                const badge = getDaysBadge(f.daysLeft);
                return (
                  <div key={f._id} className="p-4 border-b hover:bg-gray-50 last:border-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{f.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{f.skill}</p>
                        <p className="text-xs text-gray-400 mt-1">Ends: {fmtDate(f.contractEnd)}</p>
                      </div>
                      {badge && (
                        <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full"
                          style={{ color: badge.color, background: badge.bg }}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Freelancer Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">{freelancers.length} freelancers · Quibo Tech HRMS</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowBell(!showBell)}
            className="relative p-2.5 bg-white border rounded-xl shadow-sm hover:bg-gray-50 transition-colors">
            <Bell size={18} className="text-gray-600" />
            {expiring.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {expiring.length}
              </span>
            )}
          </button>
          {isAdmin && (
            <>
              <button onClick={downloadCSV}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border rounded-xl text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                <Download size={15} /> Export CSV
              </button>
              <button onClick={() => { setEditId(null); setForm(emptyForm); setShowForm(!showForm); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors">
                <Plus size={15} /> Add Freelancer
              </button>
            </>
          )}
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{s.label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* EXPIRY BANNER */}
      {expiring.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">
              {expiring.length} freelancer contract{expiring.length > 1 ? "s" : ""} expiring within 30 days
            </p>
            <p className="text-amber-600 text-xs mt-0.5">
              Automated email reminders are sent to all admins at 30, 14, 7, 3, and 1 day milestones.
            </p>
          </div>
        </div>
      )}

      {/* FORM */}
      {isAdmin && showForm && (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
            <h2 className="font-bold text-gray-900">{editId ? "Edit Freelancer" : "Add New Freelancer"}</h2>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}
              className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Full Name *",           key: "name"  },
                { label: "Email Address *",        key: "email" },
                { label: "Phone Number",           key: "phone" },
                { label: "Primary Skill *",        key: "skill" },
                { label: "Rate (e.g. ₹3000/hr)",  key: "rate"  },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                    value={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Contract Start</label>
                <input type="date"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                  value={form.contractStart}
                  onChange={(e) => setForm({ ...form, contractStart: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Contract End Date
                  <span className="ml-1 text-amber-500 font-normal">(triggers expiry alerts)</span>
                </label>
                <input type="date"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                  value={form.contractEnd}
                  onChange={(e) => setForm({ ...form, contractEnd: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "expired" })}>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={handleSave} disabled={saving}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors">
                {saving ? "Saving…" : editId ? "Update Freelancer" : "Add Freelancer"}
              </button>
              <button onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH */}
      <div className="flex items-center gap-3">
        <input
          placeholder="Search by name, email, skill…"
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="text-sm text-gray-400">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* LIST */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border p-10 text-center">
            <User size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">No freelancers found</p>
          </div>
        )}

        {filtered.map((f) => {
          const badge    = getDaysBadge(f.daysLeft);
          const isExpand = expanded === f._id;

          return (
            <div key={f._id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${badge && f.daysLeft !== undefined && f.daysLeft <= 7 ? "border-red-200" : ""}`}>

              <div className="flex items-start gap-4 p-5">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
                  <span className="text-green-700 font-bold text-base">
                    {f.name?.[0]?.toUpperCase() || "F"}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 text-base">{f.name}</h3>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      f.status === "active"
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-600"
                    }`}>
                      {f.status === "active" ? "Active" : "Expired"}
                    </span>
                    {badge && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1"
                        style={{ color: badge.color, background: badge.bg }}>
                        <AlertTriangle size={10} /> {badge.label}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Briefcase size={11} /> {f.skill}</span>
                    <span className="flex items-center gap-1"><Mail  size={11} /> {f.email}</span>
                    {f.phone && <span className="flex items-center gap-1"><Phone size={11} /> {f.phone}</span>}
                    {f.rate  && <span className="flex items-center gap-1">💰 {f.rate}</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                    <CalendarDays size={11} />
                    {fmtDate(f.contractStart)} → {fmtDate(f.contractEnd)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setExpanded(isExpand ? null : f._id)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                    {isExpand ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                  {isAdmin && (
                    <>
                      <button onClick={() => handleEdit(f)}
                        className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(f._id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* EXPANDED */}
              {isExpand && (
                <div className="border-t bg-gray-50 px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Contract Period</p>
                    <div className="space-y-1 text-gray-700">
                      <p>Start: <strong>{fmtDate(f.contractStart)}</strong></p>
                      <p>End: <strong>{fmtDate(f.contractEnd)}</strong></p>
                      {f.daysLeft !== undefined && (
                        <p style={{ color: getDaysBadge(f.daysLeft)?.color || "#6b7280" }} className="font-semibold text-xs mt-1">
                          {f.daysLeft > 0
                            ? `${f.daysLeft} days remaining`
                            : f.daysLeft === 0 ? "Expires today!"
                            : `Expired ${Math.abs(f.daysLeft)} days ago`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Alert Status</p>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {f.daysLeft !== undefined && f.daysLeft <= 30 && f.daysLeft > 0
                        ? "⚠️ Email reminders active. Admins notified at 30, 14, 7, 3, and 1 day(s) before expiry."
                        : f.daysLeft !== undefined && f.daysLeft <= 0
                        ? "❌ Contract expired. Status auto-updated to Expired."
                        : "✅ No active alerts. Reminder schedule activates 30 days before end date."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
