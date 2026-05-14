import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Trash2, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  image?: string;
  likes: Set<string>;
  comments: Comment[];
  createdAt: string;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
}

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>(() => {
    const stored = localStorage.getItem('outsidehub_posts');
    return stored ? JSON.parse(stored).map((p: any) => ({ ...p, likes: new Set(p.likes) })) : [];
  });

  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState('');

  // Persist posts
  useEffect(() => {
    localStorage.setItem('outsidehub_posts', JSON.stringify(posts.map(p => ({ ...p, likes: Array.from(p.likes) }))));
  }, [posts]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5000000) {
        alert('Arquivo muito grande. Máximo 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setNewPostImage(result); // Permitir imagem completa
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = () => {
    if (!user || !newPostContent.trim()) return;

    const newPost: Post = {
      id: Date.now().toString(),
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      content: newPostContent,
      image: newPostImage || undefined,
      likes: new Set(),
      comments: [],
      createdAt: new Date().toISOString(),
    };

    setPosts([newPost, ...posts]);
    setNewPostContent('');
    setNewPostImage(null);
  };

  const handleLike = (postId: string) => {
    if (!user) return;
    setPosts(posts.map(p => {
      if (p.id === postId) {
        const likes = new Set(p.likes);
        if (likes.has(user.id)) {
          likes.delete(user.id);
        } else {
          likes.add(user.id);
        }
        return { ...p, likes };
      }
      return p;
    }));
  };

  const handleAddComment = (postId: string) => {
    if (!user || !commentContent.trim()) return;

    setPosts(posts.map(p => {
      if (p.id === postId) {
        const newComment: Comment = {
          id: Date.now().toString(),
          userId: user.id,
          userName: user.name,
          userAvatar: user.avatar,
          content: commentContent,
          createdAt: new Date().toISOString(),
        };
        return { ...p, comments: [...p.comments, newComment] };
      }
      return p;
    }));

    setCommentContent('');
    setCommentingOn(null);
  };

  const handleDeletePost = (postId: string) => {
    setPosts(posts.filter(p => p.id !== postId));
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Create Post */}
      {user && (
        <div className="glass-dark p-6 rounded-xl">
          <div className="flex gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
              {user.avatar ? (
                typeof user.avatar === 'string' && user.avatar.startsWith('data:') ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0)
                )
              ) : (
                user.name.charAt(0)
              )}
            </div>
            <div className="flex-1">
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="O que você está pensando?"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                rows={3}
              />
            </div>
          </div>

          {newPostImage && (
            <div className="relative mb-4 rounded-lg overflow-hidden">
              <img src={newPostImage} alt="Preview" className="w-full h-64 object-cover" />
              <button
                onClick={() => setNewPostImage(null)}
                className="absolute top-2 right-2 p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400"
              >
                <Trash2 size={18} />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <label className="cursor-pointer p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white">
              <Upload size={20} />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            <button
              onClick={handleCreatePost}
              disabled={!newPostContent.trim()}
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Postar
            </button>
          </div>
        </div>
      )}

      {/* Posts */}
      <div className="space-y-6">
        {posts.length === 0 ? (
          <div className="glass-dark p-12 rounded-xl text-center">
            <p className="text-white/60">Nenhum post ainda. Seja o primeiro a postar!</p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="glass-dark p-6 rounded-xl">
              {/* Post Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                    {post.userAvatar ? (
                      typeof post.userAvatar === 'string' && post.userAvatar.startsWith('data:') ? (
                        <img src={post.userAvatar} alt={post.userName} className="w-full h-full object-cover" />
                      ) : (
                        post.userName.charAt(0)
                      )
                    ) : (
                      post.userName.charAt(0)
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-white flex items-center gap-2">
                      {post.userName}
                      {(post as any).userBadges && (post as any).userBadges.length > 0 && (
                        <div className="flex gap-1">
                          {(post as any).userBadges.slice(0, 2).map((badge: any) => (
                            <span key={badge.id} title={badge.name} className="text-sm">
                              {badge.icon}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-white/50">{formatTime(post.createdAt)}</div>
                  </div>
                </div>
                {user?.id === post.userId && (
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              {/* Post Content */}
              <p className="text-white/90 mb-4">{post.content}</p>

              {/* Post Image */}
              {post.image && (
                <img src={post.image} alt="Post" className="w-full rounded-lg mb-4 max-h-96 object-cover" />
              )}

              {/* Post Actions */}
              <div className="flex items-center gap-4 mb-4 pt-4 border-t border-white/10">
                <button
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-all ${
                    user && post.likes.has(user.id)
                      ? 'text-red-400 bg-red-500/20'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Heart size={18} fill={user && post.likes.has(user.id) ? 'currentColor' : 'none'} />
                  <span className="text-sm">{post.likes.size}</span>
                </button>
                <button
                  onClick={() => setCommentingOn(commentingOn === post.id ? null : post.id)}
                  className="flex items-center gap-2 px-3 py-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
                >
                  <MessageCircle size={18} />
                  <span className="text-sm">{post.comments.length}</span>
                </button>

              </div>

              {/* Comments */}
              {post.comments.length > 0 && (
                <div className="space-y-3 mb-4 pt-4 border-t border-white/10">
                  {post.comments.map(comment => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 overflow-hidden">
                        {comment.userAvatar ? (
                          typeof comment.userAvatar === 'string' && comment.userAvatar.startsWith('data:') ? (
                            <img src={comment.userAvatar} alt={comment.userName} className="w-full h-full object-cover" />
                          ) : (
                            comment.userName.charAt(0)
                          )
                        ) : (
                          comment.userName.charAt(0)
                        )}
                      </div>
                      <div className="flex-1 bg-white/5 rounded-lg p-3">
                        <div className="font-semibold text-white text-sm">{comment.userName}</div>
                        <p className="text-white/80 text-sm">{comment.content}</p>
                        <div className="text-xs text-white/50 mt-1">{formatTime(comment.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Comment Input */}
              {commentingOn === post.id && user && (
                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 overflow-hidden">
                    {user.avatar ? (
                      typeof user.avatar === 'string' && user.avatar.startsWith('data:') ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        user.name.charAt(0)
                      )
                    ) : (
                      user.name.charAt(0)
                    )}
                  </div>
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                      placeholder="Escrever um comentário..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                    />
                    <button
                      onClick={() => handleAddComment(post.id)}
                      disabled={!commentContent.trim()}
                      className="px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-purple-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Enviar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
