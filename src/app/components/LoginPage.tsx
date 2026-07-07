// src/app/components/LoginPage.tsx

import { useState, useEffect, useRef, useCallback } from "react";
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

/* ============================================================
   CAPTCHA CONFIG
   ============================================================ */
const CAPTCHA_LENGTH   = 6;
const CAPTCHA_CHARS    = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
const CAPTCHA_REFRESH_MS = 30000; // 30 seconds

function generateCaptchaText(): string {
  let text = "";
  for (let i = 0; i < CAPTCHA_LENGTH; i++) {
    text += CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)];
  }
  return text;
}

export default function LoginPage({ onReset }: Props) {
  const { login, loginWithGoogle } = useAuth();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole]         = useState<Role>("employee");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [error, setError]       = useState("");

  /* ── CAPTCHA STATE ── */
  const [captchaText, setCaptchaText]   = useState(generateCaptchaText());
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* ── Draw CAPTCHA onto canvas whenever text changes ── */
  const drawCaptcha = useCallback((text: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(0, 0, w, h);

    // Noise lines
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = `rgba(${Math.random() * 150}, ${Math.random() * 150}, ${Math.random() * 150}, 0.4)`;
      ctx.beginPath();
      ctx.moveTo(Math.random() * w, Math.random() * h);
      ctx.lineTo(Math.random() * w, Math.random() * h);
      ctx.stroke();
    }

    // Noise dots
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(${Math.random() * 180}, ${Math.random() * 180}, ${Math.random() * 180}, 0.5)`;
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Characters, each with random rotation/offset
    const charWidth = w / text.length;
    for (let i = 0; i < text.length; i++) {
      ctx.save();
      const x = charWidth * i + charWidth / 2;
      const y = h / 2 + (Math.random() * 6 - 3);
      ctx.translate(x, y);
      ctx.rotate((Math.random() * 30 - 15) * (Math.PI / 180));
      ctx.font = `bold ${Math.floor(h * 0.55)}px monospace`;
      ctx.fillStyle = "#1e293b";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text[i], 0, 0);
      ctx.restore();
    }
  }, []);

  const refreshCaptcha = useCallback(() => {
    const next = generateCaptchaText();
    setCaptchaText(next);
    setCaptchaInput("");
    setCaptchaError("");
    drawCaptcha(next);
  }, [drawCaptcha]);

  // Initial draw
  useEffect(() => {
    drawCaptcha(captchaText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshCaptcha();
    }, CAPTCHA_REFRESH_MS);
    return () => clearInterval(interval);
  }, [refreshCaptcha]);

  /* ── Email / Password login ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCaptchaError("");

    const trimmedEmail    = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (captchaInput.trim().toUpperCase() !== captchaText.toUpperCase()) {
      setCaptchaError("Incorrect CAPTCHA. Please try again.");
      refreshCaptcha();
      return;
    }

    setLoading(true);
    try {
      const success = await login(trimmedEmail, trimmedPassword, role);
      if (!success) {
        setError("Invalid credentials. Please check your email, password and role.");
        refreshCaptcha(); // force a new CAPTCHA after every failed attempt
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  /* ── Google Sign-In ── */
  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
  setError("");
  setGLoading(true);
  try {
    if (!credentialResponse.credential) {
      throw new Error("No credential received from Google.");
    }
    await loginWithGoogle(credentialResponse.credential); // send raw ID token, not decoded email
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
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ════════════════════════════════════════
          LEFT PANEL — Grey Branding
      ════════════════════════════════════════ */}
      <div className="flex flex-col justify-between w-full lg:w-1/2 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 p-8 lg:p-12 relative overflow-hidden min-h-[460px] lg:min-h-screen">

        <div className="absolute -top-20 -left-20 w-80 h-80 bg-slate-500 opacity-20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-slate-600 opacity-20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 z-10">
          <img
            src={quiboLogo}
            alt="Quibo Tech"
            className="h-14 w-14 object-contain rounded-xl bg-white p-1 shadow-md flex-shrink-0"
          />
          <div>
            <span className="text-white text-xl font-bold tracking-wide block leading-tight">
              Quibo Tech
            </span>
            <span className="text-slate-300 text-xs tracking-widest uppercase">
              HRMS Platform
            </span>
          </div>
        </div>

        <div className="z-10 space-y-7 mt-10 lg:mt-0">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-3">
              Smarter HR,<br />
              <span className="text-slate-300">Better Teams.</span>
            </h1>
            <p className="text-slate-400 text-sm lg:text-base leading-relaxed max-w-sm">
              A powerful HRMS built for modern organizations — streamline
              people operations, boost productivity, and make data-driven
              decisions effortlessly.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            {[
              {
                icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 32 32">
                  <circle cx="22" cy="10" r="5" fill="white" />
                  <path d="M14 28c0-5.523 3.582-8 8-8s8 2.477 8 8z" fill="white" />
                  <circle cx="12" cy="10" r="6" fill="white" />
                  <path d="M0 28c0-5.523 4.477-10 12-10s12 4.477 12 10z" fill="white" />
                </svg>
                ),
                label: "Workforce Management"
              },
              { icon: "🗓️", label: "Leave Tracking" },
              { icon: "💰", label: "Payroll" },
              { icon: "📊", label: "Analytics" },
            ].map((f) => (
              <div
                key={f.label}
                className="bg-white/8 border border-white/15 rounded-2xl py-5 px-3 hover:bg-white/12 transition-all flex flex-col items-center text-center gap-3"
              >
                <span className="text-5xl leading-none">{f.icon}</span>
                <p className="text-white text-xs font-semibold leading-snug">{f.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="z-10 space-y-1 mt-10 lg:mt-0">
          <p className="text-slate-400 text-xs">
            Designed & developed by{" "}
            <span className="text-white font-semibold">Quibo Tech</span>
          </p>
          <p className="text-slate-500 text-xs">
            © {new Date().getFullYear()} Quibo Tech Pvt. Ltd. All rights reserved.
          </p>
        </div>
      </div>

      {/* ════════════════════════════════════════
          RIGHT PANEL — Light Silver Sign-in
      ════════════════════════════════════════ */}
      <div className="flex flex-1 items-center justify-center px-6 py-10 bg-gradient-to-br from-gray-100 via-slate-50 to-gray-200 relative overflow-hidden">

        <div className="absolute -top-20 -right-20 w-80 h-80 bg-slate-300 opacity-40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-gray-300 opacity-40 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md z-10">

          {/* Mobile-only logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <img
              src={quiboLogo}
              alt="Quibo Tech"
              className="h-11 w-11 object-contain rounded-xl bg-white p-1 shadow-md flex-shrink-0"
            />
            <div>
              <span className="text-black text-lg font-bold block leading-tight">Quibo Tech</span>
              <span className="text-slate-500 text-xs tracking-widest uppercase">HRMS Platform</span>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-1">Welcome back</h2>
            <p className="text-slate-500 text-sm">Sign in to your account to continue</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-6 flex items-start gap-3 px-4 py-3 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm">
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
              <label className="block text-sm font-medium text-black">
                Email address
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
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
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-black placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition shadow-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-black">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
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
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-black placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black transition"
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
              <label className="block text-sm font-medium text-black">
                Sign in as
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full pl-10 pr-8 py-2.5 bg-white border border-slate-300 rounded-lg text-black text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition appearance-none cursor-pointer shadow-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r} className="bg-white text-black">
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </div>
            </div>

            {/* ── CAPTCHA ── */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-black">
                Security check
              </label>
              <div className="flex items-center gap-3">
                <canvas
                  ref={canvasRef}
                  width={180}
                  height={50}
                  className="border border-slate-300 rounded-lg bg-slate-100 select-none"
                />
                <button
                  type="button"
                  onClick={refreshCaptcha}
                  title="Refresh CAPTCHA"
                  className="p-2 border border-slate-300 rounded-lg text-slate-500 hover:text-black hover:bg-slate-50 transition shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              <input
                type="text"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                placeholder="Enter the code shown above"
                autoComplete="off"
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-black placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition shadow-sm"
              />
              {captchaError && (
                <p className="text-red-600 text-xs">{captchaError}</p>
              )}
              <p className="text-slate-400 text-xs">Code refreshes automatically every 30 seconds.</p>
            </div>

            {/* Forgot password */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onReset}
                className="text-sm text-slate-500 hover:text-black transition font-medium"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 active:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all text-sm tracking-wide shadow-md"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
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
            <div className="flex-1 h-px bg-slate-300" />
            <span className="text-slate-400 text-xs uppercase tracking-wider">or continue with</span>
            <div className="flex-1 h-px bg-slate-300" />
          </div>

          {/* Google Sign-In */}
          <div>
            {gLoading ? (
              <div className="flex items-center justify-center gap-2 w-full py-2.5 bg-white border border-slate-300 rounded-lg text-black text-sm shadow-sm">
                <svg className="animate-spin h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24">
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
                  theme="outline"
                  shape="rectangular"
                  text="signin_with"
                  width="400"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-10 text-center space-y-1">
            <p className="text-slate-500 text-xs">
              Designed & developed by{" "}
              <span className="text-black font-medium">Quibo Tech</span>
            </p>
            <p className="text-slate-400 text-xs">
              © {new Date().getFullYear()} Quibo Tech Pvt. Ltd. All rights reserved.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
