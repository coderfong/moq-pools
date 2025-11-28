"use client";
import React, { useState } from "react";
import MessagesInbox from "@/components/MessagesInbox";
import MessagesFeed from "@/components/MessagesFeed";

export default function Page() {
  const [mode, setMode] = useState<"inbox" | "alerts">("inbox");
  const [notifCount, setNotifCount] = useState<number>(0);

  return (
    <section className="min-h-screen w-full bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-700">
      {/* Top Nav */}
      <header className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <button onClick={() => history.back()} className="rounded-lg px-2 py-1 hover:bg-white/10" aria-label="Back">&lt;</button>
          <h1 className="text-lg font-semibold">Messages</h1>
        </div>
        <div className="relative">
          <button className="rounded-lg px-2 py-1 hover:bg-white/10" aria-label="Notifications">🔔</button>
          {notifCount > 0 && <span className="absolute -right-1 -top-1 inline-block size-2 rounded-full bg-red-500" />}
        </div>
      </header>

      {/* Mode Switcher */}
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 pb-3">
        <div className="inline-flex rounded-xl bg-white/20 p-1 text-sm text-white shadow-sm backdrop-blur">
          <button
            className={`rounded-lg px-3 py-1.5 ${mode === 'inbox' ? 'bg-white text-neutral-900' : 'hover:bg-white/10'}`}
            onClick={() => setMode('inbox')}
          >Inbox</button>
          <button
            className={`rounded-lg px-3 py-1.5 ${mode === 'alerts' ? 'bg-white text-neutral-900' : 'hover:bg-white/10'}`}
            onClick={() => setMode('alerts')}
          >Alerts</button>
        </div>
      </div>

      {/* Body */}
      {mode === 'inbox' ? <MessagesInbox /> : (
        <div className="mx-auto h-[calc(100vh-120px)] max-w-[1400px] border border-neutral-200 rounded-2xl overflow-hidden shadow-sm bg-white">
          <MessagesFeed />
        </div>
      )}
    </section>
  );
}
