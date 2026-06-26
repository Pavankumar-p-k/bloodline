"use client";
import React, { useEffect, useState } from "react";
import ProtectedRoute from "../../../components/ProtectedRoute";
import { useAuth } from "../../../context/AuthContext";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

interface UserProfile {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [donorCount, setDonorCount] = useState<number | null>(null);
  const [hospitalCount, setHospitalCount] = useState<number | null>(null);
  const [activeRequests, setActiveRequests] = useState<number | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchStats = async () => {
      try {
        const [donorsRes, hospitalsRes, requestsRes, usersRes] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "donor"),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "hospital"),
          supabase.from("emergency_requests").select("id", { count: "exact", head: true }).neq("status", "fulfilled"),
          supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(50),
        ]);

        if (!mounted) return;

        setDonorCount(donorsRes.count ?? 0);
        setHospitalCount(hospitalsRes.count ?? 0);
        setActiveRequests(requestsRes.count ?? 0);
        setUsers((usersRes.data as UserProfile[]) ?? []);
      } catch (err) {
        console.error("Failed to fetch admin stats:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStats();
    return () => { mounted = false; };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);

      if (error) {
        console.error("Role update error:", error);
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      console.error("Role change failed:", err);
    }
  };

  return (
    <ProtectedRoute role={"admin"}>
      <div className="max-w-5xl mx-auto p-6">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Admin Panel</h1>
            <p className="text-sm text-gray-600">
              {user?.email ?? "Administrator"}
            </p>
          </div>
          <div>
            <button onClick={handleLogout} className="px-3 py-1 border rounded">
              Logout
            </button>
          </div>
        </header>

        {loading ? (
          <div className="text-sm text-gray-500">Loading stats...</div>
        ) : (
          <>
            <section className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 border rounded bg-white">
                <div className="text-sm text-gray-500">Donors</div>
                <div className="text-2xl font-bold">{donorCount ?? "—"}</div>
              </div>
              <div className="p-4 border rounded bg-white">
                <div className="text-sm text-gray-500">Hospitals</div>
                <div className="text-2xl font-bold">{hospitalCount ?? "—"}</div>
              </div>
              <div className="p-4 border rounded bg-white">
                <div className="text-sm text-gray-500">Active Requests</div>
                <div className="text-2xl font-bold">{activeRequests ?? "—"}</div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">User Management</h3>
              <div className="p-3 border rounded bg-white overflow-x-auto">
                {users.length === 0 ? (
                  <div className="text-sm text-gray-500">No users found.</div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-gray-500 border-b">
                        <th className="pb-2 pr-4">Email</th>
                        <th className="pb-2 pr-4">Role</th>
                        <th className="pb-2 pr-4">Joined</th>
                        <th className="pb-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b last:border-0">
                          <td className="py-2 pr-4">{u.email}</td>
                          <td className="py-2 pr-4">
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="border rounded px-2 py-1 text-xs"
                            >
                              <option value="donor">Donor</option>
                              <option value="hospital">Hospital</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td className="py-2 pr-4 text-gray-500">
                            {u.created_at
                              ? new Date(u.created_at).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="py-2">
                            <button
                              onClick={() => handleRoleChange(u.id, u.role)}
                              className="px-2 py-1 border rounded text-xs"
                            >
                              Update
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
