import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getUserRoles } from '../services/firestore'

export function ThreeColumnLayout({ children, leftSidebar, rightSidebar }) {
  const { user } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [userRoles, setUserRoles] = useState([])
  const [isDesktop, setIsDesktop] = useState(false)
  const [isXlScreen, setIsXlScreen] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024)
      setIsXlScreen(window.innerWidth >= 1280)
    }
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  useEffect(() => {
    if (user?.uid) {
      getUserRoles(user.uid).then(setUserRoles)
    }
  }, [user?.uid])

  const navLinks = [
    { to: '/', label: 'News Feed', icon: '📰' },
    { to: '/chat', label: 'Chat AI', icon: '💬' },
    { to: '/exam', label: 'Exam Room', icon: '📝' },
    { to: '/teacher', label: 'Teacher', icon: '👨‍🏫' },
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  ]
  
  if (userRoles.includes('admin')) {
    navLinks.push({ to: '/admin', label: 'Admin', icon: '⚙️' })
  }

  // Default left sidebar content - Navigation
  const defaultLeftSidebar = (
    <nav className="space-y-1">
      {navLinks.map((link) => (
        <Link
          key={link.to}
          to={link.to}
            className={`flex items-center gap-3 px-4 py-3 transition rounded-md ${
            location.pathname === link.to
              ? 'bg-gemini-blue/10 text-gemini-blue font-semibold border-l-4 border-gemini-blue'
              : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <span className="text-xl">{link.icon}</span>
          <span className="text-base">{link.label}</span>
        </Link>
      ))}
    </nav>
  )

  // Default right sidebar content
  const defaultRightSidebar = (
    <div className="space-y-3">
      <div className="p-4 bg-gemini-green/10 border border-gemini-green/20">
        <p className="text-base font-medium text-gemini-green mb-1">💡 Mẹo học tập</p>
        <p className="text-sm text-slate-600">
          Sử dụng LaTeX để viết công thức: $x^2$ hoặc $$\int_0^1 x dx$$
        </p>
      </div>
      <div className="p-4 bg-gemini-blue/10 border border-gemini-blue/20">
        <p className="text-base font-medium text-gemini-blue mb-1">🤖 AI Hỗ trợ</p>
        <p className="text-sm text-slate-600">
          Click "AI Giải bài tập" để nhận giải đáp tự động cho câu hỏi của bạn.
        </p>
      </div>
      <div className="p-4 bg-gemini-yellow/10 border border-gemini-yellow/20">
        <p className="text-base font-medium text-gemini-yellow mb-1">📅 Lịch học</p>
        <p className="text-sm text-slate-600">
          Lên kế hoạch học tập hiệu quả mỗi ngày.
        </p>
      </div>
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden relative w-full">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
          style={{ top: '64px' }}
        />
      )}

      {/* Sidebar - Cột 1 (Có thể ẩn/hiện) - Desktop & Mobile - FIXED POSITION */}
      <aside
        className={`${
          sidebarOpen 
            ? 'translate-x-0' 
            : '-translate-x-full lg:translate-x-0'
        } ${
          sidebarOpen 
            ? 'w-64' 
            : 'w-0 lg:w-0'
        } fixed top-[64px] left-0 z-50 lg:z-auto flex flex-col transition-all duration-300 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0 h-[calc(100vh-64px)] overflow-hidden`}
        style={{
          position: 'fixed',
          top: '64px',
          left: sidebarOpen ? '0' : (isDesktop ? '0' : '-256px'),
          height: 'calc(100vh - 64px)',
          zIndex: 50,
        }}
      >
        <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ maxHeight: 'calc(100vh - 64px)' }}>
          {leftSidebar ? (
            // Custom left sidebar (e.g., chat history) - no header needed
            leftSidebar
          ) : (
            // Default navigation sidebar
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">Điều hướng</h3>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition text-lg"
                >
                  ✕
                </button>
              </div>
              <div className="p-3">
                {defaultLeftSidebar}
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Nút mở sidebar - Mobile & Desktop */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-0 top-20 z-30 p-2 bg-white border-r border-b border-slate-200 text-slate-600 hover:text-gemini-blue transition shadow-sm text-lg"
        >
          ☰
        </button>
      )}

      {/* Main Content - Cột 2 (Desktop) / Cột 1 (Mobile) - Chỉ phần này scroll */}
      <main 
        className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 dark:bg-slate-900 flex-shrink scrollbar-hide min-w-0" 
        style={{ 
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          marginLeft: isDesktop && sidebarOpen ? '256px' : '0',
          marginRight: isXlScreen ? '320px' : '0',
          transition: 'margin-left 0.3s ease, margin-right 0.3s ease',
        }}
      >
        <style>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <div className="max-w-4xl mx-auto px-4 py-6 w-full box-border">
          {children}
        </div>
      </main>

      {/* Right Sidebar - Cột 3 (Chỉ Desktop) - FIXED POSITION */}
      <aside 
        className="hidden xl:flex flex-col w-80 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0 overflow-hidden"
        style={{ 
          position: 'fixed',
          top: '64px',
          right: '0',
          height: 'calc(100vh - 64px)',
          zIndex: 40,
        }}
      >
        <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ maxHeight: 'calc(100vh - 64px)' }}>
          <div className="p-4">
            {rightSidebar || defaultRightSidebar}
          </div>
        </div>
      </aside>
    </div>
  )
}