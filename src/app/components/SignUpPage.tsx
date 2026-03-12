import { useState } from "react";
import { useAuth, Role } from "../contexts/AuthContext";

interface Props {
  onBack: () => void;
}

export default function SignupPage({ onBack }: Props) {
  const { signup } = useAuth();

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole]         = useState<Role>("employee");
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSignup = async () => {
    if (!name || !email || !password || !role) {
      setError("All fields are required");
      setSuccess("");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");

    const result = await signup(name, email, password, role);

    setLoading(false);

    if (!result) {
      setError("Email already exists. Please use a different email.");
      setSuccess("");
    } else {
      setSuccess("Account created! Redirecting to dashboard...");
      setError("");
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-100">

      {/* LEFT HERO */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-orange-500 to-orange-700 text-white p-12 items-center justify-center">
        <div className="max-w-md space-y-6">
          <h1 className="text-4xl font-bold leading-snug">
            Join the SmartHR Platform
          </h1>
          <p className="text-lg opacity-90">
            Create your account and start managing your HR operations seamlessly.
          </p>
          <div className="bg-white/10 p-6 rounded-xl space-y-2 text-sm">
            <p>✔ Role-based access control</p>
            <p>✔ Attendance & leave management</p>
            <p>✔ Payroll & analytics</p>
          </div>
        </div>
      </div>

      {/* RIGHT FORM */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6">
        <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl space-y-5">

          <div className="text-center">
            <h2 className="text-2xl font-bold text-orange-500">SmartHR</h2>
            <p className="text-lg font-semibold text-gray-800 mt-2">
              Create Account
            </p>
            <p className="text-gray-500 text-sm">
              Fill in your details to get started
            </p>
          </div>

          {/* NAME */}
          <div>
            <label className="text-sm text-gray-600 font-medium">Full Name</label>
            <input
              className="w-full mt-1 p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* EMAIL */}
          <div>
            <label className="text-sm text-gray-600 font-medium">Email Address</label>
            <input
              type="email"
              className="w-full mt-1 p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* PASSWORD */}
          <div>
            <label className="text-sm text-gray-600 font-medium">Password</label>
            <input
              type="password"
              className="w-full mt-1 p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* ROLE */}
          <div>
            <label className="text-sm text-gray-600 font-medium">Role</label>
            <select
              className="w-full mt-1 p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="hr">HR</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* ERROR / SUCCESS */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm text-center p-3 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-600 text-sm text-center p-3 rounded-lg">
              {success}
            </div>
          )}

          {/* SUBMIT */}
          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white p-2.5 rounded-lg font-semibold transition"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

          {/* BACK TO LOGIN */}
          <button
            onClick={onBack}
            className="w-full border border-orange-500 text-orange-600 p-2.5 rounded-lg text-sm hover:bg-orange-50 transition font-medium"
          >
            ← Back to Login
          </button>

        </div>
      </div>
    </div>
  );
}