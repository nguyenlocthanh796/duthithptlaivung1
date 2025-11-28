import React from 'react';
import Navbar from './Navbar';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';

import LiveModePopup from '../features/ai/LiveModePopup';

const MainLayout = ({ children, leftSidebarOpen, setLeftSidebarOpen, rightSidebarOpen, setRightSidebarOpen, user, setView, activeView, toggleAI, liveModeState }) => {
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 text-base leading-normal flex flex-col">
      <Navbar 
        user={user} 
        setLeftSidebarOpen={setLeftSidebarOpen} leftSidebarOpen={leftSidebarOpen}
        setRightSidebarOpen={setRightSidebarOpen} rightSidebarOpen={rightSidebarOpen}
        toggleAI={toggleAI}
      />
      
      <div className="flex flex-1 pt-16 overflow-hidden">
        {/* Mobile Overlay */}
        {leftSidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-sm" onClick={() => setLeftSidebarOpen(false)} />}

        <LeftSidebar 
          isOpen={leftSidebarOpen} 
          setView={setView} 
          activeView={activeView} 
          setLeftSidebarOpen={setLeftSidebarOpen} 
        />
        
        {/* Live Mode Popup trên Desktop - hiển thị bên cạnh LeftSidebar */}
        {liveModeState && typeof window !== 'undefined' && window.innerWidth >= 1024 && (
          <LiveModePopup 
            sessionTime={liveModeState.sessionTime}
            isListening={liveModeState.isListening}
            toggleListening={liveModeState.toggleListening}
            turnOffLive={liveModeState.turnOffLive}
          />
        )}

        {/* Main Content Area */}
        <main className={`
          flex-1 min-w-0 transition-all duration-300 overflow-y-auto scroll-smooth bg-gray-50
          lg:ml-72
          ${rightSidebarOpen && activeView !== 'ai_chat' ? 'xl:mr-80' : ''} 
        `}>
          {/* Logic: AI Page chiếm full width, các trang khác có padding container */}
          {activeView === 'ai_chat' ? (
            children
          ) : (
            <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 md:px-6 py-0 sm:py-6 pb-20">
              {children}
            </div>
          )}
        </main>

        {/* Right Sidebar (Chỉ hiện ở các trang không phải AI Chat) */}
        {activeView !== 'ai_chat' && (
          <RightSidebar isOpen={rightSidebarOpen} />
        )}
      </div>
    </div>
  );
};

export default MainLayout;

