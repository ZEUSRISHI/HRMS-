import { useState } from "react";
import { useAuth } from "../app/contexts/AuthContext";

export default function AccountPage() {
  const { currentUser, users, logout } = useAuth();

  if (!currentUser) return null;

  const [form, setForm] = useState({
    email: currentUser.email,
    role: currentUser.role,
    notifications: true,
    twoFactor: false,
    language: "English",
    timezone: "Asia/Kolkata",
  });

  /* ===== HANDLE CHANGE ===== */
  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  /* ===== SAVE ===== */
  const handleSave = () => {
    const updatedUsers = users.map((u) =>
      u.id === currentUser.id
        ? { ...u, email: form.email }
        : u
    );

    localStorage.setItem("hrms_users", JSON.stringify(updatedUsers));
    localStorage.setItem(
      "hrms_current",
      JSON.stringify({ ...currentUser, email: form.email })
    );

    alert("Account settings saved ✅");
    window.location.reload();
  };

  /* ===== CANCEL ===== */
  const handleCancel = () => {
    setForm({
      email: currentUser.email,
      role: currentUser.role,
      notifications: true,
      twoFactor: false,
      language: "English",
      timezone: "Asia/Kolkata",
    });
  };

  return (
    <div className="w-full bg-white p-8 rounded-xl shadow space-y-8">

      {/* ===== HEADER ===== */}
      <h2 className="text-2xl font-semibold">Account Settings</h2>

      {/* ===== ACCOUNT INFO ===== */}
      <Section title="Account Information">
        <Input
          label="Email Address"
          name="email"
          value={form.email}
          onChange={handleChange}
        />

        <Input
          label="Role"
          name="role"
          value={form.role}
          disabled
        />
      </Section>

      {/* ===== PREFERENCES ===== */}
      <Section title="Preferences">
        <Select
          label="Language"
          name="language"
          value={form.language}
          onChange={handleChange}
          options={["English", "Tamil", "Hindi"]}
        />

        <Select
          label="Timezone"
          name="timezone"
          value={form.timezone}
          onChange={handleChange}
          options={["Asia/Kolkata", "UTC", "GMT"]}
        />
      </Section>

      {/* ===== SECURITY ===== */}
      <Section title="Security">
        <Checkbox
          label="Enable Email Notifications"
          name="notifications"
          checked={form.notifications}
          onChange={handleChange}
        />

        <Checkbox
          label="Enable Two Factor Authentication"
          name="twoFactor"
          checked={form.twoFactor}
          onChange={handleChange}
        />
      </Section>

      {/* ===== ACTIONS ===== */}
      <div className="flex justify-between border-t pt-6">
        <button
          onClick={logout}
          className="px-5 py-2 rounded-lg text-red-600 border border-red-200 hover:bg-red-50"
        >
          Logout
        </button>

        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="px-5 py-2 rounded-lg border hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== SECTION ===== */
function Section({ title, children }: any) {
  return (
    <div>
      <h3 className="font-semibold mb-4">{title}</h3>
      <div className="grid md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

/* ===== INPUT ===== */
function Input({ label, ...props }: any) {
  return (
    <div>
      <label className="text-sm text-gray-500">{label}</label>
      <input
        {...props}
        className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400 outline-none"
      />
    </div>
  );
}

/* ===== SELECT ===== */
function Select({ label, options, ...props }: any) {
  return (
    <div>
      <label className="text-sm text-gray-500">{label}</label>
      <select
        {...props}
        className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400 outline-none"
      >
        {options.map((o: string) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

/* ===== CHECKBOX ===== */
function Checkbox({ label, ...props }: any) {
  return (
    <label className="flex items-center gap-2 mt-2">
      <input type="checkbox" {...props} />
      <span className="text-sm">{label}</span>
    </label>
  );
}
