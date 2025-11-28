import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { LayoutDashboard, BookOpen, BrainCircuit, BarChart2, LogOut, Sparkles } from 'lucide-react';

const LeftSidebar = ({ isOpen, setView, activeView, setLeftSidebarOpen }) => {
  const handleLogout = async () => {
    if (!auth) {
      console.error('Firebase auth not available');
      return;
    }

    try {
      await signOut(auth);
      console.log('✅ Đăng xuất thành công');
    } catch (error) {
      console.error('❌ Lỗi đăng xuất:', error);
      alert('Lỗi khi đăng xuất: ' + error.message);
    }
  };
  const menuItems = [
    { id: 'dashboard', label: 'Bảng tin', icon: LayoutDashboard },
    { id: 'ai_chat', label: 'Trợ lý AI', icon: Sparkles },
    { id: 'my_classes', label: 'Lớp học của tôi', icon: BookOpen },
    { id: 'exam_bank', label: 'Ngân hàng đề', icon: BrainCircuit },
    { id: 'statistics', label: 'Thống kê', icon: BarChart2 },
  ];

  return (
    <aside className={`fixed top-16 left-0 bottom-0 w-72 bg-white border-r border-gray-200 z-30 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 overflow-y-auto`}>
      <div className="p-4 space-y-1">
        {menuItems.map(item => (
          <button 
            key={item.id} 
            onClick={() => { setView(item.id); if(window.innerWidth < 1024) setLeftSidebarOpen(false); }} 
            className={`w-full flex items-center gap-3 px-4 py-3.5 text-base font-medium rounded-xl transition-all ${
              activeView === item.id 
                ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 shadow-sm border border-blue-100' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <item.icon size={20} className={activeView === item.id ? 'text-blue-600' : 'text-gray-400'} /> {item.label}
          </button>
        ))}
      </div>
      <div className="p-4 mt-auto border-t border-gray-100">
         <button 
           onClick={handleLogout}
           className="w-full flex items-center gap-3 px-4 py-3.5 text-base font-medium text-red-600 hover:bg-red-50 rounded-xl transition-all"
         >
           <LogOut size={20} /> Đăng xuất
         </button>
      </div>
    </aside>
  );
};

export default LeftSidebar;

