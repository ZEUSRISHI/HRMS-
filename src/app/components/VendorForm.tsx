import { useState } from "react";
import { v4 as uuid } from "uuid";
import { useWorkforce } from "../contexts/WorkforceContext";
import { useAuth } from "../contexts/AuthContext";

export default function VendorModule() {
  const { vendors, addVendor, updateVendor, deleteVendor } = useWorkforce();
  const { currentUser } = useAuth();

  const isAdmin = currentUser?.role === "admin";

  const [editingId, setEditingId] = useState<string | null>(null);
  const [popup, setPopup] = useState("");

  const [form, setForm] = useState({
    name: "",
    company: "",
    contact: "",
    email: "",
    phone: "",
    category: "",
    taxId: "",
    address: "",
  });

  /* ================= POPUP ================= */
  function showPopup(message: string) {
    setPopup(message);
    setTimeout(() => setPopup(""), 2500);
  }

  /* ================= SAVE / UPDATE ================= */
  const handleSave = () => {
    if (!isAdmin) return;

    if (Object.values(form).some((v) => !v.trim())) {
      alert("All fields required");
      return;
    }

    if (editingId) {
      updateVendor({
        id: editingId,
        ...form,
        createdAt: new Date().toISOString(),
      });

      showPopup("Vendor updated successfully ✅");
      setEditingId(null);
    } else {
      addVendor({
        id: uuid(),
        ...form,
        createdAt: new Date().toISOString(),
      });

      showPopup("Vendor added successfully 🎉");
    }

    setForm({
      name: "",
      company: "",
      contact: "",
      email: "",
      phone: "",
      category: "",
      taxId: "",
      address: "",
    });
  };

  /* ================= DELETE ================= */
  const handleDelete = (id: string) => {
    if (!isAdmin) return;
    if (!confirm("Delete this vendor?")) return;

    deleteVendor(id);
    showPopup("Vendor deleted 🗑️");
  };

  /* ================= UI ================= */
  return (
    <div className="p-6 space-y-6">

      {popup && (
        <div className="fixed top-5 right-5 bg-black text-white px-4 py-2 rounded shadow z-50">
          {popup}
        </div>
      )}

      <h2 className="text-2xl font-bold">Vendor Management</h2>

      {/* ADMIN FORM */}
      {isAdmin && (
        <div className="grid md:grid-cols-2 gap-4 bg-white p-6 rounded-xl shadow">
          {Object.keys(form).map((key) => (
            <input
              key={key}
              placeholder={key}
              value={form[key as keyof typeof form]}
              onChange={(e) =>
                setForm({ ...form, [key]: e.target.value })
              }
              className="border rounded-lg px-3 py-2"
            />
          ))}

          <button
            onClick={handleSave}
            className="md:col-span-2 bg-orange-500 text-white py-2 rounded-lg hover:opacity-90"
          >
            {editingId ? "Update Vendor" : "Save Vendor"}
          </button>
        </div>
      )}

      {/* VENDOR LIST */}
      <div className="bg-white rounded-xl p-6 shadow">
        <h3 className="font-semibold mb-4">Saved Vendors</h3>

        {vendors.length === 0 && (
          <p className="text-gray-500">No vendors available.</p>
        )}

        {vendors.map((v) => (
          <div
            key={v.id}
            className="flex justify-between items-center border-b py-3"
          >
            <div>
              <p className="font-semibold">{v.company}</p>
              <p className="text-sm text-gray-500">
                {v.category} • {v.email}
              </p>
            </div>

            {isAdmin && (
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setForm({
                      name: v.name,
                      company: v.company,
                      contact: v.contact,
                      email: v.email,
                      phone: v.phone,
                      category: v.category,
                      taxId: v.taxId,
                      address: v.address,
                    });
                    setEditingId(v.id);
                  }}
                  className="text-blue-500 hover:underline"
                >
                  Edit
                </button>

                <button
                  onClick={() => handleDelete(v.id)}
                  className="text-red-500 hover:underline"
                >
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