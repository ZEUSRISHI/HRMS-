import { useState } from "react";
import { Freelancer, useWorkforce } from "../../contexts/WorkforceContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  canManageFreelancers,
  canManageFreelancerContracts,
  canViewWorkforce,
} from "../../../utils/permissions";

/**
 * 👉 UI-only fields (not stored in DB)
 */
type FreelancerForm = Omit<Freelancer, "id" | "createdAt"> & {
  experience: string;
  location: string;
  paymentType: string;
  notes: string;
};

export default function FreelancerModule() {
  const { freelancers, addFreelancer, updateFreelancer, deleteFreelancer } =
    useWorkforce();
  const { currentUser } = useAuth();

  const canView = canViewWorkforce(currentUser?.role);
  const canFullEdit = canManageFreelancers(currentUser?.role);
  const canContractEdit = canManageFreelancerContracts(currentUser?.role);

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
    experience: "",
    location: "",
    paymentType: "",
    notes: "",
  };

  const [form, setForm] = useState<FreelancerForm>(emptyForm);

  const updateField = (key: keyof FreelancerForm, value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  const saveFreelancer = () => {
    const payload: Freelancer = {
      id: editId ?? crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      name: form.name,
      email: form.email,
      phone: form.phone,
      skill: form.skill,
      rate: form.rate,
      contractStart: form.contractStart,
      contractEnd: form.contractEnd,
      status: form.status,
    };

    editId ? updateFreelancer(payload) : addFreelancer(payload);

    setLoading(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const startEdit = (f: Freelancer) => {
    setEditId(f.id);
    setForm({
      ...f,
      experience: "",
      location: "",
      paymentType: "",
      notes: "",
    });
  };

  const profileDisabled = !canFullEdit;
  const contractDisabled = !canFullEdit && !canContractEdit;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Freelancer Management</h1>
        <p className="text-gray-500 text-sm">
          {canFullEdit
            ? "Manage freelancer profiles and contracts"
            : "View freelancer information"}
        </p>
      </div>

      {/* 🔹 FORM — hidden for admin */}
      {(canFullEdit || canContractEdit) && (
        <div className="bg-white rounded-xl shadow p-5 space-y-4">
          <h2 className="font-semibold text-lg">
            {editId ? "Edit Freelancer" : "Add Freelancer"}
          </h2>

          {/* PROFILE */}
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="Name *" value={form.name} onChange={(v) => updateField("name", v)} disabled={profileDisabled} />
            <Input label="Email *" value={form.email} onChange={(v) => updateField("email", v)} disabled={profileDisabled} />
            <Input label="Phone" value={form.phone} onChange={(v) => updateField("phone", v)} disabled={profileDisabled} />
            <Input label="Primary Skill *" value={form.skill} onChange={(v) => updateField("skill", v)} disabled={profileDisabled} />
            <Input label="Experience" value={form.experience} onChange={(v) => updateField("experience", v)} disabled={profileDisabled} />
            <Input label="Location" value={form.location} onChange={(v) => updateField("location", v)} disabled={profileDisabled} />
            <Input label="Rate" value={form.rate} onChange={(v) => updateField("rate", v)} disabled={profileDisabled} />
            <Input label="Payment Type" value={form.paymentType} onChange={(v) => updateField("paymentType", v)} disabled={profileDisabled} />
          </div>

          {/* CONTRACT */}
          <div className="grid md:grid-cols-2 gap-4">
            <DateInput label="Contract Start" value={form.contractStart} onChange={(v) => updateField("contractStart", v)} disabled={contractDisabled} />
            <DateInput label="Contract End" value={form.contractEnd} onChange={(v) => updateField("contractEnd", v)} disabled={contractDisabled} />

            <select
              className="border p-2 rounded"
              value={form.status}
              disabled={contractDisabled}
              onChange={(e) =>
                updateField("status", e.target.value as "active" | "expired")
              }
            >
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <textarea
            placeholder="Notes"
            className="border p-2 rounded w-full"
            value={form.notes}
            disabled={profileDisabled}
            onChange={(e) => updateField("notes", e.target.value)}
          />

          <button
            onClick={saveFreelancer}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white py-2 rounded w-full"
          >
            {loading ? "Saving..." : editId ? "Update Freelancer" : "Add Freelancer"}
          </button>
        </div>
      )}

      {/* 🔹 LIST — visible to admin */}
      <div className="bg-white rounded-xl shadow p-5 space-y-3">
        <h2 className="font-semibold text-lg">Freelancer List</h2>

        {freelancers.length === 0 && (
          <p className="text-gray-500 text-sm">No freelancers added yet</p>
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

            {canFullEdit && (
              <div className="space-x-4">
                <button onClick={() => startEdit(f)} className="text-blue-600 hover:underline">
                  Edit
                </button>
                <button onClick={() => deleteFreelancer(f.id)} className="text-red-600 hover:underline">
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

/* 🔹 INPUTS */

function Input({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col space-y-1">
      <label className="text-sm text-gray-600">{label}</label>
      <input
        className="border p-2 rounded focus:ring-2 focus:ring-green-500 outline-none disabled:bg-gray-100"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function DateInput({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col space-y-1">
      <label className="text-sm text-gray-600">{label}</label>
      <input
        type="date"
        className="border p-2 rounded disabled:bg-gray-100"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}