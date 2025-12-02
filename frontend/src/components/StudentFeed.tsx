import React, { useEffect, useMemo, useState } from 'react';
import { Home, MessageCircle, Filter as FilterIcon } from 'lucide-react';
import { Post, postsAPI } from '../services/api';

interface StudentFeedProps {
  showToast: (msg: string, type: 'success' | 'error') => void;
}

const StudentFeed: React.FC<StudentFeedProps> = ({ showToast }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('');

  useEffect(() => {
    void loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      if (!posts.length) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      const data = await postsAPI.getAll({ limit: 20 });
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

  if (loading) {
    return <div className="text-center py-10 text-slate-400">Đang tải bảng tin...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in">
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

      {filteredPosts.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl text-center text-slate-400">
          Không có bài viết phù hợp bộ lọc hiện tại
        </div>
      ) : (
        filteredPosts.map((post) => (
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
            </div>

            <p className="text-slate-700 mb-4">{post.content}</p>

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

            <div className="flex items-center gap-6 pt-4 border-t border-slate-100">
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

              <div className="flex items-center gap-2 text-slate-600">
                <MessageCircle size={20} />
                <span className="font-medium">{post.comments}</span>
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
          </div>
        ))
      )}
    </div>
  );
};

export default StudentFeed;


