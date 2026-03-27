import React, { useEffect, useState } from "react";
import axios from "axios";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "hr" | "manager" | "employee";
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "hr" | "manager" | "employee">("employee");

  const token = localStorage.getItem("token"); // Login token

  const fetchUsers = () => {
    axios.get<User[]>(`${import.meta.env.VITE_API_URL}/api/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => setUsers(res.data))
      .catch(err => console.log("Axios error:", err.response?.data || err));
  };

  const addUser = () => {
    axios.post(`${import.meta.env.VITE_API_URL}/api/users`, { name, email, password, role }, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        alert("User created!");
        fetchUsers(); // Refresh list
        setName(""); setEmail(""); setPassword(""); setRole("employee");
      })
      .catch(err => console.log("Axios error:", err.response?.data || err));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div>
      <h2>Users</h2>

      <div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" />
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
        <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
        <select value={role} onChange={e => setRole(e.target.value as any)}>
          <option value="employee">Employee</option>
          <option value="hr">HR</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
        <button onClick={addUser}>Add User</button>
      </div>

      <div>
        {users.map(user => (
          <p key={user.id}>{user.name} - {user.email} - {user.role}</p>
        ))}
      </div>
    </div>
  );
};

export default Users;