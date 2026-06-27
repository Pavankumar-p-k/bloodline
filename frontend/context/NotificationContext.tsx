"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./AuthContext";

type Notification = {
  id: string;
  donor_id: string;
  request_id: string;
  message: string;
  is_read: boolean;
  sent_at: string;
};

type NotificationContextType = {
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, role } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = useCallback(async () => {
    if (!user || role !== "donor") return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("donor_id", user.id)
      .eq("is_read", false)
      .order("sent_at", { ascending: false });
    if (data) setNotifications(data);
  }, [user, role]);

  useEffect(() => {
    fetchNotifications();
    if (!user || role !== "donor") return;

    const channel = supabase
      .channel("notif-context")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `donor_id=eq.${user.id}` }, (payload: any) => {
        setNotifications((prev) => [payload.new, ...prev]);
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          new Notification("Bloodline Alert", { body: payload.new.message });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `donor_id=eq.${user.id}` }, () => fetchNotifications())
      .subscribe();

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => { supabase.removeChannel(channel); };
  }, [user, role, fetchNotifications]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("donor_id", user.id);
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount: notifications.length, fetchNotifications, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
