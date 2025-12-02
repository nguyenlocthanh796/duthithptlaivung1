import React, { useEffect, useMemo, useState, ChangeEvent, FormEvent } from 'react';
import { Home, MessageCircle, Filter as FilterIcon, Image as ImageIcon, Send, Trash2, MoreHorizontal } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { Post, PostCreate, postsAPI, Comment, commentsAPI } from '../services/api';

interface StudentFeedProps {
  showToast: (msg: string, type: 'success' | 'error') => void;
  onAskWithContext?: (context: string) => void;
}

const StudentFeed: React.FC<StudentFeedProps> = ({ showToast, onAskWithContext }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState<number>(5);

  // Composer state
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState('toan');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [imageInfo, setImageInfo] = useState<string | null>(null);

  // Comment state
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [loadingCommentsFor, setLoadingCommentsFor] = useState<string | null>(null);

  // Post edit state (đơn giản: cho phép sửa nội dung text + subject)
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [editingSubject, setEditingSubject] = useState<string>('toan');

  useEffect(() => {
    void loadPosts();
  }, []);

  const PREFETCH_LIMIT = 20;
  const PAGE_SIZE = 5;

  const loadPosts = async () => {
    try {
      if (!posts.length) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      const data = await postsAPI.getAll({ limit: PREFETCH_LIMIT });
      setPosts(data);
    } catch (error: any) {
      showToast('Không thể tải bảng tin: ' + error.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (subjectFilter !== 'all' && post.subject !== subjectFilter) return false;
      if (
        gradeFilter !== 'all' &&
        post.grade !== null &&
        post.grade !== undefined &&
        String(post.grade) !== gradeFilter
      ) {
        return false;
      }
      if (tagFilter.trim()) {
        const tag = tagFilter.trim().toLowerCase();
        const haystack = (post.aiTags || []).join(' ').toLowerCase();
        if (!haystack.includes(tag)) return false;
      }
      return true;
    });
  }, [posts, subjectFilter, gradeFilter, tagFilter]);

  const visiblePosts = useMemo(
    () => filteredPosts.slice(0, visibleCount),
    [filteredPosts, visibleCount]
  );

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  const loadComments = async (postId: string) => {
    try {
      setLoadingCommentsFor(postId);
      const data = await commentsAPI.getForPost(postId, 50);
      setCommentsByPost((prev) => ({ ...prev, [postId]: data }));
    } catch (error: any) {
      console.error('Error loading comments:', error);
      showToast('Không thể tải bình luận: ' + (error.message || 'Lỗi không xác định'), 'error');
    } finally {
      setLoadingCommentsFor((prev) => (prev === postId ? null : prev));
    }
  };

  const handleCreateComment = async (postId: string) => {
    const text = (commentInput[postId] || '').trim();
    if (!text) return;
    try {
      const created = await commentsAPI.create(postId, { content: text });
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: [created, ...(prev[postId] || [])],
      }));
      setCommentInput((prev) => ({ ...prev, [postId]: '' }));
      // tăng đếm comment ở post tương ứng
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments: (p.comments || 0) + 1 } : p))
      );
    } catch (error: any) {
      console.error('Error creating comment:', error);
      showToast('Không thể gửi bình luận: ' + (error.message || 'Lỗi không xác định'), 'error');
    }
  };

  const handleDeleteComment = async (postId: string, comment: Comment) => {
    if (!window.confirm('Xoá bình luận này?')) return;
    try {
      await commentsAPI.delete(postId, comment.id);
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).filter((c) => c.id !== comment.id),
      }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments: Math.max(0, (p.comments || 0) - 1) } : p
        )
      );
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      showToast('Không thể xoá bình luận: ' + (error.message || 'Lỗi không xác định'), 'error');
    }
  };

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImageInfo('Đang nén ảnh...');
      const options = {
        maxWidthOrHeight: 1280,
        initialQuality: 0.6,
        fileType: 'image/webp',
        useWebWorker: true,
      } as const;

      const compressed = await imageCompression(file, options);
      setImageFile(compressed);
      setPreviewUrl(URL.createObjectURL(compressed));

      const originalKb = (file.size / 1024).toFixed(0);
      const compressedKb = (compressed.size / 1024).toFixed(0);
      setImageInfo(`Ảnh đã nén: ${originalKb}KB → ${compressedKb}KB (${compressed.type})`);
    } catch (err: any) {
      console.error('Error compressing image:', err);
      setImageFile(null);
      setPreviewUrl(null);
      setImageInfo('Không thể nén ảnh, thử lại file khác nhé');
    }
  };

  const handleCreatePost = async (e: FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text || creating) return;

    try {
      setCreating(true);
      let imageUrl: string | undefined;
      if (imageFile) {
        imageUrl = await imageCompression.getDataUrlFromFile(imageFile);
      }

      const payload: PostCreate = {
        content: text,
        subject,
        post_type: imageUrl ? 'image' : 'text',
        image_url: imageUrl,
      };

      const created = await postsAPI.create(payload);
      // Đưa bài mới lên đầu feed
      setPosts((prev) => [created, ...prev]);
      setContent('');
      setImageFile(null);
      setPreviewUrl(null);
      setImageInfo(null);
      setVisibleCount(PAGE_SIZE); // reset lại page view, luôn thấy bài mới
      showToast('Đăng bài thành công!', 'success');
    } catch (err: any) {
      console.error('Error creating post:', err);
      showToast(err.message || 'Không thể đăng bài', 'error');
    } finally {
      setCreating(false);
    }
  };

  const startEditPost = (post: Post) => {
    setEditingPostId(post.id);
    setEditingContent(post.content);
    setEditingSubject(post.subject || 'toan');
  };

  const cancelEditPost = () => {
    setEditingPostId(null);
    setEditingContent('');
    setEditingSubject('toan');
  };

  const handleUpdatePost = async (post: Post) => {
    const text = editingContent.trim();
    if (!text) {
      showToast('Nội dung không được để trống', 'error');
      return;
    }
    try {
      const updated = await postsAPI.update(post.id, {
        content: text,
        subject: editingSubject,
      });
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, ...updated } : p)));
      cancelEditPost();
      showToast('Đã cập nhật bài viết', 'success');
    } catch (error: any) {
      console.error('Error updating post:', error);
      showToast('Không thể cập nhật bài viết: ' + (error.message || 'Lỗi không xác định'), 'error');
    }
  };

  const handleDeletePost = async (post: Post) => {
    if (!window.confirm('Xoá bài viết này?')) return;
    try {
      await postsAPI.delete(post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      showToast('Đã xoá bài viết', 'success');
    } catch (error: any) {
      console.error('Error deleting post:', error);
      showToast('Không thể xoá bài viết: ' + (error.message || 'Lỗi không xác định'), 'error');
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-slate-400">Đang tải bảng tin...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Composer tạo bài viết */}
      <form
        onSubmit={handleCreatePost}
        className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
            HS
          </div>
          <div className="flex-1 space-y-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[60px] max-h-40 resize-y border border-slate-200 rounded-2xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Cậu đang nghĩ gì? Dán đề bài hoặc câu hỏi ở đây..."
              disabled={creating}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1 text-xs"
                  disabled={creating}
                >
                  <option value="toan">Toán</option>
                  <option value="ly">Lý</option>
                  <option value="hoa">Hóa</option>
                  <option value="sinh">Sinh</option>
                  <option value="van">Văn</option>
                  <option value="anh">Anh</option>
                </select>
                <label className="inline-flex items-center gap-1 cursor-pointer text-indigo-600">
                  <ImageIcon size={14} />
                  <span>Ảnh minh họa</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                    disabled={creating}
                  />
                </label>
                {imageInfo && <span className="text-[11px] text-slate-500">{imageInfo}</span>}
              </div>
              <button
                type="submit"
                disabled={!content.trim() || creating}
                className="px-4 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-semibold disabled:opacity-50"
              >
                {creating ? 'Đang đăng...' : 'Đăng bài'}
              </button>
            </div>
            {previewUrl && (
              <div className="mt-2">
                <img
                  src={previewUrl}
                  alt="Xem trước"
                  className="max-h-40 rounded-xl border border-slate-200 object-contain"
                />
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Bộ lọc */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Home className="text-indigo-600" /> Bảng tin học tập
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-[11px]">
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-600">
            <FilterIcon size={12} />
            <span>Bộ lọc</span>
          </div>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-full px-2 py-1 text-xs text-slate-600"
          >
            <option value="all">Tất cả môn</option>
            <option value="toan">Toán</option>
            <option value="ly">Lý</option>
            <option value="hoa">Hóa</option>
            <option value="sinh">Sinh</option>
            <option value="van">Văn</option>
            <option value="anh">Anh</option>
          </select>
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-full px-2 py-1 text-xs text-slate-600"
          >
            <option value="all">Tất cả khối</option>
            <option value="10">Lớp 10</option>
            <option value="11">Lớp 11</option>
            <option value="12">Lớp 12</option>
          </select>
          <input
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            placeholder="#Tag (VD: logarit)"
            className="bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-600 w-32 sm:w-40 outline-none focus:ring-1 focus:ring-indigo-400"
          />
          {refreshing && (
            <span className="text-[11px] text-slate-400">Đang làm mới...</span>
          )}
        </div>
      </div>

      {visiblePosts.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl text-center text-slate-400">
          Không có bài viết phù hợp bộ lọc hiện tại
        </div>
      ) : (
        visiblePosts.map((post) => (
          <div key={post.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {post.author_name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1">
                <div className="font-bold text-slate-800">{post.author_name}</div>
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span>{new Date(post.created_at).toLocaleString('vi-VN')}</span>
                  {post.status === 'pending' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Đang phân tích bởi Anh Thơ
                    </span>
                  )}
                </div>
              </div>
              {/* Menu bài viết (sửa/xoá) – tạm thời luôn hiển thị, backend vẫn kiểm tra quyền */}
              <button
                type="button"
                onClick={() => {
                  if (editingPostId === post.id) {
                    cancelEditPost();
                  } else {
                    startEditPost(post);
                  }
                }}
                className="text-slate-400 hover:text-slate-600"
                title="Sửa bài"
              >
                <MoreHorizontal size={18} />
              </button>
            </div>

            {editingPostId === post.id ? (
              <div className="mb-4 space-y-2">
                <textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  className="w-full min-h-[60px] max-h-40 resize-y border border-slate-200 rounded-2xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex items-center justify-between gap-2 text-xs">
                  <select
                    value={editingSubject}
                    onChange={(e) => setEditingSubject(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1 text-xs"
                  >
                    <option value="toan">Toán</option>
                    <option value="ly">Lý</option>
                    <option value="hoa">Hóa</option>
                    <option value="sinh">Sinh</option>
                    <option value="van">Văn</option>
                    <option value="anh">Anh</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdatePost(post)}
                      className="px-3 py-1 rounded-full bg-indigo-600 text-white font-semibold"
                    >
                      Lưu
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePost(post)}
                      className="px-3 py-1 rounded-full border border-slate-300 text-slate-600"
                    >
                      Xoá bài
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditPost}
                      className="px-3 py-1 rounded-full text-slate-400"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-700 mb-4">{post.content}</p>
            )}

            <div className="flex flex-wrap gap-2 mb-3">
              {post.subject && (
                <span className="inline-flex items-center bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[11px] font-semibold">
                  {post.subject}
                  {post.grade ? ` · Lớp ${post.grade}` : ''}
                </span>
              )}
              {post.aiTags &&
                post.aiTags.length > 0 &&
                post.aiTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                  >
                    {tag}
                  </span>
                ))}
            </div>

            {post.image_url && (
              <div className="mb-4">
                <img
                  src={post.image_url}
                  alt="Hình minh họa"
                  className="max-h-80 w-auto rounded-2xl border border-slate-100 object-contain"
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-100">
              {/* Reactions học tập */}
              <div className="flex items-center gap-3 text-slate-600">
                {([
                  { key: 'idea', label: 'Hiểu rồi', icon: '💡' },
                  { key: 'thinking', label: 'Đang suy nghĩ', icon: '🤔' },
                  { key: 'resource', label: 'Tài liệu hay', icon: '📚' },
                  { key: 'motivation', label: 'Cố lên', icon: '🔥' },
                ] as const).map((r) => {
                  const count = post.reactionCounts?.[r.key] ?? 0;
                  const isActive = false; // TODO: map userReactions theo current user nếu cần
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={async () => {
                        try {
                          await postsAPI.react(post.id, r.key);
                          await loadPosts();
                        } catch (error: any) {
                          showToast('Không thể cập nhật cảm xúc: ' + error.message, 'error');
                        }
                      }}
                      className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition ${
                        isActive
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-sm">{r.icon}</span>
                      <span className="font-semibold">{count}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 text-slate-600 justify-end">
                {onAskWithContext && (
                  <button
                    type="button"
                    onClick={() => {
                      const ctxParts: string[] = [];
                      if (post.subject) ctxParts.push(`môn ${post.subject}`);
                      if (post.grade) ctxParts.push(`lớp ${post.grade}`);
                      const meta = ctxParts.length ? `Bài đăng ${ctxParts.join(', ')}` : 'Bài đăng';
                      const snippet = post.content.slice(0, 200);
                      const context = `${meta}: "${snippet}${post.content.length > 200 ? '...' : ''}"`;
                      onAskWithContext(context);
                    }}
                    className="text-xs px-2.5 py-1 rounded-full border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-semibold flex items-center gap-1"
                  >
                    <MessageCircle size={14} />
                    Giải giúp mình với
                  </button>
                )}
                <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      void loadComments(post.id);
                    }}
                    className="inline-flex items-center gap-1.5 text-slate-600 hover:text-indigo-600"
                  >
                    <MessageCircle size={16} />
                    <span className="font-medium">
                      {typeof post.comments === 'number' ? post.comments : 0}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bình luận gợi ý của Anh Thơ */}
            {post.aiComment && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                  AT
                </div>
                <div className="bg-slate-50 rounded-2xl px-3 py-2 text-slate-700">
                  <div className="font-semibold text-xs text-slate-500 mb-0.5">
                    Anh Thơ · Trợ lý học tập
                  </div>
                  <p>{post.aiComment}</p>
                </div>
              </div>
            )}

            {/* Danh sách bình luận & composer */}
            {commentsByPost[post.id] && (
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={commentInput[post.id] || ''}
                    onChange={(e) =>
                      setCommentInput((prev) => ({ ...prev, [post.id]: e.target.value }))
                    }
                    placeholder="Viết bình luận của cậu..."
                    className="flex-1 text-xs px-3 py-2 rounded-full border border-slate-200 outline-none focus:ring-1 focus:ring-indigo-400"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleCreateComment(post.id);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void handleCreateComment(post.id)}
                    className="p-2 rounded-full bg-indigo-600 text-white text-xs hover:bg-indigo-700 disabled:opacity-50"
                    disabled={!commentInput[post.id]?.trim()}
                  >
                    <Send size={14} />
                  </button>
                </div>

                {loadingCommentsFor === post.id && (
                  <div className="text-[11px] text-slate-400">Đang tải bình luận...</div>
                )}

                <div className="space-y-2">
                  {commentsByPost[post.id].map((c) => (
                    <div key={c.id} className="flex items-start gap-2 text-xs">
                      <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-semibold">
                        {c.author_name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1 bg-slate-50 rounded-2xl px-3 py-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-[11px] text-slate-700">
                            {c.author_name}
                          </div>
                          {!c.is_ai_generated && (
                            <button
                              type="button"
                              onClick={() => void handleDeleteComment(post.id, c)}
                              className="text-[10px] text-slate-400 hover:text-red-500 inline-flex items-center gap-0.5"
                            >
                              <Trash2 size={10} />
                              Xoá
                            </button>
                          )}
                        </div>
                        <div className="text-slate-700">{c.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))
      )}
      {visiblePosts.length < filteredPosts.length && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleLoadMore}
            className="mt-2 px-4 py-1.5 rounded-full border border-slate-300 text-xs text-slate-600 hover:bg-slate-50"
          >
            Xem thêm bài viết
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentFeed;


