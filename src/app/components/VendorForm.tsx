import { useState } from "react";
import { v4 as uuid } from "uuid";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useWorkforce } from "../contexts/WorkforceContext";
import { useNotification } from "../contexts/NotificationContext";

/* ================= TYPES ================= */

type VendorFormData = {
  name: string;      // from old form
  company: string;
  contact: string;
  email: string;
  phone: string;
  category: string;
  taxId: string;
  address: string;
};

export default function VendorForm() {
  const { addVendor } = useWorkforce();
  const { addNotification } = useNotification();

  const [form, setForm] = useState<VendorFormData>({
    name: "",
    company: "",
    contact: "",
    email: "",
    phone: "",
    category: "",
    taxId: "",
    address: "",
  });

  const [error, setError] = useState("");

  const handleChange = (key: keyof VendorFormData, value: string) => {
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
      id: uuid(),
      ...form,
    });

    addNotification(`New vendor added: ${form.company}`);

    alert("Vendor saved successfully ✅");

    handleCancel();
  };

  const handleCancel = () => {
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
    setError("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendor Information</CardTitle>
      </CardHeader>

      <CardContent className="grid md:grid-cols-2 gap-4">

        <Input label="Vendor Name" value={form.name} onChange={(v) => handleChange("name", v)} />
        <Input label="Company Name" value={form.company} onChange={(v) => handleChange("company", v)} />
        <Input label="Contact Person" value={form.contact} onChange={(v) => handleChange("contact", v)} />
        <Input label="Email Address" type="email" value={form.email} onChange={(v) => handleChange("email", v)} />
        <Input label="Phone Number" value={form.phone} onChange={(v) => handleChange("phone", v)} />
        <Input label="Service Category" value={form.category} onChange={(v) => handleChange("category", v)} />
        <Input label="GST / Tax ID" value={form.taxId} onChange={(v) => handleChange("taxId", v)} />

        <div className="md:col-span-2">
          <Input label="Company Address" value={form.address} onChange={(v) => handleChange("address", v)} />
        </div>

        {error && (
          <p className="text-red-500 text-sm md:col-span-2">{error}</p>
        )}

        <div className="flex justify-end gap-3 md:col-span-2 pt-4">
          <button
            onClick={handleCancel}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Save Vendor
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
