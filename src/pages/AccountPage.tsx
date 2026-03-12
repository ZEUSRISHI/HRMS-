import { useState } from "react";
import { useAuth } from "../app/contexts/AuthContext";
import { authApi } from "../services/api";

export default function AccountPage() {
  const { currentUser, logout } = useAuth();

  if (!currentUser) return null;

  const [form, setForm] = useState({
    email:         currentUser.email,
    role:          currentUser.role,
    notifications: true,
    twoFactor:     false,
    language:      "English",
    timezone:      "Asia/Kolkata",
    oldPassword:   "",
    newPassword:   "",
    confirmPassword: "",
  });

  const [saving, setSaving]   = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSave = async () => {
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setMessage("❌ New passwords do not match");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      if (form.oldPassword && form.newPassword) {
        await authApi.changePassword(form.oldPassword, form.newPassword);
        setForm({ ...form, oldPassword: "", newPassword: "", confirmPassword: "" });
      }
      setMessage("✅ Account settings saved successfully!");
    } catch (err: any) {
      setMessage("❌ " + (err.message || "Failed to save settings"));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      ...form,
      email:           currentUser.email,
      role:            currentUser.role,
      oldPassword:     "",
      newPassword:     "",
      confirmPassword: "",
    });
    setMessage("");
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="w-full bg-white p-8 rounded-xl shadow space-y-8">

      <h2 className="text-2xl font-semibold">Account Settings</h2>

      {message && (
        <div className={`p-3 rounded-lg text-sm text-center ${
          message.startsWith("✅")
            ? "bg-green-50 text-green-600 border border-green-200"
            : "bg-red-50 text-red-600 border border-red-200"
        }`}>
          {message}
        </div>
      )}

      {/* ACCOUNT INFO */}
      <Section title="Account Information">
        <Field label="Email Address" name="email" value={form.email} disabled />
        <Field label="Role"          name="role"  value={form.role}  disabled />
      </Section>

      {/* CHANGE PASSWORD */}
      <Section title="Change Password">
        <Field
          label="Current Password"
          name="oldPassword"
          type="password"
          value={form.oldPassword}
          onChange={handleChange}
          placeholder="Enter current password"
        />
        <Field
          label="New Password"
          name="newPassword"
          type="password"
          value={form.newPassword}
          onChange={handleChange}
          placeholder="Min. 6 characters"
        />
        <Field
          label="Confirm New Password"
          name="confirmPassword"
          type="password"
          value={form.confirmPassword}
          onChange={handleChange}
          placeholder="Repeat new password"
        />
      </Section>

      {/* PREFERENCES */}
      <Section title="Preferences">
        <SelectField
          label="Language"
          name="language"
          value={form.language}
          onChange={handleChange}
          options={["English", "Tamil", "Hindi"]}
        />
        <SelectField
          label="Timezone"
          name="timezone"
          value={form.timezone}
          onChange={handleChange}
          options={["Asia/Kolkata", "UTC", "GMT"]}
        />
      </Section>

      {/* SECURITY */}
      <Section title="Security">
        <CheckboxField
          label="Enable Email Notifications"
          name="notifications"
          checked={form.notifications}
          onChange={handleChange}
        />
        <CheckboxField
          label="Enable Two Factor Authentication"
          name="twoFactor"
          checked={form.twoFactor}
          onChange={handleChange}
        />
      </Section>

      {/* ACTIONS */}
      <div className="flex justify-between border-t pt-6">
        <button
          onClick={handleLogout}
          className="px-5 py-2 rounded-lg text-red-600 border border-red-200 hover:bg-red-50 transition"
        >
          Logout
        </button>

        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="px-5 py-2 rounded-lg border hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:bg-orange-300 transition font-medium"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b">{title}</h3>
      <div className="grid md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Field({ label, ...props }: any) {
  return (
    <div>
      <label className="text-sm text-gray-500 font-medium">{label}</label>
      <input
        {...props}
        className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400 outline-none disabled:bg-gray-50 disabled:text-gray-400"
      />
    </div>
  );
}

function SelectField({ label, options, ...props }: any) {
  return (
    <div>
      <label className="text-sm text-gray-500 font-medium">{label}</label>
      <select
        {...props}
        className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400 outline-none bg-white"
      >
        {options.map((o: string) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

function CheckboxField({ label, ...props }: any) {
  return (
    <label className="flex items-center gap-2 mt-2 cursor-pointer">
      <input type="checkbox" {...props} className="accent-orange-500 w-4 h-4" />
      <span className="text-sm text-gray-600">{label}</span>
    </label>
  );
}