"use client";
import { useEffect, useRef } from "react";
import { getSocket, disconnectSocket } from "../lib/socket";
import type { Socket } from "socket.io-client";

export function useSocket(token: string | null): Socket | null {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    // Get or create socket — stable reference, not recreated on re-renders
    const s = getSocket(token);
    socketRef.current = s;

    s.on("connect", () => {
      console.log("Socket connected:", s.id);
    });

    s.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    s.on("connect_error", (err) => {
      console.error("Socket error:", err.message);
    });

    // Only disconnect when component fully unmounts (page navigation)
    return () => {
      disconnectSocket();
    };
  }, [token]); // Only runs when token changes, not on every render

  return socketRef.current;
}
