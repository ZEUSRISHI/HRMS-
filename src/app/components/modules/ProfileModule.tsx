import { useState } from "react";

type ViewType = "profile" | "account";

export default function ProfileModule() {
  const [view, setView] = useState<ViewType>("profile");

  return (
    <div className="bg-white rounded-xl shadow p-6">

      {/* ===== TOP SWITCH BUTTONS ===== */}
      <div className="flex gap-3 mb-6 border-b pb-3">
        <button
          onClick={() => setView("profile")}
          className={`px-4 py-2 rounded-lg ${
            view === "profile"
              ? "bg-orange-500 text-white"
              : "bg-gray-100"
          }`}
        >
          Profile
        </button>

        <button
          onClick={() => setView("account")}
          className={`px-4 py-2 rounded-lg ${
            view === "account"
              ? "bg-orange-500 text-white"
              : "bg-gray-100"
          }`}
        >
          My Account
        </button>
      </div>

      {/* ===== VIEW SWITCH ===== */}
      {view === "profile" ? <ProfileForm /> : <AccountForm />}
    </div>
  );
}

/* ================= PROFILE FORM ================= */

function ProfileForm() {
  return (
    <div className="space-y-6">

      <h2 className="text-lg font-semibold">Basic Information</h2>

      <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-200" />

        <div>
          <p className="font-medium">Profile Photo</p>
          <p className="text-sm text-gray-500">
            Recommended image size is 40px x 40px
          </p>

          <div className="mt-2 flex gap-2">
            <button className="bg-orange-500 text-white px-3 py-1 rounded">
              Upload
            </button>
            <button className="px-3 py-1 rounded border">
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* FORM */}
      <div className="grid grid-cols-2 gap-4">
        <input placeholder="First Name" className="input" />
        <input placeholder="Last Name" className="input" />
        <input placeholder="Email" className="input" />
        <input placeholder="Phone" className="input" />
      </div>

      <h2 className="text-lg font-semibold">Address Information</h2>

      <input placeholder="Address" className="input w-full" />

      <div className="grid grid-cols-2 gap-4">
        <input placeholder="Country" className="input" />
        <input placeholder="State" className="input" />
        <input placeholder="City" className="input" />
        <input placeholder="Postal Code" className="input" />
      </div>

      <div className="flex justify-end gap-2">
        <button className="px-4 py-2 border rounded">Cancel</button>
        <button className="px-4 py-2 bg-orange-500 text-white rounded">
          Save
        </button>
      </div>
    </div>
  );
}

/* ================= ACCOUNT FORM ================= */

function AccountForm() {
  return (
    <div className="space-y-6">

      <h2 className="text-lg font-semibold">Profile Settings</h2>

      <div className="grid grid-cols-2 gap-4">
        <input type="password" placeholder="Current Password" className="input" />
        <input type="password" placeholder="New Password" className="input" />
        <input type="password" placeholder="Confirm Password" className="input" />
      </div>

      <div className="flex justify-end gap-2">
        <button className="px-4 py-2 border rounded">Cancel</button>
        <button className="px-4 py-2 bg-orange-500 text-white rounded">
          Save Changes
        </button>
      </div>
    </div>
  );
}
