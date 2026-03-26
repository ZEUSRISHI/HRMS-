import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { vendorApi } from "@/services/api";

export default function VendorModule() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  const isAdmin   = currentUser.role === "admin";
  const isManager = currentUser.role === "manager";
  const isHR      = currentUser.role === "hr";

  if (!isAdmin && !isManager && !isHR) return null;

  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState("");
  const [editId, setEditId]   = useState<string | null>(null);

  const emptyForm = {
    company: "", contactPerson: "", email: "",
    phone: "", category: "", taxId: "", address: "",
  };
  const [form, setForm] = useState(emptyForm);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const loadVendors = async () => {
    try {
      setLoading(true);
      const data = await vendorApi.getAll();
      setVendors(data.vendors || []);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadVendors(); }, []);

  const handleSave = async () => {
    if (!form.company || !form.contactPerson || !form.email || !form.phone) {
      showToast("Please fill all required fields (*)");
      return;
    }
    try {
      setSaving(true);
      if (editId) {
        await vendorApi.update(editId, form);
        showToast("✅ Vendor updated");
      } else {
        await vendorApi.create(form);
        showToast("✅ Vendor added");
      }
      setEditId(null);
      setForm(emptyForm);
      await loadVendors();
    } catch (err: any) {
      showToast("❌ " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (v: any) => {
    setEditId(v._id);
    setForm({
      company:       v.company,
      contactPerson: v.contactPerson,
      email:         v.email,
      phone:         v.phone,
      category:      v.category,
      taxId:         v.taxId,
      address:       v.address,
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete vendor?")) return;
    try {
      await vendorApi.delete(id);
      showToast("✅ Vendor deleted");
      await loadVendors();
    } catch (err: any) {
      showToast("❌ " + err.message);
    }
  };

  const downloadReport = () => {
    const rows = ["Company,Contact,Email,Phone,Category,Tax ID,Address"];
    vendors.forEach((v) => {
      rows.push(`${v.company},${v.contactPerson},${v.email},${v.phone},${v.category},${v.taxId},${v.address}`);
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendors_${Date.now()}.csv`;
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
          <h1 className="text-xl font-semibold">Vendor Management</h1>
          <p className="text-gray-500 text-sm">{vendors.length} vendors registered</p>
        </div>
        {isAdmin && (
          <button onClick={downloadReport}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
            Download Report
          </button>
        )}
      </div>

      {/* FORM */}
      {isAdmin && (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border space-y-4">
          <h2 className="font-semibold text-lg">
            {editId ? "Edit Vendor" : "Add New Vendor"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Company Name *", key: "company" },
              { label: "Contact Person *", key: "contactPerson" },
              { label: "Email *", key: "email" },
              { label: "Phone *", key: "phone" },
              { label: "Category", key: "category" },
              { label: "Tax ID / GST", key: "taxId" },
            ].map(({ label, key }) => (
              <div key={key} className="flex flex-col space-y-1">
                <label className="text-sm text-gray-600">{label}</label>
                <input
                  className="border p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <div>
            <label className="text-sm text-gray-600">Address</label>
            <textarea
              className="border p-2 rounded-md w-full mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <button onClick={handleSave} disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
            {saving ? "Saving..." : editId ? "Update Vendor" : "Add Vendor"}
          </button>
        </div>
      )}

      {/* VENDOR LIST */}
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border space-y-3">
        <h2 className="font-semibold text-lg">Vendor List</h2>
        {vendors.length === 0 && (
          <p className="text-gray-500 text-sm">No vendors added yet</p>
        )}
        {vendors.map((v) => (
          <div key={v._id}
            className="flex flex-col md:flex-row md:items-center md:justify-between border rounded-lg p-4 hover:bg-gray-50">
            <div className="space-y-1">
              <p className="font-semibold">{v.company}</p>
              <p className="text-sm text-gray-500">{v.contactPerson} • {v.category}</p>
              <p className="text-sm text-gray-500">{v.email} • {v.phone}</p>
              {v.taxId && <p className="text-xs text-gray-400">GST: {v.taxId}</p>}
            </div>
            {isAdmin && (
              <div className="flex gap-4 mt-3 md:mt-0">
                <button onClick={() => handleEdit(v)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Edit
                </button>
                <button onClick={() => handleDelete(v._id)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium">
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}