import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserConfig } from "./supabase-env";

let browserClient: SupabaseClient | null = null;

function getSupabaseConfig() {
  return getSupabaseBrowserConfig();
}

export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;
  const config = getSupabaseConfig();
  if (!config) return null;
  browserClient = createBrowserClient(config.url, config.anonKey);
  return browserClient;
}

const STUB_CHAIN = new Proxy({} as any, {
  get(_t, prop) {
    if (prop === "then") return (resolve: any) => resolve({ data: null, error: null });
    return () => STUB_CHAIN;
  },
});

function makeAuthStub() {
  const authRes = (data: any) => ({ data, error: null });
  return {
    getUser: async () => authRes({ user: null }),
    getSession: async () => authRes({ session: null }),
    signUp: async () => authRes({ user: { id: "local-" + Date.now() }, session: null }),
    signInWithOtp: async () => authRes(null),
    verifyOtp: async () => authRes({ user: { id: "local-" + Date.now() }, session: { access_token: "local" } }),
    signInWithPassword: async () => authRes({ user: { id: "local-" + Date.now() }, session: { access_token: "local" } }),
    signOut: async () => authRes(null),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  };
}

const STUB_SUPABASE = new Proxy({} as any, {
  get(_t, prop) {
    if (prop === "auth") return makeAuthStub();
    if (prop === "from") return () => STUB_CHAIN;
    if (prop === "rpc") return () => STUB_CHAIN;
    return () => STUB_CHAIN;
  },
});

const realClient = getSupabaseBrowserClient();

export const supabase = realClient || STUB_SUPABASE;
