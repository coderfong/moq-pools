export type Thread = {
  id: string;
  title: string; // display name
  company?: string;
  avatarUrl?: string;
  preview?: string;
  updatedAt: number; // epoch ms
};

export type Message = {
  id: string;
  threadId: string;
  sender: 'me' | 'them';
  text: string;
  createdAt: number; // epoch ms
};

// Simple in-memory store (dev only). In production, back with Prisma.
const threads: Thread[] = [
  {
    id: 'vivian',
    title: 'Vivian Su',
    company: 'Guangzhou Qianlai Intelligent Technology Co., Ltd.',
    avatarUrl: 'https://sc04.alicdn.com/kf/H59415c535c4f468fbb1caf069149c5ff8.jpg_120x120.jpg',
    preview: 'Do you have your own software?',
    updatedAt: Date.now() - 1000 * 60 * 60 * 2,
  },
  {
    id: 'chance',
    title: 'Chance Chen',
    company: 'Guangzhou PDL Animation Technology Co., Ltd.',
    avatarUrl: 'https://sc04.alicdn.com/kf/H45845d2dcd8043908ee93c62abe23e33w.jpg_120x120.jpg',
    preview: "I've noticed that you haven't been replying...",
    updatedAt: Date.now() - 1000 * 60 * 60 * 12,
  },
];

const messages: Message[] = [
  {
    id: 'm1',
    threadId: 'vivian',
    sender: 'them',
    text: 'Hi! Do you have your own software?',
    createdAt: Date.now() - 1000 * 60 * 120,
  },
  {
    id: 'm2',
    threadId: 'vivian',
    sender: 'me',
    text: 'Yes, we do. I can share a quick demo and feature list—any particular workflows you care about?',
    createdAt: Date.now() - 1000 * 60 * 115,
  },
];

const byId = new Map<string, Thread>(threads.map((t) => [t.id, t]));

export function listThreads(): Thread[] {
  // sort by updatedAt desc
  return [...threads].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function listMessages(threadId: string): Message[] {
  return messages
    .filter((m) => m.threadId === threadId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function addMessage(threadId: string, sender: 'me' | 'them', text: string): Message {
  const msg: Message = {
    id: Math.random().toString(36).slice(2),
    threadId,
    sender,
    text,
    createdAt: Date.now(),
  };
  messages.push(msg);
  const t = byId.get(threadId);
  if (t) {
    t.preview = text;
    t.updatedAt = msg.createdAt;
  }
  return msg;
}

export function getThread(threadId: string): Thread | undefined {
  return byId.get(threadId);
}

// For demo realism: simulate a reply after a brief delay
export function simulateReply(threadId: string) {
  setTimeout(() => {
    addMessage(
      threadId,
      'them',
      'Thanks for the info! Could you share pricing and lead time details?'
    );
  }, 1200);
}
