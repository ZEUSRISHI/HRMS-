import { useState } from "react";
import { useWorkforce } from "../../contexts/WorkforceContext";
import { useAuth } from "../../contexts/AuthContext";

export function WorkforceModule() {
  const { vendors, freelancers, addVendor, addFreelancer, deleteVendor, deleteFreelancer } = useWorkforce();
  const { currentUser } = useAuth();

  const isAdmin = currentUser?.role === "admin";

  const [vendorForm, setVendorForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    service: "",
  });

  const [freelancerForm, setFreelancerForm] = useState({
    name: "",
    skill: "",
    email: "",
    phone: "",
    rate: "",
  });

  /* ================= HANDLERS ================= */

  const handleVendorSubmit = () => {
    if (!isAdmin) return;

    addVendor({
      id: Date.now().toString(),
      ...vendorForm,
    });

    setVendorForm({ name: "", company: "", email: "", phone: "", service: "" });
  };

  const handleFreelancerSubmit = () => {
    if (!isAdmin) return;

    addFreelancer({
      id: Date.now().toString(),
      ...freelancerForm,
    });

    setFreelancerForm({ name: "", skill: "", email: "", phone: "", rate: "" });
  };

  /* ================= UI ================= */

  return (
    <div className="space-y-6">

      {/* ================= VENDORS ================= */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="font-semibold mb-3">Vendors</h2>

        {isAdmin && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {Object.keys(vendorForm).map((key) => (
              <input
                key={key}
                placeholder={key}
                value={(vendorForm as any)[key]}
                onChange={(e) => setVendorForm({ ...vendorForm, [key]: e.target.value })}
                className="border p-2 rounded"
              />
            ))}

            <button onClick={handleVendorSubmit} className="bg-orange-500 text-white p-2 rounded col-span-2">
              Add Vendor
            </button>
          </div>
        )}

        <ul className="space-y-2">
          {vendors.map((v) => (
            <li key={v.id} className="border p-2 rounded flex justify-between">
              <span>{v.name} — {v.company}</span>
              {isAdmin && (
                <button onClick={() => deleteVendor(v.id)} className="text-red-500">Delete</button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* ================= FREELANCERS ================= */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="font-semibold mb-3">Freelancers</h2>

        {isAdmin && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {Object.keys(freelancerForm).map((key) => (
              <input
                key={key}
                placeholder={key}
                value={(freelancerForm as any)[key]}
                onChange={(e) => setFreelancerForm({ ...freelancerForm, [key]: e.target.value })}
                className="border p-2 rounded"
              />
            ))}

            <button onClick={handleFreelancerSubmit} className="bg-orange-500 text-white p-2 rounded col-span-2">
              Add Freelancer
            </button>
          </div>
        )}

        <ul className="space-y-2">
          {freelancers.map((f) => (
            <li key={f.id} className="border p-2 rounded flex justify-between">
              <span>{f.name} — {f.skill}</span>
              {isAdmin && (
                <button onClick={() => deleteFreelancer(f.id)} className="text-red-500">Delete</button>
              )}
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
}
