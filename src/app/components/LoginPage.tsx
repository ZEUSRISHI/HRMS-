import { useState } from "react";
import { useAuth, Role } from "../contexts/AuthContext";

interface Props {
  onSignup: () => void;
  onReset: () => void;
}

export default function LoginPage({ onSignup, onReset }: Props) {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("employee");
  const [error, setError] = useState("");

  const handleLogin = () => {
    const success = login(email, password, role);
    if (!success) setError("Invalid Email / Password / Role");
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-lg w-96 space-y-4">
        <h2 className="text-xl font-bold text-center text-orange-500">
          Quibo Tech HRMS
        </h2>

        <input
          className="w-full p-2 bg-gray-700 rounded"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full p-2 bg-gray-700 rounded"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <select
          className="w-full p-2 bg-gray-700 rounded"
          onChange={(e) => setRole(e.target.value as Role)}
        >
          <option value="employee">Employee</option>
          <option value="manager">Manager</option>
          <option value="hr">HR</option>
          <option value="admin">Admin</option>
        </select>

        <button
          onClick={handleLogin}
          className="w-full bg-orange-500 p-2 rounded"
        >
          Login
        </button>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex justify-between text-sm">
          <button onClick={onSignup} className="underline text-blue-400">
            Create Account
          </button>
          <button onClick={onReset} className="underline text-blue-400">
            Forgot Password?
          </button>
        </div>
      </div>
    </div>
  );
}
