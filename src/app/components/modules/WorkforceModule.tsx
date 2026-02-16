import { useState } from "react";
import { useWorkforce } from "../../contexts/WorkforceContext";
import { useAuth } from "../../contexts/AuthContext";

export function WorkforceModule() {
  const {
    vendors,
    freelancers,
    addVendor,
    addFreelancer,
    deleteVendor,
    deleteFreelancer,
  } = useWorkforce();

  const { currentUser } = useAuth();

  if (!currentUser) return null;

  /* ===== ROLE PERMISSION ===== */
  const canManage =
    currentUser.role === "admin" || currentUser.role === "manager";

  /* ===== FORM STATE ===== */

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

  /* ===== SUBMIT HANDLERS ===== */

  const handleVendorSubmit = () => {
    if (!canManage) return;

    if (!vendorForm.name) return;

    addVendor({
      id: Date.now().toString(),
      ...vendorForm,
    });

    setVendorForm({
      name: "",
      company: "",
      email: "",
      phone: "",
      service: "",
    });
  };

  const handleFreelancerSubmit = () => {
    if (!canManage) return;

    if (!freelancerForm.name) return;

    addFreelancer({
      id: Date.now().toString(),
      ...freelancerForm,
    });

    setFreelancerForm({
      name: "",
      skill: "",
      email: "",
      phone: "",
      rate: "",
    });
  };

  /* ================= UI ================= */

  return (
    <div className="space-y-8">

      <h2 className="text-2xl font-semibold text-orange-600">
        Vendors & Freelancers
      </h2>

      {/* ===== ADD FORMS ===== */}
      {canManage && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ===== VENDOR FORM ===== */}
          <div className="bg-white p-4 rounded-xl shadow">
            <h3 className="font-semibold mb-3">Add Vendor</h3>

            {Object.keys(vendorForm).map((key) => (
              <input
                key={key}
                placeholder={key.charAt(0).toUpperCase() + key.slice(1)}
                value={(vendorForm as any)[key]}
                onChange={(e) =>
                  setVendorForm({
                    ...vendorForm,
                    [key]: e.target.value,
                  })
                }
                className="border p-2 rounded w-full mb-2"
              />
            ))}

            <button
              onClick={handleVendorSubmit}
              className="bg-orange-500 text-white px-4 py-2 rounded w-full"
            >
              Add Vendor
            </button>
          </div>

          {/* ===== FREELANCER FORM ===== */}
          <div className="bg-white p-4 rounded-xl shadow">
            <h3 className="font-semibold mb-3">Add Freelancer</h3>

            {Object.keys(freelancerForm).map((key) => (
              <input
                key={key}
                placeholder={key.charAt(0).toUpperCase() + key.slice(1)}
                value={(freelancerForm as any)[key]}
                onChange={(e) =>
                  setFreelancerForm({
                    ...freelancerForm,
                    [key]: e.target.value,
                  })
                }
                className="border p-2 rounded w-full mb-2"
              />
            ))}

            <button
              onClick={handleFreelancerSubmit}
              className="bg-orange-500 text-white px-4 py-2 rounded w-full"
            >
              Add Freelancer
            </button>
          </div>

        </div>
      )}

      {!canManage && (
        <p className="text-gray-500 text-sm">
          Only Admin and Manager can add or manage vendors and freelancers.
        </p>
      )}

      {/* ===== LIST SECTION ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ===== VENDOR LIST ===== */}
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="font-semibold mb-3">
            Vendors ({vendors.length})
          </h3>

          {vendors.length === 0 && (
            <p className="text-gray-400 text-sm">No vendors added</p>
          )}

          {vendors.map((v) => (
            <div
              key={v.id}
              className="flex justify-between items-center border-b py-2"
            >
              <div>
                <p className="font-medium">{v.name}</p>
                <p className="text-sm text-gray-500">
                  {v.company} • {v.service}
                </p>
              </div>

              {canManage && (
                <button
                  onClick={() => deleteVendor(v.id)}
                  className="text-red-500 text-sm"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>

        {/* ===== FREELANCER LIST ===== */}
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="font-semibold mb-3">
            Freelancers ({freelancers.length})
          </h3>

          {freelancers.length === 0 && (
            <p className="text-gray-400 text-sm">
              No freelancers added
            </p>
          )}

          {freelancers.map((f) => (
            <div
              key={f.id}
              className="flex justify-between items-center border-b py-2"
            >
              <div>
                <p className="font-medium">{f.name}</p>
                <p className="text-sm text-gray-500">
                  {f.skill} • {f.rate}
                </p>
              </div>

              {canManage && (
                <button
                  onClick={() => deleteFreelancer(f.id)}
                  className="text-red-500 text-sm"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
