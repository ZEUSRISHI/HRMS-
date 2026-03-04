import { useState } from "react";
import { Freelancer, useWorkforce } from "../../contexts/WorkforceContext";
import { useAuth } from "../../contexts/AuthContext";

/**
 * Strict Form Type (No any)
 */
type FreelancerForm = Omit<Freelancer, "id" | "createdAt">;

export default function FreelancerModule() {
  const {
    freelancers,
    addFreelancer,
    updateFreelancer,
    deleteFreelancer,
  } = useWorkforce();

  const { currentUser } = useAuth();
  if (!currentUser) return null;

  const isAdmin = currentUser.role === "admin";
  const isManager = currentUser.role === "manager";
  const isHR = currentUser.role === "hr";

  const canView = isAdmin || isManager || isHR;
  if (!canView) return null;

  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emptyForm: FreelancerForm = {
    name: "",
    email: "",
    phone: "",
    skill: "",
    rate: "",
    contractStart: "",
    contractEnd: "",
    status: "active",
  };

  const [form, setForm] = useState<FreelancerForm>(emptyForm);

  const handleChange = (key: keyof FreelancerForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    if (!form.name || !form.email || !form.skill) {
      alert("Please fill required fields (Name, Email, Skill)");
      return false;
    }
    return true;
  };

  const saveFreelancer = () => {
    if (!isAdmin) return;
    if (!validate()) return;

    setLoading(true);

    const payload: Freelancer = {
      id: editId ?? crypto.randomUUID(),
      createdAt: editId
        ? freelancers.find((f) => f.id === editId)?.createdAt ||
          new Date().toISOString()
        : new Date().toISOString(),
      ...form,
    };

    editId
      ? updateFreelancer(payload)
      : addFreelancer(payload);

    setTimeout(() => {
      setEditId(null);
      setForm(emptyForm);
      setLoading(false);
    }, 300);
  };

  const startEdit = (f: Freelancer) => {
    if (!isAdmin) return;

    setEditId(f.id);
    setForm({
      name: f.name,
      email: f.email,
      phone: f.phone,
      skill: f.skill,
      rate: f.rate,
      contractStart: f.contractStart,
      contractEnd: f.contractEnd,
      status: f.status,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Freelancer Management
        </h1>
        <p className="text-gray-500 text-sm">
          {isAdmin
            ? "Manage freelancer profiles and contracts"
            : "View freelancer information"}
        </p>
      </div>

      {/* 🔹 ADMIN FORM */}
      {isAdmin && (
        <div className="bg-white p-5 rounded-xl shadow space-y-4">
          <h2 className="font-semibold text-lg">
            {editId ? "Edit Freelancer" : "Add New Freelancer"}
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Name *"
              value={form.name}
              onChange={(v) => handleChange("name", v)}
            />
            <Input
              label="Email *"
              value={form.email}
              onChange={(v) => handleChange("email", v)}
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(v) => handleChange("phone", v)}
            />
            <Input
              label="Primary Skill *"
              value={form.skill}
              onChange={(v) => handleChange("skill", v)}
            />
            <Input
              label="Rate"
              value={form.rate}
              onChange={(v) => handleChange("rate", v)}
            />
            <DateInput
              label="Contract Start"
              value={form.contractStart}
              onChange={(v) => handleChange("contractStart", v)}
            />
            <DateInput
              label="Contract End"
              value={form.contractEnd}
              onChange={(v) => handleChange("contractEnd", v)}
            />

            <div className="flex flex-col space-y-1">
              <label className="text-sm text-gray-600">
                Status
              </label>
              <select
                className="border p-2 rounded"
                value={form.status}
                onChange={(e) =>
                  handleChange(
                    "status",
                    e.target.value as "active" | "expired"
                  )
                }
              >
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          <button
            onClick={saveFreelancer}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 transition text-white px-4 py-2 rounded w-full"
          >
            {loading
              ? "Saving..."
              : editId
              ? "Update Freelancer"
              : "Add Freelancer"}
          </button>
        </div>
      )}

      {/* 🔹 LIST (Visible to Admin, Manager, HR) */}
      <div className="bg-white p-5 rounded-xl shadow space-y-3">
        <h2 className="font-semibold text-lg">
          Freelancer List
        </h2>

        {freelancers.length === 0 && (
          <p className="text-gray-500 text-sm">
            No freelancers added yet
          </p>
        )}

        {freelancers.map((f) => (
          <div
            key={f.id}
            className="flex justify-between items-center border rounded-lg p-3 hover:bg-gray-50"
          >
            <div>
              <p className="font-semibold">{f.name}</p>
              <p className="text-sm text-gray-500">
                {f.skill} • {f.status}
              </p>
            </div>

            {isAdmin && (
              <div className="space-x-4">
                <button
                  onClick={() => startEdit(f)}
                  className="text-blue-600 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteFreelancer(f.id)}
                  className="text-red-600 hover:underline"
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

/* 🔹 Reusable Inputs */

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
      <label className="text-sm text-gray-600">
        {label}
      </label>
      <input
        className="border p-2 rounded focus:ring-2 focus:ring-green-500 outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function DateInput({
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
      <label className="text-sm text-gray-600">
        {label}
      </label>
      <input
        type="date"
        className="border p-2 rounded"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}