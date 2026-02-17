import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useWorkforce } from "../contexts/WorkforceContext";
import { useNotification } from "../contexts/NotificationContext";

type FreelancerFormData = {
  name: string;
  email: string;
  phone: string;
  skill: string;
  rate: string;
  experience: string;
  portfolio: string;
};

export default function FreelancerForm() {
  const { addFreelancer } = useWorkforce();
  const { addNotification } = useNotification(); // ✅ hook inside component

  const [form, setForm] = useState<FreelancerFormData>({
    name: "",
    email: "",
    phone: "",
    skill: "",
    rate: "",
    experience: "",
    portfolio: "",
  });

  const [error, setError] = useState("");

  const handleChange = (key: keyof FreelancerFormData, value: string) => {
    setForm({ ...form, [key]: value });
    setError("");
  };

  const handleSave = () => {
    const isEmpty = Object.values(form).some((v) => !v.trim());

    if (isEmpty) {
      setError("Please fill all required fields");
      return;
    }

    addFreelancer({
      id: Date.now().toString(),
      ...form,
    });

    // ✅ Notification trigger
    addNotification(`New freelancer added: ${form.name}`);

    alert("Freelancer saved successfully ✅");
    handleCancel();
  };

  const handleCancel = () => {
    setForm({
      name: "",
      email: "",
      phone: "",
      skill: "",
      rate: "",
      experience: "",
      portfolio: "",
    });
    setError("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Freelancer Information</CardTitle>
      </CardHeader>

      <CardContent className="grid md:grid-cols-2 gap-4">
        <Input label="Full Name" value={form.name} onChange={(v) => handleChange("name", v)} />
        <Input label="Email Address" type="email" value={form.email} onChange={(v) => handleChange("email", v)} />
        <Input label="Phone Number" value={form.phone} onChange={(v) => handleChange("phone", v)} />
        <Input label="Primary Skill" value={form.skill} onChange={(v) => handleChange("skill", v)} />
        <Input label="Hourly Rate" value={form.rate} onChange={(v) => handleChange("rate", v)} />
        <Input label="Experience (Years)" value={form.experience} onChange={(v) => handleChange("experience", v)} />

        <div className="md:col-span-2">
          <Input label="Portfolio / Website" value={form.portfolio} onChange={(v) => handleChange("portfolio", v)} />
        </div>

        {error && <p className="text-red-500 text-sm md:col-span-2">{error}</p>}

        <div className="flex justify-end gap-3 md:col-span-2 pt-4">
          <button onClick={handleCancel} className="px-4 py-2 border rounded-lg">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-orange-500 text-white rounded-lg">
            Save Freelancer
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ================= INPUT ================= */

type InputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
};

function Input({ label, value, onChange, type = "text" }: InputProps) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-gray-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
      />
    </div>
  );
}
