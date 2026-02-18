import { useState } from "react";
import { useTasks } from "../../contexts/TaskContext";
import { useAuth } from "../../contexts/AuthContext";
import { v4 as uuid } from "uuid";

type User = {
  id: string;
  name: string;
  role: string;
};

export default function CreateTask({ users }: { users: User[] }) {
  const { createTask } = useTasks();
  const { currentUser } = useAuth();

  const [form, setForm] = useState({
    title: "",
    description: "",
    assignedTo: "",
    priority: "medium",
    dueDate: "",
  });

  const handleCreate = () => {
    if (!currentUser) {
      alert("Please login first");
      return;
    }

    createTask({
      id: uuid(),
      title: form.title,
      description: form.description,
      assignedTo: form.assignedTo,
      assignedBy: currentUser.id,
      priority: form.priority as "low" | "medium" | "high",
      dueDate: form.dueDate,
      status: "pending",
    });

    alert("Task created successfully ✅");

    setForm({
      title: "",
      description: "",
      assignedTo: "",
      priority: "medium",
      dueDate: "",
    });
  };

  return (
    <div className="space-y-3 max-w-md">
      <input
        placeholder="Title"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        className="border p-2 w-full"
      />

      <textarea
        placeholder="Description"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        className="border p-2 w-full"
      />

      <select
        value={form.assignedTo}
        onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
        className="border p-2 w-full"
      >
        <option value="">Assign To</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} ({u.role})
          </option>
        ))}
      </select>

      <select
        value={form.priority}
        onChange={(e) => setForm({ ...form, priority: e.target.value })}
        className="border p-2 w-full"
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>

      <input
        type="date"
        value={form.dueDate}
        onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
        className="border p-2 w-full"
      />

      <button
        onClick={handleCreate}
        className="bg-orange-500 text-white px-4 py-2 rounded w-full"
      >
        Create Task
      </button>
    </div>
  );
}
