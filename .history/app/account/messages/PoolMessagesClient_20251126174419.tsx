"use client";
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

type PoolConversation = {
  pool: {
    id: string;
    status: string;
    targetQty: number;
    pledgedQty: number;
    deadlineAt: Date;
    product: {
      id: string;
      title: string;
      imagesJson: string | null;
    };
    conversations: Array<{
      id: string;
      updatedAt: Date;
      messages: Array<{
        id: string;
        text: string;
        createdAt: Date;
        senderUserId: string | null;
      }>;
      participants: Array<{
        lastReadAt: Date | null;
      }>;
    }>;
  };
};

type Message = {
  id: string;
  text: string;
  createdAt: Date;
  senderUserId: string | null;
  isMe: boolean;
};

interface Props {
  userPools: PoolConversation[];
  userId: string;
}

function parseImages(json: string | null): string[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(d);
}

export default function PoolMessagesClient({ userPools: initialPools, userId }: Props) {
  const [pools, setPools] = useState(initialPools);
  const [activePoolId, setActivePoolId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const activePool = pools.find(p => p.pool.id === activePoolId)?.pool;
  const activeConversation = activePool?.conversations[0];

  useEffect(() => {
    if (pools.length > 0 && !activePoolId) {
      const firstPool = pools[0].pool;
      setActivePoolId(firstPool.id);
      if (firstPool.conversations.length > 0) {
        setActiveConversationId(firstPool.conversations[0].id);
      }
    }
  }, [pools, activePoolId]);

  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    }
  }, [activeConversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function loadMessages(conversationId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/messages?threadId=${conversationId}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load messages');
      const data = await res.json();
      const msgs = (data.messages || []).map((m: any) => ({
        ...m,
        createdAt: new Date(m.createdAt),
        isMe: m.senderUserId === userId,
      }));
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    if (!text.trim() || !activeConversationId || sending) return;
    
    setSending(true);
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: activeConversationId, text: text.trim() }),
      });
      setText('');
      if (taRef.current) {
        taRef.current.style.height = 'auto';
      }
      loadMessages(activeConversationId);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  }

  async function createOrOpenConversation(poolId: string) {
    try {
      const res = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poolId }),
      });
      if (!res.ok) throw new Error('Failed to create conversation');
      const data = await res.json();
      
      // Reload pools to get the new conversation
      window.location.reload();
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  }

  function autoGrowTextArea() {
    const t = taRef.current;
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
  }

  if (pools.length === 0) {
    return (
      <section className="h-screen w-full bg-neutral-50">
        <div className="mx-auto h-full max-w-[1400px] flex items-center justify-center">
          <div className="text-center p-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
              <span className="text-4xl">💬</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Pool Conversations</h2>
            <p className="text-gray-600 mb-6">Join a pool to start messaging with other participants!</p>
            <Link 
              href="/pools"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
            >
              Browse Pools
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="h-screen w-full bg-neutral-50">
      <div className="mx-auto h-full max-w-[1400px] grid grid-cols-[360px_1fr] border-x border-neutral-200 bg-white">
        
        {/* Sidebar - Pool List */}
        <aside className="flex flex-col border-r border-neutral-200 bg-white overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-neutral-200 bg-gradient-to-r from-emerald-50 to-white">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">💬</span>
              <h1 className="text-lg font-bold tracking-tight">Pool Conversations</h1>
            </div>
            <p className="text-xs text-gray-600">Messages for pools you've joined</p>
          </div>

          {/* Pool List */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {pools.map(({ pool }) => {
                const images = parseImages(pool.product.imagesJson);
                const productImage = images[0] || '/placeholder-product.png';
                const conversation = pool.conversations[0];
                const lastMsg = conversation?.messages[0];
                const isActive = pool.id === activePoolId;
                
                let unread = false;
                if (lastMsg && conversation) {
                  const lastReadAt = conversation.participants[0]?.lastReadAt;
                  unread = !lastReadAt || new Date(lastMsg.createdAt) > new Date(lastReadAt);
                }

                return (
                  <motion.div
                    key={pool.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`border-b border-neutral-200 cursor-pointer transition-colors ${
                      isActive ? 'bg-emerald-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setActivePoolId(pool.id);
                      if (conversation) {
                        setActiveConversationId(conversation.id);
                      } else {
                        createOrOpenConversation(pool.id);
                      }
                    }}
                  >
                    <div className="p-4 flex gap-3">
                      <div className="flex-shrink-0">
                        <img
                          src={productImage}
                          alt={pool.product.title}
                          className="w-12 h-12 rounded-lg object-cover border-2 border-gray-200"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className={`text-sm font-semibold line-clamp-1 ${unread ? 'text-gray-900' : 'text-gray-700'}`}>
                            {pool.product.title}
                          </h3>
                          {unread && (
                            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-500"></span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                          <span className="capitalize">{pool.status.toLowerCase()}</span>
                          <span>•</span>
                          <span>{pool.pledgedQty}/{pool.targetQty} units</span>
                        </div>
                        {lastMsg ? (
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-xs line-clamp-1 ${unread ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                              {lastMsg.text}
                            </p>
                            <span className="flex-shrink-0 text-xs text-gray-400">
                              {formatDate(lastMsg.createdAt)}
                            </span>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">No messages yet</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </aside>

        {/* Main Chat Area */}
        <main className="flex flex-col bg-white">
          {activePool && activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b-2 border-gray-200 bg-gradient-to-r from-emerald-50 via-blue-50 to-white">
                <div className="flex items-center gap-3">
                  <img
                    src={parseImages(activePool.product.imagesJson)[0] || '/placeholder-product.png'}
                    alt={activePool.product.title}
                    className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-200"
                  />
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-gray-900">{activePool.product.title}</h2>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <span>👤</span>
                        <span className="font-semibold">Admin Support</span>
                      </span>
                      <span>•</span>
                      <span className="capitalize">{activePool.status.toLowerCase()}</span>
                      <span>•</span>
                      <span>{activePool.pledgedQty}/{activePool.targetQty} units</span>
                    </div>
                  </div>
                  <Link
                    href={`/pools/${activePool.id}`}
                    className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-semibold hover:bg-emerald-200 transition-colors"
                  >
                    View Pool
                  </Link>
                </div>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <span className="text-4xl mb-2 block">💬</span>
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        msg.isMe
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                        <p className={`text-xs mt-1 ${msg.isMe ? 'text-emerald-100' : 'text-gray-500'}`}>
                          {formatDate(msg.createdAt)}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t-2 border-gray-200 bg-white">
                <div className="flex gap-3">
                  <textarea
                    ref={taRef}
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      autoGrowTextArea();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none resize-none min-h-[48px] max-h-[120px]"
                    rows={1}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!text.trim() || sending}
                    className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {sending ? '⏳' : '📤'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <span className="text-4xl mb-2 block">💬</span>
                <p>Select a pool to view messages</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
