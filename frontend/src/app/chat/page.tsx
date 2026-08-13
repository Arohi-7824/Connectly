"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MessageBubble } from "../../components/chat/MessageBubble";
import { PollMessage } from "../../components/chat/PollMessage";
import { VoiceMessage } from "../../components/chat/VoiceMessage";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { getSocket, disconnectSocket } from "../../lib/socket";
import { api, setAuthToken } from "../../lib/api";
import type { Socket } from "socket.io-client";
import { useGroups, type Group } from "../../hooks/useGroups";
import { CreateGroupModal } from "../../components/chat/CreateGroupModel";
type Poll = {
  pollId: number; messageId: number; question: string;
  options: { id: number; text: string; votes: number; isMine?: boolean }[];
};
type Message = {
  id: number; sender_id: number; content: string;
  created_at: string; conversation_id?: number;
  reactions?: Reaction[];
  type?: "text" | "poll" | "voice";
  audio_url?: string | null; audio_duration?: number | null; waveform?: number[] | null;
  poll?: Poll;
};
type Reaction = { emoji: string; user_id: number };
type Contact = {
  id: number; contact_id: number; conversation_id: number;
  name: string; username: string;
  last_message: string | null; last_message_time: string | null;
  unread_count: number;
  mood?: string | null; mood_updated_at?: string | null;
  streak?: number;
  current_track?: string | null;
  is_group?: boolean;
  member_count?: number;
};
type GroupMember = { user_id: number; role: "admin" | "member"; name: string; username: string };
type SquadGoal = {
  id: number; conversation_id: number; title: string; created_by: number;
  created_at: string; completed_at: string | null;
  checkins: { userId: number; checkedInAt: string }[];
};
type SearchUser = { id: number; name: string; username: string; };
type PendingRequest = {
  id: number; sender_id: number;
  sender_name: string; sender_username: string;
};

const MOOD_OPTIONS = ["😴","🔥","📚","🎮","💭","🙂"];
const REACTION_EMOJIS = ["💀","🫡","🔥","💅","🫶","😭"];

const THEMES: Record<string, { own: string; accent: string; label: string; swatch: string }> = {
  default: { own: "bg-cyan/20 border-cyan/30",   accent: "text-cyan",    label: "Default", swatch: "#22d3ee" },
  sunset:  { own: "bg-orange-500/20 border-orange-400/30", accent: "text-orange-400", label: "Sunset", swatch: "#fb923c" },
  ocean:   { own: "bg-blue-500/20 border-blue-400/30",     accent: "text-blue-400",   label: "Ocean",  swatch: "#60a5fa" },
  mono:    { own: "bg-white/15 border-white/25",           accent: "text-white",     label: "Mono",   swatch: "#e5e7eb" },
  pink:    { own: "bg-pink-500/20 border-pink-400/30",     accent: "text-pink-400",  label: "Pink",   swatch: "#f472b6" },
};

export default function ChatPage() {
  const router = useRouter();
  const [token, setToken]                 = useState<string | null>(null);
  const [userId, setUserId]               = useState(0);
  const [userName, setUserName]           = useState("");
  const [contacts, setContacts]           = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [draft, setDraft]                 = useState("");
  const [showEmoji, setShowEmoji]         = useState(false);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [showModal, setShowModal]         = useState(false);
  const [modalTab, setModalTab]           = useState<"search"|"pending">("search");
  const [searchQ, setSearchQ]             = useState("");
  const [searchRes, setSearchRes]         = useState<SearchUser[]>([]);
  const [searching, setSearching]         = useState(false);
  const [pending, setPending]             = useState<PendingRequest[]>([]);
  const [sentIds, setSentIds]             = useState<Set<number>>(new Set());
  const [actLoading, setActLoading]       = useState<number|null>(null);
  const [userMood, setUserMood]           = useState<string | null>(null);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [profileView, setProfileView]     = useState<"me" | Contact | null>(null);
  const [chatTheme, setChatTheme]         = useState("default");
  const [showPollComposer, setShowPollComposer] = useState(false);
  const [pollQuestion, setPollQuestion]   = useState("");
  const [pollOptions, setPollOptions]     = useState(["", ""]);
  const [isRecording, setIsRecording]     = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [lastfmUsername, setLastfmUsername] = useState("");
  const [lastfmInput, setLastfmInput]     = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [activeGroup, setActiveGroup]       = useState<Group | null>(null);
  const [groupMembers, setGroupMembers]   = useState<GroupMember[]>([]);
  const [showManageGroup, setShowManageGroup] = useState(false);
  const [addMemberQ, setAddMemberQ]       = useState("");
  const [addMemberRes, setAddMemberRes]   = useState<SearchUser[]>([]);
  const [showGoals, setShowGoals]         = useState(false);
  const [goalsList, setGoalsList]         = useState<SquadGoal[]>([]);
  const [newGoalTitle, setNewGoalTitle]   = useState("");

  const bottomRef      = useRef<HTMLDivElement>(null);
  const socketRef      = useRef<Socket | null>(null);
  const activeRef      = useRef<Contact | Group | null>(null);
  const userIdRef      = useRef(0);
  const contactsRef    = useRef<Contact[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef  = useRef<Blob[]>([]);
  const recordTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);


const [showSchedule, setShowSchedule] = useState(false);
const [scheduledAt, setScheduledAt] = useState("");
const [scheduling, setScheduling] = useState(false);

  const {
    groups,
    setGroups,
    loadGroups,
    updateLastMessage,
    incrementUnread,
    clearUnread,
  } = useGroups(token, socketRef.current);

  const loadGroupsRef = useRef(loadGroups);
  useEffect(() => { loadGroupsRef.current = loadGroups; }, [loadGroups]);

  useEffect(() => { activeRef.current = activeContact ?? activeGroup; }, [activeContact, activeGroup]);

  

  useEffect(() => { userIdRef.current   = userId; }, [userId]);
  useEffect(() => { contactsRef.current = contacts; }, [contacts]);

  // Helper — join all known rooms (DMs and groups both)
  function joinAllRooms(s: Socket) {
    contactsRef.current.forEach(c => {
      s.emit("conversation:join", String(c.conversation_id));
    });
    if (activeRef.current) {
      s.emit("conversation:join", String(activeRef.current.conversation_id));
    }
  }

  /* ── INIT once ─────────────────────────────────── */
  useEffect(() => {
    const t     = localStorage.getItem("token");
    const uid   = Number(localStorage.getItem("userId"));
    const uname = localStorage.getItem("userName") || "You";
    if (!t) { router.push("/login"); return; }

    setUserId(uid);
    userIdRef.current = uid;
    setUserName(uname);
    setToken(t);
    setAuthToken(t);

    api.get("/api/users/me").then(({ data }) => {
      setUserMood(data.user.mood ?? null);
      setChatTheme(data.user.chat_theme || "default");
      setLastfmUsername(data.user.lastfm_username || "");
      setLastfmInput(data.user.lastfm_username || "");
    }).catch(console.error);

    const s = getSocket(t);
    socketRef.current = s;

    // Rejoin rooms on every (re)connect, and resync messages in case any
    // were missed while disconnected (e.g. backend restart/crash window)
    const onConnect = () => {
      console.log("Socket connected — rejoining rooms");
      joinAllRooms(s);

      const current = activeRef.current;
      if (current) {
        api.get(`/api/messages/${current.conversation_id}`)
          .then(({ data }) => {
            // Only resync if still viewing the same conversation
            if (activeRef.current?.conversation_id === current.conversation_id) {
              setMessages(data.messages);
            }
          })
          .catch(console.error);
      }
    };
    s.on("connect", onConnect);
    if (s.connected) onConnect();

    // Incoming message handler
    const onMessage = (msg: Message) => {
      const current  = activeRef.current;
      const myId     = userIdRef.current;
      const msgConv  = Number(msg.conversation_id);
      const isFromMe = msg.sender_id === myId;
      const isOpen   = current && Number(current.conversation_id) === msgConv;

      if (isOpen && !isFromMe) {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        api.post(`/api/contacts/read/${msgConv}`).catch(console.error);
      }

      if (!isFromMe) {
        setContacts(prev => prev.map(c => {
          if (Number(c.conversation_id) !== msgConv) return c;
          return {
            ...c,
            last_message: msg.content,
            last_message_time: msg.created_at,
            unread_count: isOpen ? 0 : (c.unread_count || 0) + 1,
          };
        }));
        updateLastMessage(msgConv, msg.content, msg.created_at);
        if (isOpen) clearUnread(msgConv);
        else incrementUnread(msgConv);
      }
    };
    s.on("message:new", onMessage);

    // Mood updates from any contact (or the echo of our own change)
    const onMoodUpdate = (payload: { userId: number; mood: string | null; mood_updated_at: string }) => {
      setContacts(prev => prev.map(c =>
        c.contact_id === payload.userId
          ? { ...c, mood: payload.mood, mood_updated_at: payload.mood_updated_at }
          : c
      ));
      if (payload.userId === userIdRef.current) setUserMood(payload.mood);
    };
    s.on("mood:update", onMoodUpdate);

    // Reaction updates on any message in an open or background conversation
    const onReactionUpdate = (payload: { conversationId: number; messageId: number; reactions: Reaction[] }) => {
      setMessages(prev => prev.map(m =>
        m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m
      ));
    };
    s.on("reaction:update", onReactionUpdate);

    // Poll vote tallies update live for whoever has that conversation open
    const onPollUpdate = (payload: {
      conversationId: number; pollId: number; messageId: number;
      options: { id: number; text: string; votes: number }[];
      voterId: number; voterOptionId: number | null;
    }) => {
      setMessages(prev => prev.map(m => {
        if (m.id !== payload.messageId || !m.poll) return m;
        const iAmVoter = payload.voterId === userIdRef.current;
        return {
          ...m,
          poll: {
            ...m.poll,
            options: payload.options.map(o => ({
              ...o,
              isMine: iAmVoter
                ? o.id === payload.voterOptionId
                : m.poll!.options.find(existing => existing.id === o.id)?.isMine ?? false,
            })),
          },
        };
      }));
    };
    s.on("poll:update", onPollUpdate);

    // Music status ("now playing") from any contact, or our own echo
    const onMusicUpdate = (payload: { userId: number; current_track: string | null }) => {
      setContacts(prev => prev.map(c =>
        c.contact_id === payload.userId ? { ...c, current_track: payload.current_track } : c
      ));
    };
    s.on("music:update", onMusicUpdate);

    // Someone accepted OUR contact request — refresh contacts so the new
    // contact shows up without needing a manual page reload.
    const onContactAccepted = () => {
      loadContacts();
    };
    s.on("contact:accepted", onContactAccepted);

    // Added to a new group, or a new member joined a group we're in —
    // refresh the groups list live.
    const onGroupAdded = () => { void loadGroupsRef.current(); };
    s.on("group:added", onGroupAdded);
    s.on("group:member_added", onGroupAdded);

    const onGroupRemoved = (payload: { conversationId: number; userId: number }) => {
      if (payload.userId === userIdRef.current) {
        // We were removed (or left) — drop it from our list entirely.
        setGroups(prev => prev.filter(g => g.conversation_id !== payload.conversationId));
        setActiveGroup(prev => prev?.conversation_id === payload.conversationId ? null : prev);
      } else if (activeRef.current?.conversation_id === payload.conversationId) {
        setGroupMembers(prev => prev.filter(m => m.user_id !== payload.userId));
      }
    };
    s.on("group:member_removed", onGroupRemoved);

    const onGroupRenamed = (payload: { conversationId: number; name: string }) => {
      setGroups(prev => prev.map(g =>
        g.conversation_id === payload.conversationId ? { ...g, name: payload.name } : g
      ));
      setActiveGroup(prev =>
        prev?.conversation_id === payload.conversationId ? { ...prev, name: payload.name } : prev
      );
    };
    s.on("group:renamed", onGroupRenamed);

    // Squad Goals — live create/checkin updates for whoever has the group open
    const onGoalCreated = (payload: { conversationId: number; goal: SquadGoal }) => {
      if (activeRef.current?.conversation_id === payload.conversationId) {
        setGoalsList(prev => [...prev, payload.goal]);
      }
    };
    s.on("goal:created", onGoalCreated);

    const onGoalUpdate = (payload: { conversationId: number; goalId: number; completedAt: string | null; checkins: { userId: number; checkedInAt: string }[] }) => {
      if (activeRef.current?.conversation_id === payload.conversationId) {
        setGoalsList(prev => prev.map(g =>
          g.id === payload.goalId ? { ...g, completed_at: payload.completedAt, checkins: payload.checkins } : g
        ));
      }
    };
    s.on("goal:update", onGoalUpdate);

    return () => {
      s.off("connect", onConnect);
      s.off("message:new", onMessage);
      s.off("mood:update", onMoodUpdate);
      s.off("reaction:update", onReactionUpdate);
      s.off("poll:update", onPollUpdate);
      s.off("music:update", onMusicUpdate);
      s.off("contact:accepted", onContactAccepted);
      s.off("group:added", onGroupAdded);
      s.off("group:member_added", onGroupAdded);
      s.off("group:member_removed", onGroupRemoved);
      s.off("group:renamed", onGroupRenamed);
      s.off("goal:created", onGoalCreated);
      s.off("goal:update", onGoalUpdate);
      // Note: intentionally NOT calling disconnectSocket() here.
      // This cleanup fires on every remount (React Strict Mode
      // double-invokes effects in dev), and disconnecting the shared
      // socket singleton mid-handshake was closing the connection before
      // it ever finished establishing — the root cause of dropped
      // messages. The socket is a long-lived singleton; only disconnect
      // it on actual logout (see the sign-out button below).
    };
  }, []);

  /* ── Join room when switching contacts ─────────── */
  useEffect(() => {
    const s = socketRef.current;
    const conversation = activeContact ?? activeGroup;
    if (!s || !conversation) return;
    const room = String(conversation.conversation_id);
    if (s.connected) {
      s.emit("conversation:join", room);
    } else {
      s.once("connect", () => s.emit("conversation:join", room));
    }
  }, [activeContact, activeGroup]);

  /* ── Last.fm now-playing sync ──────────────────── */
  useEffect(() => {
    if (!lastfmUsername) return;
    const sync = () => api.post("/api/users/me/lastfm/sync").catch(console.error);
    sync(); // immediately on connect/set
    const interval = setInterval(sync, 30000);
    return () => clearInterval(interval);
  }, [lastfmUsername]);

  /* ── Load contacts + join their rooms ──────────── */
  const loadContacts = useCallback(async () => {
    const { data } = await api.get("/api/contacts");
    const loaded: Contact[] = data.contacts;
    setContacts(loaded);
    contactsRef.current = loaded; // update ref immediately

    // Join all conversation rooms right after loading
    const s = socketRef.current;
    if (s) {
      const joinRooms = () => {
        loaded.forEach(c => {
          s.emit("conversation:join", String(c.conversation_id)); // ← fixed: was `room`
        });
      };
      if (s.connected) joinRooms();
      else s.once("connect", joinRooms);
    }
  }, []);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  /* ── Load pending requests ─────────────────────── */
  const loadPending = useCallback(async () => {
    const { data } = await api.get("/api/contacts/pending");
    setPending(data.requests);
  }, []);

  useEffect(() => { loadPending(); }, [loadPending]);

  /* ── Load messages + mark read ─────────────────── */
  useEffect(() => {
    const conversation = activeContact ?? activeGroup;
    if (!conversation) return;
    setLoadingMsgs(true);
    setMessages([]);
    api.get(`/api/messages/${conversation.conversation_id}`)
      .then(({ data }) => setMessages(data.messages))
      .catch(console.error)
      .finally(() => setLoadingMsgs(false));

    api.post(`/api/contacts/read/${conversation.conversation_id}`).catch(console.error);
  }, [activeContact, activeGroup]);

  /* ── Load group members + squad goals when opening a group ────── */
  useEffect(() => {
    if (!activeGroup) {
      setGroupMembers([]);
      setGoalsList([]);
      return;
    }
    api.get(`/api/groups/${activeGroup.conversation_id}/members`)
      .then(({ data }) => setGroupMembers(data.members.map((m: any) => ({
        user_id: m.user_id, role: m.role, name: m.name, username: m.username,
      }))))
      .catch(console.error);

    api.get(`/api/groups/${activeGroup.conversation_id}/goals`)
      .then(({ data }) => setGoalsList(data.goals))
      .catch(console.error);
  }, [activeGroup]);

  /* ── Scroll to bottom ──────────────────────────── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Search ────────────────────────────────────── */
  useEffect(() => {
    if (!searchQ || searchQ.length < 2) { setSearchRes([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get(`/api/contacts/search?q=${searchQ}`);
        setSearchRes(data.users);
      } catch { /* ignore */ }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [searchQ]);

  /* ── Add-member search (manage-group modal) ──────── */
  useEffect(() => {
    if (!addMemberQ || addMemberQ.length < 2) { setAddMemberRes([]); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get(`/api/contacts/search?q=${addMemberQ}`);
        setAddMemberRes(data.users.filter((u: SearchUser) => !groupMembers.find(m => m.user_id === u.id)));
      } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(t);
  }, [addMemberQ, groupMembers]);

  /* ── Contact request actions ───────────────────── */
  async function sendRequest(receiverId: number) {
    setActLoading(receiverId);
    try {
      await api.post("/api/contacts/request", { receiverId });
      setSentIds(p => new Set([...p, receiverId]));
    } catch (e: any) { alert(e?.response?.data?.error || "Could not send"); }
    finally { setActLoading(null); }
  }

  async function acceptReq(id: number) {
    setActLoading(id);
    try { await api.post(`/api/contacts/accept/${id}`); await loadContacts(); await loadPending(); }
    catch { /* ignore */ }
    finally { setActLoading(null); }
  }

  async function rejectReq(id: number) {
    setActLoading(id);
    try { await api.post(`/api/contacts/reject/${id}`); await loadPending(); }
    catch { /* ignore */ }
    finally { setActLoading(null); }
  }

  /* ── Group management ───────────────────────────── */
  const isCurrentUserGroupAdmin = groupMembers.find(m => m.user_id === userId)?.role === "admin";

  async function addMemberToGroup(memberId: number) {
    if (!activeGroup) return;
    try {
      await api.post(`/api/groups/${activeGroup.conversation_id}/members`, { userId: memberId });
      const { data } = await api.get(`/api/groups/${activeGroup.conversation_id}/members`);
      setGroupMembers(data.members.map((m: any) => ({ user_id: m.user_id, role: m.role, name: m.name, username: m.username })));
      setAddMemberQ(""); setAddMemberRes([]);
    } catch (e: any) {
      alert(e?.response?.data?.error || "Could not add member");
    }
  }

  async function removeMemberFromGroup(memberId: number) {
    if (!activeGroup) return;
    try {
      await api.delete(`/api/groups/${activeGroup.conversation_id}/members/${memberId}`);
      setGroupMembers(prev => prev.filter(m => m.user_id !== memberId));
    } catch (e: any) {
      alert(e?.response?.data?.error || "Could not remove member");
    }
  }

  async function leaveGroup() {
    if (!activeGroup) return;
    if (!confirm(`Leave ${activeGroup.name}?`)) return;
    try {
      await api.delete(`/api/groups/${activeGroup.conversation_id}/members/${userId}`);
      setGroups(prev => prev.filter(g => g.conversation_id !== activeGroup.conversation_id));
      setActiveGroup(null);
      setShowManageGroup(false);
    } catch (e: any) {
      alert(e?.response?.data?.error || "Could not leave group");
    }
  }

  async function renameActiveGroup(newName: string) {
    if (!activeGroup || !newName.trim()) return;
    try {
      await api.patch(`/api/groups/${activeGroup.conversation_id}`, { name: newName.trim() });
      setGroups(prev => prev.map(g => g.conversation_id === activeGroup.conversation_id ? { ...g, name: newName.trim() } : g));
      setActiveGroup(prev => prev ? { ...prev, name: newName.trim() } : prev);
    } catch (e: any) {
      alert(e?.response?.data?.error || "Could not rename group");
    }
  }

  /* ── Squad Goals ─────────────────────────────────── */
  function submitGoal() {
    const s = socketRef.current;
    if (!s || !activeGroup || !newGoalTitle.trim()) return;
    s.emit("goal:create", { conversationId: String(activeGroup.conversation_id), title: newGoalTitle.trim() });
    setNewGoalTitle("");
  }

  function checkInGoal(goalId: number) {
    const s = socketRef.current;
    if (!s || !activeGroup) return;
    s.emit("goal:checkin", { conversationId: String(activeGroup.conversation_id), goalId });
  }

  /* ── Send message ──────────────────────────────── */
  function sendMessage() {
    const s = socketRef.current;
    const conversation = activeContact ?? activeGroup;
    if (!s || !draft.trim() || !conversation) return;

    // Optimistic
    setMessages(prev => [...prev, {
      id: Date.now(), sender_id: userId, content: draft,
      created_at: new Date().toISOString(),
      conversation_id: conversation.conversation_id,
    }]);
    setContacts(prev => prev.map(c =>
      c.conversation_id === conversation.conversation_id
        ? { ...c, last_message: draft, last_message_time: new Date().toISOString() }
        : c
    ));
    updateLastMessage(conversation.conversation_id, draft, new Date().toISOString());

    s.emit("message:send", {
      conversationId: String(conversation.conversation_id),
      content: draft,
    });
    setDraft(""); setShowEmoji(false);
  }

  function fmt(ts: string | null) {
    if (!ts) return "";
    const d = new Date(ts), now = new Date();
    const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (days === 0) return d.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
    if (days === 1) return "Yesterday";
    return d.toLocaleDateString([], { month:"short", day:"numeric" });
  }

  /* ── Mood ───────────────────────────────────────── */
  async function updateMood(mood: string | null) {
    setShowMoodPicker(false);
    setUserMood(mood); // optimistic; socket echo will confirm
    try { await api.patch("/api/users/me/mood", { mood }); }
    catch (e) { console.error(e); }
  }

  /* ── Reactions ──────────────────────────────────── */
  function sendReaction(messageId: number, emoji: string) {
    const s = socketRef.current;
    const conversation = activeContact ?? activeGroup;
    if (!s || !conversation) return;
    s.emit("reaction:set", {
      conversationId: String(conversation.conversation_id),
      messageId,
      emoji,
    });
  }

  /* ── Theme ──────────────────────────────────────── */
  async function updateTheme(theme: string) {
    setChatTheme(theme); // optimistic
    try { await api.patch("/api/users/me/theme", { theme }); }
    catch (e) { console.error(e); }
  }

  /* ── Last.fm ────────────────────────────────────── */
  async function saveLastfmUsername() {
    try {
      await api.patch("/api/users/me/lastfm", { lastfmUsername: lastfmInput.trim() || null });
      setLastfmUsername(lastfmInput.trim());
    } catch (e) { console.error(e); }
  }

  /* ── Polls ──────────────────────────────────────── */
  function submitPoll() {
    const s = socketRef.current;
    const conversation = activeContact ?? activeGroup;
    if (!s || !conversation) return;
    const cleanOptions = pollOptions.map(o => o.trim()).filter(Boolean);
    if (!pollQuestion.trim() || cleanOptions.length < 2) return;
    s.emit("poll:create", {
      conversationId: String(conversation.conversation_id),
      question: pollQuestion.trim(),
      options: cleanOptions,
    });
    setPollQuestion(""); setPollOptions(["", ""]); setShowPollComposer(false);
  }

  function votePoll(pollId: number, optionId: number) {
    const s = socketRef.current;
    const conversation = activeContact ?? activeGroup;
    if (!s || !conversation) return;
    s.emit("poll:vote", {
      conversationId: String(conversation.conversation_id),
      pollId,
      optionId,
    });
  }

  /* ── Voice messages ─────────────────────────────── */
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recordChunksRef.current.push(e.data); };
      recorder.onstop = () => { stream.getTracks().forEach(t => t.stop()); };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch (e) {
      console.error(e);
      alert("Couldn't access microphone");
    }
  }

  async function stopRecording() {
    const recorder = mediaRecorderRef.current;
    const conversation = activeContact ?? activeGroup;
    if (!recorder || !conversation) return;

    const seconds = recordSeconds;
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setIsRecording(false);

    const blob: Blob = await new Promise(resolve => {
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach(t => t.stop());
        resolve(new Blob(recordChunksRef.current, { type: "audio/webm" }));
      };
      recorder.stop();
    });

    // Compute real waveform peaks from the recorded audio
    let waveform: number[] = [];
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const audioCtx = new AudioContext();
      const decoded = await audioCtx.decodeAudioData(arrayBuffer);
      const channel = decoded.getChannelData(0);
      const barCount = 40;
      const blockSize = Math.floor(channel.length / barCount);
      for (let i = 0; i < barCount; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) sum += Math.abs(channel[i * blockSize + j] || 0);
        waveform.push(Math.min(1, (sum / blockSize) * 4)); // normalize, boost quiet audio a bit
      }
      audioCtx.close();
    } catch (e) {
      console.error("Waveform decode failed", e);
      waveform = Array.from({ length: 40 }, () => Math.random() * 0.6 + 0.2); // fallback
    }

    const formData = new FormData();
    formData.append("audio", blob, "voice.webm");
    formData.append("conversationId", String(conversation.conversation_id));
    formData.append("duration", String(seconds));
    formData.append("waveform", JSON.stringify(waveform));

    try {
      await api.post("/api/messages/voice", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // No optimistic insert needed — the server broadcasts message:new
      // over the socket, and our own socket is already in this room.
    } catch (e) {
      console.error(e);
      alert("Couldn't send voice message");
    }
  }

  async function scheduleMessage() {
  const conversation = activeContact ?? activeGroup;
  if (!conversation || !draft.trim() || !scheduledAt) return;

  const scheduledFor = new Date(scheduledAt);

  if (
    Number.isNaN(scheduledFor.getTime()) ||
    scheduledFor.getTime() <= Date.now()
  ) {
    alert("Choose a future date and time.");
    return;
  }

  setScheduling(true);

  try {
    await api.post("/api/messages/schedule", {
      conversationId: conversation.conversation_id,
      content: draft.trim(),
      scheduledFor: scheduledFor.toISOString(),
    });

    setDraft("");
    setShowSchedule(false);
    setScheduledAt("");
    setShowEmoji(false);
  } catch (e: any) {
    alert(
      e?.response?.data?.error ||
      "Could not schedule message"
    );
  } finally {
    setScheduling(false);
  }
}

function openSchedulePicker() {
  const d = new Date(Date.now() + 10 * 60 * 1000);
  d.setSeconds(0, 0);

  const local = new Date(
    d.getTime() - d.getTimezoneOffset() * 60000
  )
    .toISOString()
    .slice(0, 16);

  setScheduledAt(local);
  setShowSchedule(true);
}

  /* ── RENDER ────────────────────────────────────── */
  return (
    <div className="flex h-screen bg-background text-white overflow-hidden">

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Contacts</h2>
              <button onClick={() => { setShowModal(false); setSearchQ(""); setSearchRes([]); }}
                className="text-muted hover:text-white text-xl">✕</button>
            </div>
            <div className="flex gap-2 mb-4">
              {(["search","pending"] as const).map(tab => (
                <button key={tab} onClick={() => setModalTab(tab)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors relative
                    ${modalTab===tab ? "bg-cyan/10 border border-cyan text-cyan" : "bg-card border border-border text-muted hover:text-white"}`}>
                  {tab === "search" ? "Find People" : "Requests"}
                  {tab === "pending" && pending.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger rounded-full text-white text-[10px] flex items-center justify-center">
                      {pending.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {modalTab === "search" && (
              <div>
                <input autoFocus value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  placeholder="Search by name or username..."
                  className="w-full bg-card border border-border text-white placeholder:text-muted px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-cyan/50 mb-3" />
                {searching && <p className="text-muted text-sm text-center py-4">Searching...</p>}
                {!searching && searchQ.length >= 2 && searchRes.length === 0 &&
                  <p className="text-muted text-sm text-center py-4">No users found</p>}
                {!searching && searchQ.length < 2 &&
                  <p className="text-muted text-sm text-center py-4">Type at least 2 characters</p>}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {searchRes.map(u => (
                    <div key={u.id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan to-purple flex items-center justify-center font-bold text-background shrink-0">{u.name[0]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{u.name}</p>
                        <p className="text-xs text-muted">@{u.username}</p>
                      </div>
                      <button onClick={() => sendRequest(u.id)}
                        disabled={sentIds.has(u.id) || actLoading === u.id}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50
                          ${sentIds.has(u.id) ? "bg-card border border-border text-muted" : "bg-cyan text-background hover:opacity-90"}`}>
                        {sentIds.has(u.id) ? "Sent ✓" : actLoading === u.id ? "..." : "Add"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {modalTab === "pending" && (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {pending.length === 0 && <p className="text-muted text-sm text-center py-8">No pending requests</p>}
                {pending.map(r => (
                  <div key={r.id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan to-purple flex items-center justify-center font-bold text-background shrink-0">{r.sender_name[0]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{r.sender_name}</p>
                      <p className="text-xs text-muted">@{r.sender_username}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => acceptReq(r.id)} disabled={actLoading===r.id}
                        className="bg-cyan text-background text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50">
                        {actLoading===r.id ? "..." : "Accept"}
                      </button>
                      <button onClick={() => rejectReq(r.id)} disabled={actLoading===r.id}
                        className="bg-card border border-border text-muted text-xs px-3 py-1.5 rounded-lg hover:text-white disabled:opacity-50">
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {profileView && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-sm p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Profile</h2>
              <button onClick={() => setProfileView(null)} className="text-muted hover:text-white text-xl">✕</button>
            </div>

            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan to-purple flex items-center justify-center text-xl font-bold text-background mb-2">
                {profileView === "me" ? userName[0]?.toUpperCase() : profileView.name[0]}
              </div>
              <p className="font-semibold text-base flex items-center gap-1.5">
                {profileView === "me" ? userName : profileView.name}
                {(profileView === "me" ? userMood : profileView.mood) && (
                  <span>{profileView === "me" ? userMood : profileView.mood}</span>
                )}
              </p>
              {profileView !== "me" && <p className="text-xs text-muted">@{profileView.username}</p>}
              {profileView !== "me" && profileView.current_track && (
                <p className="text-xs text-cyan mt-1">🎵 {profileView.current_track}</p>
              )}
            </div>

            {profileView === "me" ? (
              <div className="space-y-5">
                <div>
                  <p className="text-xs text-muted uppercase tracking-wider mb-2">Set your mood</p>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {MOOD_OPTIONS.map(m => (
                      <button key={m} onClick={() => updateMood(m)}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg hover:bg-card transition-colors ${userMood === m ? "bg-cyan/20 border border-cyan/40" : "bg-card border border-border"}`}>
                        {m}
                      </button>
                    ))}
                    <button onClick={() => updateMood(null)}
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-muted hover:text-white bg-card border border-border transition-colors text-sm">
                      ✕
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted uppercase tracking-wider mb-2">Chat theme</p>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {Object.entries(THEMES).map(([key, t]) => (
                      <button key={key} onClick={() => updateTheme(key)}
                        title={t.label}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-colors ${chatTheme === key ? "border-white" : "border-border"}`}
                        style={{ backgroundColor: t.swatch + "33" }}>
                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: t.swatch }} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted uppercase tracking-wider mb-2">Music status (Last.fm)</p>
                  <div className="flex gap-2">
                    <input value={lastfmInput} onChange={e => setLastfmInput(e.target.value)}
                      placeholder="Your Last.fm username"
                      className="flex-1 bg-card border border-border text-sm text-white placeholder:text-muted px-3 py-2 rounded-lg focus:outline-none focus:border-cyan/50" />
                    <button onClick={saveLastfmUsername}
                      className="text-xs bg-cyan text-background font-semibold px-3 py-2 rounded-lg hover:opacity-90 shrink-0">
                      Save
                    </button>
                  </div>
                  <p className="text-[10px] text-muted mt-1.5">
                    Turn on "Scrobble to Last.fm" in Spotify's settings, then enter your Last.fm username here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                {!!profileView.streak && profileView.streak > 0 ? (
                  <p className="text-sm text-orange-400 font-semibold">🔥 {profileView.streak} day streak</p>
                ) : (
                  <p className="text-sm text-muted">No active streak yet — keep chatting daily!</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showCreateGroup && (
        <CreateGroupModal
          contacts={contacts.map(c => ({
            contact_id: c.contact_id,
            name: c.name,
            username: c.username,
          }))}
          onClose={() => setShowCreateGroup(false)}
          onCreated={async (conversationId, name) => {
            await loadGroups();
            setActiveGroup({
              conversation_id: conversationId,
              name,
              last_message: null,
              last_message_time: null,
              member_count: 1,
              unread_count: 0,
            });
            setActiveContact(null);
          }}
        />
      )}

      {showManageGroup && activeGroup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Group Info</h2>
              <button onClick={() => setShowManageGroup(false)} className="text-muted hover:text-white text-xl">✕</button>
            </div>

            {isCurrentUserGroupAdmin ? (
              <div className="flex gap-2 mb-5">
                <input defaultValue={activeGroup.name} id="group-rename-input"
                  className="flex-1 bg-card border border-border text-sm text-white px-3 py-2 rounded-lg focus:outline-none focus:border-cyan/50" />
                <button onClick={() => {
                  const el = document.getElementById("group-rename-input") as HTMLInputElement | null;
                  if (el) renameActiveGroup(el.value);
                }} className="text-xs bg-cyan text-background font-semibold px-3 py-2 rounded-lg hover:opacity-90 shrink-0">Rename</button>
              </div>
            ) : (
              <p className="font-semibold text-base mb-5">{activeGroup.name}</p>
            )}

            <p className="text-xs text-muted uppercase tracking-wider mb-2">{groupMembers.length} members</p>
            <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
              {groupMembers.map(m => (
                <div key={m.user_id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan to-purple flex items-center justify-center font-bold text-background text-sm shrink-0">{m.name[0]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      {m.name}
                      {m.role === "admin" && <span className="text-[10px] text-cyan border border-cyan/40 rounded-full px-1.5">Admin</span>}
                    </p>
                    <p className="text-xs text-muted">@{m.username}</p>
                  </div>
                  {isCurrentUserGroupAdmin && m.user_id !== userId && (
                    <button onClick={() => removeMemberFromGroup(m.user_id)}
                      className="text-xs text-danger hover:underline shrink-0">Remove</button>
                  )}
                </div>
              ))}
            </div>

            {isCurrentUserGroupAdmin && (
              <>
                <p className="text-xs text-muted uppercase tracking-wider mb-2">Add member</p>
                <input value={addMemberQ} onChange={e => setAddMemberQ(e.target.value)}
                  placeholder="Search people to add..."
                  className="w-full bg-card border border-border text-white placeholder:text-muted px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-cyan/50 mb-3" />
                <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
                  {addMemberRes.map(u => (
                    <div key={u.id} onClick={() => addMemberToGroup(u.id)}
                      className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 cursor-pointer hover:border-cyan/30">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan to-purple flex items-center justify-center font-bold text-background text-sm shrink-0">{u.name[0]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{u.name}</p>
                        <p className="text-xs text-muted">@{u.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <button onClick={leaveGroup}
              className="w-full bg-danger/10 border border-danger/30 text-danger font-semibold py-2.5 rounded-lg hover:bg-danger/20 text-sm">
              Leave Group
            </button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-72 bg-surface border-r border-border flex flex-col shrink-0">
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan flex items-center justify-center text-background font-bold text-xs">C</div>
            <span className="font-semibold">Connectly</span>
          </div>
          <div className="flex items-center gap-2">
            {pending.length > 0 && (
              <div className="w-5 h-5 bg-danger rounded-full flex items-center justify-center text-white text-xs font-bold">{pending.length}</div>
            )}
            <button onClick={() => setShowCreateGroup(true)}
              className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-muted hover:text-cyan transition-colors" title="Create group">👥</button>
            <button onClick={() => { setShowModal(true); setModalTab("search"); }}
              className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-muted hover:text-cyan transition-colors" title="Add contact">✏️</button>
          </div>
        </div>

        <div className="px-4 py-3">
          <input placeholder="Search conversations..."
            className="w-full bg-card border border-border text-sm text-white placeholder:text-muted px-3 py-2 rounded-lg focus:outline-none focus:border-cyan/50" />
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          <p className="text-xs text-muted px-2 py-2 font-medium uppercase tracking-wider">Messages</p>
          {contacts.length === 0 && (
            <div className="text-center py-8 px-4">
              <div className="text-3xl mb-2">👥</div>
              <p className="text-muted text-xs">No contacts yet</p>
              <button onClick={() => { setShowModal(true); setModalTab("search"); }}
                className="mt-3 text-xs text-cyan hover:underline">Find people to chat with</button>
            </div>
          )}
          {contacts.map(c => (
            <div key={c.id} onClick={() => setActiveContact(c)}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors mb-1
                ${activeContact?.id === c.id ? "bg-cyan/10 border border-cyan/20" : "hover:bg-card"}`}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan to-purple flex items-center justify-center text-sm font-bold text-background shrink-0">
                {c.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-sm truncate flex items-center gap-1 ${c.unread_count > 0 ? "font-bold text-white" : "font-medium"}`}>
                    {c.name}
                    {c.mood && <span title="Mood">{c.mood}</span>}
                    {!!c.streak && c.streak > 0 && (
                      <span className="text-[10px] text-orange-400 font-semibold flex items-center gap-0.5" title={`${c.streak} day streak`}>
                        🔥{c.streak}
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted shrink-0 ml-1">{fmt(c.last_message_time)}</span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <p className={`text-xs truncate ${c.unread_count > 0 ? "text-white font-medium" : "text-muted"}`}>
                    {c.current_track ? `🎵 ${c.current_track}` : (c.last_message || "No messages yet")}
                  </p>
                  {c.unread_count > 0 && (
                    <div className="w-5 h-5 bg-cyan rounded-full flex items-center justify-center text-background text-[10px] font-bold shrink-0">
                      {c.unread_count > 9 ? "9+" : c.unread_count}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {groups.length > 0 && (
            <>
              <p className="text-xs text-muted px-2 py-2 mt-2 font-medium uppercase tracking-wider">Groups</p>
              {groups.map(g => (
                <div key={`group-${g.id}`} onClick={() => setActiveContact(g)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors mb-1
                    ${activeContact?.is_group && activeContact?.id === g.id ? "bg-cyan/10 border border-cyan/20" : "hover:bg-card"}`}>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple to-cyan flex items-center justify-center text-sm font-bold text-background shrink-0">
                    👥
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm truncate ${g.unread_count > 0 ? "font-bold text-white" : "font-medium"}`}>{g.name}</span>
                      <span className="text-xs text-muted shrink-0 ml-1">{fmt(g.last_message_time)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs truncate ${g.unread_count > 0 ? "text-white font-medium" : "text-muted"}`}>
                        {g.last_message || `${g.member_count} members`}
                      </p>
                      {g.unread_count > 0 && (
                        <div className="w-5 h-5 bg-cyan rounded-full flex items-center justify-center text-background text-[10px] font-bold shrink-0">
                          {g.unread_count > 9 ? "9+" : g.unread_count}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="px-4 py-4 border-t border-border flex items-center gap-3 relative">
          <button onClick={() => setShowMoodPicker(v => !v)}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan to-purple flex items-center justify-center text-background text-xs font-bold relative shrink-0">
            {userName[0]?.toUpperCase()}
            {userMood && (
              <span className="absolute -bottom-1 -right-1 text-xs bg-surface rounded-full leading-none">{userMood}</span>
            )}
          </button>
          <button onClick={() => setProfileView("me")} className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium truncate flex items-center gap-1">{userName} {userMood && <span>{userMood}</span>}</p>
            <p className="text-xs text-muted">Online</p>
          </button>
          <button onClick={() => { disconnectSocket(); localStorage.clear(); router.push("/login"); }}
            className="text-muted hover:text-white transition-colors text-sm" title="Sign out">↩</button>

          {showMoodPicker && (
            <div className="absolute bottom-full left-4 mb-2 bg-card border border-border rounded-xl p-2 flex gap-1 shadow-lg z-10">
              {MOOD_OPTIONS.map(m => (
                <button key={m} onClick={() => updateMood(m)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-surface transition-colors ${userMood === m ? "bg-cyan/20 border border-cyan/40" : ""}`}>
                  {m}
                </button>
              ))}
              <button onClick={() => updateMood(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-white hover:bg-surface transition-colors text-xs" title="Clear mood">
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeContact && !activeGroup && (
          <div className="flex-1 flex flex-col items-center justify-center text-muted">
            <div className="text-6xl mb-4">💬</div>
            <p className="font-medium text-lg mb-1">Welcome to Connectly</p>
            <p className="text-sm mb-4">Search for people and send a request to start chatting</p>
            <button onClick={() => { setShowModal(true); setModalTab("search"); }}
              className="bg-cyan text-background font-semibold px-6 py-2.5 rounded-lg hover:opacity-90 text-sm">
              Find People
            </button>
            {pending.length > 0 && (
              <button onClick={() => { setShowModal(true); setModalTab("pending"); }}
                className="mt-3 text-danger text-sm hover:underline">
                {pending.length} pending request{pending.length > 1 ? "s" : ""}
              </button>
            )}
          </div>
        )}

        {(activeContact || activeGroup) && (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface shrink-0">
              <button onClick={() => activeGroup ? setShowManageGroup(true) : activeContact && setProfileView(activeContact)}
                className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan to-purple flex items-center justify-center font-bold text-background">
                  {activeGroup ? "👥" : activeContact?.name[0]}
                </div>
                <div>
                  <p className="font-semibold text-sm flex items-center gap-1.5">
                    {activeGroup?.name || activeContact?.name}
                    {!activeGroup && activeContact?.mood && <span title="Mood">{activeContact.mood}</span>}
                    {!activeGroup && !!activeContact?.streak && activeContact.streak > 0 && (
                      <span className="text-xs text-orange-400 font-semibold" title={`${activeContact.streak} day streak`}>
                        🔥{activeContact.streak}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted">
                    {activeGroup
                      ? `${activeGroup.member_count || groupMembers.length} members`
                      : `@${activeContact?.username}`}
                  </p>
                </div>
              </button>
              <div className="flex items-center gap-2">
                {activeGroup && (
                  <button onClick={() => setShowGoals(v => !v)}
                    className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors
                      ${showGoals ? "bg-cyan/10 border-cyan/40 text-cyan" : "bg-card border-border text-muted hover:text-white"}`}
                    title="Squad goals">🎯</button>
                )}
                {activeGroup ? (
                  <button onClick={() => setShowManageGroup(true)}
                    className="w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center text-muted hover:text-white" title="Manage group">⚙️</button>
                ) : (
                  <>
                    <button className="w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center text-muted hover:text-white">📞</button>
                    <button className="w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center text-muted hover:text-white">🔍</button>
                  </>
                )}
              </div>
            </div>

            {showGoals && activeGroup && (
              <div className="px-6 py-4 border-b border-border bg-surface shrink-0 space-y-3 max-h-56 overflow-y-auto">
                <div className="flex items-center gap-2">
                  <input value={newGoalTitle} onChange={e => setNewGoalTitle(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && submitGoal()}
                    placeholder="Add a squad goal, e.g. 'Read 5 books this month'"
                    className="flex-1 bg-card border border-border text-sm text-white placeholder:text-muted px-3 py-2 rounded-lg focus:outline-none focus:border-cyan/50" />
                  <button onClick={submitGoal} disabled={!newGoalTitle.trim()}
                    className="text-xs bg-cyan text-background font-semibold px-3 py-2 rounded-lg hover:opacity-90 disabled:opacity-40 shrink-0">Add</button>
                </div>
                {goalsList.length === 0 && (
                  <p className="text-xs text-muted text-center py-2">No squad goals yet — add one above!</p>
                )}
                {goalsList.map(g => {
                  const total = groupMembers.length || 1;
                  const done = g.checkins.length;
                  const iCheckedIn = g.checkins.some(c => c.userId === userId);
                  const completed = !!g.completed_at;
                  return (
                    <div key={g.id} className={`rounded-xl border px-4 py-3 ${completed ? "bg-cyan/10 border-cyan/40" : "bg-card border-border"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium flex items-center gap-1.5">
                          {completed && <span>🎉</span>}
                          {g.title}
                        </p>
                        <button onClick={() => checkInGoal(g.id)}
                          disabled={completed}
                          className={`text-xs font-semibold px-3 py-1 rounded-lg shrink-0 disabled:opacity-60
                            ${iCheckedIn ? "bg-cyan/20 border border-cyan/40 text-cyan" : "bg-surface border border-border text-muted hover:text-white"}`}>
                          {iCheckedIn ? "✓ Done" : "Check in"}
                        </button>
                      </div>
                      <p className="text-[10px] text-muted mt-1.5">{done}/{total} checked in{completed ? " — goal complete!" : ""}</p>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loadingMsgs && (
                <div className="flex items-center justify-center h-full text-muted">
                  <p className="text-sm">Loading messages...</p>
                </div>
              )}
              {!loadingMsgs && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-muted">
                  <div className="text-5xl mb-4">👋</div>
                  <p className="font-medium mb-1">Say hello to {activeGroup?.name || activeContact?.name}!</p>
                  <p className="text-sm">Start the conversation</p>
                </div>
              )}
              {messages.map(m => {
                const senderName = activeGroup && m.sender_id !== userId
                  ? groupMembers.find(gm => gm.user_id === m.sender_id)?.name
                  : undefined;
                if (m.type === "poll" && m.poll) {
                  return (
                    <PollMessage key={m.id} question={m.poll.question} options={m.poll.options}
                      isOwn={m.sender_id === userId}
                      onVote={(optionId) => votePoll(m.poll!.pollId, optionId)} />
                  );
                }
                if (m.type === "voice" && m.audio_url) {
                  return (
                    <VoiceMessage key={m.id} audioUrl={m.audio_url} duration={m.audio_duration ?? null}
                      waveform={m.waveform ?? null} isOwn={m.sender_id === userId}
                      backendUrl={process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"} />
                  );
                }
                return (
                  <MessageBubble key={m.id} content={m.content}
                    isOwn={m.sender_id === userId}
                    timestamp={new Date(m.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                    reactions={m.reactions}
                    currentUserId={userId}
                    themeClass={THEMES[chatTheme]?.own}
                    senderName={senderName}
                    showSenderName={!!senderName}
                    onReact={(emoji) => sendReaction(m.id, emoji)} />
                );
              })}
              <div ref={bottomRef} />
            </div>

            {showEmoji && (
              <div className="px-6 py-3 border-t border-border bg-surface shrink-0 flex justify-center">
                <EmojiPicker
                  theme={Theme.DARK}
                  onEmojiClick={(emojiData: EmojiClickData) => setDraft(d => d + emojiData.emoji)}
                  width="100%"
                  height={350}
                  previewConfig={{ showPreview: false }}
                  skinTonesDisabled
                />
              </div>
            )}

            {showPollComposer && (
              <div className="px-6 py-4 border-t border-border bg-surface shrink-0 space-y-2">
                <input value={pollQuestion} onChange={e => setPollQuestion(e.target.value)}
                  placeholder="Ask a question..."
                  className="w-full bg-card border border-border text-sm text-white placeholder:text-muted px-3 py-2 rounded-lg focus:outline-none focus:border-cyan/50" />
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={opt} onChange={e => setPollOptions(prev => prev.map((o, idx) => idx === i ? e.target.value : o))}
                      placeholder={`Option ${i + 1}`}
                      className="flex-1 bg-card border border-border text-sm text-white placeholder:text-muted px-3 py-2 rounded-lg focus:outline-none focus:border-cyan/50" />
                    {pollOptions.length > 2 && (
                      <button onClick={() => setPollOptions(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-muted hover:text-white text-sm">✕</button>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1">
                  <button onClick={() => setPollOptions(prev => prev.length < 6 ? [...prev, ""] : prev)}
                    disabled={pollOptions.length >= 6}
                    className="text-xs text-cyan hover:underline disabled:text-muted disabled:no-underline">+ Add option</button>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowPollComposer(false); setPollQuestion(""); setPollOptions(["", ""]); }}
                      className="text-xs text-muted hover:text-white px-3 py-1.5">Cancel</button>
                    <button onClick={submitPoll}
                      disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
                      className="text-xs bg-cyan text-background font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-40">
                      Create poll
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="px-6 py-4 border-t border-border bg-surface shrink-0">
              {isRecording ? (
                <div className="flex items-center gap-3 bg-card border border-danger/40 rounded-xl px-4 py-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-danger animate-pulse shrink-0" />
                  <span className="text-sm text-white flex-1">
                    Recording... {Math.floor(recordSeconds / 60)}:{(recordSeconds % 60).toString().padStart(2, "0")}
                  </span>
                  <button onClick={stopRecording}
                    className="text-xs bg-danger text-white font-semibold px-3 py-1.5 rounded-lg hover:opacity-90">Stop & Send</button>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 focus-within:border-cyan/40 transition-colors">
                  <button onClick={() => setShowEmoji(v => !v)}
                    className={`text-xl transition-colors ${showEmoji ? "text-cyan" : "text-muted hover:text-white"}`}>😊</button>
                  <button onClick={() => setShowPollComposer(v => !v)}
                    className={`text-lg transition-colors ${showPollComposer ? "text-cyan" : "text-muted hover:text-white"}`} title="Poll">📊</button>
                  <button onClick={startRecording}
                    className="text-lg text-muted hover:text-white transition-colors" title="Voice message">🎤</button>
                  <button
                    onClick={openSchedulePicker}
                    className={`text-lg transition-colors ${
                      showSchedule ? "text-cyan" : "text-muted hover:text-white"
                    }`}
                    title="Schedule message"
                  >
                    🕐
                  </button>
                  <input value={draft} onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && (showSchedule ? scheduleMessage() : sendMessage())}
                    placeholder={`Message ${activeGroup?.name || activeContact?.name}...`}
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-muted focus:outline-none" />
                  <button onClick={showSchedule ? scheduleMessage : sendMessage}
                    disabled={!draft.trim() || (showSchedule && (!scheduledAt || scheduling))}
                    className="w-8 h-8 bg-cyan rounded-lg flex items-center justify-center text-background font-bold hover:opacity-90 disabled:opacity-40">
                    {showSchedule ? "🕐" : "➤"}
                  </button>
                </div>
              )}
              {showSchedule && !isRecording && (
  <div className="px-6 py-3 border-t border-border bg-surface shrink-0">
    <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
      <span className="text-sm text-muted shrink-0">
        🕐 Schedule for
      </span>

      <input
        type="datetime-local"
        value={scheduledAt}
        min={new Date(Date.now() + 60_000)
          .toISOString()
          .slice(0, 16)}
        onChange={e => setScheduledAt(e.target.value)}
        className="flex-1 min-w-0 bg-surface border border-border text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-cyan/50"
      />

      <button
        onClick={() => {
          setShowSchedule(false);
          setScheduledAt("");
        }}
        className="text-xs text-muted hover:text-white px-2 py-1.5"
      >
        Cancel
      </button>

      <button
        onClick={scheduleMessage}
        disabled={!draft.trim() || !scheduledAt || scheduling}
        className="text-xs bg-cyan text-background font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-40 shrink-0"
      >
        {scheduling ? "Scheduling..." : "Schedule"}
      </button>
    </div>
  </div>
)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}