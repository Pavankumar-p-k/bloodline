"use client";

import React, { useEffect, useState } from "react";
import ProtectedRoute from "../../../components/ProtectedRoute";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../lib/supabaseClient";
import { useToast } from "../../../components/ToastContext";
import { 
  Users, Activity, ShieldAlert, Award, 
  Search, Check, Ban, Trash2, Heart, 
  MapPin, Eye, FileText, CheckCircle2, 
  AlertTriangle, Filter, BarChart2 
} from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState("overview");

  // State Lists
  const [profilesList, setProfilesList] = useState<any[]>([]);
  const [donorsList, setDonorsList] = useState<any[]>([]);
  const [requestsList, setRequestsList] = useState<any[]>([]);
  const [responsesList, setResponsesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [donorSearch, setDonorSearch] = useState("");
  const [donorFilter, setDonorFilter] = useState("all"); // all, verified, unverified, suspended
  
  const [requestSearch, setRequestSearch] = useState("");
  const [requestFilter, setRequestFilter] = useState("all"); // all, pending, active, fulfilled, fake

  // Verification review modal
  const [reviewRequest, setReviewRequest] = useState<any | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch profiles
      const { data: profiles, error: pErr } = await supabase.from("profiles").select("*");
      if (pErr) throw pErr;
      setProfilesList(profiles || []);

      // 2. Fetch donors
      const { data: donors, error: dErr } = await supabase.from("donors").select("*");
      if (dErr) throw dErr;
      setDonorsList(donors || []);

      // 3. Fetch requests
      const { data: requests, error: rErr } = await supabase.from("blood_requests").select("*");
      if (rErr) throw rErr;
      setRequestsList(requests || []);

      // 4. Fetch responses
      const { data: responses, error: respErr } = await supabase.from("donor_responses").select("*");
      if (respErr) throw respErr;
      setResponsesList(responses || []);

    } catch (e: any) {
      console.error(e);
      toast.push({ title: "Fetch Error", description: e.message || "Failed to load admin logs", type: "error", id: "admin-fetch-err" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Update donor verification/suspension status
  const handleUpdateDonor = async (donorId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from("donors")
        .update(updates)
        .eq("id", donorId);

      if (error) throw error;

      // In profiles, also suspend if needed
      if (updates.is_suspended !== undefined) {
        await supabase.from("profiles").update({ is_suspended: updates.is_suspended }).eq("id", donorId);
      }

      toast.push({ title: "Donor Updated", description: "Status changed successfully", type: "success", id: "donor-up-ok" });
      fetchAdminData();
    } catch (err: any) {
      toast.push({ title: "Update Failed", description: err.message, type: "error", id: "donor-up-err" });
    }
  };

  // Delete Donor
  const handleDeleteDonor = async (donorId: string) => {
    if (!confirm("Are you sure you want to permanently delete this donor?")) return;
    try {
      const { error } = await supabase.from("donors").delete().eq("id", donorId);
      if (error) throw error;
      await supabase.from("profiles").delete().eq("id", donorId);
      
      toast.push({ title: "Donor Deleted", description: "Profile removed from database", type: "success", id: "donor-del-ok" });
      fetchAdminData();
    } catch (err: any) {
      toast.push({ title: "Deletion Failed", description: err.message, type: "error", id: "donor-del-err" });
    }
  };

  // Update request status
  const handleUpdateRequest = async (requestId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("blood_requests")
        .update({ status })
        .eq("id", requestId);

      if (error) throw error;
      toast.push({ title: "Request Updated", description: `Status changed to ${status}`, type: "success", id: "req-up-ok" });
      fetchAdminData();
    } catch (err: any) {
      toast.push({ title: "Update Failed", description: err.message, type: "error", id: "req-up-err" });
    }
  };

  // Approve Document
  const handleApproveDocument = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("blood_requests")
        .update({ is_verified: true, status: "active" })
        .eq("id", requestId);

      if (error) throw error;
      toast.push({ title: "Request Verified", description: "Verification complete. Alerts dispatched.", type: "success", id: "doc-app-ok" });
      setReviewRequest(null);
      fetchAdminData();
    } catch (err: any) {
      toast.push({ title: "Verification Failed", description: err.message, type: "error", id: "doc-app-err" });
    }
  };

  // Reject Document
  const handleRejectDocument = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("blood_requests")
        .update({ is_verified: false, status: "closed" })
        .eq("id", requestId);

      if (error) throw error;
      toast.push({ title: "Document Rejected", description: "Request has been marked unverified and closed.", type: "success", id: "doc-rej-ok" });
      setReviewRequest(null);
      fetchAdminData();
    } catch (err: any) {
      toast.push({ title: "Action Failed", description: err.message, type: "error", id: "doc-rej-err" });
    }
  };

  // Filters Evaluation
  const filteredDonors = donorsList.filter(d => {
    const matchesSearch = d.full_name.toLowerCase().includes(donorSearch.toLowerCase()) || 
                          d.phone.includes(donorSearch) || 
                          d.blood_group.toLowerCase().includes(donorSearch.toLowerCase());
    
    if (!matchesSearch) return false;

    if (donorFilter === "verified" && !d.is_verified) return false;
    if (donorFilter === "unverified" && d.is_verified) return false;
    if (donorFilter === "suspended" && !d.is_suspended) return false;

    return true;
  });

  const filteredRequests = requestsList.filter(r => {
    const matchesSearch = r.hospital_name.toLowerCase().includes(requestSearch.toLowerCase()) || 
                          r.contact_name.toLowerCase().includes(requestSearch.toLowerCase()) ||
                          r.blood_group_needed.toLowerCase().includes(requestSearch.toLowerCase());
    
    if (!matchesSearch) return false;

    if (requestFilter !== "all" && r.status !== requestFilter) return false;

    return true;
  });

  // Calculate analytical metrics
  const totalFulfilled = requestsList.filter(r => r.status === "fulfilled").length;
  const fulfillmentRate = requestsList.length > 0 ? Math.round((totalFulfilled / requestsList.length) * 100) : 0;
  
  // Pending verification queue
  const pendingVerifications = requestsList.filter(r => r.requester_type === "Hospital" && !r.is_verified && r.verification_doc_url);

  // Severe Alert Panel Checks
  const criticalUnanswered = requestsList.filter(r => r.urgency_level === "CRITICAL" && r.status === "pending");

  return (
    <ProtectedRoute role="admin">
      <main className="min-h-screen bg-void text-text pb-16 px-4">
        <div className="max-w-6xl mx-auto space-y-8 pt-8">
          
          {/* HEADER BAR */}
          <header className="flex justify-between items-center bg-surface border border-border rounded-2xl p-6 shadow-xl">
            <div>
              <span className="text-xs font-semibold text-text-2 uppercase tracking-widest block">Command Center</span>
              <h1 className="text-2xl font-black text-text mt-1">Super Admin Dashboard</h1>
            </div>
            <span className="px-3.5 py-1.5 bg-vital-dim border border-vital-mid text-vital text-xs font-black rounded-lg">
              SYSTEM ONLINE
            </span>
          </header>

          {/* TAB TRIGGERS */}
          <div className="flex border-b border-border gap-6 text-sm font-semibold">
            {["overview", "donors", "requests", "verifications"].map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`pb-3 capitalize transition-all relative ${
                  activeTab === t ? "text-vital border-b-2 border-vital" : "text-text-2 hover:text-zinc-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-20 text-sm text-text-3">Retrieving operational parameters...</div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-8">
                  {/* Top Stats bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-surface p-5 border border-border rounded-xl">
                      <span className="text-xs text-text-2 uppercase tracking-wider block font-bold">Total Donors</span>
                      <span className="text-3xl font-black text-white mt-1 block">{donorsList.length}</span>
                    </div>

                    <div className="bg-surface p-5 border border-border rounded-xl">
                      <span className="text-xs text-text-2 uppercase tracking-wider block font-bold">Active Broadcasts</span>
                      <span className="text-3xl font-black text-vital mt-1 block">
                        {requestsList.filter(r => r.status === "pending" || r.status === "active").length}
                      </span>
                    </div>

                    <div className="bg-surface p-5 border border-border rounded-xl">
                      <span className="text-xs text-text-2 uppercase tracking-wider block font-bold">Fulfillment Rate</span>
                      <span className="text-3xl font-black text-confirmed mt-1 block">{fulfillmentRate}%</span>
                    </div>

                    <div className="bg-surface p-5 border border-border rounded-xl">
                      <span className="text-xs text-text-2 uppercase tracking-wider block font-bold">Pending Reviews</span>
                      <span className="text-3xl font-black text-warning mt-1 block">{pendingVerifications.length}</span>
                    </div>
                  </div>

                  {/* Alerts and Shortages */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Urgency Alert Logs */}
                    <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-6 space-y-4">
                      <div className="flex items-center gap-2 border-b border-border pb-3">
                        <AlertTriangle className="h-5 w-5 text-warning" />
                        <h3 className="font-bold text-sm uppercase tracking-wider text-white">System Security Alerts</h3>
                      </div>

                      <div className="space-y-3">
                        {criticalUnanswered.length === 0 ? (
                          <div className="text-xs text-text-3 py-6 text-center">No critical warnings logged. System operations normal.</div>
                        ) : (
                          criticalUnanswered.map(c => (
                            <div key={c.id} className="bg-vital-dim border border-vital-dim p-4 rounded-xl flex items-center justify-between text-xs">
                              <div className="space-y-1">
                                <span className="px-2 py-0.5 bg-vital-dim border border-vital-mid text-vital font-black rounded text-[9px] uppercase tracking-widest">CRITICAL UNANSWERED</span>
                                <p className="font-bold text-white mt-1">{c.hospital_name} needs {c.blood_group_needed} ({c.units_needed} units)</p>
                                <span className="text-text-2 text-[10px]">Submitted: {new Date(c.created_at).toLocaleTimeString("en-IN")}</span>
                              </div>
                              <button
                                onClick={() => setActiveTab("requests")}
                                className="px-3 py-1.5 bg-vital hover:bg-vital text-white font-bold rounded-lg"
                              >
                                Dispatch Match
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Blood Shortage alerts */}
                    <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
                      <div className="flex items-center gap-2 border-b border-border pb-3">
                        <BarChart2 className="h-5 w-5 text-vital" />
                        <h3 className="font-bold text-sm uppercase tracking-wider text-white">Blood Availability</h3>
                      </div>

                      <div className="space-y-3.5 text-xs">
                        {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => {
                          const count = donorsList.filter(d => d.blood_group === bg && d.is_available).length;
                          const isLow = count === 0;
                          return (
                            <div key={bg} className="flex justify-between items-center bg-surface-2 p-2.5 rounded-lg border border-border">
                              <span className="font-bold text-white">{bg} Group</span>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 font-bold rounded text-[9px] ${
                                  isLow ? "bg-vital-dim text-vital border border-vital-dim" : "bg-confirmed/5 text-confirmed border border-confirmed/20"
                                }`}>
                                  {isLow ? "CRITICAL SHORTAGE" : `${count} Available`}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB 2: DONORS MANAGEMENT */}
              {activeTab === "donors" && (
                <div className="bg-surface border border-border rounded-2xl p-6 space-y-4 shadow-xl">
                  {/* Search filters */}
                  <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center gap-2 bg-surface-2 border border-border px-3 py-2.5 rounded-xl flex-1 max-w-sm">
                      <Search className="h-4 w-4 text-text-3" />
                      <input 
                        type="text" 
                        placeholder="Search donor by name, phone, blood group..."
                        value={donorSearch}
                        onChange={(e) => setDonorSearch(e.target.value)}
                        className="bg-transparent border-none outline-none text-xs text-white placeholder-text-3 w-full"
                      />
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <Filter className="h-4 w-4 text-text-3" />
                      <select
                        value={donorFilter}
                        onChange={(e) => setDonorFilter(e.target.value)}
                        className="bg-surface-2 border border-border rounded-lg text-text py-2 px-3 focus:outline-none"
                      >
                        <option value="all">All Donors</option>
                        <option value="verified">Verified Only</option>
                        <option value="unverified">Pending Verification</option>
                        <option value="suspended">Suspended Only</option>
                      </select>
                    </div>
                  </div>

                  {/* Donors list table */}
                  <div className="overflow-x-auto">
                    {filteredDonors.length === 0 ? (
                      <div className="text-center py-10 text-xs text-text-2">No matching donor logs found.</div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border text-text-3 font-bold">
                            <th className="pb-3 pr-4 uppercase">Name</th>
                            <th className="pb-3 pr-4 uppercase">Blood</th>
                            <th className="pb-3 pr-4 uppercase">Location</th>
                            <th className="pb-3 pr-4 uppercase">Contact</th>
                            <th className="pb-3 pr-4 uppercase">Status</th>
                            <th className="pb-3 uppercase text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredDonors.map(d => (
                            <tr key={d.id} className="border-b border-border last:border-0 hover:bg-surface-2 transition-all">
                              <td className="py-3.5 pr-4 font-bold text-white">{d.full_name}</td>
                              <td className="py-3.5 pr-4">
                                <span className="px-2 py-0.5 bg-vital-dim text-vital border border-vital/30 font-black rounded">
                                  {d.blood_group}
                                </span>
                              </td>
                              <td className="py-3.5 pr-4 text-text">{d.city}, {d.area}</td>
                              <td className="py-3.5 pr-4 font-mono">{d.phone}</td>
                              <td className="py-3.5 pr-4">
                                <span className={`px-2 py-0.5 text-[10px] font-black rounded ${
                                  d.is_suspended 
                                    ? "bg-vital-mid text-vital border border-vital-dim" 
                                    : d.is_verified 
                                      ? "bg-confirmed/5 text-confirmed border border-confirmed/20" 
                                      : "bg-surface-2 text-text-2"
                                }`}>
                                  {d.is_suspended ? "SUSPENDED" : d.is_verified ? "VERIFIED" : "UNVERIFIED"}
                                </span>
                              </td>
                              <td className="py-3.5 text-right space-x-2">
                                {!d.is_verified && (
                                  <button
                                    onClick={() => handleUpdateDonor(d.id, { is_verified: true })}
                                    className="p-1.5 bg-confirmed/10 hover:brightness-90 border border-confirmed/30 text-confirmed hover:text-text rounded-lg transition-all"
                                    title="Verify Donor"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleUpdateDonor(d.id, { is_suspended: !d.is_suspended })}
                                  className={`p-1.5 border rounded-lg transition-all ${
                                    d.is_suspended 
                                      ? 'bg-warning/10 border-warning/30 text-warning hover:brightness-90 hover:text-text' 
                                      : 'bg-surface border-border text-text-2 hover:bg-surface-2'
                                  }`}
                                  title={d.is_suspended ? "Reactivate Donor" : "Suspend Donor"}
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteDonor(d.id)}
                                  className="p-1.5 bg-vital-dim hover:bg-vital border border-vital-mid text-vital hover:text-text rounded-lg transition-all"
                                  title="Delete Profile"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: REQUEST MANAGEMENT */}
              {activeTab === "requests" && (
                <div className="bg-surface border border-border rounded-2xl p-6 space-y-4 shadow-xl">
                  {/* Search filters */}
                  <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center gap-2 bg-surface-2 border border-border px-3 py-2.5 rounded-xl flex-1 max-w-sm">
                      <Search className="h-4 w-4 text-text-3" />
                      <input 
                        type="text" 
                        placeholder="Search requests by hospital, blood type..."
                        value={requestSearch}
                        onChange={(e) => setRequestSearch(e.target.value)}
                        className="bg-transparent border-none outline-none text-xs text-white placeholder-text-3 w-full"
                      />
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <Filter className="h-4 w-4 text-text-3" />
                      <select
                        value={requestFilter}
                        onChange={(e) => setRequestFilter(e.target.value)}
                        className="bg-surface-2 border border-border rounded-lg text-text py-2 px-3 focus:outline-none"
                      >
                        <option value="all">All Request Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                        <option value="fulfilled">Fulfilled</option>
                        <option value="closed">Closed</option>
                        <option value="fake">Fake / Suspicious</option>
                      </select>
                    </div>
                  </div>

                  {/* Requests Table */}
                  <div className="overflow-x-auto">
                    {filteredRequests.length === 0 ? (
                      <div className="text-center py-10 text-xs text-text-2">No matching emergency broadcasts recorded.</div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border text-text-3 font-bold">
                            <th className="pb-3 pr-4 uppercase">Hospital</th>
                            <th className="pb-3 pr-4 uppercase">Patient</th>
                            <th className="pb-3 pr-4 uppercase">Type Needed</th>
                            <th className="pb-3 pr-4 uppercase">Urgency</th>
                            <th className="pb-3 pr-4 uppercase">Responses</th>
                            <th className="pb-3 pr-4 uppercase">Status</th>
                            <th className="pb-3 uppercase text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRequests.map(r => {
                            const resCount = responsesList.filter(res => res.request_id === r.id).length;
                            return (
                              <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-2 transition-all">
                                <td className="py-3.5 pr-4">
                                  <div className="font-bold text-white">{r.hospital_name}</div>
                                  <div className="text-[10px] text-text-3 truncate max-w-[150px]">{r.address}</div>
                                </td>
                                <td className="py-3.5 pr-4 text-text">{r.patient_name || "Anonymized"}</td>
                                <td className="py-3.5 pr-4 font-extrabold text-vital">
                                  {r.blood_group_needed} ({r.units_needed} bags)
                                </td>
                                <td className="py-3.5 pr-4">
                                  <span className={`px-2 py-0.5 text-[9px] font-black rounded ${
                                    r.urgency_level === "CRITICAL" ? "bg-vital-dim text-vital border border-vital-dim" : "bg-warning/10 text-warning border border-warning/20"
                                  }`}>{r.urgency_level}</span>
                                </td>
                                <td className="py-3.5 pr-4 text-text-2">{resCount} Donors</td>
                                <td className="py-3.5 pr-4 capitalize">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    r.status === "fulfilled" ? "bg-confirmed/10 text-confirmed" : r.status === "fake" ? "bg-vital-dim text-vital" : "bg-surface-2 text-text"
                                  }`}>{r.status}</span>
                                </td>
                                <td className="py-3.5 text-right space-x-2">
                                  {r.status !== "fulfilled" && (
                                    <button
                                      onClick={() => handleUpdateRequest(r.id, "fulfilled")}
                                      className="px-2.5 py-1.5 bg-confirmed/10 hover:brightness-90 border border-confirmed/30 text-confirmed hover:text-text rounded-lg text-[10px] font-bold transition-all"
                                    >
                                      Fulfill
                                    </button>
                                  )}
                                  {r.status !== "fake" && (
                                    <button
                                      onClick={() => handleUpdateRequest(r.id, "fake")}
                                      className="px-2.5 py-1.5 bg-vital-dim hover:bg-vital border border-vital-mid text-vital hover:text-text rounded-lg text-[10px] font-bold transition-all"
                                      title="Mark Fraudulent"
                                    >
                                      Flag Fake
                                    </button>
                                  )}
                                  {r.status !== "closed" && (
                                    <button
                                      onClick={() => handleUpdateRequest(r.id, "closed")}
                                      className="px-2.5 py-1.5 bg-surface hover:bg-surface-2 border border-border text-text-2 hover:text-text rounded-lg text-[10px] font-bold transition-all"
                                    >
                                      Close
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: VERIFICATION QUEUE */}
              {activeTab === "verifications" && (
                <div className="bg-surface border border-border rounded-2xl p-6 space-y-4 shadow-xl">
                  <div className="border-b border-border pb-3 mb-4">
                    <h3 className="font-bold text-sm uppercase tracking-wider text-text-2">Pending Document Review</h3>
                  </div>

                  <div className="overflow-x-auto">
                    {pendingVerifications.length === 0 ? (
                      <div className="text-center py-10 text-xs text-text-2">All pending documents reviewed. Queue empty!</div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border text-text-3 font-bold">
                            <th className="pb-3 pr-4 uppercase">Hospital</th>
                            <th className="pb-3 pr-4 uppercase">Contact Name</th>
                            <th className="pb-3 pr-4 uppercase">Requested Details</th>
                            <th className="pb-3 pr-4 uppercase">Uploaded File</th>
                            <th className="pb-3 uppercase text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingVerifications.map(v => (
                            <tr key={v.id} className="border-b border-border last:border-0 hover:bg-surface-2 transition-all">
                              <td className="py-3.5 pr-4 font-bold text-white">{v.hospital_name}</td>
                              <td className="py-3.5 pr-4 text-text">{v.contact_name}</td>
                              <td className="py-3.5 pr-4">
                                <span className="font-extrabold text-vital">{v.blood_group_needed} Needed</span> ({v.units_needed} bags)
                              </td>
                              <td className="py-3.5 pr-4">
                                <button
                                  onClick={() => setReviewRequest(v)}
                                  className="text-text-2 hover:text-text flex items-center gap-1 hover:underline text-[10px]"
                                >
                                  <FileText className="h-4 w-4 text-vital" /> View letterhead.png
                                </button>
                              </td>
                              <td className="py-3.5 text-right space-x-2">
                                <button
                                  onClick={() => handleApproveDocument(v.id)}
                                  className="px-3 py-1.5 bg-confirmed/10 hover:brightness-90 border border-confirmed/30 text-confirmed hover:text-text rounded-lg text-[10px] font-bold transition-all"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectDocument(v.id)}
                                  className="px-3 py-1.5 bg-vital-dim hover:bg-vital border border-vital-mid text-vital hover:text-text rounded-lg text-[10px] font-bold transition-all"
                                >
                                  Reject
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* VERIFICATION DIALOG MODAL */}
          {reviewRequest && (
            <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl relative">
                
                <button
                  onClick={() => setReviewRequest(null)}
                  className="absolute top-4 right-4 text-text-3 hover:text-text"
                >
                  <Eye className="h-5 w-5" />
                </button>

                <h3 className="text-base font-bold text-white border-b border-border pb-2">Hospital Verification Document</h3>

                <div className="space-y-1.5 text-xs">
                  <p><strong>Hospital Coordinator:</strong> {reviewRequest.contact_name} ({reviewRequest.contact_phone})</p>
                  <p><strong>Emergency:</strong> {reviewRequest.blood_group_needed} ({reviewRequest.units_needed} units required)</p>
                </div>

                {/* Display File Image Preview */}
                <div className="w-full h-64 rounded-xl border border-border overflow-hidden relative bg-void flex items-center justify-center">
                  <img 
                    src={reviewRequest.verification_doc_url} 
                    alt="Letterhead slip" 
                    className="max-h-full object-contain"
                  />
                </div>

                {/* Approve/Reject Buttons */}
                <div className="flex gap-3 justify-end pt-3 border-t border-border">
                  <button
                    onClick={() => handleRejectDocument(reviewRequest.id)}
                    className="px-4 py-2.5 bg-vital-dim border border-vital-mid text-vital hover:bg-vital hover:text-text rounded-lg text-xs font-bold transition-all"
                  >
                    Reject Verification
                  </button>
                  <button
                    onClick={() => handleApproveDocument(reviewRequest.id)}
                    className="px-4 py-2.5 bg-vital hover:bg-vital text-white rounded-lg text-xs font-bold transition-all"
                  >
                    Approve & Verify
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>
    </ProtectedRoute>
  );
}
