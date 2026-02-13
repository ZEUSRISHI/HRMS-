import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

interface Props {
  onBack: () => void;
}

export default function ForgotPassword({ onBack }: Props) {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleReset = () => {
    if (!email || !newPassword) {
      setError("All fields are required");
      setSuccess("");
      return;
    }

    const result = resetPassword(email, newPassword);

    if (!result) {
      setError("Email not found");
      setSuccess("");
    } else {
      setSuccess("Password reset successfully!");
      setError("");
      setEmail("");
      setNewPassword("");
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-xl w-96 space-y-4 shadow-lg">
        <h2 className="text-2xl font-bold text-center text-orange-500">
          Reset Password
        </h2>

        <input
          className="w-full p-2 bg-gray-700 rounded focus:outline-none"
          placeholder="Enter Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full p-2 bg-gray-700 rounded focus:outline-none"
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <button
          onClick={handleReset}
          className="w-full bg-orange-500 hover:bg-orange-600 p-2 rounded font-semibold transition"
        >
          Reset Password
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
