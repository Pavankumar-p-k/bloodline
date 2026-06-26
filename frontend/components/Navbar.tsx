"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { 
  Heart, Map, User, Home, LogOut, 
  ShieldAlert, Bell, Check, Trash2 
} from "lucide-react";

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Notifications State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);

  // Fetch unread notifications
  const fetchNotifications = async () => {
    if (!user || role !== "donor") return;
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("donor_id", user.id)
        .eq("is_read", false)
        .order("sent_at", { ascending: false });

      if (!error && data) {
        setNotifications(data);
      }
    } catch (e) {
      console.warn("Failed to fetch notifications:", e);
    }
  };

  useEffect(() => {
    fetchNotifications();

    if (!user || role !== "donor") return;

    // Realtime notifications listener
    const notifChannel = supabase
      .channel("navbar-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `donor_id=eq.${user.id}` },
        (payload: any) => {
          setNotifications((prev) => [payload.new, ...prev]);
          // Optional: Browser HTML5 Notification popup
          if (Notification.permission === "granted") {
            new Notification("Bloodline Emergency", {
              body: payload.new.message,
              icon: "🩸"
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `donor_id=eq.${user.id}` },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    // Ask for browser notification permission
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }

    return () => {
      supabase.removeChannel(notifChannel);
    };
  }, [user, role]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const getProfilePath = () => {
    if (!user) return "/auth/login";
    if (role === "donor") return "/donor/dashboard";
    if (role === "hospital") return "/hospital/dashboard";
    if (role === "admin") return "/admin/dashboard";
    return "/";
  };

  const isTabActive = (path: string) => {
    if (path === "/" && pathname === "/") return true;
    if (path !== "/" && pathname?.startsWith(path)) return true;
    return false;
  };

  const markAsRead = async (id: string, requestId: string) => {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      
      if (requestId) {
        router.push(`/map`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("donor_id", user.id);
      
      setNotifications([]);
      setShowNotifDrawer(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      {/* DESKTOP TOP HEADER */}
      <nav className="w-full bg-[#1A1A1A] border-b border-zinc-800 sticky top-0 z-40 text-[#F5F5F5] h-16 flex items-center shadow-md">
        <div className="container mx-auto px-4 flex items-center justify-between relative">
          <Link href="/" className="font-black text-xl flex items-center gap-1.5 text-white tracking-wider hover:opacity-90">
            <span className="text-[#C41E3A] text-2xl">🩸</span>
            <span>BLOOD<span className="text-[#C41E3A]">LINE</span></span>
          </Link>
          
          <div className="hidden sm:flex items-center gap-6 text-sm font-semibold">
            <Link href="/" className={`transition-all hover:text-[#C41E3A] ${pathname === '/' ? 'text-[#C41E3A]' : 'text-zinc-300'}`}>
              Home
            </Link>
            <Link href="/map" className={`transition-all hover:text-[#C41E3A] ${pathname?.startsWith('/map') ? 'text-[#C41E3A]' : 'text-zinc-300'}`}>
              Live Map
            </Link>
            <Link href="/emergency" className={`transition-all hover:text-[#C41E3A] ${pathname?.startsWith('/emergency') ? 'text-[#C41E3A]' : 'text-zinc-300'}`}>
              Emergency Request
            </Link>
            
            {user ? (
              <>
                {/* Notification Bell (Donors Only) */}
                {role === "donor" && (
                  <div className="relative">
                    <button 
                      onClick={() => setShowNotifDrawer(!showNotifDrawer)}
                      className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all relative"
                    >
                      <Bell className="h-5 w-5" />
                      {notifications.length > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#C41E3A] border-2 border-[#1A1A1A] rounded-full flex items-center justify-center text-[8px] text-white font-black animate-bounce">
                          {notifications.length}
                        </span>
                      )}
                    </button>

                    {/* Notification Dropdown Drawer */}
                    {showNotifDrawer && (
                      <div className="absolute right-0 mt-2.5 w-72 bg-[#1A1A1A] border border-zinc-850 rounded-xl shadow-2xl p-4 z-50 text-left space-y-3">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                          <span className="text-xs font-extrabold uppercase text-white tracking-wider flex items-center gap-1">
                            <Bell className="h-3.5 w-3.5 text-[#C41E3A]" /> Alerts ({notifications.length})
                          </span>
                          {notifications.length > 0 && (
                            <button 
                              onClick={markAllAsRead}
                              className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-0.5"
                            >
                              <Check className="h-3 w-3 text-emerald-400" /> Clear all
                            </button>
                          )}
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-2.5">
                          {notifications.length === 0 ? (
                            <p className="text-[11px] text-[#9090A0] text-center py-4">No new emergency broadcasts.</p>
                          ) : (
                            notifications.map(n => (
                              <div 
                                key={n.id} 
                                onClick={() => markAsRead(n.id, n.request_id)}
                                className="p-2.5 bg-zinc-950/50 hover:bg-zinc-950 border border-zinc-850 hover:border-zinc-800 rounded-lg cursor-pointer transition-all space-y-1 group"
                              >
                                <p className="text-[11px] font-semibold text-zinc-200 group-hover:text-white leading-normal">
                                  {n.message}
                                </p>
                                <span className="text-[9px] text-[#9090A0] block">
                                  {new Date(n.sent_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <Link 
                  href={getProfilePath()} 
                  className={`transition-all hover:text-[#C41E3A] capitalize ${pathname?.includes('dashboard') ? 'text-[#C41E3A]' : 'text-zinc-300'}`}
                >
                  {role} Dashboard
                </Link>
                
                <button
                  onClick={handleLogout}
                  className="px-3.5 py-1.5 rounded-lg bg-red-950/40 border border-[#C41E3A]/40 text-[#C41E3A] hover:bg-[#C41E3A] hover:text-white transition-all text-xs font-bold"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/auth/login"
                  className="px-3 py-1.5 text-zinc-300 hover:text-white transition-all text-xs font-bold"
                >
                  Login
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-3.5 py-1.5 rounded-lg bg-[#C41E3A] hover:bg-[#8B0000] text-white transition-all text-xs font-bold shadow-[0_0_8px_rgba(196,30,58,0.2)]"
                >
                  Join Us
                </Link>
              </div>
            )}
          </div>

          {/* Simple Mobile Menu notifications & logout buttons */}
          <div className="sm:hidden flex items-center gap-3">
            {user && role === "donor" && (
              <button 
                onClick={() => { setShowNotifDrawer(!showNotifDrawer); router.push(getProfilePath()); }}
                className="relative text-zinc-400 hover:text-white"
              >
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#C41E3A] rounded-full flex items-center justify-center text-[7px] text-white font-bold">
                    {notifications.length}
                  </span>
                )}
              </button>
            )}
            
            {user && (
              <button 
                onClick={handleLogout}
                className="text-zinc-400 hover:text-white"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#1A1A1A] border-t border-zinc-800 z-40 flex items-center justify-around text-[#9090A0]">
        
        {/* Home Link */}
        <Link 
          href="/" 
          className={`flex flex-col items-center justify-center w-16 h-full transition-all ${
            isTabActive("/") ? "text-[#C41E3A]" : "hover:text-[#F5F5F5]"
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Home</span>
        </Link>

        {/* Map Link */}
        <Link 
          href="/map" 
          className={`flex flex-col items-center justify-center w-16 h-full transition-all ${
            isTabActive("/map") ? "text-[#C41E3A]" : "hover:text-[#F5F5F5]"
          }`}
        >
          <Map className="h-5 w-5" />
          <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Map</span>
        </Link>

        {/* Request Link */}
        <Link 
          href="/emergency" 
          className={`flex flex-col items-center justify-center w-16 h-full transition-all ${
            isTabActive("/emergency") ? "text-[#C41E3A]" : "hover:text-[#F5F5F5]"
          }`}
        >
          <ShieldAlert className="h-5 w-5" />
          <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Request</span>
        </Link>

        {/* My Profile Link */}
        <Link 
          href={getProfilePath()} 
          className={`flex flex-col items-center justify-center w-16 h-full transition-all ${
            pathname?.includes("dashboard") || pathname?.startsWith("/auth") ? "text-[#C41E3A]" : "hover:text-[#F5F5F5]"
          }`}
        >
          <User className="h-5 w-5" />
          <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Profile</span>
        </Link>

      </div>
    </>
  );
}
