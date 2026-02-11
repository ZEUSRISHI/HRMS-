import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";

export function LoginPage() {
  const { login } = useAuth();

  const [role, setRole] = useState<"admin" | "manager" | "employee">("employee");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (email && password) {
      login(role);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100 px-4">
      <Card className="w-full max-w-md shadow-xl rounded-2xl">
        <CardContent className="p-8 space-y-6">

          <div className="text-center">
            <h1 className="text-2xl font-bold">HRMS Portal</h1>
            <p className="text-sm text-muted-foreground">
              Human Resource Management System
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="text-sm font-medium">Login As</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full mt-1 border rounded-lg px-3 py-2"
              >
                <option value="admin">Admin</option>
                <option value="manager">HR / Manager</option>
                <option value="employee">Employee</option>
              </select>
            </div>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full border rounded-lg px-3 py-2"
            />

            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full border rounded-lg px-3 py-2"
            />

            <div className="text-right text-sm text-primary hover:underline cursor-pointer">
              Forgot Password?
            </div>

            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>

          <div className="text-center text-sm">
            Don’t have an account?
            <span className="text-primary ml-1 hover:underline cursor-pointer">
              Sign Up
            </span>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
