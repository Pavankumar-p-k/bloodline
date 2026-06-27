"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { Heart, PlusCircle, Loader2 } from "lucide-react";

export default function RoleSelectPage() {
  const router = useRouter();
  const { selectRole, user } = useAuth();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelect = async (role: string) => {
    setLoading(true);
    try {
      await selectRole(role);
      if (role === "donor") router.push("/onboarding/donor");
      else if (role === "hospital") router.push("/onboarding/hospital");
    } catch (err) {
      console.error("Role selection failed:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-vital animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-void flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl mx-auto text-center space-y-10">
        {/* Header */}
        <div>
          <span className="text-4xl">🩸</span>
          <h1 className="text-2xl font-display font-bold text-text mt-4">
            You&apos;re almost in
          </h1>
          <p className="text-sm text-text-2 mt-2 max-w-md mx-auto">
            Choose how you want to use Bloodline. This cannot be changed
            without admin approval.
          </p>
        </div>

        {!confirming ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Donor Card */}
            <button
              onClick={() => setConfirming("donor")}
              className="group bg-surface border border-border hover:border-vital hover:shadow-vital-glow rounded-2xl p-8 text-center transition-all duration-200"
            >
              <div className="w-20 h-20 mx-auto rounded-full bg-vital-dim border border-vital-mid flex items-center justify-center mb-5 group-hover:bg-vital-mid transition-colors">
                <Heart className="h-9 w-9 text-vital" />
              </div>
              <h2 className="text-lg font-bold text-text mb-2">
                I Want To Donate
              </h2>
              <p className="text-xs text-text-2 leading-relaxed">
                Register as a blood donor. Receive alerts when your blood type
                is needed near you.
              </p>
            </button>

            {/* Hospital Card */}
            <button
              onClick={() => setConfirming("hospital")}
              className="group bg-surface border border-border hover:border-vital hover:shadow-vital-glow rounded-2xl p-8 text-center transition-all duration-200"
            >
              <div className="w-20 h-20 mx-auto rounded-full bg-vital-dim border border-vital-mid flex items-center justify-center mb-5 group-hover:bg-vital-mid transition-colors">
                <PlusCircle className="h-9 w-9 text-vital" />
              </div>
              <h2 className="text-lg font-bold text-text mb-2">
                I Represent A Hospital
              </h2>
              <p className="text-xs text-text-2 leading-relaxed">
                Register your hospital. Manage blood inventory, request
                donations, and coordinate with other hospitals.
              </p>
            </button>
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-2xl p-8 max-w-sm mx-auto space-y-6 animate-fade-up">
            <div className="text-center">
              <span className="text-3xl">
                {confirming === "donor" ? "🩸" : "🏥"}
              </span>
              <h3 className="text-lg font-bold text-text mt-3">
                Confirm your role
              </h3>
              <p className="text-sm text-text-2 mt-1">
                {confirming === "donor"
                  ? "You will be registered as a blood donor."
                  : "You will be registered as a hospital representative."}
              </p>
              <p className="text-[11px] text-text-3 mt-2">
                This cannot be changed without admin approval.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirming(null)}
                className="flex-1 py-2.5 border border-border text-text-2 hover:text-text rounded-lg text-sm font-semibold transition-all"
              >
                Back
              </button>
              <button
                onClick={() => handleSelect(confirming)}
                disabled={loading}
                className="flex-1 py-2.5 bg-vital hover:brightness-90 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Confirm"
                )}
              </button>
            </div>
          </div>
        )}

        <p className="text-[11px] text-text-3 max-w-xs mx-auto">
          By continuing, you agree to Bloodline&apos;s terms and privacy policy.
        </p>
      </div>
    </main>
  );
}
