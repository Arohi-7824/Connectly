"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import type { Socket } from "socket.io-client";

export type Group = {
  conversation_id: number;
  name: string;
  last_message: string | null;
  last_message_time: string | null;
  member_count: number;
  unread_count: number;
};

export function useGroups(token: string | null, socket: Socket | null) {
  const [groups, setGroups] = useState<Group[]>([]);

  const loadGroups = useCallback(async () => {
    if (!token) return;
    const { data } = await api.get("/api/groups");
    const loaded: Group[] = data.groups.map((g: Group) => ({
      ...g,
      unread_count: 0,
    }));
    setGroups(loaded);

    // Join all group rooms
    if (socket?.connected) {
      loaded.forEach(g => {
        socket.emit("conversation:join", String(g.conversation_id));
      });
    }
  }, [token, socket]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  function updateLastMessage(conversationId: number, content: string, time: string) {
    setGroups(prev => prev.map(g =>
      g.conversation_id === conversationId
        ? { ...g, last_message: content, last_message_time: time }
        : g
    ));
  }

  function incrementUnread(conversationId: number) {
    setGroups(prev => prev.map(g =>
      g.conversation_id === conversationId
        ? { ...g, unread_count: (g.unread_count || 0) + 1 }
        : g
    ));
  }

  function clearUnread(conversationId: number) {
    setGroups(prev => prev.map(g =>
      g.conversation_id === conversationId
        ? { ...g, unread_count: 0 }
        : g
    ));
  }

  return { groups, setGroups, loadGroups, updateLastMessage, incrementUnread, clearUnread };
}