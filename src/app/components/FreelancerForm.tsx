import { useState } from "react";
import { v4 as uuid } from "uuid";
import { useWorkforce } from "../contexts/WorkforceContext";
import { useAuth } from "../contexts/AuthContext";

type PopupType = "success" | "error" | null;

export default function FreelancerModule() {
  const {
    freelancers,
    addFreelancer,
    updateFreelancer,
    deleteFreelancer,
  } = useWorkforce();

  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";

  const [editingId, setEditingId] = useState<string | null>(null);

  const [popup, setPopup] = useState<{
    message: string;
    type: PopupType;
  }>({ message: "", type: null });

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    skill: "",
    rate: "",
    experience: "",
    portfolio: "",
  });

  const showPopup = (message: string, type: PopupType = "success") => {
    setPopup({ message, type });
    setTimeout(() => setPopup({ message: "", type: null }), 2500);
  };

  const handleSave = () => {
    if (!isAdmin) return;

    if (Object.values(form).some((v) => !v.trim())) {
      showPopup("All fields are required", "error");
      return;
    }

    if (editingId) {
      updateFreelancer({
        id: editingId,
        ...form,
        createdAt: new Date().toISOString(),
      });
      setEditingId(null);
      showPopup("Freelancer updated successfully ✅");
    } else {
      addFreelancer({
        id: uuid(),
        ...form,
        createdAt: new Date().toISOString(),
      });
      showPopup("Freelancer added successfully 🎉");
    }

    setForm({
      name: "",
      email: "",
      phone: "",
      skill: "",
      rate: "",
      experience: "",
      portfolio: "",
    });
  };

  const handleDelete = (id: string) => {
    deleteFreelancer(id);
    showPopup("Freelancer deleted 🗑️");
  };

  return (
    <div className="p-6 space-y-6 relative">
      <h2 className="text-2xl font-bold">Freelancer Management</h2>

      {/* 🔔 POPUP */}
      {popup.type && (
        <div
          className={`fixed top-6 right-6 px-4 py-3 rounded-lg shadow-lg text-white
          ${popup.type === "success" ? "bg-green-500" : "bg-red-500"}`}
        >
          {popup.message}
        </div>
      )}

      {/* 🟢 ADMIN FORM */}
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
            className="md:col-span-2 bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600"
          >
            {editingId ? "Update Freelancer" : "Save Freelancer"}
          </button>
        </div>
      )}

      {/* 🔵 LIST */}
      <div className="bg-white rounded-xl p-6 shadow">
        <h3 className="font-semibold mb-4">Saved Freelancers</h3>

        {freelancers.length === 0 && (
          <p className="text-gray-500">No freelancers available.</p>
        )}

        {freelancers.map((f) => (
          <div
            key={f.id}
            className="flex justify-between items-center border-b py-3"
          >
            <div>
              <p className="font-semibold">{f.name}</p>
              <p className="text-sm text-gray-500">
                {f.skill} • {f.email}
              </p>
            </div>

            {isAdmin && (
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setForm(f);
                    setEditingId(f.id);
                  }}
                  className="text-blue-500"
                >
                  Edit
                </button>

                <button
                  onClick={() => handleDelete(f.id)}
                  className="text-red-500"
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