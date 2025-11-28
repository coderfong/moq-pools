'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Send, MessageSquare, AlertCircle, Filter, User } from 'lucide-react';
import Link from 'next/link';

type Conversation = {
  id: string;
  poolId: string;
  poolTitle: string;
  poolStatus: string;
  poolImage: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  } | null;
  lastMessage: {
    text: string;
    createdAt: string;
    senderName: string;
    isAdmin: boolean;
  } | null;
  messageCount: number;
  isUnread: boolean;
  needsReply: boolean;
  updatedAt: string;
};

type Message = {
  id: string;
  threadId: string;
  text: string;
  createdAt: number;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
};

type Stats = {
  total: number;
  unread: number;
  needsReply: number;
};

type Props = {
  initialConversations: Conversation[];
  initialStats: Stats;
  adminId: string;
};

export default function AdminPoolMessagesClient({ initialConversations, initialStats, adminId }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'needsReply'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [messageText]);

  // Poll for new messages every 3 seconds
  useEffect(() => {
    if (!selectedConversation?.id) return;
    
    console.log('Admin polling: Starting for conversation', selectedConversation.id);
    const interval = setInterval(async () => {
      console.log('Admin polling: Checking for new messages in', selectedConversation.id);
      try {
        const res = await fetch(`/api/messages?threadId=${selectedConversation.id}`);
        if (res.ok) {
          const data = await res.json();
          const newMessages = data.messages || [];
          console.log('Admin polling: Got', newMessages.length, 'messages');
          
          // Only update if message count changed
          if (newMessages.length !== messages.length) {
            console.log('Admin polling: Message count changed, updating UI');
            setMessages(newMessages);
          }
        }
      } catch (error) {
        console.error('Admin polling error:', error);
      }
    }, 3000);
    
    return () => {
      console.log('Admin polling: Clearing interval');
      clearInterval(interval);
    };
  }, [selectedConversation?.id, messages.length]);

  // Load messages for selected conversation
  const loadMessages = async (conversationId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/messages?threadId=${conversationId}`);
      if (!res.ok) throw new Error('Failed to load messages');
      const data = await res.json();
      setMessages(data.messages || []);

      // Mark as read
      await fetch('/api/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: conversationId }),
      });

      // Update conversation as read
      setConversations(prev =>
        prev.map(c => c.id === conversationId ? { ...c, isUnread: false } : c)
      );
      setStats(prev => ({
        ...prev,
        unread: Math.max(0, prev.unread - 1),
      }));
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) return;

    const text = messageText.trim();
    setMessageText('');

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: selectedConversation.id,
          text,
        }),
      });

      if (!res.ok) throw new Error('Failed to send message');

      // Reload messages
      await loadMessages(selectedConversation.id);

      // Update conversation in list
      const updatedConv = {
        ...selectedConversation,
        lastMessage: {
          text,
          createdAt: new Date().toISOString(),
          senderName: 'Admin',
          isAdmin: true,
        },
        needsReply: false,
        updatedAt: new Date().toISOString(),
      };
      setSelectedConversation(updatedConv);
      setConversations(prev => [
        updatedConv,
        ...prev.filter(c => c.id !== updatedConv.id),
      ]);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessageText(text);
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    if (filter === 'unread' && !conv.isUnread) return false;
    if (filter === 'needsReply' && !conv.needsReply) return false;
    if (searchQuery && !conv.poolTitle.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !conv.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !conv.user?.email.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const formatTime = (dateString: string | number) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-gray-50">
      {/* Sidebar - Conversations List */}
      <div className="w-96 border-r border-gray-200 flex flex-col bg-white">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Pool Support Messages</h1>
          <p className="text-sm text-gray-500 mb-4">All user conversations about pools</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.unread}</div>
              <div className="text-xs text-gray-500">Unread</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.needsReply}</div>
              <div className="text-xs text-gray-500">Needs Reply</div>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by pool or user..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setFilter('needsReply')}
              className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'needsReply'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Needs Reply
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <MessageSquare className="size-12 mx-auto mb-3 opacity-50" />
              <p>No conversations found</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredConversations.map((conv) => (
                <motion.button
                  key={conv.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onClick={() => {
                    setSelectedConversation(conv);
                    loadMessages(conv.id);
                  }}
                  className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-orange-50 border-l-4 border-l-orange-500' : ''
                  } ${conv.isUnread ? 'bg-blue-50/30' : ''}`}
                >
                  <div className="flex gap-3">
                    {/* Pool Image */}
                    <div className="relative flex-shrink-0">
                      {conv.poolImage ? (
                        <img
                          src={conv.poolImage}
                          alt={conv.poolTitle}
                          className="size-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="size-12 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                          <MessageSquare className="size-6 text-white" />
                        </div>
                      )}
                      {conv.isUnread && (
                        <div className="absolute -top-1 -right-1 size-3 rounded-full bg-blue-500 border-2 border-white"></div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <div className="font-semibold text-gray-900 truncate pr-2">
                          {conv.poolTitle}
                        </div>
                        <div className="text-xs text-gray-500 flex-shrink-0">
                          {formatTime(conv.updatedAt)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                        <User className="size-3" />
                        <span className="truncate">{conv.user?.name || conv.user?.email || 'Unknown User'}</span>
                      </div>

                      {conv.lastMessage && (
                        <div className="text-sm text-gray-600 truncate">
                          {conv.lastMessage.isAdmin && '✓ '}
                          {conv.lastMessage.text}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">
                          {conv.messageCount} messages
                        </span>
                        {conv.needsReply && (
                          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                            Needs reply
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          conv.poolStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                          conv.poolStatus === 'CLOSED' ? 'bg-gray-100 text-gray-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {conv.poolStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Main Content - Chat */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedConversation.poolImage ? (
                    <img
                      src={selectedConversation.poolImage}
                      alt={selectedConversation.poolTitle}
                      className="size-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="size-12 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                      <MessageSquare className="size-6 text-white" />
                    </div>
                  )}
                  <div>
                    <h2 className="font-bold text-gray-900">{selectedConversation.poolTitle}</h2>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="size-3" />
                      <span>{selectedConversation.user?.name || selectedConversation.user?.email || 'Unknown User'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {selectedConversation.needsReply && (
                    <div className="flex items-center gap-2 text-orange-600 text-sm font-medium">
                      <AlertCircle className="size-4" />
                      <span>Needs reply</span>
                    </div>
                  )}
                  <Link
                    href={`/admin/pools/${selectedConversation.poolId}`}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    View Pool
                  </Link>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loading ? (
                <div className="text-center text-gray-500">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500">
                  <MessageSquare className="size-12 mx-auto mb-3 opacity-50" />
                  <p>No messages yet</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {messages.map((msg) => {
                    const isAdmin = msg.user.role === 'ADMIN';
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${isAdmin ? 'text-right' : 'text-left'}`}>
                          <div className={`inline-block rounded-2xl px-4 py-3 ${
                            isAdmin
                              ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white'
                              : 'bg-white border border-gray-200 text-gray-900'
                          }`}>
                            <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                          </div>
                          <div className={`text-xs mt-1 ${isAdmin ? 'text-gray-500' : 'text-gray-500'}`}>
                            {msg.user.name || msg.user.email} • {formatTime(msg.createdAt)}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex gap-3">
                <textarea
                  ref={textareaRef}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Type your reply... (Shift+Enter for new line)"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageText.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-lg hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  <Send className="size-4" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageSquare className="size-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select a conversation to start</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
