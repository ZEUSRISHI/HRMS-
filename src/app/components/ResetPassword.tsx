import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function ResetPassword({ onBack }: { onBack: () => void }) {
  const { resetPassword } = useAuth(); // ✅ correct function name

  const [email, setEmail] = useState("");
  const [newPass, setNewPass] = useState("");

  const handleReset = () => {
    const success = resetPassword(email, newPass);

    if (!success) {
      alert("Email not found!");
    } else {
      alert("Password updated successfully!");
      onBack();
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-lg w-96 space-y-4">
        <h2 className="text-xl font-bold text-center text-orange-500">
          Reset Password
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
          placeholder="New Password"
          value={newPass}
          onChange={(e) => setNewPass(e.target.value)}
        />

        <button
          onClick={handleReset}
          className="w-full bg-orange-500 p-2 rounded"
        >
          Reset
        </button>

        <button
          onClick={onBack}
          className="w-full text-blue-400 underline text-sm"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
