// src/app/components/LoginPage.tsx

import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import quiboLogo from "../../assets/hrms-login.png";

interface Props {
  onReset: () => void;
}

interface GoogleJwtPayload {
  email: string;
  name:  string;
  picture?: string;
}

const ROLES = ["admin", "manager", "hr", "employee"] as const;
type Role = typeof ROLES[number];

export default function LoginPage({ onReset }: Props) {
  const { login, loginWithGoogle } = useAuth();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole]         = useState<Role>("employee");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [error, setError]       = useState("");

  /* ── Email / Password login ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      const success = await login(email, password, role);
      if (!success) {
        setError("Invalid credentials. Please check your email, password and role.");
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Google Sign-In ── */
  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    setError("");
    setGLoading(true);
    try {
      const decoded     = jwtDecode<GoogleJwtPayload>(credentialResponse.credential!);
      const googleEmail = decoded.email;
      await loginWithGoogle(googleEmail);
    } catch (err: any) {
      setError(
        err?.message ||
        "This Google account is not registered. Please contact your admin."
      );
    } finally {
      setGLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-950">

      {/* ════════════════════════════════════════
          LEFT PANEL — Branding
      ════════════════════════════════════════ */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-12 relative overflow-hidden">

        {/* Decorative glows */}
        <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] bg-orange-500 opacity-10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-[28rem] h-[28rem] bg-orange-400 opacity-10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-orange-600 opacity-5 rounded-full blur-3xl pointer-events-none" />

        {/* Logo + company name */}
        <div className="flex items-center gap-3 z-10">
          <img
            src={quiboLogo}
            alt="Quibo Tech"
            className="h-12 w-auto object-contain rounded-xl"
          />
          <div>
            <span className="text-white text-xl font-bold tracking-wide block leading-tight">
              Quibo Tech
            </span>
            <span className="text-orange-400 text-xs tracking-widest uppercase">
              HRMS Platform
            </span>
          </div>
        </div>

        {/* Hero text */}
        <div className="z-10 space-y-6">
          <div>
            <h1 className="text-5xl font-extrabold text-white leading-tight mb-3">
              Smarter HR,<br />
              <span className="text-orange-500">Better Teams.</span>
            </h1>
            <p className="text-gray-400 text-base leading-relaxed max-w-sm">
              A powerful HRMS built for modern organizations — streamline
              people operations, boost productivity, and make data-driven
              decisions effortlessly.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {[
              { icon: "👥", label: "Workforce Management", desc: "Onboard & manage employees" },
              { icon: "🗓️", label: "Leave Tracking",       desc: "Automated leave workflows" },
              { icon: "💰", label: "Payroll",              desc: "Accurate payroll processing" },
              { icon: "📊", label: "Analytics",            desc: "Real-time HR insights" },
            ].map((f) => (
              <div
                key={f.label}
                className="bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/8 transition"
              >
                <span className="text-xl mb-1 block">{f.icon}</span>
                <p className="text-white text-xs font-semibold leading-tight">{f.label}</p>
                <p className="text-gray-500 text-xs mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer credit */}
        <div className="z-10 space-y-1">
          <p className="text-gray-500 text-xs">
            Designed & developed by{" "}
            <span className="text-orange-400 font-semibold">Quibo Tech</span>
          </p>
          <p className="text-gray-600 text-xs">
            © {new Date().getFullYear()} Quibo Tech Pvt. Ltd. All rights reserved.
          </p>
        </div>
      </div>

      {/* ════════════════════════════════════════
          RIGHT PANEL — Sign-in form
      ════════════════════════════════════════ */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 bg-gray-950">
        <div className="w-full max-w-md">

          {/* Mobile-only logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <img
              src={quiboLogo}
              alt="Quibo Tech"
              className="h-10 w-auto object-contain rounded-xl"
            />
            <div>
              <span className="text-white text-lg font-bold block leading-tight">Quibo Tech</span>
              <span className="text-orange-400 text-xs tracking-widest uppercase">HRMS Platform</span>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
            <p className="text-gray-400 text-sm">Sign in to your account to continue</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-6 flex items-start gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mt-0.5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12A9 9 0 113 12a9 9 0 0118 0z"
                />
              </svg>
              {error}
            </div>
          )}

          {/* ── Form ── */}
          <form onSubmit={handleLogin} className="space-y-5">

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-300">
                Email address
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                >
                  {showPass ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-7s4.477-7 10-7a10.05 10.05 0 011.875.175M15 12a3 3 0 11-6 0 3 3 0 016 0zm6.364-2.364A9.956 9.956 0 0122 12c0 2.523-4.477 7-10 7" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-300">
                Sign in as
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full pl-10 pr-8 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition appearance-none cursor-pointer"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Forgot password */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onReset}
                className="text-sm text-orange-400 hover:text-orange-300 transition"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all text-sm tracking-wide"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-gray-600 text-xs uppercase tracking-wider">
              or continue with
            </span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          {/* ── Google Sign-In — below divider ── */}
          <div>
            {gLoading ? (
              <div className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 text-sm">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Signing in with Google...
              </div>
            ) : (
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError("Google sign-in failed. Please try again.")}
                  theme="filled_black"
                  shape="rectangular"
                  text="signin_with"
                  width="400"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-10 text-center space-y-1">
            <p className="text-gray-600 text-xs">
              Designed & developed by{" "}
              <span className="text-orange-400 font-medium">Quibo Tech</span>
            </p>
            <p className="text-gray-700 text-xs">
              © {new Date().getFullYear()} Quibo Tech Pvt. Ltd. All rights reserved.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
