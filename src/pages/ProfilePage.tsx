import { useState, useRef } from "react";
import { useAuth } from "../app/contexts/AuthContext";

export default function ProfilePage() {
  const { currentUser, users } = useAuth();

  const fileRef = useRef<HTMLInputElement>(null);

  const [avatar, setAvatar] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: currentUser?.name.split(" ")[0] || "",
    lastName: currentUser?.name.split(" ")[1] || "",
    email: currentUser?.email || "",
    phone: "",
    designation: "Software Engineer",
    department: "Engineering",
    dob: "",
    gender: "",
    address: "",
    country: "",
    state: "",
    city: "",
    postalCode: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  if (!currentUser) return null;

  /* ===== INPUT CHANGE ===== */
  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ===== IMAGE PREVIEW ===== */
  const handleImage = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  /* ===== SAVE ===== */
  const handleSave = () => {
    const updatedName = `${form.firstName} ${form.lastName}`;

    const updatedUsers = users.map((u) =>
      u.id === currentUser.id
        ? { ...u, name: updatedName, email: form.email }
        : u
    );

    localStorage.setItem("hrms_users", JSON.stringify(updatedUsers));
    localStorage.setItem(
      "hrms_current",
      JSON.stringify({ ...currentUser, name: updatedName, email: form.email })
    );

    alert("Profile updated successfully ✅");
    window.location.reload();
  };

  /* ===== CANCEL ===== */
  const handleCancel = () => {
    setForm({
      ...form,
      firstName: currentUser.name.split(" ")[0] || "",
      lastName: currentUser.name.split(" ")[1] || "",
      email: currentUser.email,
    });
    setAvatar(null);
  };

  return (
    <div className="w-full bg-white p-8 rounded-xl shadow space-y-8">

      {/* ===== HEADER ===== */}
      <h2 className="text-2xl font-semibold">Profile Settings</h2>

      {/* ===== PROFILE PHOTO ===== */}
      <div className="flex items-center gap-6">
        <div className="h-20 w-20 rounded-full overflow-hidden bg-orange-500 flex items-center justify-center text-white text-2xl font-bold">
          {avatar ? (
            <img src={avatar} className="h-full w-full object-cover" />
          ) : (
            currentUser.name.charAt(0)
          )}
        </div>

        <div>
          <button
            onClick={() => fileRef.current?.click()}
            className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Upload Photo
          </button>

          <input
            ref={fileRef}
            type="file"
            onChange={handleImage}
            className="hidden"
          />

          <p className="text-xs text-gray-400 mt-1">
            Recommended 200x200 JPG or PNG
          </p>
        </div>
      </div>

      {/* ===== BASIC INFO ===== */}
      <Section title="Basic Information">
        <Input label="First Name" name="firstName" value={form.firstName} onChange={handleChange} />
        <Input label="Last Name" name="lastName" value={form.lastName} onChange={handleChange} />
        <Input label="Email" name="email" value={form.email} onChange={handleChange} />
        <Input label="Phone" name="phone" value={form.phone} onChange={handleChange} />
        <Input label="Designation" name="designation" value={form.designation} onChange={handleChange} />
        <Input label="Department" name="department" value={form.department} onChange={handleChange} />
        <Input label="Date of Birth" type="date" name="dob" value={form.dob} onChange={handleChange} />
        <Select label="Gender" name="gender" value={form.gender} onChange={handleChange} options={["Male","Female","Other"]} />
      </Section>

      {/* ===== ADDRESS ===== */}
      <Section title="Address Information">
        <Input label="Address" name="address" value={form.address} onChange={handleChange} />
        <Input label="Country" name="country" value={form.country} onChange={handleChange} />
        <Input label="State" name="state" value={form.state} onChange={handleChange} />
        <Input label="City" name="city" value={form.city} onChange={handleChange} />
        <Input label="Postal Code" name="postalCode" value={form.postalCode} onChange={handleChange} />
      </Section>

      {/* ===== PASSWORD ===== */}
      <Section title="Change Password">
        <Input type="password" label="Current Password" name="currentPassword" value={form.currentPassword} onChange={handleChange} />
        <Input type="password" label="New Password" name="newPassword" value={form.newPassword} onChange={handleChange} />
        <Input type="password" label="Confirm Password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} />
      </Section>

      {/* ===== ACTIONS ===== */}
      <div className="flex justify-end gap-3 border-t pt-6">
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
        <option value="">Select</option>
        {options.map((o: string) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
