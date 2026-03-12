import { useState } from "react";
import { useAuth, Role } from "../contexts/AuthContext";

interface Props {
  onSignup: () => void;
  onReset: () => void;
}

export default function LoginPage({ onSignup, onReset }: Props) {
  const { login } = useAuth();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole]         = useState<Role>("employee");
  const [remember, setRemember] = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please fill all fields");
      return;
    }

    setLoading(true);
    setError("");

    const success = await login(email.trim(), password.trim(), role);

    setLoading(false);

    if (!success) {
      setError("Invalid email, password or role. Please try again.");
    }
  };

  /* Press Enter to login */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="min-h-screen flex bg-gray-100">

      {/* ===== LEFT HERO ===== */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-orange-500 to-orange-700 text-white p-12 items-center justify-center">
        <div className="max-w-md space-y-6">

          <h1 className="text-4xl font-bold leading-snug">
            Empowering people through seamless HR management
          </h1>

          <p className="text-lg opacity-90">
            Manage employees, attendance, payroll and performance in one place.
          </p>

          <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl space-y-2">
            <p className="text-sm">✔ Smart workforce tracking</p>
            <p className="text-sm">✔ Easy leave management</p>
            <p className="text-sm">✔ Real-time analytics</p>
          </div>

          {/* DEFAULT CREDENTIALS HINT */}
          <div className="bg-white/10 p-4 rounded-xl text-xs space-y-1">
            <p className="font-semibold mb-2">Default Credentials:</p>
            <p>Admin: admin@quibotech.com / admin123</p>
            <p>HR: hr@quibotech.com / hr123456</p>
            <p>Manager: manager@quibotech.com / manager123</p>
            <p>Employee: employee@quibotech.com / employee123</p>
          </div>

        </div>
      </div>

      {/* ===== RIGHT LOGIN FORM ===== */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6">
        <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl space-y-5">

          {/* LOGO */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-orange-500">SmartHR</h2>
            <p className="text-gray-400 text-xs mt-1">Quibo Tech HRMS</p>
          </div>

          <div className="text-center">
            <p className="text-lg font-semibold text-gray-800">Sign In</p>
            <p className="text-gray-500 text-sm">
              Enter your details to access your account
            </p>
          </div>

          {/* EMAIL */}
          <div>
            <label className="text-sm text-gray-600 font-medium">
              Email Address
            </label>
            <input
              type="email"
              className="w-full mt-1 p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={email}
              placeholder="admin@quibotech.com"
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* PASSWORD */}
          <div>
            <label className="text-sm text-gray-600 font-medium">
              Password
            </label>
            <input
              type="password"
              className="w-full mt-1 p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={password}
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* ROLE */}
          <div>
            <label className="text-sm text-gray-600 font-medium">
              Login As
            </label>
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

          {/* REMEMBER + FORGOT */}
          <div className="flex justify-between items-center text-sm">
            <label className="flex items-center gap-2 cursor-pointer text-gray-600">
              <input
                type="checkbox"
                checked={remember}
                onChange={() => setRemember(!remember)}
                className="accent-orange-500"
              />
              Remember Me
            </label>
            <button
              onClick={onReset}
              className="text-orange-600 hover:underline font-medium"
            >
              Forgot Password?
            </button>
          </div>

          {/* ERROR */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm text-center p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* LOGIN BUTTON */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white p-2.5 rounded-lg transition font-semibold"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>

          {/* SIGNUP LINK */}
          <p className="text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <button
              onClick={onSignup}
              className="text-orange-600 font-semibold hover:underline"
            >
              Create Account
            </button>
          </p>

          {/* SOCIAL */}
          <div className="pt-2 border-t text-center">
            <p className="text-sm text-gray-400 mb-3">Or continue with</p>
            <button className="w-full border p-2.5 rounded-lg hover:bg-gray-50 text-sm text-gray-600 transition">
              🔵 Google
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}