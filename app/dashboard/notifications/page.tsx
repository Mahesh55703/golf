"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  Calendar,
  CreditCard,
  Trophy,
  Loader2,
  AlertCircle,
  ExternalLink,
  CheckCheck,
} from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function GolferNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = async () => {
    try {
      const res = await fetch("/api/golfer/notifications");
      if (!res.ok) throw new Error("Failed to load notifications");
      const json = await res.json();
      setNotifications(json.notifications || []);
      setUnreadCount(json.unreadCount || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch("/api/golfer/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAllAsRead = async () => {
    setUpdating(true);
    try {
      await fetch("/api/golfer/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-white/50 space-y-3">
        <Loader2 className="animate-spin text-[#dfbf77]" size={32} />
        <p className="text-xs">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Notification Centre</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Important updates regarding your entries, schedules & tournament notices
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={updating}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-sm"
          >
            <CheckCheck size={14} className="text-emerald-700" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border border-slate-200/80 text-center space-y-3 shadow-sm">
          <Bell size={36} className="mx-auto text-slate-300" />
          <h3 className="font-bold text-base text-slate-900">No Notifications</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You are completely caught up! Updates about your registered tournaments and verified scores will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-5 rounded-2xl border transition-all space-y-2 shadow-sm ${
                notif.isRead
                  ? "bg-white border-slate-200 text-slate-700"
                  : "bg-emerald-50/70 border-emerald-200 text-slate-900"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      notif.isRead ? "bg-slate-300" : "bg-emerald-600"
                    }`}
                  />
                  <h4 className="font-bold text-sm text-slate-900">{notif.title}</h4>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {new Date(notif.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed pl-4">{notif.message}</p>

              <div className="flex items-center justify-between pt-2 pl-4 text-xs">
                {notif.linkUrl ? (
                  <Link
                    href={notif.linkUrl}
                    className="text-emerald-800 hover:underline font-bold flex items-center gap-1"
                  >
                    <span>View Event Details</span>
                    <ExternalLink size={12} />
                  </Link>
                ) : (
                  <span />
                )}

                {!notif.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(notif.id)}
                    className="text-[11px] text-slate-400 hover:text-slate-800 font-medium transition-colors"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
