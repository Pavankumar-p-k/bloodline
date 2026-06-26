import { z } from "zod";
import { supabase } from "../supabaseClient";
import type { AppRole } from "../auth";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["donor", "hospital"]),
});

export type SignupInput = z.infer<typeof signupSchema>;

export async function loginAndResolveRole(input: LoginInput): Promise<AppRole> {
  const { data, error } = await supabase.auth.signInWithPassword(input);
  if (error) throw error;

  const userId = data.user?.id;
  if (!userId) throw new Error("Sign in succeeded but no user ID returned");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  const role = (profile?.role as AppRole) ?? "donor";
  return role;
}

export async function signupWithRole(input: SignupInput): Promise<AppRole> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
  });
  if (error) throw error;

  const userId = data.user?.id ?? data.session?.user?.id;
  if (!userId) throw new Error("Sign up succeeded but no user ID returned");

  const { error: profileErr } = await supabase
    .from("profiles")
    .upsert({ id: userId, email: input.email, role: input.role });

  if (profileErr) throw profileErr;

  return input.role;
}
