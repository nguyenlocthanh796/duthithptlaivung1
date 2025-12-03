import { useEffect, useState } from 'react';
import { meAPI } from '../../services/api';
import { Home, Activity } from 'lucide-react';

interface StudentProfileProps {
  showToast: (msg: string, type: 'success' | 'error') => void;
}

interface Overview {
  user: { id: string; name: string };
  stats: { total_posts: number; total_comments: number; favorite_subject: string | null };
  recent_posts: {
    id: string;
    content: string;
    subject?: string;
    created_at?: string;
    comments: number;
    likes: number;
  }[];
}

const StudentProfile: React.FC<StudentProfileProps> = ({ showToast }) => {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await meAPI.overview();
        setOverview(data);
      } catch (error: any) {
        console.error('Error loading overview:', error);
        showToast('Không thể tải hồ sơ học sinh', 'error');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) {
    return <div className="text-center py-10 text-slate-400">Đang tải hồ sơ học sinh...</div>;
  }

  if (!overview) {
    return <div className="text-center py-10 text-slate-400">Chưa có dữ liệu hoạt động.</div>;
  }

  const { user, stats, recent_posts } = overview;

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xl font-bold">
          {user.name?.charAt(0) || 'U'}
        </div>
        <div>
          <div className="text-sm text-slate-500 mb-1">Hồ sơ học sinh</div>
          <div className="text-xl font-bold text-slate-800">{user.name}</div>
          {stats.favorite_subject && (
            <div className="text-xs text-slate-500 mt-1">
              Môn hoạt động nhiều nhất: <span className="font-semibold">{stats.favorite_subject}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Home size={18} />
          </div>
          <div>
            <div className="text-xs text-slate-500">Bài đăng</div>
            <div className="text-xl font-bold text-slate-800">{stats.total_posts}</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Activity size={18} />
          </div>
          <div>
            <div className="text-xs text-slate-500">Bình luận</div>
            <div className="text-xl font-bold text-slate-800">{stats.total_comments}</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col justify-center">
          <div className="text-xs text-slate-500 mb-1">Gợi ý</div>
          <div className="text-sm text-slate-700">
            Hãy đăng các bài liên quan đến{' '}
            <span className="font-semibold">
              {stats.favorite_subject || 'môn cậu đang cần ôn luyện nhiều nhất'}
            </span>
            , Anh Thơ sẽ dần hiểu phong cách học của cậu.
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">Bài đăng gần đây</h2>
          <span className="text-xs text-slate-400">
            {recent_posts.length} bài gần nhất
          </span>
        </div>
        {recent_posts.length === 0 ? (
          <div className="text-sm text-slate-400 text-center py-6">
            Chưa có bài đăng nào. Bắt đầu đăng bài ở Bảng tin học tập nhé!
          </div>
        ) : (
          <div className="space-y-3">
            {recent_posts.map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-default text-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-slate-800">
                    {p.subject || 'Chưa gắn môn'}
                  </div>
                  {p.created_at && (
                    <div className="text-[11px] text-slate-400">
                      {new Date(p.created_at).toLocaleString('vi-VN')}
                    </div>
                  )}
                </div>
                <div className="text-slate-700 text-sm">
                  {p.content}
                  {p.content.length === 200 && '...'}
                </div>
                <div className="mt-1 text-[11px] text-slate-500 flex gap-3">
                  <span>👍 {p.likes}</span>
                  <span>💬 {p.comments}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentProfile;


