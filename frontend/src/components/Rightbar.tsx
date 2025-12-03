/**
 * Rightbar Component - Modern Design
 * Sidebar bên phải với các thông tin và shortcuts được nâng cấp
 */
import React from 'react';
import { Users, BookOpen, Calendar, TrendingUp, MessageCircle, MoreHorizontal, Video } from 'lucide-react';
import { Card, Badge } from './ui';

interface RightbarProps {
  role: string;
}

const Rightbar: React.FC<RightbarProps> = ({ role }) => {
  // Mock data - sau này sẽ lấy từ API
  const contacts = [
    { id: 1, name: 'Nguyễn Văn A', avatar: 'A', online: true },
    { id: 2, name: 'Trần Thị B', avatar: 'B', online: true },
    { id: 3, name: 'Lê Văn C', avatar: 'C', online: false },
    { id: 4, name: 'Phạm Thị D', avatar: 'D', online: true },
    { id: 5, name: 'Hoàng Văn E', avatar: 'E', online: false },
  ];

  const shortcuts = [
    { id: 1, label: 'Nhóm Toán học', icon: BookOpen, color: 'from-blue-500 to-cyan-500' },
    { id: 2, label: 'Lịch học', icon: Calendar, color: 'from-purple-500 to-pink-500' },
    { id: 3, label: 'Xu hướng', icon: TrendingUp, color: 'from-green-500 to-emerald-500' },
  ];

  return (
    <aside className="w-[360px] h-[calc(100vh-3.5rem)] overflow-y-auto pt-6 px-4 scrollbar-thin bg-white border-l border-neutral-200">
      <div className="space-y-6">
        {/* Contacts */}
        <div>
          <div className="flex items-center justify-between px-2 mb-3">
            <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider">Người liên hệ</h3>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 rounded-xl hover:bg-neutral-100 flex items-center justify-center transition-all duration-200 group">
                <MessageCircle size={16} className="text-neutral-500 group-hover:text-primary-600 transition-colors" />
              </button>
              <button className="w-8 h-8 rounded-xl hover:bg-neutral-100 flex items-center justify-center transition-all duration-200 group">
                <Video size={16} className="text-neutral-500 group-hover:text-primary-600 transition-colors" />
              </button>
              <button className="w-8 h-8 rounded-xl hover:bg-neutral-100 flex items-center justify-center transition-all duration-200 group">
                <MoreHorizontal size={16} className="text-neutral-500 group-hover:text-primary-600 transition-colors" />
              </button>
            </div>
          </div>
          <div className="space-y-1">
            {contacts.map((contact) => (
              <button
                key={contact.id}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-neutral-50 transition-all duration-200 group"
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <span className="text-white text-sm font-semibold">{contact.avatar}</span>
                  </div>
                  {contact.online && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-success-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <span className="text-sm text-neutral-700 group-hover:text-neutral-900 flex-1 text-left font-medium transition-colors">
                  {contact.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Shortcuts */}
        <div>
          <div className="flex items-center justify-between px-2 mb-3">
            <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider">Lối tắt</h3>
            <button className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors">
              Chỉnh sửa
            </button>
          </div>
          <div className="space-y-1">
            {shortcuts.map((shortcut) => (
              <button
                key={shortcut.id}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50 transition-all duration-200 group"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${shortcut.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                  <shortcut.icon size={18} className="text-white" />
                </div>
                <span className="text-sm text-neutral-700 group-hover:text-neutral-900 flex-1 text-left font-medium transition-colors">
                  {shortcut.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Suggestions/Ads */}
        {role === 'student' && (
          <div className="px-2">
            <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider mb-3">Gợi ý cho bạn</h3>
            <div className="space-y-3">
              <Card className="p-4 hover cursor-pointer" padding="none">
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="neutral" size="sm">Quảng cáo</Badge>
                  <button className="text-neutral-400 hover:text-neutral-600 transition-colors">
                    <MoreHorizontal size={16} />
                  </button>
                </div>
                <h4 className="text-sm font-semibold text-neutral-900 mb-1">
                  Khóa học Toán nâng cao
                </h4>
                <p className="text-xs text-neutral-600">
                  Nâng cao kỹ năng toán học của bạn với các bài giảng chuyên sâu
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center">
                    <BookOpen size={24} className="text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-neutral-900">EduSystem Pro</div>
                    <div className="text-xs text-neutral-500">Học tập thông minh</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Rightbar;

