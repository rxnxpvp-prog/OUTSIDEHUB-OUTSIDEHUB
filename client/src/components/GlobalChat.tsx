import React, { useState, useRef, useEffect } from "react";
import { Send, Trash2, Reply, X, Smile, Hash, Lock, Paperclip, File as FileIcon } from "lucide-react";
import { useChat, type ChatAttachment, type Message } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Avatar from "./Avatar";
import OperatorProfileCard from "./OperatorProfileCard";
import { BadgeDisplay, nameColorFromBadges } from "./BadgeIcon";

function operatorNameColor(_role?: string, badges?: { icon: string; color?: string }[]): string {
  return nameColorFromBadges(badges, "var(--foreground)");
}

const EMOJIS = ["👍", "❤️", "😂", "🔥", "🎉", "✨", "🚀", "💯"];

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  return new Date(date).toLocaleDateString("en-US");
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function attachmentSummary(attachments?: ChatAttachment[]) {
  if (!attachments?.length) return "";
  return attachments.length === 1 ? attachments[0].name : `${attachments.length} files`;
}

function replyPreviewText(message?: Pick<Message, "content" | "attachments">) {
  if (!message) return "Message unavailable";
  return message.content || attachmentSummary(message.attachments) || "Message";
}

function AttachmentView({ attachment }: { attachment: ChatAttachment }) {
  const isImage = attachment.type.startsWith("image/");
  const isAudio = attachment.type.startsWith("audio/");
  const isVideo = attachment.type.startsWith("video/");
  const meta = `${attachment.name} · ${formatBytes(attachment.size)}`;

  if (isImage) {
    return (
      <a href={attachment.url} download={attachment.name} title={meta} style={{ display: "inline-block", marginTop: 6 }}>
        <img src={attachment.url} alt={attachment.name} style={{ maxWidth: 260, maxHeight: 220, borderRadius: 8, border: "1px solid var(--border)", objectFit: "cover", display: "block" }} />
      </a>
    );
  }
  if (isAudio) {
    return (
      <div style={{ marginTop: 6, display: "grid", gap: 4, maxWidth: 320 }}>
        <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{meta}</span>
        <audio controls src={attachment.url} style={{ width: "100%" }} />
      </div>
    );
  }
  if (isVideo) {
    return (
      <div style={{ marginTop: 6, display: "grid", gap: 4, maxWidth: 340 }}>
        <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{meta}</span>
        <video controls src={attachment.url} style={{ width: "100%", maxHeight: 260, borderRadius: 8, border: "1px solid var(--border)" }} />
      </div>
    );
  }
  return (
    <a href={attachment.url} download={attachment.name} style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--accent)", color: "var(--foreground)", fontSize: 12, textDecoration: "none" }}>
      <FileIcon size={14} />
      <span>{attachment.name}</span>
      <span style={{ color: "var(--muted-foreground)" }}>{formatBytes(attachment.size)}</span>
    </a>
  );
}

export default function GlobalChat() {
  const [input, setInput] = useState("");
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [showEmoji, setShowEmoji] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [viewProfile, setViewProfile] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { messages, channels, currentChannel, sendMessage, deleteMessage, addReaction, setCurrentChannel, loading } = useChat();
  const { user } = useAuth();
  const currentChatChannel = channels.find((channel) => channel.name === currentChannel);
  const isChannelLocked = Boolean(currentChatChannel?.locked && user?.role !== "admin");

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || !user || isSending || isChannelLocked) return;
    setIsSending(true);
    try {
      await sendMessage(input.trim(), replyingTo?.id, attachments);
      setInput("");
      setAttachments([]);
      setReplyingTo(null);
    } catch {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    try { await deleteMessage(id); }
    catch { toast.error("Failed to delete"); }
  };

  const handleReact = async (msgId: string, emoji: string) => {
    try { await addReaction(msgId, emoji); setShowEmoji(null); }
    catch { toast.error("Failed to react"); }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const picked = Array.from(files).slice(0, 5 - attachments.length);
    const next: ChatAttachment[] = [];
    for (const file of picked) {
      if (file.size > 8 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 8MB`);
        continue;
      }
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      next.push({ name: file.name, type: file.type || "application/octet-stream", size: file.size, url });
    }
    setAttachments((prev) => [...prev, ...next].slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const iconBtn: React.CSSProperties = {
    padding: 4,
    borderRadius: "var(--radius)",
    color: "var(--muted-foreground)",
    transition: "color 100ms",
  };

  return (
    <div style={{ display: "flex", overflow: "hidden", height: "calc(100vh - 96px)", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--background)" }}>
      <div style={{ width: 148, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)", background: "var(--card)" }}>
        <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "var(--muted-foreground)", textTransform: "uppercase" }}>
            Channels
          </span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
          {channels.map((ch) => {
            const active = currentChannel === ch.name;
            return (
              <button
                key={ch.id}
                onClick={() => setCurrentChannel(ch.name)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "6px 12px",
                  fontSize: 13,
                  textAlign: "left",
                  color: active ? "var(--foreground)" : "var(--muted-foreground)",
                  background: active ? "var(--accent)" : "transparent",
                  borderLeft: active ? "2px solid var(--foreground)" : "2px solid transparent",
                  transition: "color 100ms, background 100ms",
                }}
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.color = "var(--foreground)"; e.currentTarget.style.background = "var(--accent)"; } }}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.background = "transparent"; } }}
              >
                <Hash size={13} style={{ flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ch.name}</span>
                {ch.locked && <Lock size={10} style={{ marginLeft: "auto", opacity: 0.7 }} />}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
          <Hash size={13} style={{ color: "var(--muted-foreground)" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{currentChannel}</span>
          {currentChatChannel?.locked && <Lock size={12} style={{ color: "#eab308" }} />}
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted-foreground)" }}>{messages.length} messages</span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {loading && messages.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <span className="spin" style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid var(--border)", borderTopColor: "var(--foreground)", display: "inline-block" }} />
            </div>
          ) : messages.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No messages yet.</p>
            </div>
          ) : messages.map((msg) => (
            <div key={msg.id} style={{ display: "flex", gap: 9, alignItems: "flex-start" }} className="group">
              <Avatar name={msg.userName} src={msg.userAvatar} size={28} onClick={() => setViewProfile(msg.userId)} style={{ marginTop: 1 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 22, marginBottom: 2 }}>
                  <button
                    onClick={() => setViewProfile(msg.userId)}
                    style={{ display: "inline-flex", alignItems: "center", height: 22, fontSize: 14, fontWeight: 700, color: operatorNameColor(msg.userRole, msg.userBadges), lineHeight: "22px", padding: 0 }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                  >
                    {msg.userName}
                  </button>

                  {msg.userBadges && msg.userBadges.length > 0 && (
                    <div style={{ display: "flex", gap: 4, alignItems: "center", height: 22 }}>
                      {msg.userBadges.map((b: any) => (
                        <div key={b.id} title={b.name} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, lineHeight: 1 }}>
                          <BadgeDisplay badge={b} size={18} />
                        </div>
                      ))}
                    </div>
                  )}

                  <span style={{ display: "inline-flex", alignItems: "center", height: 22, fontSize: 11, color: "var(--muted-foreground)", marginLeft: 2, lineHeight: "22px" }}>{timeAgo(msg.createdAt)}</span>
                  
                  <div style={{ marginLeft: "auto", display: "flex", gap: 2, opacity: 0 }} className="group-hover:opacity-100" onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}>
                    <button onClick={() => setReplyingTo(msg)} style={iconBtn} onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}>
                      <Reply size={13} />
                    </button>
                    <button onClick={() => setShowEmoji(showEmoji === msg.id ? null : msg.id)} style={iconBtn} onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}>
                      <Smile size={13} />
                    </button>
                    {(user?.id === msg.userId || user?.role === "admin") && (
                      <button onClick={() => handleDelete(msg.id)} style={iconBtn} onMouseEnter={(e) => (e.currentTarget.style.color = "var(--destructive)")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {msg.replyTo && (
                  <div style={{ fontSize: 12, paddingLeft: 9, marginBottom: 4, borderLeft: "2px solid var(--border)", color: "var(--muted-foreground)", display: "grid", gap: 2 }}>
                    <span>
                    Replying to <b style={{ color: "var(--foreground)", fontWeight: 600 }}>{msg.replyToMessage?.userName || "a message"}</b>
                    </span>
                    <span style={{ color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 420 }}>
                      {replyPreviewText(msg.replyToMessage)}
                    </span>
                  </div>
                )}

                {msg.content && (
                  <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--foreground)", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>{msg.content}</p>
                )}

                {msg.attachments && msg.attachments.length > 0 && (
                  <div style={{ display: "grid", gap: 6 }}>
                    {msg.attachments.map((attachment) => (
                      <AttachmentView key={attachment.id || attachment.url} attachment={attachment} />
                    ))}
                  </div>
                )}

                {Object.keys(msg.reactions).length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                    {Object.entries(msg.reactions).map(([emoji, count]) => (
                      <button
                        key={emoji}
                        onClick={() => handleReact(msg.id, emoji)}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 7px", background: "var(--accent)", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: 12, transition: "border-color 100ms" }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--foreground)")}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                      >
                        {emoji}
                        <span style={{ color: "var(--muted-foreground)" }}>{count}</span>
                      </button>
                    ))}
                  </div>
                )}

                {showEmoji === msg.id && (
                  <div style={{ display: "flex", gap: 4, marginTop: 6, padding: 8, background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "var(--radius)", width: "fit-content" }}>
                    {EMOJIS.map((emoji) => (
                      <button key={emoji} onClick={() => handleReact(msg.id, emoji)} style={{ fontSize: 15, transition: "transform 100ms" }} onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.25)")} onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {replyingTo && (
          <div style={{ margin: "0 14px 8px", padding: "8px 12px", background: "var(--accent)", border: "1px solid var(--border)", borderRadius: "var(--radius)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground)" }}>Replying to {replyingTo.userName}</p>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>{replyPreviewText(replyingTo)}</p>
            </div>
            <button onClick={() => setReplyingTo(null)} style={iconBtn} onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}>
              <X size={14} />
            </button>
          </div>
        )}

        {attachments.length > 0 && (
          <div style={{ margin: "0 14px 8px", display: "flex", flexWrap: "wrap", gap: 6 }}>
            {attachments.map((attachment, index) => (
              <div key={`${attachment.name}-${index}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--accent)", fontSize: 12, color: "var(--foreground)" }}>
                <Paperclip size={12} />
                <span style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{attachment.name}</span>
                <span style={{ color: "var(--muted-foreground)" }}>{formatBytes(attachment.size)}</span>
                <button onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== index))} type="button" style={{ color: "var(--muted-foreground)" }}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSend} style={{ padding: "0 14px 14px", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {user && <Avatar name={user.name} src={user.avatar} size={30} onClick={() => setViewProfile(user.id)} />}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,audio/*,video/*,.pdf,.zip,.rar,.txt,.csv,.json"
              onChange={(e) => handleFiles(e.target.files)}
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isChannelLocked || attachments.length >= 5}
              className="action action-outline"
              style={{ padding: "7px 9px", flexShrink: 0, opacity: isChannelLocked || attachments.length >= 5 ? 0.5 : 1 }}
              title="Attach file"
            >
              <Paperclip size={14} />
            </button>
            <div style={{ flex: 1, position: "relative" }}>
              <textarea
                value={input}
                onChange={(e) => { if (e.target.value.length <= 2000) setInput(e.target.value); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim()) handleSend(e as any);
                  }
                }}
                placeholder={isChannelLocked ? `#${currentChannel} is locked for sending` : `Message #${currentChannel} (Enter to send, Shift+Enter for new line)`}
                disabled={isChannelLocked}
                className="field"
                rows={1}
                style={{
                  flex: 1,
                  width: "100%",
                  resize: "none",
                  minHeight: 36,
                  maxHeight: 120,
                  overflowY: "auto",
                  lineHeight: "1.5",
                  paddingBottom: input.length > 0 ? 18 : undefined,
                  opacity: isChannelLocked ? 0.55 : 1,
                }}
              />
              {input.length > 1800 && (
                <span style={{
                  position: "absolute",
                  bottom: 4,
                  right: 8,
                  fontSize: 10,
                  color: input.length >= 2000 ? "#ef4444" : "var(--muted-foreground)",
                }}>
                  {input.length}/2000
                </span>
              )}
            </div>
              <button
                type="submit"
                disabled={(!input.trim() && attachments.length === 0) || isSending || isChannelLocked}
              className="action action-solid"
              style={{ padding: "6px 12px", flexShrink: 0, opacity: isSending ? 0.5 : 1 }}
            >
              {isSending ? (
                <span className="spin" style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid currentColor", borderTopColor: "transparent", display: "inline-block" }} />
              ) : (
                <Send size={14} />
              )}
            </button>
          </div>
        </form>
      </div>
      <OperatorProfileCard userId={viewProfile} onClose={() => setViewProfile(null)} />
    </div>
  );
}
