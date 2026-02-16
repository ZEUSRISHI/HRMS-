export default function ProfilePage() {
  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <h1 className="text-xl font-semibold mb-6">Profile</h1>

      <section className="mb-6">
        <h2 className="font-medium mb-4">Basic Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <input className="input" placeholder="First Name" />
          <input className="input" placeholder="Last Name" />
          <input className="input" placeholder="Email" />
          <input className="input" placeholder="Phone" />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="font-medium mb-4">Address Information</h2>
        <input className="input mb-4" placeholder="Address" />
        <div className="grid grid-cols-2 gap-4">
          <input className="input" placeholder="Country" />
          <input className="input" placeholder="State" />
          <input className="input" placeholder="City" />
          <input className="input" placeholder="Postal Code" />
        </div>
      </section>

      {/* PASSWORD SECTION ONLY IN PROFILE */}
      <section>
        <h2 className="font-medium mb-4">Change Password</h2>
        <div className="grid grid-cols-3 gap-4">
          <input type="password" className="input" placeholder="Current Password" />
          <input type="password" className="input" placeholder="New Password" />
          <input type="password" className="input" placeholder="Confirm Password" />
        </div>
      </section>

      <div className="flex justify-end gap-3 mt-6">
        <button className="px-4 py-2 border rounded-lg">Cancel</button>
        <button className="px-4 py-2 bg-orange-500 text-white rounded-lg">Save</button>
      </div>
    </div>
  );
}
