import type { Area, Conversation, Message } from '@/lib/types';

interface StoredData {
  areas: Area[];
  conversations: Conversation[];
  messagesByConv: Record<string, Message[]>;
  activeAreaId: string | null;
  activeConvId: string | null;
}

function storageKey(userId: string) {
  return `ra:${userId}`;
}

function reviveDates(raw: StoredData): StoredData {
  return {
    areas: raw.areas.map(a => ({ ...a, createdAt: new Date(a.createdAt as unknown as string) })),
    conversations: raw.conversations.map(c => ({
      ...c,
      createdAt: new Date(c.createdAt as unknown as string),
    })),
    messagesByConv: Object.fromEntries(
      Object.entries(raw.messagesByConv).map(([id, msgs]) => [
        id,
        (msgs as unknown as Array<Message & { timestamp: string }>).map(m => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })),
      ])
    ),
    activeAreaId: raw.activeAreaId,
    activeConvId: raw.activeConvId,
  };
}

export function loadUserData(userId: string): StoredData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    return reviveDates(JSON.parse(raw) as StoredData);
  } catch {
    return null;
  }
}

export function saveUserData(
  userId: string,
  data: {
    areas: Area[];
    conversations: Conversation[];
    messagesByConv: Record<string, Message[]>;
    activeAreaId: string | null;
    activeConvId: string | null;
  }
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(data));
  } catch {
    // storage full — silently ignore
  }
}
