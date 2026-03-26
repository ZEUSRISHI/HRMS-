import { useState, useRef } from "react";
import { useAuth } from "../app/contexts/AuthContext";
import { profileApi } from "../services/api";

export default function ProfilePage() {
  const { currentUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    firstName:       currentUser?.name.split(" ")[0] || "",
    lastName:        currentUser?.name.split(" ")[1] || "",
    email:           currentUser?.email || "",
    phone:           currentUser?.phone || "",
    designation:     "Software Engineer",
    department:      currentUser?.department || "Engineering",
    dob:             "",
    gender:          "",
    address:         "",
    country:         "",
    state:           "",
    city:            "",
    postalCode:      "",
    currentPassword: "",
    newPassword:     "",
    confirmPassword: "",
  });

  if (!currentUser) return null;

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImage = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    try {
      await profileApi.update({
        name: `${form.firstName} ${form.lastName}`.trim(),
        phone: form.phone,
        department: form.department,
        avatar: avatar || undefined,
      });

      setMessage("✅ Profile updated successfully!");
    } catch (err: any) {
      setMessage("❌ " + (err.message || "Failed to update profile"));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      ...form,
      firstName: currentUser.name.split(" ")[0] || "",
      lastName:  currentUser.name.split(" ")[1] || "",
      email:     currentUser.email,
    });
    setAvatar(null);
    setMessage("");
  };

  return (
    <div className="w-full bg-white p-8 rounded-xl shadow space-y-8">

      <h2 className="text-2xl font-semibold">Profile Settings</h2>

      {message && (
        <div className={`p-3 rounded-lg text-sm text-center ${
          message.startsWith("✅")
            ? "bg-green-50 text-green-600 border border-green-200"
            : "bg-red-50 text-red-600 border border-red-200"
        }`}>
          {message}
        </div>
      )}

      {/* PHOTO */}
      <div className="flex items-center gap-6">
        <div className="h-20 w-20 rounded-full overflow-hidden bg-orange-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-orange-200">
          {avatar ? (
            <img src={avatar} className="h-full w-full object-cover" />
          ) : currentUser.avatar ? (
            <img src={currentUser.avatar} className="h-full w-full object-cover" />
          ) : (
            currentUser.name.charAt(0).toUpperCase()
          )}
        </div>

        <div>
          <button
            onClick={() => fileRef.current?.click()}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm transition"
          >
            Upload Photo
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
          <p className="text-xs text-gray-400 mt-1">Recommended: 200x200 JPG or PNG</p>
        </div>
      </div>

      {/* BASIC INFO */}
      <Section title="Basic Information">
        <Field label="First Name"   name="firstName"   value={form.firstName}   onChange={handleChange} />
        <Field label="Last Name"    name="lastName"    value={form.lastName}    onChange={handleChange} />
        <Field label="Email"        name="email"       value={form.email}       onChange={handleChange} disabled />
        <Field label="Phone"        name="phone"       value={form.phone}       onChange={handleChange} />
        <Field label="Designation"  name="designation" value={form.designation} onChange={handleChange} />
        <Field label="Department"   name="department"  value={form.department}  onChange={handleChange} />
        <Field label="Date of Birth" name="dob"        value={form.dob}         onChange={handleChange} type="date" />
        <SelectField
          label="Gender"
          name="gender"
          value={form.gender}
          onChange={handleChange}
          options={["Male", "Female", "Other"]}
        />
      </Section>

      {/* ADDRESS */}
      <Section title="Address Information">
        <Field label="Address"     name="address"    value={form.address}    onChange={handleChange} />
        <Field label="Country"     name="country"    value={form.country}    onChange={handleChange} />
        <Field label="State"       name="state"      value={form.state}      onChange={handleChange} />
        <Field label="City"        name="city"       value={form.city}       onChange={handleChange} />
        <Field label="Postal Code" name="postalCode" value={form.postalCode} onChange={handleChange} />
      </Section>

      {/* ACTIONS */}
      <div className="flex justify-end gap-3 border-t pt-6">
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
        <option value="">Select</option>
        {options.map((o: string) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}