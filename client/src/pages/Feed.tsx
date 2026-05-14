import React, { useState, useEffect } from "react";
import { Heart, MessageCircle, Trash2, ImagePlus, Send, X, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import Avatar from "@/components/Avatar";

interface Comment { id: string; userId: string; userName: string; userAvatar?: string; content: string; createdAt: string; }
interface Post { id: string; userId: string; userName: string; userAvatar?: string; content: string; image?: string; likes: string[]; comments: Comment[]; createdAt: string; }
interface PublicUser { id: string; name: string; username: string; role: "admin" | "user"; avatar?: string; bio?: string; badges: { id: string; name: string; icon: string; image?: string }[]; createdAt: string; }

function ago(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  return new Date(d).toLocaleDateString("pt-BR");
}

function ProfileModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [p, setP] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/users/${userId}/public`)
      .then((r) => setP(r.data))
      .catch(() => toast.error("Erro ao carregar perfil"))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: 16
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="drop-in"
        style={{
          width: "100%",
          maxWidth: 360,
          background: "rgba(10, 10, 15, 0.8)",
          backdropFilter: "blur(40px) saturate(2.0)",
          WebkitBackdropFilter: "blur(40px) saturate(2.0)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 28,
          boxShadow: "inset 0 1px 1px rgba(255,255,255,0.05), 0 40px 100px rgba(0,0,0,0.6)",
          overflow: "hidden",
          position: "relative"
        }}
      >
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.02)"
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--foreground)" }}>Perfil</span>
          <button onClick={onClose} className="hdr-btn" style={{ width: 28, height: 28 }}>
            <X size={14} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 60, display: "flex", justifyContent: "center" }}>
            <span className="spin" style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "var(--foreground)", display: "inline-block" }} />
          </div>
        ) : p ? (
          <div style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <div style={{ position: "relative" }}>
                <div style={{
                  position: "absolute",
                  inset: -3,
                  borderRadius: "50%",
                  background: "linear-gradient(45deg, rgba(255,255,255,0.15), transparent)",
                  zIndex: 0
                }} />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <Avatar name={p.name} src={p.avatar} size={64} />
                </div>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.02em" }}>{p.name}</span>
                  {p.role === "admin" && (
                    <div title="Administrador" style={{ color: "var(--glass-shine)", display: "flex" }}>
                      <Shield size={14} fill="currentColor" fillOpacity={0.1} />
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>@{p.username}</span>
              </div>
            </div>

            {p.bio && (
              <p style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.85)",
                lineHeight: 1.6,
                marginBottom: 20,
                background: "rgba(255,255,255,0.03)",
                padding: "12px 16px",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.04)"
              }}>
                {p.bio}
              </p>
            )}

            {p.badges.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {p.badges.map((b) => (
                  <span key={b.id} title={b.name} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 10,
                    fontSize: 12,
                    color: "var(--foreground)",
                    fontWeight: 500
                  }}>
                    {b.image ? <img src={b.image} alt={b.name} style={{ width: 14, height: 14, borderRadius: "50%" }} /> : b.icon}
                    {b.name}
                  </span>
                ))}
              </div>
            )}

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              paddingTop: 16,
              borderTop: "1px solid rgba(255,255,255,0.06)",
              opacity: 0.6
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.02em", color: "var(--muted-foreground)" }}>
                MEMBRO DESDE {new Date(p.createdAt).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).toUpperCase()}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ padding: 60, textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "var(--muted-foreground)", fontWeight: 500 }}>Perfil não encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [commenting, setCommenting] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [viewProfile, setViewProfile] = useState<string | null>(null);

  useEffect(() => {
    api.get("/posts").then((r) => setPosts(r.data)).catch(() => toast.error("Erro ao carregar")).finally(() => setLoading(false));
  }, []);

  const uploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5_000_000) { toast.error("Máximo 5MB"); return; }
    const r = new FileReader();
    r.onload = (ev) => setImage(ev.target?.result as string);
    r.readAsDataURL(f);
  };

  const post = async () => {
    if (!content.trim()) return;
    setPosting(true);
    try {
      const r = await api.post("/posts", { content, image });
      setPosts((p) => [r.data, ...p]);
      setContent(""); setImage(null);
    } catch { toast.error("Erro ao postar"); }
    finally { setPosting(false); }
  };

  const like = async (id: string) => {
    try {
      const r = await api.post(`/posts/${id}/like`);
      setPosts((p) => p.map((x) => x.id === id ? r.data : x));
    } catch { toast.error("Erro"); }
  };

  const del = async (id: string) => {
    try {
      await api.delete(`/posts/${id}`);
      setPosts((p) => p.filter((x) => x.id !== id));
    } catch { toast.error("Erro"); }
  };

  const comment = async (postId: string) => {
    if (!commentText.trim()) return;
    try {
      const r = await api.post(`/posts/${postId}/comments`, { content: commentText });
      setPosts((p) => p.map((x) => x.id === postId ? { ...x, comments: [...x.comments, r.data] } : x));
      setCommentText(""); setCommenting(null);
    } catch { toast.error("Erro"); }
  };

  const s: React.CSSProperties = { padding: 16, marginBottom: 10 };

  if (loading) {
    return (
      <div style={{ maxWidth: 540, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {[1, 2, 3].map((i) => <div key={i} style={{ ...s, height: 90 }} className="surface pulse" />)}
      </div>
    );
  }

  return (
    <>
      <div style={{ maxWidth: 540, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {user && (
          <div className="surface" style={s}>
            <div style={{ display: "flex", gap: 10 }}>
              <Avatar name={user.name} src={user.avatar} size={30} />
              <div style={{ flex: 1 }}>
                <div style={{ position: "relative" }}>
                  <textarea
                    value={content}
                    onChange={(e) => { if (e.target.value.length <= 2000) setContent(e.target.value); }}
                    onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) post(); }}
                    placeholder="O que você está pensando? (Cmd+Enter para postar)"
                    rows={2}
                    style={{ width: "100%", background: "transparent", border: "none", outline: "none", resize: "none", fontSize: 13, color: "var(--foreground)", fontFamily: "inherit", lineHeight: 1.5, whiteSpace: "pre-wrap" }}
                  />
                  {content.length > 1800 && (
                    <span style={{ fontSize: 10, color: content.length >= 2000 ? "#ef4444" : "var(--muted-foreground)" }}>
                      {content.length}/2000
                    </span>
                  )}
                </div>
                {image && (
                  <div style={{ position: "relative", marginTop: 8, borderRadius: "var(--radius)", overflow: "hidden" }}>
                    <img src={image} alt="" style={{ width: "100%", maxHeight: 180, objectFit: "cover" }} />
                    <button onClick={() => setImage(null)} style={{ position: "absolute", top: 6, right: 6, background: "var(--background)", color: "var(--foreground)", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                  <label className="action action-ghost" style={{ padding: 5, cursor: "pointer" }}>
                    <ImagePlus size={14} />
                    <input type="file" accept="image/*" onChange={uploadImage} style={{ display: "none" }} />
                  </label>
                  <button onClick={post} disabled={!content.trim() || posting} className="action action-solid" style={{ gap: 5 }}>
                    <Send size={12} />
                    {posting ? "Postando…" : "Postar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {posts.length === 0 ? (
          <div style={{ ...s, padding: "40px 14px", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Nenhum post ainda.</p>
          </div>
        ) : posts.map((post) => {
          const liked = user ? post.likes.includes(user.id) : false;
          return (
            <div key={post.id} className="surface" style={{ ...s, position: "relative" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <Avatar name={post.userName} src={post.userAvatar} size={38} onClick={() => setViewProfile(post.userId)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <button
                      onClick={() => setViewProfile(post.userId)}
                      style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", padding: 0, lineHeight: 1 }}
                      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                    >
                      {post.userName}
                    </button>
                    <span style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1 }}>{ago(post.createdAt)}</span>
                  </div>
                  
                  <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--foreground)", marginBottom: post.image ? 10 : 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {post.content}
                  </p>
                  
                  {post.image && (
                    <img src={post.image} alt="" style={{ width: "100%", borderRadius: "var(--radius)", maxHeight: 280, objectFit: "cover", marginTop: 8 }} />
                  )}
                </div>
              </div>

              {user?.id === post.userId && (
                <button
                  onClick={() => del(post.id)}
                  className="action action-ghost"
                  style={{ position: "absolute", top: 12, right: 12, padding: 6 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--destructive)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
                >
                  <Trash2 size={14} />
                </button>
              )}



              <div style={{ display: "flex", alignItems: "center", gap: 14, paddingTop: 10, marginTop: 10, borderTop: "1px solid var(--border)" }}>
                <button
                  onClick={() => like(post.id)}
                  style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: liked ? "#e5484d" : "var(--muted-foreground)", transition: "color 100ms" }}
                  onMouseEnter={(e) => { if (!liked) e.currentTarget.style.color = "var(--foreground)"; }}
                  onMouseLeave={(e) => { if (!liked) e.currentTarget.style.color = "var(--muted-foreground)"; }}
                >
                  <Heart size={14} fill={liked ? "currentColor" : "none"} />
                  {post.likes.length}
                </button>
                <button
                  onClick={() => setCommenting(commenting === post.id ? null : post.id)}
                  style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--muted-foreground)", transition: "color 100ms" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
                >
                  <MessageCircle size={14} />
                  {post.comments.length}
                </button>
              </div>

              {post.comments.length > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 7 }}>
                  {post.comments.map((c) => (
                    <div key={c.id} style={{ display: "flex", gap: 7 }}>
                      <Avatar name={c.userName} src={c.userAvatar} size={24} onClick={() => setViewProfile(c.userId)} />
                      <div style={{ flex: 1, background: "var(--accent)", borderRadius: "var(--radius)", padding: "5px 9px" }}>
                        <button
                          onClick={() => setViewProfile(c.userId)}
                          style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", padding: 0 }}
                          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                        >
                          {c.userName}
                        </button>
                        <p style={{ fontSize: 12, color: "var(--foreground)", marginTop: 2 }}>{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {commenting === post.id && user && (
                <div style={{ display: "flex", gap: 7, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                  <Avatar name={user.name} src={user.avatar} size={24} />
                  <div style={{ flex: 1, display: "flex", gap: 7 }}>
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && comment(post.id)}
                      placeholder="Comentar…"
                      className="field"
                      style={{ flex: 1 }}
                    />
                    <button onClick={() => comment(post.id)} disabled={!commentText.trim()} className="action action-solid">
                      Enviar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {viewProfile && <ProfileModal userId={viewProfile} onClose={() => setViewProfile(null)} />}
    </>
  );
}
