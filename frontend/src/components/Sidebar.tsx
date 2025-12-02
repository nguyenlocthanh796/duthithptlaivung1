import React from 'react';
import { BarChart2, Building, FileText, Home, Users, BookOpen, LogOut, Globe } from 'lucide-react';

interface SidebarProps {
  role: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  role,
  activeTab,
  setActiveTab,
  mobileOpen,
  setMobileOpen,
  onLogout,
}) => {
  const getMenu = () => {
    switch (role) {
      case 'ministry':
        return [
          { id: 'dashboard', label: 'Tổng quan', icon: BarChart2 },
          { id: 'schools', label: 'Quản lý Trường', icon: Building },
          { id: 'policies', label: 'Chính sách', icon: FileText },
        ];
      case 'school':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: Home },
          { id: 'teachers', label: 'Giáo viên', icon: Users },
          { id: 'classes', label: 'Lớp học', icon: BookOpen },
        ];
      case 'teacher':
        return [
          { id: 'dashboard', label: 'Chủ nhiệm', icon: Home },
          { id: 'gradebook', label: 'Sổ điểm', icon: FileText },
          { id: 'students', label: 'Học sinh', icon: Users },
        ];
      default:
        return [
          { id: 'feed', label: 'Bảng tin', icon: Home },
          { id: 'exams', label: 'Thi cử', icon: FileText },
          { id: 'library', label: 'Tài liệu', icon: BookOpen },
          { id: 'profile', label: 'Hồ sơ', icon: Users },
        ];
    }
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[280px] bg-[#1E293B] text-white flex flex-col transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6 flex items-center gap-3 border-b border-slate-700/50">
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
            <Globe size={18} />
          </div>
          <span className="font-bold text-lg tracking-tight">EduSystem</span>
        </div>
        <div className="flex-1 py-6 px-3 space-y-1">
          {getMenu().map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium ${
                activeTab === item.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-slate-700/50">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-slate-800 hover:text-red-300 transition-all font-bold text-sm"
          >
            <LogOut size={20} /> Đăng xuất
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;


