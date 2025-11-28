'use client';

import { useState } from 'react';
import { 
  MessageSquare, Search, Filter, Send, X, 
  Clock, CheckCheck, AlertCircle, Sparkles, ChevronDown 
} from 'lucide-react';
import { messageTemplates, interpolateTemplate, getAllCategories, type MessageTemplate } from '@/lib/admin/message-templates';

type Conversation = {
  id: string;
  title: string | null;
  company: string | null;
  avatarUrl: string | null;
  updatedAt: Date;
  createdAt: Date;
  messageCount: number;
  latestMessage: {
    text: string;
    createdAt: Date;
    senderName: string;
    isAdmin: boolean;
  } | null;
  user: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  isUnread: boolean;
  needsReply: boolean;
};

type Message = {
  id: string;
  threadId: string;
  sender: 'me' | 'them';
  text: string;
  createdAt: number;
};

type TemplateInsertProps = {
  onInsert: (text: string) => void;
  onClose: () => void;
};

function TemplateInsert({ onInsert, onClose }: TemplateInsertProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  
  const categories = ['all', ...getAllCategories()];
  const templates = selectedCategory === 'all' 
    ? Object.values(messageTemplates)
    : Object.values(messageTemplates).filter(t => t.category === selectedCategory);

  const handleSelectTemplate = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    // Initialize variables
    const initialVars: Record<string, string> = {};
    template.variables.forEach(v => {
      initialVars[v] = '';
    });
    setVariables(initialVars);
  };

  const handleInsert = () => {
    if (!selectedTemplate) return;
    const interpolated = interpolateTemplate(selectedTemplate.template, variables);
    onInsert(interpolated);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="size-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Message Templates</h2>
              <p className="text-sm text-gray-500">Choose a template to speed up your response</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close message templates"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Template List */}
          <div className="w-80 border-r border-gray-200 flex flex-col">
            {/* Category Filter */}
            <div className="p-4 border-b border-gray-200">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                aria-label="Filter templates by category"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Template List */}
            <div className="flex-1 overflow-y-auto">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedTemplate?.id === template.id ? 'bg-orange-50 border-l-4 border-l-orange-500' : ''
                  }`}
                >
                  <div className="font-medium text-gray-900">{template.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {template.category} • {template.variables.length} variables
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content - Template Preview & Variables */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedTemplate ? (
              <>
                {/* Variables Form */}
                <div className="p-6 border-b border-gray-200 overflow-y-auto">
                  <h3 className="font-semibold text-gray-900 mb-4">Fill in the variables:</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedTemplate.variables.map((variable) => (
                      <div key={variable}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {variable}
                        </label>
                        <input
                          type="text"
                          value={variables[variable] || ''}
                          onChange={(e) => setVariables({ ...variables, [variable]: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder={`Enter ${variable}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="flex-1 p-6 bg-gray-50 overflow-y-auto">
                  <h3 className="font-semibold text-gray-900 mb-3">Preview:</h3>
                  <div className="bg-white rounded-lg p-4 border border-gray-200 whitespace-pre-wrap text-sm">
                    {interpolateTemplate(selectedTemplate.template, variables)}
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInsert}
                    className="px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:shadow-lg hover:shadow-orange-500/30 transition-all"
                  >
                    Insert Template
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Sparkles className="size-12 mx-auto mb-3 opacity-50" />
                  <p>Select a template to preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminMessagesClient() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [stats, setStats] = useState({ total: 0, unread: 0, needsReply: 0 });
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'unanswered'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const res = await fetch(`/api/admin/conversations?filter=${filter}&search=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error('Failed to fetch conversations');
      const data = await res.json();
      setConversations(data.conversations || []);
      setStats(data.stats || { total: 0, unread: 0, needsReply: 0 });
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error fetching conversations:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for selected conversation
  const fetchMessages = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/messages?threadId=${conversationId}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
      setMessages(data.messages || []);
      
      // Mark as read
      await fetch('/api/admin/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error fetching messages:', error);
      }
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) return;
    
    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: selectedConversation.id,
          text: messageText.trim(),
        }),
      });
      
      if (!res.ok) throw new Error('Failed to send message');
      
      setMessageText('');
      await fetchMessages(selectedConversation.id);
      await fetchConversations(); // Refresh list
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error sending message:', error);
      }
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Initial load
  useState(() => {
    fetchConversations();
  });

  // Reload when filter or search changes
  useState(() => {
    fetchConversations();
  });

  const formatTime = (date: Date | number) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Sidebar - Conversations List */}
      <div className="w-96 border-r border-gray-200 flex flex-col bg-white">
        {/* Header with Stats */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Messages</h1>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.unread}</div>
              <div className="text-xs text-gray-500">Unread</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.needsReply}</div>
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
              placeholder="Search conversations..."
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
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setFilter('unanswered')}
              className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'unanswered'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Unanswered
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <MessageSquare className="size-12 mx-auto mb-3 opacity-50" />
              <p>No conversations found</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  setSelectedConversation(conv);
                  fetchMessages(conv.id);
                }}
                className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  selectedConversation?.id === conv.id ? 'bg-orange-50 border-l-4 border-l-orange-500' : ''
                } ${conv.isUnread ? 'bg-blue-50/50' : ''}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-gray-900">
                      {conv.user?.name || conv.user?.email || 'Unknown User'}
                    </div>
                    {conv.isUnread && (
                      <div className="size-2 rounded-full bg-blue-500"></div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatTime(conv.updatedAt)}
                  </div>
                </div>
                
                {conv.latestMessage && (
                  <div className="text-sm text-gray-600 truncate">
                    {conv.latestMessage.isAdmin ? '✓ ' : ''}
                    {conv.latestMessage.text}
                  </div>
                )}
                
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-500">
                    {conv.messageCount} messages
                  </span>
                  {conv.needsReply && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                      Needs reply
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content - Message Thread */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedConversation ? (
          <>
            {/* Thread Header */}
            <div className="bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedConversation.user?.name || selectedConversation.user?.email}
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedConversation.user?.email}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedConversation.needsReply && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="size-4" />
                    <span>Needs reply</span>
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                      msg.sender === 'me'
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                    <div
                      className={`text-xs mt-1 ${
                        msg.sender === 'me' ? 'text-orange-100' : 'text-gray-500'
                      }`}
                    >
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowTemplates(true)}
                  className="px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-2"
                  title="Use template"
                >
                  <Sparkles className="size-4" />
                  <span className="text-sm font-medium">Templates</span>
                </button>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Type your message... (Shift+Enter for new line)"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  rows={3}
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageText.trim() || sending}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:shadow-lg hover:shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
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
              <p className="text-lg">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Template Selector Modal */}
      {showTemplates && (
        <TemplateInsert
          onInsert={(text) => setMessageText(text)}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
}
