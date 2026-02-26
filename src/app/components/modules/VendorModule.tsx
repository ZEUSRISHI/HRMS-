import { useState } from "react";
import { Vendor, useWorkforce } from "../../contexts/WorkforceContext";
import { useAuth } from "../../contexts/AuthContext";

type VendorForm = Omit<Vendor, "id" | "createdAt"> & {
  status: "active" | "inactive";
  contractType: string;
  notes: string;
};

export default function VendorModule() {
  const { vendors, addVendor, updateVendor, deleteVendor } = useWorkforce();
  const { currentUser } = useAuth();

  if (currentUser?.role !== "admin") return null;

  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<VendorForm>({
    company: "",
    contactPerson: "",
    email: "",
    phone: "",
    category: "",
    taxId: "",
    address: "",
    status: "active",
    contractType: "",
    notes: "",
  });

  const handleChange = (key: keyof VendorForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    if (!form.company || !form.contactPerson || !form.email || !form.phone) {
      alert("Please fill required fields");
      return false;
    }
    return true;
  };

  const saveVendor = () => {
    if (!validate()) return;

    setLoading(true);

    const payload: Vendor = {
      id: editId || crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      company: form.company,
      contactPerson: form.contactPerson,
      email: form.email,
      phone: form.phone,
      category: form.category,
      taxId: form.taxId,
      address: form.address,
    };

    editId ? updateVendor(payload) : addVendor(payload);

    setTimeout(() => {
      setLoading(false);
      setEditId(null);
      setForm({
        company: "",
        contactPerson: "",
        email: "",
        phone: "",
        category: "",
        taxId: "",
        address: "",
        status: "active",
        contractType: "",
        notes: "",
      });
    }, 300);
  };

  const handleEdit = (v: Vendor) => {
    setEditId(v.id);
    setForm({
      company: v.company,
      contactPerson: v.contactPerson,
      email: v.email,
      phone: v.phone,
      category: v.category,
      taxId: v.taxId,
      address: v.address,
      status: "active",
      contractType: "",
      notes: "",
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Vendor Management</h1>
        <p className="text-gray-500 text-sm">
          Create and manage vendor partnerships
        </p>
      </div>

      {/* FORM CARD */}
      <div className="bg-white p-5 rounded-xl shadow space-y-4">
        <h2 className="font-semibold text-lg">
          {editId ? "Edit Vendor" : "Add New Vendor"}
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Company Name *" value={form.company} onChange={(v) => handleChange("company", v)} />
          <Input label="Contact Person *" value={form.contactPerson} onChange={(v) => handleChange("contactPerson", v)} />
          <Input label="Email *" value={form.email} onChange={(v) => handleChange("email", v)} />
          <Input label="Phone *" value={form.phone} onChange={(v) => handleChange("phone", v)} />
          <Input label="Category" value={form.category} onChange={(v) => handleChange("category", v)} />
          <Input label="Tax ID / GST" value={form.taxId} onChange={(v) => handleChange("taxId", v)} />
          <Input label="Contract Type" value={form.contractType} onChange={(v) => handleChange("contractType", v)} />
        </div>

        <textarea
          placeholder="Address"
          className="border p-2 rounded w-full"
          value={form.address}
          onChange={(e) => handleChange("address", e.target.value)}
        />

        <textarea
          placeholder="Notes"
          className="border p-2 rounded w-full"
          value={form.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
        />

        <button
          onClick={saveVendor}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 transition text-white px-4 py-2 rounded w-full"
        >
          {loading ? "Saving..." : editId ? "Update Vendor" : "Add Vendor"}
        </button>
      </div>

      {/* LIST CARD */}
      <div className="bg-white p-5 rounded-xl shadow space-y-3">
        <h2 className="font-semibold text-lg">Vendor List</h2>

        {vendors.length === 0 && (
          <p className="text-gray-500 text-sm">No vendors added yet</p>
        )}

        {vendors.map((v) => (
          <div
            key={v.id}
            className="flex justify-between items-center border rounded-lg p-3 hover:bg-gray-50"
          >
            <div>
              <p className="font-semibold">{v.company}</p>
              <p className="text-sm text-gray-500">
                {v.contactPerson} • {v.email}
              </p>
            </div>

            <div className="space-x-4">
              <button
                onClick={() => handleEdit(v)}
                className="text-blue-600 hover:underline"
              >
                Edit
              </button>
              <button
                onClick={() => deleteVendor(v.id)}
                className="text-red-600 hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col space-y-1">
      <label className="text-sm text-gray-600">{label}</label>
      <input
        className="border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}