"use client";
import { useState } from "react";
import { api } from "../../lib/api";

type Contact = {
  contact_id: number;
  name: string;
  username: string;
};

type Props = {
  contacts: Contact[];
  onClose: () => void;
  onCreated: (conversationId: number, name: string) => void;
};

export function CreateGroupModal({ contacts, onClose, onCreated }: Props) {
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleMember(id: number) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  }

  async function handleCreate() {
    if (!groupName.trim()) return setError("Please enter a group name");
    if (selected.length < 1) return setError("Add at least 1 member");
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/api/groups", {
        name: groupName.trim(),
        memberIds: selected,
      });
      onCreated(data.conversationId, groupName.trim());
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || "Could not create group");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">New Group</h2>
          <button onClick={onClose} className="text-muted hover:text-white text-xl">✕</button>
        </div>

        {/* Group name */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1.5">Group Name</label>
          <input
            autoFocus
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            placeholder="e.g. Friday Night 🎮"
            className="w-full bg-card border border-border text-white placeholder:text-muted px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-cyan/50"
          />
        </div>

        {/* Member selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Add Members
            {selected.length > 0 && (
              <span className="ml-2 text-cyan text-xs">{selected.length} selected</span>
            )}
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {contacts.map(c => (
              <div
                key={c.contact_id}
                onClick={() => toggleMember(c.contact_id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors border ${
                  selected.includes(c.contact_id)
                    ? "bg-cyan/10 border-cyan"
                    : "bg-card border-border hover:border-white/20"
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan to-purple flex items-center justify-center font-bold text-background shrink-0">
                  {c.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted">@{c.username}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selected.includes(c.contact_id)
                    ? "bg-cyan border-cyan text-background"
                    : "border-border"
                }`}>
                  {selected.includes(c.contact_id) && <span className="text-[10px]">✓</span>}
                </div>
              </div>
            ))}
            {contacts.length === 0 && (
              <p className="text-muted text-sm text-center py-4">No contacts to add</p>
            )}
          </div>
        </div>

        {error && (
          <p className="text-danger text-sm bg-danger/10 border border-danger/20 px-3 py-2 rounded-lg mb-3">
            {error}
          </p>
        )}

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-gradient-to-r from-cyan to-purple text-background font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Group"}
        </button>
      </div>
    </div>
  );
}