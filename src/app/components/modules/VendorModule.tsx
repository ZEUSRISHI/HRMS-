import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { vendorApi } from "@/services/api";
import {
  Building2, Phone, Mail, Tag, CalendarDays, AlertTriangle,
  Plus, Pencil, Trash2, Download, Bell, X, ChevronDown, ChevronUp,
} from "lucide-react";

const PROJECT_STATUSES = [
  { value: "",            label: "Select Status" },
  { value: "not_started", label: "Not Started"  },
  { value: "in_progress", label: "In Progress"  },
  { value: "on_hold",     label: "On Hold"       },
  { value: "completed",   label: "Completed"     },
  { value: "cancelled",   label: "Cancelled"     },
];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  not_started: { label: "Not Started", color: "#6b7280", bg: "#f3f4f6" },
  in_progress: { label: "In Progress", color: "#2563eb", bg: "#eff6ff" },
  on_hold:     { label: "On Hold",     color: "#d97706", bg: "#fffbeb" },
  completed:   { label: "Completed",   color: "#16a34a", bg: "#f0fdf4" },
  cancelled:   { label: "Cancelled",   color: "#dc2626", bg: "#fef2f2" },
};

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

const fmtDate = (d?: string | Date) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function VendorModule() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  const isAdmin   = currentUser.role === "admin";
  const isManager = currentUser.role === "manager";
  const isHR      = currentUser.role === "hr";
  if (!isAdmin && !isManager && !isHR) return null;

  const [vendors,  setVendors]  = useState<any[]>([]);
  const [expiring, setExpiring] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null);
  const [editId,   setEditId]   = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showBell, setShowBell] = useState(false);
  const [search,   setSearch]   = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const emptyForm = {
    company: "", contactPerson: "", email: "", phone: "",
    category: "", taxId: "", address: "",
    projectName: "", projectStatus: "", projectStartDate: "", projectEndDate: "",
  };
  const [form, setForm] = useState(emptyForm);

  const toast$ = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // ── ONLY vendor API calls here ───────────────────────────────
  const load = async () => {
    try {
      setLoading(true);
      const [vRes, eRes] = await Promise.all([
        vendorApi.getAll(),
        vendorApi.getExpiring(),
      ]);
      setVendors(vRes.vendors   || []);
      setExpiring(eRes.vendors  || []);
    } catch (err: any) {
      toast$(err.message, false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.company || !form.contactPerson || !form.email || !form.phone) {
      toast$("Please fill all required fields (Company, Contact, Email, Phone)", false);
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...form,
        projectStartDate: form.projectStartDate || null,
        projectEndDate:   form.projectEndDate   || null,
      };
      editId
        ? await vendorApi.update(editId, payload)
        : await vendorApi.create(payload);
      toast$(editId ? "Vendor updated successfully" : "Vendor added successfully");
      setEditId(null); setForm(emptyForm); setShowForm(false);
      await load();
    } catch (err: any) {
      toast$(err.message, false);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (v: any) => {
    setEditId(v._id);
    setForm({
      company:          v.company          || "",
      contactPerson:    v.contactPerson    || "",
      email:            v.email            || "",
      phone:            v.phone            || "",
      category:         v.category         || "",
      taxId:            v.taxId            || "",
      address:          v.address          || "",
      projectName:      v.projectName      || "",
      projectStatus:    v.projectStatus    || "",
      projectStartDate: v.projectStartDate ? String(v.projectStartDate).slice(0, 10) : "",
      projectEndDate:   v.projectEndDate   ? String(v.projectEndDate).slice(0, 10)   : "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this vendor?")) return;
    try {
      await vendorApi.delete(id);
      toast$("Vendor deleted");
      await load();
    } catch (err: any) {
      toast$(err.message, false);
    }
  };

  const downloadCSV = () => {
    const esc = (v: any) => {
      const s = String(v ?? "");
      return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = [
      "Company,Contact,Email,Phone,Category,Tax ID,Project,Status,Start,End,Days Left",
      ...vendors.map((v) =>
        [v.company, v.contactPerson, v.email, v.phone, v.category, v.taxId,
         v.projectName, v.projectStatus,
         fmtDate(v.projectStartDate), fmtDate(v.projectEndDate), v.daysLeft ?? ""]
          .map(esc).join(",")
      ),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement("a"), { href: url, download: `vendors_${Date.now()}.csv` });
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const filtered = vendors.filter((v) =>
    !search ||
    [v.company, v.contactPerson, v.category, v.email]
      .some((f) => f?.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = [
    { label: "Total Vendors",   value: vendors.length,                                                  color: "#2563eb" },
    { label: "Active Projects", value: vendors.filter((v) => v.projectStatus === "in_progress").length, color: "#16a34a" },
    { label: "Expiring (30d)",  value: expiring.length,                                                 color: "#d97706" },
    { label: "Completed",       value: vendors.filter((v) => v.projectStatus === "completed").length,   color: "#7c3aed" },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
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
        <div className="fixed inset-0 z-40 flex items-start justify-end pt-16 pr-6"
          onClick={() => setShowBell(false)}>
          <div className="bg-white rounded-2xl shadow-2xl border w-96 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-bold text-gray-900">Contract Alerts</h3>
                <p className="text-xs text-gray-500 mt-0.5">Vendor projects expiring within 30 days</p>
              </div>
              <button onClick={() => setShowBell(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            {expiring.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No expiring contracts 🎉</div>
            ) : (
              expiring.map((v) => {
                const badge = getDaysBadge(v.daysLeft);
                return (
                  <div key={v._id} className="p-4 border-b hover:bg-gray-50 last:border-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{v.company}</p>
                        {v.projectName && <p className="text-xs text-gray-500 mt-0.5">{v.projectName}</p>}
                        <p className="text-xs text-gray-400 mt-1">Ends: {fmtDate(v.projectEndDate)}</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">{vendors.length} vendors · Quibo Tech HRMS</p>
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
                className="flex items-center gap-2 px-4 py-2.5 bg-white border rounded-xl text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
                <Download size={15} /> Export CSV
              </button>
              <button
                onClick={() => { setEditId(null); setForm(emptyForm); setShowForm(!showForm); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors">
                <Plus size={15} /> Add Vendor
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
              {expiring.length} vendor project{expiring.length > 1 ? "s" : ""} expiring within 30 days
            </p>
            <p className="text-amber-600 text-xs mt-0.5">
              Email reminders are sent automatically to all admins.
              {expiring[0] && ` Next: ${expiring[0].company} — ${fmtDate(expiring[0].projectEndDate)}`}
            </p>
          </div>
        </div>
      )}

      {/* FORM */}
      {isAdmin && showForm && (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
            <h2 className="font-bold text-gray-900">{editId ? "Edit Vendor" : "Add New Vendor"}</h2>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}
              className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <div className="p-6 space-y-5">

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Company Details</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Company Name *",  key: "company"       },
                  { label: "Contact Person *", key: "contactPerson" },
                  { label: "Email Address *",  key: "email"         },
                  { label: "Phone Number *",   key: "phone"         },
                  { label: "Category",         key: "category"      },
                  { label: "Tax ID / GST No.", key: "taxId"         },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                    <input
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      value={(form as any)[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
              <textarea rows={2}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Project Details</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Project Name</label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={form.projectName}
                    onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Project Status</label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={form.projectStatus}
                    onChange={(e) => setForm({ ...form, projectStatus: e.target.value })}>
                    {PROJECT_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Project Start Date</label>
                  <input type="date"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={form.projectStartDate}
                    onChange={(e) => setForm({ ...form, projectStartDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Project End Date
                    <span className="ml-1 text-amber-500 font-normal">(triggers expiry alerts)</span>
                  </label>
                  <input type="date"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={form.projectEndDate}
                    onChange={(e) => setForm({ ...form, projectEndDate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={handleSave} disabled={saving}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors">
                {saving ? "Saving…" : editId ? "Update Vendor" : "Add Vendor"}
              </button>
              <button onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH */}
      <div className="flex items-center gap-3">
        <input
          placeholder="Search by company, contact, category…"
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="text-sm text-gray-400">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* VENDOR LIST */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border p-10 text-center">
            <Building2 size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">No vendors found</p>
          </div>
        )}

        {filtered.map((v) => {
          const badge   = getDaysBadge(v.daysLeft);
          const statCfg = statusConfig[v.projectStatus] || null;
          const isExp   = expanded === v._id;

          return (
            <div key={v._id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                badge && v.daysLeft !== undefined && v.daysLeft <= 7 ? "border-red-200" : ""
              }`}>

              <div className="flex items-start gap-4 p-5">
                <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <span className="text-blue-700 font-bold text-base">
                    {v.company?.[0]?.toUpperCase() || "V"}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 text-base leading-tight">{v.company}</h3>
                    {statCfg && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                        style={{ color: statCfg.color, background: statCfg.bg }}>
                        {statCfg.label}
                      </span>
                    )}
                    {badge && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1"
                        style={{ color: badge.color, background: badge.bg }}>
                        <AlertTriangle size={10} /> {badge.label}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Building2 size={11} /> {v.contactPerson || "—"}</span>
                    <span className="flex items-center gap-1"><Mail     size={11} /> {v.email}</span>
                    <span className="flex items-center gap-1"><Phone    size={11} /> {v.phone}</span>
                    {v.category && <span className="flex items-center gap-1"><Tag size={11} /> {v.category}</span>}
                  </div>
                  {v.projectName && (
                    <p className="text-xs text-gray-400 mt-1.5">
                      📁 {v.projectName}
                      {v.projectEndDate && ` · Ends ${fmtDate(v.projectEndDate)}`}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setExpanded(isExp ? null : v._id)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                    {isExp ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                  {isAdmin && (
                    <>
                      <button onClick={() => handleEdit(v)}
                        className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(v._id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isExp && (
                <div className="border-t bg-gray-50 px-5 py-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Company Info</p>
                    {v.taxId   && <p className="text-gray-700">GST / Tax ID: <strong>{v.taxId}</strong></p>}
                    {v.address && <p className="text-gray-700 mt-1">{v.address}</p>}
                    {!v.taxId && !v.address && <p className="text-gray-400 text-xs">No additional info</p>}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Project Timeline</p>
                    <div className="flex items-center gap-2">
                      <CalendarDays size={13} className="text-gray-400" />
                      <span className="text-gray-700">{fmtDate(v.projectStartDate)} → {fmtDate(v.projectEndDate)}</span>
                    </div>
                    {v.daysLeft !== undefined && (
                      <p className="mt-1.5 text-xs font-semibold"
                        style={{ color: getDaysBadge(v.daysLeft)?.color || "#6b7280" }}>
                        {v.daysLeft > 0
                          ? `${v.daysLeft} days until project end`
                          : v.daysLeft === 0 ? "Ends today!"
                          : `Ended ${Math.abs(v.daysLeft)} days ago`}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Alert Status</p>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {v.daysLeft !== undefined && v.daysLeft <= 30 && v.daysLeft > 0
                        ? "⚠️ Email reminders active. Admins notified at 30, 14, 7, 3 and 1 day(s) before expiry."
                        : v.daysLeft !== undefined && v.daysLeft <= 0
                        ? "❌ Contract has expired. No further reminders."
                        : "✅ No active alerts. Reminders activate within 30 days of end date."}
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
