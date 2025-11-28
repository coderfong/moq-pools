'use client';

import { useState } from 'react';
import { MessageSquare, Bell, Package } from 'lucide-react';
import PoolMessagesClient from './PoolMessagesClient';

type Tab = 'messages' | 'alerts' | 'tracking';

interface Props {
  userPools: any[];
  userId: string;
  alerts: any[];
  poolItems: any[];
}

export default function AccountHubClient({ userPools, userId, alerts, poolItems }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('messages');

  return (
    <section className="h-screen w-full bg-neutral-50 flex flex-col">
      <div className="mx-auto h-full w-full max-w-[1400px] flex border-x border-neutral-200 bg-white">
        
        {/* Left Sidebar - Tab Navigation */}
        <aside className="w-20 border-r border-neutral-200 bg-gradient-to-b from-gray-50 to-white flex flex-col items-center py-6 gap-4">
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex flex-col items-center gap-2 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'messages'
                ? 'bg-emerald-100 text-emerald-700'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
            title="Messages"
          >
            <MessageSquare className="w-6 h-6" />
            <span className="text-xs font-medium">Messages</span>
            {userPools.some(p => {
              const conv = p.pool.conversations[0];
              if (!conv) return false;
              const lastMsg = conv.messages[0];
              const lastReadAt = conv.participants[0]?.lastReadAt;
              return lastMsg && (!lastReadAt || new Date(lastMsg.createdAt) > new Date(lastReadAt));
            }) && (
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex flex-col items-center gap-2 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'alerts'
                ? 'bg-orange-100 text-orange-700'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
            title="Alerts"
          >
            <Bell className="w-6 h-6" />
            <span className="text-xs font-medium">Alerts</span>
            {alerts.filter(a => a.status === 'UNREAD').length > 0 && (
              <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">
                {alerts.filter(a => a.status === 'UNREAD').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('tracking')}
            className={`flex flex-col items-center gap-2 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'tracking'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
            title="Order Tracking"
          >
            <Package className="w-6 h-6" />
            <span className="text-xs font-medium">Tracking</span>
            {poolItems.filter((item: any) => 
              ['IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(item.poolItemStatus)
            ).length > 0 && (
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            )}
          </button>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'messages' && (
            <PoolMessagesClient userPools={userPools} userId={userId} />
          )}
          
          {activeTab === 'alerts' && (
            <div className="flex-1 overflow-y-auto p-6">
              <h2 className="text-2xl font-bold mb-6">Alerts & Notifications</h2>
              {/* Import and use AlertsClient component here */}
              <div className="text-gray-500">Alerts content will be integrated here</div>
            </div>
          )}
          
          {activeTab === 'tracking' && (
            <div className="flex-1 overflow-y-auto p-6">
              <h2 className="text-2xl font-bold mb-6">Order Tracking</h2>
              {/* Import and use PoolItemTrackingClient component here */}
              <div className="text-gray-500">Order tracking content will be integrated here</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
