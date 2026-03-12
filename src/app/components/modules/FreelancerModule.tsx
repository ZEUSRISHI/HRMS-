import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { freelancerApi } from "@/services/api";

export default function FreelancerModule() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  const isAdmin   = currentUser.role === "admin";
  const isManager = currentUser.role === "manager";
  const isHR      = currentUser.role === "hr";

  if (!isAdmin && !isManager && !isHR) return null;

  const [freelancers, setFreelancers] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState("");
  const [editId, setEditId]     = useState<string | null>(null);

  const emptyForm = {
    name: "", email: "", phone: "", skill: "",
    rate: "", contractStart: "", contractEnd: "", status: "active" as "active" | "expired",
  };
  const [form, setForm] = useState(emptyForm);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const loadFreelancers = async () => {
    try {
      setLoading(true);
      const data = await freelancerApi.getAll();
      setFreelancers(data.freelancers || []);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFreelancers(); }, []);

  const handleSave = async () => {
    if (!form.name || !form.email || !form.skill) {
      showToast("Please fill required fields (Name, Email, Skill)");
      return;
    }
    try {
      setSaving(true);
      if (editId) {
        await freelancerApi.update(editId, form);
        showToast("✅ Freelancer updated");
      } else {
        await freelancerApi.create(form);
        showToast("✅ Freelancer added");
      }
      setEditId(null);
      setForm(emptyForm);
      await loadFreelancers();
    } catch (err: any) {
      showToast("❌ " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (f: any) => {
    setEditId(f._id);
    setForm({
      name:          f.name,
      email:         f.email,
      phone:         f.phone,
      skill:         f.skill,
      rate:          f.rate,
      contractStart: f.contractStart,
      contractEnd:   f.contractEnd,
      status:        f.status,
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete freelancer?")) return;
    try {
      await freelancerApi.delete(id);
      showToast("✅ Freelancer deleted");
      await loadFreelancers();
    } catch (err: any) {
      showToast("❌ " + err.message);
    }
  };

  const downloadReport = () => {
    const rows = ["Name,Email,Phone,Skill,Rate,Contract Start,Contract End,Status"];
    freelancers.forEach((f) => {
      rows.push(`${f.name},${f.email},${f.phone},${f.skill},${f.rate},${f.contractStart},${f.contractEnd},${f.status}`);
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `freelancers_${Date.now()}.csv`;
    a.click();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">

      {toast && (
        <div className="fixed top-5 right-5 bg-black text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm">
          {toast}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Freelancer Management</h1>
          <p className="text-gray-500 text-sm">{freelancers.length} freelancers registered</p>
        </div>
        {isAdmin && (
          <button onClick={downloadReport}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
            Download Report
          </button>
        )}
      </div>

      {/* FORM */}
      {isAdmin && (
        <div className="bg-white p-4 md:p-6 rounded-xl border shadow-sm space-y-4">
          <h2 className="font-semibold text-lg">
            {editId ? "Edit Freelancer" : "Add New Freelancer"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Name *", key: "name" },
              { label: "Email *", key: "email" },
              { label: "Phone", key: "phone" },
              { label: "Primary Skill *", key: "skill" },
              { label: "Rate (e.g. ₹3000/hr)", key: "rate" },
            ].map(({ label, key }) => (
              <div key={key} className="flex flex-col space-y-1">
                <label className="text-sm text-gray-600">{label}</label>
                <input
                  className="border p-2 rounded-md focus:ring-2 focus:ring-green-500 outline-none"
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
            {[
              { label: "Contract Start", key: "contractStart" },
              { label: "Contract End", key: "contractEnd" },
            ].map(({ label, key }) => (
              <div key={key} className="flex flex-col space-y-1">
                <label className="text-sm text-gray-600">{label}</label>
                <input type="date"
                  className="border p-2 rounded-md focus:ring-2 focus:ring-green-500 outline-none"
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
            <div className="flex flex-col space-y-1">
              <label className="text-sm text-gray-600">Status</label>
              <select
                className="border p-2 rounded-md focus:ring-2 focus:ring-green-500 outline-none"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "expired" })}>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
            {saving ? "Saving..." : editId ? "Update Freelancer" : "Add Freelancer"}
          </button>
        </div>
      )}

      {/* LIST */}
      <div className="bg-white p-4 md:p-6 rounded-xl border shadow-sm space-y-3">
        <h2 className="font-semibold text-lg">Freelancer List</h2>
        {freelancers.length === 0 && (
          <p className="text-gray-500 text-sm">No freelancers added yet</p>
        )}
        {freelancers.map((f) => (
          <div key={f._id}
            className="flex flex-col md:flex-row md:items-center md:justify-between border rounded-lg p-4 hover:bg-gray-50">
            <div className="space-y-1">
              <p className="font-semibold">{f.name}</p>
              <p className="text-sm text-gray-500">{f.skill} • {f.rate}</p>
              <p className="text-sm text-gray-500">{f.email} • {f.phone}</p>
              <p className="text-xs text-gray-400">
                {f.contractStart} → {f.contractEnd} •{" "}
                <span className={f.status === "active" ? "text-green-600" : "text-red-500"}>
                  {f.status}
                </span>
              </p>
            </div>
            {isAdmin && (
              <div className="flex gap-4 mt-3 md:mt-0">
                <button onClick={() => handleEdit(f)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
                <button onClick={() => handleDelete(f._id)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium">Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}