"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type AuthContextType = {
  user: any | null;
  role: string | null;
  loading: boolean;
  signup: (email: string, password: string, role?: string) => Promise<string | null>;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch role from profiles table
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
    } catch (err) {
      console.error("Error fetching user profile:", err);
      setRole(null);
      return null;
    }
  };

  useEffect(() => {
    // Check active session on load
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        }
      } catch (err) {
        console.error("Failed to restore session:", err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setLoading(true);
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setRole(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signup = async (email: string, password: string, roleParam: string = "donor") => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: roleParam,
            name: email.split("@")[0],
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error("Sign up failed");

      setUser(data.user);
      
      // Seed profile locally or wait for trigger in production.
      // In local-dev, POST /signup seeds the profile immediately.
      // Let's verify we have it:
      let userRole = roleParam;
      const fetched = await fetchProfile(data.user.id);
      if (fetched) userRole = fetched;
      else {
        // If trigger is slow, manually insert a profile (or if in mock mode)
        const { error: profileError } = await supabase
          .from("profiles")
          .insert([{ id: data.user.id, email, role: roleParam, name: email.split("@")[0] }]);
        if (!profileError) setRole(roleParam);
      }

      return userRole;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error("Invalid credentials");

      setUser(data.user);
      const userRole = await fetchProfile(data.user.id);
      return userRole;
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
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
