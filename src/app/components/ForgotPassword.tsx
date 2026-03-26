import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

interface Props {
  onBack: () => void;
}

export default function ForgotPassword({ onBack }: Props) {
  const { resetPassword } = useAuth();

  const [email, setEmail]           = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");
  const [loading, setLoading]       = useState(false);

  const handleReset = async () => {
    if (!email || !newPassword) {
      setError("All fields are required");
      setSuccess("");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");

    const result = await resetPassword(email, newPassword);

    setLoading(false);

    if (!result) {
      setError("Email not found. Please check and try again.");
      setSuccess("");
    } else {
      setSuccess("Password reset successfully! Please login with your new password.");
      setError("");
      setEmail("");
      setNewPassword("");
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-100">

      {/* LEFT HERO */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-orange-500 to-orange-700 text-white p-12 items-center justify-center">
        <div className="max-w-md space-y-6">
          <h1 className="text-4xl font-bold leading-snug">
            Reset Your Password
          </h1>
          <p className="text-lg opacity-90">
            Enter your registered email and set a new password.
          </p>
          <div className="bg-white/10 p-6 rounded-xl text-sm space-y-2">
            <p>✔ Secure password reset</p>
            <p>✔ No email OTP required</p>
            <p>✔ Instant access restoration</p>
          </div>
        </div>
      </div>

      {/* RIGHT FORM */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6">
        <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl space-y-5">

          <div className="text-center">
            <h2 className="text-2xl font-bold text-orange-500">SmartHR</h2>
            <p className="text-lg font-semibold text-gray-800 mt-2">
              Reset Password
            </p>
            <p className="text-gray-500 text-sm">
              Enter your email and choose a new password
            </p>
          </div>

          {/* EMAIL */}
          <div>
            <label className="text-sm text-gray-600 font-medium">
              Registered Email
            </label>
            <input
              type="email"
              className="w-full mt-1 p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* NEW PASSWORD */}
          <div>
            <label className="text-sm text-gray-600 font-medium">
              New Password
            </label>
            <input
              type="password"
              className="w-full mt-1 p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Min. 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
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
            onClick={handleReset}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white p-2.5 rounded-lg font-semibold transition"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>

          {/* BACK */}
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