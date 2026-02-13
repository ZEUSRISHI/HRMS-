import { useState } from "react";
import { useAuth, Role } from "../contexts/AuthContext";
import loginImage from "../../assets/hrms-login.png";

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
    if (!email.trim() || !password.trim()) {
      setError("All fields are required");
      return;
    }

    const success = login(email.trim(), password.trim(), role);

    if (!success) {
      setError("Invalid Email / Password / Role");
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-900">

      {/* LEFT SIDE IMAGE */}
      <div className="hidden md:flex w-1/2 bg-orange-600 items-center justify-center p-10">
        <div className="text-white text-center space-y-6">
          <h1 className="text-4xl font-bold">Quibo Tech HRMS</h1>
          <p className="text-lg">Smart Employee Management System</p>

          <img
            src={loginImage}
            alt="HRMS Login"
            className="rounded-xl shadow-xl max-h-[400px] object-contain"
          />
        </div>
      </div>

      {/* RIGHT SIDE FORM */}
      <div className="flex w-full md:w-1/2 items-center justify-center p-6">
        <div className="bg-gray-800 p-8 rounded-xl w-full max-w-md space-y-4 shadow-lg text-white">

          <h2 className="text-2xl font-bold text-center text-orange-500">
            Login to Your Account
          </h2>

          <input
            className="w-full p-2 bg-gray-700 rounded"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            className="w-full p-2 bg-gray-700 rounded"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <select
            className="w-full p-2 bg-gray-700 rounded"
            value={role}
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

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <div className="flex justify-between text-sm">
            <button onClick={onSignup} className="text-blue-400 underline">
              Create Account
            </button>

            <button onClick={onReset} className="text-blue-400 underline">
              Forgot Password?
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
