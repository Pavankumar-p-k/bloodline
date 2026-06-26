"use client";
import React, { useEffect, useState } from "react";
import ProtectedRoute from "../../../components/ProtectedRoute";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import LiveLocationSharing from "../../../components/LiveLocationSharing";

type RequestItem = {
  id: string;
  blood_group?: string;
  units?: number;
  city?: string;
  urgency?: string;
  status?: string;
  created_at?: string;
};

type ResponseItem = {
  id: string;
  donor_id?: string;
  request_id?: string;
  status?: string;
  created_at?: string;
};

export default function HospitalDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [responsesMap, setResponsesMap] = useState<Record<string, ResponseItem[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [msg, setMsg] = useState<string | null>(null);

  const mockRequests: RequestItem[] = [
    { id: "r1", blood_group: "O+", units: 2, city: "Hyderabad", urgency: "Critical", status: "active" },
  ];

  const fetchRequests = async () => {
    setLoading(true);
    try {
      console.log("HospitalDashboard: fetching requests for hospital user:", user?.id);
      // try to fetch requests created by this hospital user
      const { data, error } = await supabase.from("requests").select("*").eq("created_by", user?.id).order("created_at", { ascending: false });
      if (error) {
        console.warn("fetch hospital requests error:", error);
        setRequests(mockRequests);
      } else {
        setRequests(data ?? []);
      }

      // fetch responses for each request
      const map: Record<string, ResponseItem[]> = {};
      for (const req of (data ?? mockRequests)) {
        try {
          const { data: respData, error: respErr } = await supabase.from("responses").select("*").eq("request_id", req.id).order("created_at", { ascending: false });
          if (respErr) {
            console.warn("fetch responses error for", req.id, respErr);
            map[req.id] = [];
          } else {
            map[req.id] = respData ?? [];
          }
        } catch (err) {
          console.error("unexpected responses fetch error:", err);
          map[req.id] = [];
        }
      }
      setResponsesMap(map);
    } catch (err) {
      console.error("Unexpected fetchRequests error:", err);
      setRequests(mockRequests);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const approveResponse = async (responseId: string, requestId: string) => {
    setMsg(null);
    try {
      console.log("Approving response:", responseId);
      const { error } = await supabase.from("responses").update({ status: "approved" }).eq("id", responseId);
      if (error) {
        console.error("approve error:", error);
        setMsg(error.message || "Failed to approve response.");
        return;
      }
      // update local map
      setResponsesMap((m) => {
        const arr = (m[requestId] ?? []).map((r) => (r.id === responseId ? { ...r, status: "approved" } : r));
        return { ...m, [requestId]: arr };
      });
      setMsg("Response approved.");
    } catch (err) {
      console.error("Unexpected approve error:", err);
      setMsg("Unexpected error. See console.");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (err) {
      console.error("Logout failed:", err);
      setMsg("Logout failed. See console.");
    }
  };

  return (
    <ProtectedRoute role={"hospital"}>
      <div className="max-w-4xl mx-auto p-6">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Hospital Dashboard</h1>
            <p className="text-sm text-gray-600">{user?.email ?? "Hospital account"}</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="px-3 py-1 border rounded">Create Emergency Request</button>
            <button onClick={handleLogout} className="px-3 py-1 border rounded">Logout</button>
          </div>
        </header>

        <section className="mb-6">
          <LiveLocationSharing />
        </section>

        {msg && <div className="mb-3 text-sm text-green-600">{msg}</div>}

        <section className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Active Requests</h3>
          {loading ? (
            <div>Loading requests...</div>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => (
                <div key={req.id} className="p-3 border rounded">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{req.blood_group} — {req.units} unit(s)</div>
                      <div className="text-sm text-gray-500">{req.urgency} — {req.city}</div>
                    </div>
                    <div className="text-sm text-gray-500">{req.status}</div>
                  </div>

                  <div className="mt-3">
                    <h4 className="font-medium">Donor Responses</h4>
                    <div className="mt-2 space-y-2">
                      {(responsesMap[req.id] ?? []).length === 0 && <div className="text-sm text-gray-500">No responses yet.</div>}
                      {(responsesMap[req.id] ?? []).map((res) => (
                        <div key={res.id} className="flex items-center justify-between border p-2 rounded">
                          <div>
                            <div className="text-sm">Donor: {res.donor_id ?? "Unknown"}</div>
                            <div className="text-xs text-gray-500">Status: {res.status}</div>
                          </div>
                          <div>
                            <button
                              onClick={() => approveResponse(res.id!, req.id!)}
                              className="px-2 py-1 bg-green-600 text-white rounded"
                              disabled={res.status === "approved"}
                            >
                              {res.status === "approved" ? "Approved" : "Approve"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {requests.length === 0 && <div className="text-sm text-gray-500">No active requests created by your account.</div>}
            </div>
          )}
        </section>
      </div>
    </ProtectedRoute>
  );
}
