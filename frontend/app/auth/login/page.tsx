"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";
import { HeartPulse, Phone, KeyRound, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { sendOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      await sendOtp(phone);
      setStep("otp");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to send OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const role = await verifyOtp(phone, otp);
      if (!role) {
        router.push("/auth/role-select");
      } else if (role === "donor") {
        router.push("/donor/dashboard");
      } else if (role === "hospital") {
        router.push("/hospital/dashboard");
      } else if (role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-void">
      <div className="max-w-md w-full space-y-8 bg-surface p-8 rounded-2xl border border-vital-dim shadow-vital-glow">
        
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-vital-dim border border-vital-mid text-vital mb-4 animate-vital-pulse">
            <HeartPulse className="h-9 w-9" />
          </div>
          <h2 className="text-3xl font-extrabold text-text tracking-tight">
            {step === "phone" ? "Sign in" : "Verify code"}
          </h2>
          <p className="mt-2 text-sm text-text-2">
            {step === "phone"
              ? "Enter your phone to receive a verification code"
              : `Enter the code sent to ${phone}`}
          </p>
        </div>

        {errorMsg && (
          <div className="bg-vital-dim border border-vital-mid text-vital p-3 rounded-lg text-sm text-center">
            {errorMsg}
          </div>
        )}

        {step === "phone" ? (
          <form className="mt-8 space-y-6" onSubmit={handleSendOtp}>
            <div>
              <label htmlFor="phone" className="sr-only">Phone number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-3">
                  <Phone className="h-5 w-5" />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                  className="appearance-none rounded-xl relative block w-full pl-10 pr-3 py-3 border border-border bg-surface-2 text-text placeholder-text-3 focus:outline-none focus:ring-2 focus:ring-vital focus:border-transparent transition-all text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-vital hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-void focus:ring-vital transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" /> Sending...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  Send OTP <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </button>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleVerifyOtp}>
            <div>
              <label htmlFor="otp" className="sr-only">Verification code</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-3">
                  <KeyRound className="h-5 w-5" />
                </div>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="appearance-none rounded-xl relative block w-full pl-10 pr-3 py-3 border border-border bg-surface-2 text-text placeholder-text-3 focus:outline-none focus:ring-2 focus:ring-vital focus:border-transparent transition-all text-sm text-center tracking-[0.5em] font-data"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-vital hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-void focus:ring-vital transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" /> Verifying...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  Verify & Sign In <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => { setStep("phone"); setOtp(""); setErrorMsg(null); }}
                className="text-xs text-text-3 hover:text-text-2 underline underline-offset-4"
              >
                Change phone number
              </button>
            </div>
          </form>
        )}

        <div className="text-center mt-6">
          <p className="text-sm text-text-2">
            No account?{" "}
            <Link href="/auth/signup" className="font-medium text-vital hover:brightness-90 underline underline-offset-4">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
