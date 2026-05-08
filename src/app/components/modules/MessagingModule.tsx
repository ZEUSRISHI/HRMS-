// src/app/components/modules/MessagingModule.tsx
import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Label } from "../ui/label";
import {
  MessageSquare,
  Send,
  Plus,
  Users,
  Trash2,
  Search,
  ChevronLeft,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";
import { messageApi } from "@/services/api";

/* ─── Types ─────────────────────────────── */
interface Participant {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface Message {
  _id: string;
  senderId: Participant;
  content: string;
  type: string;
  createdAt: string;
  isDeleted: boolean;
}

interface Conversation {
  _id: string;
  type: "direct" | "group";
  name?: string;
  participants: Participant[];
  lastMessage?: {
    senderId: { name: string };
    content: string;
  };
  lastMessageAt: string;
}

/* ─── Helpers ────────────────────────────── */
const formatMessageTime = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isToday(d))     return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
};

const getConversationName = (conv: Conversation, currentUserId: string) => {
  if (conv.type === "group") return conv.name || "Group";
  const other = conv.participants.find((p) => p._id !== currentUserId);
  return other?.name || "Unknown";
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const roleColors: Record<string, string> = {
  admin:    "bg-red-100 text-red-700",
  manager:  "bg-blue-100 text-blue-700",
  hr:       "bg-purple-100 text-purple-700",
  employee: "bg-green-100 text-green-700",
};

/* ─── Avatar ─────────────────────────────── */
const Avatar = ({ name, size = "md" }: { name: string; size?: "sm" | "md" }) => {
  const colors = [
    "bg-orange-400", "bg-blue-400", "bg-green-400",
    "bg-purple-400", "bg-pink-400", "bg-teal-400",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sz = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";

  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}>
      {getInitials(name)}
    </div>
  );
};

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export function MessagingModule() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  const isAdminOrManager =
    currentUser.role === "admin" || currentUser.role === "manager";

  /* ─── State ───────────────────────────── */
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv]       = useState<Conversation | null>(null);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [allUsers, setAllUsers]           = useState<Participant[]>([]);
  const [searchUsers, setSearchUsers]     = useState("");
  const [msgInput, setMsgInput]           = useState("");
  const [loadingConvs, setLoadingConvs]   = useState(true);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [sending, setSending]             = useState(false);
  const [toast, setToast]                 = useState("");

  // Group creation state
  const [groupName, setGroupName]             = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);
  const [userSearch, setUserSearch]           = useState("");

  // Mobile: show conversation list or chat pane
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef        = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ─── Utils ───────────────────────────── */
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  /* ─── Load conversations ──────────────── */
  const loadConversations = useCallback(async () => {
    try {
      const data = await messageApi.getConversations();
      setConversations(data.conversations || []);
    } catch (err: any) {
      console.error("Load conversations:", err.message);
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  /* ─── Load messages ───────────────────── */
  const loadMessages = useCallback(async (convId: string) => {
    try {
      setLoadingMsgs(true);
      const data = await messageApi.getMessages(convId);
      setMessages(data.messages || []);
      setTimeout(scrollToBottom, 100);
    } catch (err: any) {
      console.error("Load messages:", err.message);
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  /* ─── Load users for new chat ─────────── */
  const loadUsers = async () => {
    try {
      const data = await messageApi.getUsers();
      setAllUsers(data.users || []);
    } catch (err: any) {
      console.error("Load users:", err.message);
    }
  };

  /* ─── Polling for new messages ────────── */
  useEffect(() => {
    loadConversations();
    loadUsers();
  }, []);

  useEffect(() => {
    if (!activeConv) return;

    loadMessages(activeConv._id);

    // Poll every 4s for new messages
    pollRef.current = setInterval(() => {
      loadMessages(activeConv._id);
      loadConversations();
    }, 4000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeConv?._id]);

  /* ─── Select a conversation ───────────── */
  const selectConversation = (conv: Conversation) => {
    setActiveConv(conv);
    setMobileView("chat");
  };

  /* ─── Send message ────────────────────── */
  const handleSend = async () => {
    if (!msgInput.trim() || !activeConv || sending) return;

    const content = msgInput.trim();
    setMsgInput("");
    setSending(true);

    try {
      const data = await messageApi.sendMessage(activeConv._id, content);

      setMessages((prev) => [...prev, data.message]);
      setTimeout(scrollToBottom, 50);
      await loadConversations();
    } catch (err: any) {
      showToast("❌ Failed to send message");
      setMsgInput(content); // restore on failure
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ─── Delete message ──────────────────── */
  const handleDeleteMessage = async (messageId: string) => {
    try {
      await messageApi.deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    } catch (err: any) {
      showToast("❌ Could not delete message");
    }
  };

  /* ─── Start direct chat ───────────────── */
  const startDirectChat = async (userId: string) => {
    try {
      const data = await messageApi.startDirect(userId);
      setNewChatDialogOpen(false);
      setUserSearch("");
      await loadConversations();
      selectConversation(data.conversation);
    } catch (err: any) {
      showToast("❌ " + err.message);
    }
  };

  /* ─── Create group ────────────────────── */
  const handleCreateGroup = async () => {
    if (!groupName.trim()) return showToast("Group name is required");
    if (selectedMembers.length < 2) return showToast("Select at least 2 members");

    try {
      const data = await messageApi.createGroup(groupName.trim(), selectedMembers);
      setGroupDialogOpen(false);
      setGroupName("");
      setSelectedMembers([]);
      await loadConversations();
      selectConversation(data.conversation);
      showToast("✅ Group created");
    } catch (err: any) {
      showToast("❌ " + err.message);
    }
  };

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  /* ─── Filtered users for search ───────── */
  const filteredUsers = allUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredConvs = conversations.filter((c) =>
    getConversationName(c, currentUser.id)
      .toLowerCase()
      .includes(searchUsers.toLowerCase())
  );

  /* ═══════════════════════════════════════
     RENDER
  ═══════════════════════════════════════ */
  return (
    <div className="h-[calc(100vh-80px)] flex flex-col max-w-6xl mx-auto px-2 sm:px-4 py-2">

      {/* TOAST */}
      {toast && (
        <div className="fixed top-5 right-5 bg-black text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm">
          {toast}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

        {/* ══════════════════════════════
            LEFT PANEL — CONVERSATION LIST
        ══════════════════════════════ */}
        <div
          className={`
            ${mobileView === "chat" ? "hidden" : "flex"} 
            md:flex flex-col
            w-full md:w-72 lg:w-80 border-r border-gray-100 flex-shrink-0
          `}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-orange-500" />
              <h2 className="font-semibold text-sm">Messages</h2>
            </div>

            <div className="flex gap-1">
              {/* New Direct Chat */}
              <Dialog open={newChatDialogOpen} onOpenChange={setNewChatDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7" title="New message">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[92%] max-w-sm rounded-xl">
                  <DialogHeader>
                    <DialogTitle>New Message</DialogTitle>
                  </DialogHeader>
                  <Input
                    placeholder="Search people..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="mt-1"
                  />
                  <div className="max-h-64 overflow-y-auto space-y-1 mt-2">
                    {filteredUsers.length === 0 && (
                      <p className="text-center text-sm text-gray-400 py-6">No users found</p>
                    )}
                    {filteredUsers.map((u) => (
                      <button
                        key={u._id}
                        onClick={() => startDirectChat(u._id)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 text-left transition-colors"
                      >
                        <Avatar name={u.name} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{u.name}</p>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1 py-0 ${roleColors[u.role] || ""}`}
                          >
                            {u.role}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>

              {/* New Group — admin/manager only */}
              {isAdminOrManager && (
                <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="New group">
                      <Users className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[92%] max-w-sm rounded-xl">
                    <DialogHeader>
                      <DialogTitle>Create Group</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <Label>Group Name</Label>
                        <Input
                          placeholder="e.g. Design Team"
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>
                          Add Members{" "}
                          <span className="text-gray-400 text-xs">
                            ({selectedMembers.length} selected)
                          </span>
                        </Label>
                        <Input
                          placeholder="Search..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          className="mt-1 mb-2"
                        />
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {allUsers
                            .filter((u) =>
                              u.name.toLowerCase().includes(userSearch.toLowerCase())
                            )
                            .map((u) => (
                              <label
                                key={u._id}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedMembers.includes(u._id)}
                                  onChange={() => toggleMember(u._id)}
                                  className="accent-orange-500"
                                />
                                <Avatar name={u.name} size="sm" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{u.name}</p>
                                  <p className="text-xs text-gray-400">{u.role}</p>
                                </div>
                              </label>
                            ))}
                        </div>
                      </div>
                      <Button className="w-full" onClick={handleCreateGroup}>
                        Create Group
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Search chats..."
                className="pl-8 h-8 text-sm"
                value={searchUsers}
                onChange={(e) => setSearchUsers(e.target.value)}
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="text-center py-16 px-4">
                <MessageSquare className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No conversations yet</p>
                <p className="text-xs text-gray-300 mt-1">
                  Click + to start messaging
                </p>
              </div>
            ) : (
              filteredConvs.map((conv) => {
                const name    = getConversationName(conv, currentUser.id);
                const isActive = activeConv?._id === conv._id;
                const lastMsg  = conv.lastMessage;

                return (
                  <button
                    key={conv._id}
                    onClick={() => selectConversation(conv)}
                    className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 text-left ${
                      isActive ? "bg-orange-50 border-l-2 border-l-orange-500" : ""
                    }`}
                  >
                    <div className="relative">
                      <Avatar name={name} />
                      {conv.type === "group" && (
                        <div className="absolute -bottom-0.5 -right-0.5 bg-blue-500 rounded-full p-0.5">
                          <Users className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium truncate">{name}</p>
                        <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1">
                          {formatMessageTime(conv.lastMessageAt)}
                        </span>
                      </div>
                      {lastMsg && (
                        <p className="text-xs text-gray-400 truncate">
                          {lastMsg.senderId?.name}: {lastMsg.content}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ══════════════════════════════
            RIGHT PANEL — CHAT
        ══════════════════════════════ */}
        <div
          className={`
            ${mobileView === "list" ? "hidden" : "flex"}
            md:flex flex-col flex-1 min-w-0
          `}
        >
          {!activeConv ? (
            // Empty state
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessageSquare className="h-14 w-14 text-gray-200 mb-4" />
              <h3 className="font-medium text-gray-500">Select a conversation</h3>
              <p className="text-sm text-gray-400 mt-1">
                Or click <strong>+</strong> to start a new one
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
                {/* Back on mobile */}
                <button
                  className="md:hidden mr-1 text-gray-500"
                  onClick={() => setMobileView("list")}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <Avatar name={getConversationName(activeConv, currentUser.id)} />

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {getConversationName(activeConv, currentUser.id)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {activeConv.type === "group"
                      ? `${activeConv.participants.length} members`
                      : (() => {
                          const other = activeConv.participants.find(
                            (p) => p._id !== currentUser.id
                          );
                          return other?.role
                            ? other.role.charAt(0).toUpperCase() + other.role.slice(1)
                            : "";
                        })()}
                  </p>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
                {loadingMsgs ? (
                  <div className="flex justify-center py-12">
                    <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-gray-400">
                      No messages yet. Say hello! 👋
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.senderId?._id === currentUser.id;

                    return (
                      <div
                        key={msg._id}
                        className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
                      >
                        {!isOwn && (
                          <Avatar name={msg.senderId?.name || "?"} size="sm" />
                        )}

                        <div className={`max-w-[70%] group relative ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
                          {!isOwn && activeConv.type === "group" && (
                            <p className="text-[10px] text-gray-400 ml-1 mb-0.5">
                              {msg.senderId?.name}
                            </p>
                          )}

                          <div
                            className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                              isOwn
                                ? "bg-orange-500 text-white rounded-br-sm"
                                : "bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100"
                            }`}
                          >
                            {msg.content}
                          </div>

                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={`text-[10px] text-gray-400 ${isOwn ? "mr-1" : "ml-1"}`}
                            >
                              {format(new Date(msg.createdAt), "h:mm a")}
                            </span>

                            {/* Delete — own messages only */}
                            {isOwn && (
                              <button
                                onClick={() => handleDeleteMessage(msg._id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="px-4 py-3 border-t border-gray-100 bg-white">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={msgInput}
                    onChange={(e) => setMsgInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 rounded-full border-gray-200 focus:border-orange-400"
                    disabled={sending}
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!msgInput.trim() || sending}
                    className="rounded-full bg-orange-500 hover:bg-orange-600 flex-shrink-0"
                  >
                    {sending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-gray-300 text-center mt-1">
                  Press Enter to send
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
