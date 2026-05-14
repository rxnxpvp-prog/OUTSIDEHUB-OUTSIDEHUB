import React, { useState, useRef, useEffect } from "react";
import { Send, Trash2, Reply, X, Smile, Hash } from "lucide-react";
import { useChat, CHANNELS } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Avatar from "./Avatar";

const EMOJIS = ["👍", "❤️", "😂", "🔥", "🎉", "✨", "🚀", "💯"];

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  return new Date(date).toLocaleDateString("pt-BR");
}

export default function GlobalChat() {
  const [input, setInput] = useState("");
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [showEmoji, setShowEmoji] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const submittingRef = useRef(false); // ← prevents double-send
  const { messages, currentChannel, sendMessage, deleteMessage, addReaction, setCurrentChannel, loading } = useChat();
  const { user } = useAuth();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (submittingRef.current) return; // guard against double-fire
    if (!input.trim() || !user) return;
    submittingRef.current = true;
    const text = input.trim();
    const replyId = replyingTo?.id;
    setInput("");
    setReplyingTo(null);
    try {
      await sendMessage(text, replyId);
    } catch {
      toast.error("Erro ao enviar mensagem");
    } finally {
      submittingRef.current = false;
    }
  };

  const handleDelete = async (id: string) => {
    try { await deleteMessage(id); }
    catch { toast.error("Erro ao deletar"); }
  };

  const handleReact = async (msgId: string, emoji: string) => {
    try { await addReaction(msgId, emoji); setShowEmoji(null); }
    catch { toast.error("Erro ao reagir"); }
  };

  const iconBtn: React.CSSProperties = {
    padding: 4,
    borderRadius: "var(--radius)",
    color: "var(--muted-foreground)",
    transition: "color 100ms",
  };

  return (
    <div style={{ display: "flex", overflow: "hidden", height: "calc(100vh - 84px)", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--background)" }}>
      <div style={{ width: 148, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)", background: "var(--card)" }}>
        <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "var(--muted-foreground)", textTransform: "uppercase" }}>
            Canais
          </span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
          {CHANNELS.map((ch) => {
            const active = currentChannel === ch;
            return (
              <button
                key={ch}
                onClick={() => setCurrentChannel(ch)}
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
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ch}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
          <Hash size={13} style={{ color: "var(--muted-foreground)" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{currentChannel}</span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted-foreground)" }}>{messages.length} mensagens</span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {loading && messages.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <span className="spin" style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid var(--border)", borderTopColor: "var(--foreground)", display: "inline-block" }} />
            </div>
          ) : messages.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Nenhuma mensagem ainda.</p>
            </div>
          ) : messages.map((msg) => (
            <div key={msg.id} style={{ display: "flex", gap: 9 }} className="group">
              <Avatar name={msg.userName} src={msg.userAvatar} size={28} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{msg.userName}</span>
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{timeAgo(msg.createdAt)}</span>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 2, opacity: 0 }} className="group-hover:opacity-100" onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}>
                    <button onClick={() => setReplyingTo(msg)} style={iconBtn} onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}>
                      <Reply size={12} />
                    </button>
                    <button onClick={() => setShowEmoji(showEmoji === msg.id ? null : msg.id)} style={iconBtn} onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}>
                      <Smile size={12} />
                    </button>
                    {(user?.id === msg.userId || user?.role === "admin") && (
                      <button onClick={() => handleDelete(msg.id)} style={iconBtn} onMouseEnter={(e) => (e.currentTarget.style.color = "var(--destructive)")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {msg.replyTo && (
                  <div style={{ fontSize: 12, paddingLeft: 8, marginBottom: 4, borderLeft: "2px solid var(--border)", color: "var(--muted-foreground)" }}>
                    Respondendo a uma mensagem
                  </div>
                )}

                <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--foreground)", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>{msg.content}</p>

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
              <p style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground)" }}>Respondendo {replyingTo.userName}</p>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>{replyingTo.content}</p>
            </div>
            <button onClick={() => setReplyingTo(null)} style={iconBtn} onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}>
              <X size={14} />
            </button>
          </div>
        )}

        <form onSubmit={handleSend} style={{ padding: "0 14px 14px", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <textarea
                value={input}
                onChange={(e) => { if (e.target.value.length <= 2000) setInput(e.target.value); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={`Mensagem em #${currentChannel} (Enter para enviar, Shift+Enter para nova linha)`}
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
              disabled={!input.trim()}
              className="action action-solid"
              style={{ padding: "6px 12px", flexShrink: 0 }}
            >
              <Send size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
