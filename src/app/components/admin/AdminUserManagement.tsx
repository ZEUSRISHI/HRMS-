import { useState, useMemo } from "react";
import { useAdminUsers, Role } from "../../contexts/AdminUsersContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function AdminUserManagement() {
  const { users, addUser, updateUser, deleteUser } = useAdminUsers();

  const [form, setForm] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
    role: "HR" as Role,
  });

  const [editing, setEditing] = useState(false);

  /* ✅ SUCCESS MESSAGE STATE */
  const [message, setMessage] = useState<string | null>(null);

  const showMessage = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 2500); // auto hide
  };

  const handleSubmit = () => {
    if (!form.name || !form.email) return;

    if (editing) {
      updateUser(form.id, form);
      showMessage("✅ User updated successfully");
      setEditing(false);
    } else {
      addUser({ ...form, id: Date.now().toString() });
      showMessage("✅ User added successfully");
    }

    setForm({ id: "", name: "", email: "", phone: "", role: "HR" });
  };

  const handleEdit = (u: any) => {
    setForm(u);
    setEditing(true);
  };

  /* ================= CHART DATA ================= */

  const roleStats = useMemo(() => {
    const hr = users.filter(u => u.role === "HR").length;
    const manager = users.filter(u => u.role === "Manager").length;

    return [
      { name: "HR", value: hr },
      { name: "Manager", value: manager },
    ];
  }, [users]);

  const COLORS = ["#6366f1", "#22c55e"];

  return (
    <div className="space-y-6 relative">
      {/* ✅ SUCCESS POPUP */}
      {message && (
        <div className="fixed top-5 right-5 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          {message}
        </div>
      )}

      {/* HEADER */}
      <div>
        <h2 className="text-2xl font-bold">User Management</h2>
        <p className="text-gray-500">Create and manage HR & Manager accounts</p>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl shadow">
          <p className="text-gray-500">Total Users</p>
          <p className="text-2xl font-bold">{users.length}</p>
        </div>
        <div className="p-4 bg-white rounded-xl shadow">
          <p className="text-gray-500">HR Users</p>
          <p className="text-2xl font-bold">
            {users.filter(u => u.role === "HR").length}
          </p>
        </div>
        <div className="p-4 bg-white rounded-xl shadow">
          <p className="text-gray-500">Managers</p>
          <p className="text-2xl font-bold">
            {users.filter(u => u.role === "Manager").length}
          </p>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="font-semibold mb-3">Role Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={roleStats} dataKey="value" nameKey="name" outerRadius={80}>
                {roleStats.map((_, index) => (
                  <Cell key={index} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="font-semibold mb-3">User Count</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={roleStats}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* FORM */}
      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <h3 className="font-semibold">
          {editing ? "Update User" : "Add New User"}
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <input
            placeholder="Full Name"
            className="border p-2 rounded"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
          <input
            placeholder="Email"
            className="border p-2 rounded"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />
          <input
            placeholder="Phone"
            className="border p-2 rounded"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
          />
          <select
            className="border p-2 rounded"
            value={form.role}
            onChange={e => setForm({ ...form, role: e.target.value as Role })}
          >
            <option value="HR">HR</option>
            <option value="Manager">Manager</option>
          </select>
        </div>

        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-indigo-600 text-white rounded"
        >
          {editing ? "Update User" : "Add User"}
        </button>
      </div>

      {/* USER LIST */}
      <div className="bg-white p-6 rounded-xl shadow space-y-3">
        <h3 className="font-semibold mb-3">Users</h3>

        {users.map(u => (
          <div
            key={u.id}
            className="flex justify-between items-center border p-3 rounded-lg hover:bg-gray-50"
          >
            <div>
              <p className="font-medium">{u.name}</p>
              <p className="text-sm text-gray-500">
                {u.email} • {u.phone} • {u.role}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(u)}
                className="px-3 py-1 bg-yellow-500 text-white rounded"
              >
                Edit
              </button>
              <button
                onClick={() => deleteUser(u.id)}
                className="px-3 py-1 bg-red-500 text-white rounded"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}