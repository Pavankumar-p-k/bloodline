"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { Bell, Check, MapPin, Loader2 } from "lucide-react";

export default function NotificationHistoryPage() {
  const { user, role } = useAuth();
  const router = useRouter();
  const [allNotifs, setAllNotifs] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || role !== "donor") return;
    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("donor_id", user.id)
        .order("sent_at", { ascending: false })
        .limit(50);
      if (data) setAllNotifs(data);
      setLoading(false);
    };
    load();
  }, [user, role]);

  const handleMarkRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setAllNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const filtered = allNotifs.filter((n) => {
    if (filter === "unread") return !n.is_read;
    if (filter === "read") return n.is_read;
    return true;
  });

  return (
    <main className="min-h-screen bg-void text-text pb-16 px-4">
      <div className="max-w-2xl mx-auto pt-8 space-y-6">
        <header className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-vital" />
          <h1 className="text-xl font-black text-text">Notifications</h1>
        </header>

        <div className="flex gap-2 text-xs font-semibold">
          {(["all", "unread", "read"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg transition-all ${filter === f ? "bg-vital text-text" : "bg-surface-2 border border-border text-text-2 hover:text-text"}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)} ({f === "all" ? allNotifs.length : allNotifs.filter((n) => f === "unread" ? !n.is_read : n.is_read).length})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-vital animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-text-2">No notifications found.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((n) => (
              <div key={n.id} className={`bg-surface border rounded-xl p-4 flex items-start gap-3 transition-all ${n.is_read ? "border-border opacity-70" : "border-vital-dim"}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.is_read ? "bg-text-3" : "bg-vital"}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${n.is_read ? "text-text-2" : "text-text font-semibold"}`}>{n.message}</p>
                  <span className="text-[10px] text-text-3 mt-1 block">{new Date(n.sent_at).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {!n.is_read && (
                    <button onClick={() => handleMarkRead(n.id)} className="p-1.5 bg-confirmed/5 border border-confirmed/20 text-confirmed rounded-lg hover:brightness-90" title="Mark read">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {n.request_id && (
                    <button onClick={() => router.push("/map")} className="p-1.5 bg-surface-2 border border-border text-text-2 rounded-lg hover:text-text" title="View on map">
                      <MapPin className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
