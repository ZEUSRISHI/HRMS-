import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { useWorkforce } from "../../contexts/WorkforceContext";
import Vendor from "../../components/VendorForm";
import Freelancer from "../../components/FreelancerForm";



type TabType = "vendors" | "freelancers";

export function WorkforceModule() {
  const [activeTab, setActiveTab] = useState<TabType>("vendors");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Workforce Management</h1>
        <p className="text-gray-500 text-sm">
          Manage vendors and freelancers separately
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <TabButton
          active={activeTab === "vendors"}
          label="Vendors"
          onClick={() => setActiveTab("vendors")}
        />
        <TabButton
          active={activeTab === "freelancers"}
          label="Freelancers"
          onClick={() => setActiveTab("freelancers")}
        />
      </div>

      {activeTab === "vendors" ? <VendorForm /> : <FreelancerForm />}
    </div>
  );
}

/* ================= TAB BUTTON ================= */

type TabProps = {
  active: boolean;
  label: string;
  onClick: () => void;
};

function TabButton({ active, label, onClick }: TabProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition
        ${active ? "bg-orange-500 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
    >
      {label}
    </button>
  );
}

/* ================= VENDOR FORM ================= */

function VendorForm() {
  const { addVendor } = useWorkforce();

  const [form, setForm] = useState({
    company: "",
    contact: "",
    email: "",
    phone: "",
    category: "",
    taxId: "",
    address: "",
  });

  const [error, setError] = useState("");

  const handleChange = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
    setError("");
  };

  const handleSave = () => {
    const isEmpty = Object.values(form).some((v) => !v.trim());

    if (isEmpty) {
      setError("Please fill all required fields");
      return;
    }

    addVendor({
      id: Date.now().toString(),
      ...form,
    });

    alert("Vendor saved successfully ✅");
    handleCancel();
  };

  const handleCancel = () => {
    setForm({
      company: "",
      contact: "",
      email: "",
      phone: "",
      category: "",
      taxId: "",
      address: "",
    });
    setError("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendor Information</CardTitle>
      </CardHeader>

      <CardContent className="grid md:grid-cols-2 gap-4">
        <Input label="Company Name" value={form.company} onChange={(v) => handleChange("company", v)} />
        <Input label="Contact Person" value={form.contact} onChange={(v) => handleChange("contact", v)} />
        <Input label="Email Address" type="email" value={form.email} onChange={(v) => handleChange("email", v)} />
        <Input label="Phone Number" value={form.phone} onChange={(v) => handleChange("phone", v)} />
        <Input label="Service Category" value={form.category} onChange={(v) => handleChange("category", v)} />
        <Input label="GST / Tax ID" value={form.taxId} onChange={(v) => handleChange("taxId", v)} />

        <div className="md:col-span-2">
          <Input label="Company Address" value={form.address} onChange={(v) => handleChange("address", v)} />
        </div>

        {error && <p className="text-red-500 text-sm md:col-span-2">{error}</p>}

        <div className="flex justify-end gap-3 md:col-span-2 pt-4">
          <button onClick={handleCancel} className="px-4 py-2 rounded-lg border">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-orange-500 text-white">
            Save Vendor
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ================= FREELANCER FORM ================= */

function FreelancerForm() {
  const { addFreelancer } = useWorkforce();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    skill: "",
    rate: "",
    experience: "",
    portfolio: "",
  });

  const [error, setError] = useState("");

  const handleChange = (key: string, value: string) => {
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
          <button onClick={handleCancel} className="px-4 py-2 rounded-lg border">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-orange-500 text-white">
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
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
      />
    </div>
  );
}
