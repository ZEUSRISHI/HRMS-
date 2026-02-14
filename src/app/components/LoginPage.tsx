import { useState } from "react";
import { useAuth, Role } from "../contexts/AuthContext";
import loginImage from "../../assets/hrms-login.png"

interface Props {
  onSignup: () => void;
  onReset: () => void;
}

export default function LoginPage({ onSignup, onReset }: Props) {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("employee");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) {
      setError("Please fill all fields");
      return;
    }

    const success = login(email.trim(), password.trim(), role);

    if (!success) {
      setError("Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-100">

      {/* LEFT HERO SECTION */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-orange-500 to-orange-700 text-white p-12 items-center justify-center">
        <div className="max-w-md space-y-6">
          <h1 className="text-4xl font-bold leading-snug">
            Empowering people through seamless HR management
          </h1>

          <p className="text-lg opacity-90">
            Manage employees, attendance, payroll and performance in one place.
          </p>

          <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl">
            <p className="text-sm">
              ✔ Smart workforce tracking  
              <br />
              ✔ Easy leave management  
              <br />
              ✔ Real-time analytics
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT LOGIN SECTION */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6">
        <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl space-y-5">

          {/* LOGO */}
          <h2 className="text-center text-2xl font-bold text-gray-800">
            SmartHR
          </h2>

          <div className="text-center">
            <p className="text-lg font-semibold">Sign In</p>
            <p className="text-gray-500 text-sm">
              Enter your details to access your account
            </p>
          </div>

          {/* EMAIL */}
          <div>
            <label className="text-sm text-gray-600">Email Address</label>
            <input
              type="email"
              className="w-full mt-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* PASSWORD */}
          <div>
            <label className="text-sm text-gray-600">Password</label>
            <input
              type="password"
              className="w-full mt-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* ROLE */}
          <div>
            <label className="text-sm text-gray-600">Login As</label>
            <select
              className="w-full mt-1 p-2 border rounded-lg"
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
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={remember}
                onChange={() => setRemember(!remember)}
              />
              Remember Me
            </label>

            <button
              onClick={onReset}
              className="text-orange-600 hover:underline"
            >
              Forgot Password?
            </button>
          </div>

          {/* ERROR */}
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          {/* LOGIN BUTTON */}
          <button
            onClick={handleLogin}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-lg transition"
          >
            Sign In
          </button>

          {/* SIGNUP */}
          <p className="text-center text-sm">
            Don’t have an account?{" "}
            <button
              onClick={onSignup}
              className="text-orange-600 font-medium hover:underline"
            >
              Create Account
            </button>
          </p>

          {/* SOCIAL LOGIN UI (DESIGN ONLY) */}
          <div className="pt-4 border-t text-center text-sm text-gray-400">
            Or continue with
            <div className="flex gap-3 mt-3">
              <button className="flex-1 border p-2 rounded-lg">Google</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
