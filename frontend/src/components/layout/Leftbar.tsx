/**
 * Leftbar Component - Modern Design
 * Sidebar bên trái với navigation menu được nâng cấp
 */
import React from 'react';
import { Home, FileText, BookOpen, Users, BarChart2, Building, LogOut } from 'lucide-react';

interface LeftbarProps {
  role: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

const Leftbar: React.FC<LeftbarProps> = ({ role, activeTab, setActiveTab, onLogout }) => {
  const getMenu = () => {
    switch (role) {
      case 'ministry':
        return [
          { id: 'dashboard', label: 'Tổng quan', icon: BarChart2, color: 'from-blue-500 to-cyan-500' },
          { id: 'schools', label: 'Quản lý Trường', icon: Building, color: 'from-purple-500 to-pink-500' },
          { id: 'policies', label: 'Chính sách', icon: FileText, color: 'from-orange-500 to-red-500' },
        ];
      case 'school':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: Home, color: 'from-blue-500 to-indigo-500' },
          { id: 'teachers', label: 'Giáo viên', icon: Users, color: 'from-green-500 to-emerald-500' },
          { id: 'classes', label: 'Lớp học', icon: BookOpen, color: 'from-purple-500 to-violet-500' },
        ];
      case 'teacher':
        return [
          { id: 'dashboard', label: 'Chủ nhiệm', icon: Home, color: 'from-blue-500 to-cyan-500' },
          { id: 'gradebook', label: 'Sổ điểm', icon: FileText, color: 'from-amber-500 to-orange-500' },
          { id: 'students', label: 'Học sinh', icon: Users, color: 'from-green-500 to-teal-500' },
        ];
      default:
        return [
          { id: 'feed', label: 'Bảng tin', icon: Home, color: 'from-primary-500 to-primary-600' },
          { id: 'exams', label: 'Thi cử', icon: FileText, color: 'from-accent-500 to-accent-600' },
          { id: 'library', label: 'Tài liệu', icon: BookOpen, color: 'from-success-500 to-success-600' },
          { id: 'profile', label: 'Hồ sơ', icon: Users, color: 'from-warning-500 to-warning-600' },
        ];
    }
  };

  const menuItems = getMenu();

  return (
    <aside className="w-[360px] h-[calc(100vh-3.5rem)] overflow-y-auto scrollbar-thin pt-6 px-4 bg-white border-r border-neutral-200">
      {/* Navigation Menu */}
      <div className="space-y-1 mb-4">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-primary-50 to-accent-50 shadow-sm'
                  : 'hover:bg-neutral-50'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? `bg-gradient-to-br ${item.color} shadow-md shadow-primary-500/20`
                    : 'bg-neutral-100 group-hover:bg-neutral-200'
                }`}
              >
                <item.icon
                  size={20}
                  className={
                    isActive ? 'text-white' : 'text-neutral-600 group-hover:text-neutral-900'
                  }
                />
              </div>
              <span
                className={`text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-primary-700'
                    : 'text-neutral-700 group-hover:text-neutral-900'
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-600 animate-bounce-subtle" />
              )}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent my-4" />

      {/* Shortcuts Section */}
      <div className="px-3 mb-4">
        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
          Lối tắt
        </h3>
        <div className="space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-neutral-50 transition-all duration-200 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-success-100 to-success-200 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen size={18} className="text-success-600" />
            </div>
            <span className="text-sm text-neutral-700 group-hover:text-neutral-900 font-medium">
              Nhóm học tập
            </span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-neutral-50 transition-all duration-200 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-100 to-accent-200 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users size={18} className="text-accent-600" />
            </div>
            <span className="text-sm text-neutral-700 group-hover:text-neutral-900 font-medium">
              Bạn bè
            </span>
          </button>
        </div>
      </div>

      {/* Logout Button */}
      <div className="px-3 mt-6 pt-4 border-t border-neutral-200">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-error-50 transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-xl bg-error-100 flex items-center justify-center group-hover:bg-error-200 transition-colors">
            <LogOut size={18} className="text-error-600" />
          </div>
          <span className="text-sm font-medium text-error-600 group-hover:text-error-700">
            Đăng xuất
          </span>
        </button>
      </div>
    </aside>
  );
};

export default Leftbar;

