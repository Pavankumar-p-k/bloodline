"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { Heart, Map, User, Home, LogOut, ShieldAlert, Bell, Check } from "lucide-react";

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const router = useRouter();
  const pathname = usePathname();
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);

  const handleLogout = async () => {
    try { await logout(); router.push("/"); } catch { }
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

  const handleNotificationClick = async (n: any) => {
    await markAsRead(n.id);
    setShowNotifDrawer(false);
    if (n.request_id) router.push("/map");
  };

  return (
    <>
      <nav className="w-full bg-surface border-b border-border sticky top-0 z-40 text-text h-16 flex items-center shadow-md">
        <div className="container mx-auto px-4 flex items-center justify-between relative">
          <Link href="/" className="font-black text-xl flex items-center gap-1.5 text-text tracking-wider hover:opacity-90">
            <Heart className="h-6 w-6 text-vital" />
            <span>BLOOD<span className="text-vital">LINE</span></span>
          </Link>

          <div className="hidden sm:flex items-center gap-6 text-sm font-semibold">
            <Link href="/" className={`transition-all hover:text-vital ${pathname === "/" ? "text-vital" : "text-text"}`}>Home</Link>
            <Link href="/map" className={`transition-all hover:text-vital ${pathname?.startsWith("/map") ? "text-vital" : "text-text"}`}>Live Map</Link>
            <Link href="/emergency" className={`transition-all hover:text-vital ${pathname?.startsWith("/emergency") ? "text-vital" : "text-text"}`}>Emergency Request</Link>

            {user ? (
              <>
                {role === "donor" && (
                  <div className="relative">
                    <button onClick={() => setShowNotifDrawer(!showNotifDrawer)}
                      className="p-1.5 rounded-lg hover:bg-surface-2 text-text-2 hover:text-text transition-all relative">
                      <Bell className="h-5 w-5" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-vital border-2 border-void rounded-full flex items-center justify-center text-[8px] text-text font-black animate-bounce">
                          {unreadCount}
                        </span>
                      )}
                    </button>

                    {showNotifDrawer && (
                      <div className="absolute right-0 mt-2.5 w-72 bg-surface border border-border rounded-xl shadow-2xl p-4 z-50 text-left space-y-3">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                          <span className="text-xs font-extrabold uppercase text-text tracking-wider flex items-center gap-1">
                            <Bell className="h-3.5 w-3.5 text-vital" /> Alerts ({unreadCount})
                          </span>
                          {unreadCount > 0 && (
                            <button onClick={() => { markAllAsRead(); setShowNotifDrawer(false); }}
                              className="text-[10px] text-text-2 hover:text-text flex items-center gap-0.5">
                              <Check className="h-3 w-3 text-confirmed" /> Clear all
                            </button>
                          )}
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2.5">
                          {notifications.length === 0 ? (
                            <p className="text-[11px] text-text-2 text-center py-4">No new emergency broadcasts.</p>
                          ) : (
                            notifications.map((n) => (
                              <div key={n.id} onClick={() => handleNotificationClick(n)}
                                className="p-2.5 bg-void/50 hover:bg-void border border-border hover:border-border rounded-lg cursor-pointer transition-all space-y-1 group">
                                <p className="text-[11px] font-semibold text-text group-hover:text-text leading-normal">{n.message}</p>
                                <span className="text-[9px] text-text-2 block">{new Date(n.sent_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <Link href={getProfilePath()}
                  className={`transition-all hover:text-vital capitalize ${pathname?.includes("dashboard") ? "text-vital" : "text-text"}`}>
                  {role} Dashboard
                </Link>

                <button onClick={handleLogout}
                  className="px-3.5 py-1.5 rounded-lg bg-vital-dim border border-vital-dim text-vital hover:bg-vital hover:text-text transition-all text-xs font-bold">
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/auth/login" className="px-3 py-1.5 text-text hover:text-text transition-all text-xs font-bold">Login</Link>
                <Link href="/auth/signup" className="px-3.5 py-1.5 rounded-lg bg-vital hover:brightness-90 text-text transition-all text-xs font-bold shadow-vital-glow">Join Us</Link>
              </div>
            )}
          </div>

          <div className="sm:hidden flex items-center gap-3">
            {user && role === "donor" && (
              <button onClick={() => { setShowNotifDrawer(!showNotifDrawer); router.push(getProfilePath()); }}
                className="relative text-text-2 hover:text-text">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-vital rounded-full flex items-center justify-center text-[7px] text-text font-bold">{unreadCount}</span>
                )}
              </button>
            )}
            {user && (
              <button onClick={handleLogout} className="text-text-2 hover:text-text" title="Logout">
                <LogOut className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="sm:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border z-40 flex items-center justify-around text-text-2">
        <Link href="/" className={`flex flex-col items-center justify-center w-16 h-full transition-all ${isTabActive("/") ? "text-vital" : "hover:text-text"}`}>
          <Home className="h-5 w-5" />
          <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Home</span>
        </Link>
        <Link href="/map" className={`flex flex-col items-center justify-center w-16 h-full transition-all ${isTabActive("/map") ? "text-vital" : "hover:text-text"}`}>
          <Map className="h-5 w-5" />
          <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Map</span>
        </Link>
        <Link href="/emergency" className={`flex flex-col items-center justify-center w-16 h-full transition-all ${isTabActive("/emergency") ? "text-vital" : "hover:text-text"}`}>
          <ShieldAlert className="h-5 w-5" />
          <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Request</span>
        </Link>
        <Link href={getProfilePath()} className={`flex flex-col items-center justify-center w-16 h-full transition-all ${pathname?.includes("dashboard") || pathname?.startsWith("/auth") ? "text-vital" : "hover:text-text"}`}>
          <User className="h-5 w-5" />
          <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Profile</span>
        </Link>
      </div>
    </>
  );
}
