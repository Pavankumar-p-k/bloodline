"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";
import { HeartPulse, Mail, Lock, User, ArrowRight } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<"donor" | "hospital">("donor");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const role = await signup(email, password, selectedRole);
      if (selectedRole === "donor") {
        router.push("/donor/register"); // Go to step-by-step registration details page!
      } else if (selectedRole === "hospital") {
        router.push("/hospital/dashboard");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      console.error("Signup failed:", err);
      setErrorMsg(err?.message || "Registration failed. Please check your info and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-void">
      <div className="max-w-md w-full space-y-8 bg-surface p-8 rounded-2xl border border-vital-dim shadow-vital-glow backdrop-blur">
        
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-vital-dim border border-vital-mid text-vital mb-4 animate-pulse">
            <HeartPulse className="h-9 w-9" />
          </div>
          <h2 className="text-3xl font-extrabold text-text tracking-tight">
            Create an account
          </h2>
          <p className="mt-2 text-sm text-text-2">
            Join the India Blood Response Network
          </p>
        </div>

        {/* Error alert */}
        {errorMsg && (
          <div className="bg-vital-dim border border-vital-mid text-vital p-3 rounded-lg text-sm text-center">
            {errorMsg}
          </div>
        )}

        <form className="mt-8 space-y-5" onSubmit={handleSignup}>
          <div className="space-y-4">
            
            {/* Email Field */}
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-3">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-xl relative block w-full pl-10 pr-3 py-3 border border-border bg-surface-2 text-text placeholder-text-3 focus:outline-none focus:ring-2 focus:ring-vital focus:border-transparent transition-all text-sm"
                  placeholder="Enter email address"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-3">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-xl relative block w-full pl-10 pr-3 py-3 border border-border bg-surface-2 text-text placeholder-text-3 focus:outline-none focus:ring-2 focus:ring-vital focus:border-transparent transition-all text-sm"
                  placeholder="Create password"
                />
              </div>
            </div>

            {/* Role Select Field */}
            <div>
              <label htmlFor="role" className="block text-xs font-semibold text-text-2 uppercase tracking-wider mb-2">
                Registering As
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-3">
                  <User className="h-5 w-5" />
                </div>
                <select
                  id="role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  className="appearance-none rounded-xl relative block w-full pl-10 pr-10 py-3 border border-border bg-surface-2 text-text placeholder-text-3 focus:outline-none focus:ring-2 focus:ring-vital focus:border-transparent transition-all text-sm cursor-pointer"
                >
                  <option value="donor">Donor (Save Lives)</option>
                  <option value="hospital">Hospital / Medical Center</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-text-3">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
            </div>

          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-vital hover:bg-vital focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-void focus:ring-vital transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating Account...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  Sign up <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </button>
          </div>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-text-2">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-medium text-vital hover:text-[#8B0000] underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
