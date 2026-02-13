import { useState } from "react";
import { useAuth, Role } from "../contexts/AuthContext";

interface Props {
  onBack: () => void;
}

export default function SignupPage({ onBack }: Props) {
  const { signup } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("employee");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSignup = () => {
    if (!name || !email || !password || !role) {
      setError("All fields are required");
      setSuccess("");
      return;
    }

    const result = signup(name, email, password, role);

    if (!result) {
      setError("Email already exists");
      setSuccess("");
    } else {
      setSuccess("Account created successfully!");
      setError("");
      setName("");
      setEmail("");
      setPassword("");
      setRole("employee");
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-xl w-96 space-y-4 shadow-lg">
        <h2 className="text-2xl font-bold text-center text-orange-500">
          Create Account
        </h2>

        <input
          className="w-full p-2 bg-gray-700 rounded focus:outline-none"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="w-full p-2 bg-gray-700 rounded focus:outline-none"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full p-2 bg-gray-700 rounded focus:outline-none"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <select
          className="w-full p-2 bg-gray-700 rounded focus:outline-none"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
        >
          <option value="employee">Employee</option>
          <option value="manager">Manager</option>
          <option value="hr">HR</option>
          <option value="admin">Admin</option>
        </select>

        <button
          onClick={handleSignup}
          className="w-full bg-orange-500 hover:bg-orange-600 p-2 rounded font-semibold transition"
        >
          Sign Up
        </button>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        {success && <p className="text-green-400 text-sm text-center">{success}</p>}

        <button
          onClick={onBack}
          className="w-full text-blue-400 underline text-sm mt-2"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
