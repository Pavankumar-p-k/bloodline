"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

type AuthContextType = {
  user: any | null;
  role: string | null;
  loading: boolean;
  signup: (email: string, password: string, role?: string) => Promise<string | null>;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "bl_local_auth";

function getStore(): Record<string, { password: string; role: string; name?: string }> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStore(store: Record<string, { password: string; role: string; name?: string }>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

const FALLBACK_USERS: Record<string, { password: string; role: string; name?: string }> = {
  "admin@test.com": { password: "admin123", role: "admin", name: "Test Admin" },
  "donor@test.com": { password: "donor123", role: "donor", name: "Test Donor" },
  "hospital@test.com": { password: "hospital123", role: "hospital", name: "Test Hospital" },
};

function ensureSeed() {
  if (typeof window === "undefined") return;
  const store = getStore();
  let changed = false;
  for (const [email, data] of Object.entries(FALLBACK_USERS)) {
    if (!store[email]) {
      store[email] = data;
      changed = true;
    }
  }
  if (changed) saveStore(store);
}

let nextLocalId = 1;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async (email: string | null) => {
    if (!email) {
      setRole(null);
      return null;
    }
    const store = getStore();
    const record = store[email];
    if (record) {
      setRole(record.role);
      return record.role;
    }
    setRole(null);
    return null;
  }, []);

  useEffect(() => {
    ensureSeed();
    const stored = localStorage.getItem("bl_current_session");
    if (stored) {
      try {
        const session = JSON.parse(stored);
        setUser(session);
        fetchProfile(session.email).finally(() => setLoading(false));
      } catch {
        localStorage.removeItem("bl_current_session");
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [fetchProfile]);

  const signup = async (email: string, password: string, roleParam: string = "donor") => {
    setLoading(true);
    try {
      const store = getStore();
      if (store[email]) {
        throw new Error("User already exists");
      }
      store[email] = { password, role: roleParam };
      saveStore(store);

      const sessionUser = { id: String(nextLocalId++), email, role: roleParam };
      localStorage.setItem("bl_current_session", JSON.stringify(sessionUser));
      setUser(sessionUser);
      setRole(roleParam);
      return roleParam;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    ensureSeed();
    try {
      const store = getStore();
      const record = store[email];
      if (!record || record.password !== password) {
        throw new Error("Invalid email or password");
      }
      const sessionUser = { id: String(nextLocalId++), email, role: record.role };
      localStorage.setItem("bl_current_session", JSON.stringify(sessionUser));
      setUser(sessionUser);
      setRole(record.role);
      return record.role;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    setLoading(true);
    localStorage.removeItem("bl_current_session");
    setUser(null);
    setRole(null);
    setLoading(false);
  };

  return <AuthContext.Provider value={{ user, role, loading, signup, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
