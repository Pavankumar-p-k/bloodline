"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type AuthContextType = {
  user: any | null;
  role: string | null;
  loading: boolean;
  isNewUser: boolean;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, token: string) => Promise<string | null>;
  selectRole: (role: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isNewUser, setIsNewUser] = useState<boolean>(false);

  const fetchProfile = async (userId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
      if (!error && data) {
        setRole(data.role);
        return data.role;
      }
      setRole(null);
      return null;
    } catch {
      setRole(null);
      return null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          const r = await fetchProfile(session.user.id);
          if (!r) setIsNewUser(true);
        }
      } catch {
        // no session
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        setLoading(true);
        if (session?.user) {
          setUser(session.user);
          const r = await fetchProfile(session.user.id);
          if (!r) setIsNewUser(true);
          else setIsNewUser(false);
        } else {
          setUser(null);
          setRole(null);
          setIsNewUser(false);
        }
        setLoading(false);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const sendOtp = async (phone: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) throw error;
  };

  const verifyOtp = async (phone: string, token: string): Promise<string | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
      if (error) throw error;
      if (!data.user) throw new Error("Verification failed");

      setUser(data.user);
      const userRole = await fetchProfile(data.user.id);

      if (!userRole) {
        setIsNewUser(true);
        return null;
      }

      setIsNewUser(false);
      return userRole;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const selectRole = async (selectedRole: string): Promise<void> => {
    if (!user) throw new Error("No authenticated user");
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: selectedRole as any })
        .eq("id", user.id);
      if (error) throw error;
      setRole(selectedRole);
      setIsNewUser(false);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setRole(null);
      setIsNewUser(false);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, isNewUser, sendOtp, verifyOtp, selectRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
