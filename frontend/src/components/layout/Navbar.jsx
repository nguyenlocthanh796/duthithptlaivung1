import React from 'react';
import { Search, Menu, Sparkles, PanelRightClose, PanelRightOpen } from 'lucide-react';
import NotificationDropdown from '../features/NotificationDropdown';

const Navbar = ({ user, setLeftSidebarOpen, leftSidebarOpen, setRightSidebarOpen, rightSidebarOpen, toggleAI }) => {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-40 shrink-0">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setLeftSidebarOpen(!leftSidebarOpen)} 
          className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-xl lg:hidden"
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2 text-blue-700 font-bold text-xl tracking-tight select-none">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl text-white flex items-center justify-center shadow-blue-200 shadow-sm">D</div>
          <span className="hidden sm:inline">DuThi</span><span className="text-gray-900 font-normal">Pro</span>
        </div>
      </div>

      <div className="hidden md:flex flex-1 max-w-lg mx-8 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
        <input 
          type="text" 
          placeholder="Tìm kiếm bài thi, lớp học..." 
          className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-transparent focus:bg-white border focus:border-blue-500 rounded-xl text-base focus:outline-none transition-all" 
        />
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-xl"><Search size={22}/></button>
        
        {/* Toggle Right Sidebar (Desktop only) */}
        {setRightSidebarOpen && (
          <button 
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            className={`p-2 rounded-xl transition-colors hidden xl:block ${rightSidebarOpen ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}
          >
            {rightSidebarOpen ? <PanelRightClose size={20}/> : <PanelRightOpen size={20}/>}
          </button>
        )}

        <button 
          onClick={toggleAI} 
          className="relative p-2 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-xl font-bold flex items-center gap-1 border border-purple-100 transition-all duration-200 hover:scale-105 hover:shadow-lg group"
          title="Trò chuyện với AI"
        >
          <Sparkles size={20} className="group-hover:animate-pulse"/>
          <span className="hidden sm:inline text-sm">AI</span>
          {/* Pulse indicator */}
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
        </button>
        
        <NotificationDropdown user={user} />
        
        <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded-xl transition-all group relative">
          {user?.photoURL ? (
            <img 
              src={user.photoURL} 
              alt={user.displayName || 'User'} 
              className="w-9 h-9 rounded-full object-cover border-2 border-gray-200 shadow-md"
            />
          ) : (
            <div className="w-9 h-9 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full text-white flex items-center justify-center font-bold text-sm shadow-md">
              {user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          )}
          {/* User info tooltip */}
          <div className="hidden group-hover:block absolute top-full right-0 mt-2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            {user?.displayName || user?.email || 'User'}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

