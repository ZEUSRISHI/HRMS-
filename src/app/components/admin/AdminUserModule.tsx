import { useState } from "react";
import { useAuth, Role } from "../../contexts/AuthContext";

export default function AdminUserModule() {
  const { addUser, currentUser } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("hr");

  if (currentUser?.role !== "admin") return <p>Admin only</p>;

  const save = () => {
    addUser({
      id: Date.now().toString(),
      name,
      email,
      password,
      role
    });
    alert("User saved & can login");
  };

  return (
    <div className="space-y-3">
      <h2>Add HR / Manager</h2>
      <input placeholder="Name" onChange={e=>setName(e.target.value)} />
      <input placeholder="Email" onChange={e=>setEmail(e.target.value)} />
      <input placeholder="Password" onChange={e=>setPassword(e.target.value)} />

      <select onChange={e=>setRole(e.target.value as Role)}>
        <option value="hr">HR</option>
        <option value="manager">Manager</option>
      </select>

      <button onClick={save}>Save User</button>
    </div>
  );
}
