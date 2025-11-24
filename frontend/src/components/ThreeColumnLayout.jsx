import { useState, useEffect, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getUserRoles } from '../services/firestore'
import { NavigationSidebar } from './NavigationSidebar'
import { useSidebar } from '../context/SidebarContext'

export function ThreeColumnLayout({ children, leftSidebar, rightSidebar }) {
  const { user } = useAuth()
  const location = useLocation()
  const { sidebarOpen, setSidebarOpen, setIsMobile: setContextIsMobile } = useSidebar()
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true) // Mặc định mở
  const [userRoles, setUserRoles] = useState([])
  const [isDesktop, setIsDesktop] = useState(false)
  const [isXlScreen, setIsXlScreen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  // Sync mobile state với context
  useEffect(() => {
    setContextIsMobile(isMobile)
  }, [isMobile, setContextIsMobile])
  
  // Trên desktop, sidebar luôn mở và không thể đóng
  useEffect(() => {
    if (isDesktop) {
      setSidebarOpen(true)
    }
  }, [isDesktop, setSidebarOpen])

  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024)
      setIsXlScreen(window.innerWidth >= 1280)
      setIsMobile(window.innerWidth < 1024)
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

  // Navigation links - Memoized để tránh re-render không cần thiết
  // Phân loại theo sections giống Facebook
  const navLinks = useMemo(() => {
    const mainLinks = [
      { to: '/', label: 'News Feed', icon: '📰' },
      { to: '/chat', label: 'Chat AI', icon: '💬' },
      { to: '/exam', label: 'Exam Room', icon: '📝' },
      { to: '/documents', label: 'Tài liệu', icon: '📄' },
    ]
    
    const teacherLinks = []
    if (userRoles.includes('teacher') || userRoles.includes('admin')) {
      teacherLinks.push({ to: '/teacher', label: 'Teacher', icon: '👨‍🏫' })
    }
    
    const otherLinks = [
      { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    ]
    
    if (userRoles.includes('admin')) {
      otherLinks.push({ to: '/admin', label: 'Admin', icon: '⚙️' })
    }
    
    return { mainLinks, teacherLinks, otherLinks }
  }, [userRoles])

  // Default left sidebar content - Tối ưu hóa với component riêng
  const defaultLeftSidebar = (
    <>
      <NavigationSidebar navLinks={navLinks.mainLinks} isMobile={isMobile} />
      {navLinks.teacherLinks.length > 0 && (
        <>
          <div className="h-px bg-slate-200 dark:bg-slate-800 my-2 mx-3"></div>
          <NavigationSidebar navLinks={navLinks.teacherLinks} isMobile={isMobile} />
        </>
      )}
      {navLinks.otherLinks.length > 0 && (
        <>
          <div className="h-px bg-slate-200 dark:bg-slate-800 my-2 mx-3"></div>
          <NavigationSidebar navLinks={navLinks.otherLinks} isMobile={isMobile} />
        </>
      )}
    </>
  )

  // Default right sidebar content
  const defaultRightSidebar = (
    <div className="space-y-3">
      <div className="p-4 bg-gemini-green/5 dark:bg-gemini-green/10 border border-gemini-green/20 dark:border-gemini-green/30 rounded">
        <p className="text-lg font-medium text-gemini-green dark:text-gemini-green-light mb-1">💡 Mẹo học tập</p>
        <p className="text-base text-slate-600 dark:text-slate-400">
          Sử dụng LaTeX để viết công thức: $x^2$ hoặc $$\int_0^1 x dx$$
        </p>
      </div>
      <div className="p-4 bg-gemini-blue/5 dark:bg-gemini-blue/10 border border-gemini-blue/20 dark:border-gemini-blue/30 rounded">
        <p className="text-lg font-medium text-gemini-blue dark:text-gemini-blue-light mb-1">🤖 AI Hỗ trợ</p>
        <p className="text-base text-slate-600 dark:text-slate-400">
          Click "AI Giải bài tập" để nhận giải đáp tự động cho câu hỏi của bạn.
        </p>
      </div>
      <div className="p-4 bg-gemini-yellow/5 dark:bg-gemini-yellow/10 border border-gemini-yellow/20 dark:border-gemini-yellow/30 rounded">
        <p className="text-lg font-medium text-gemini-yellow dark:text-gemini-yellow-light mb-1">📅 Lịch học</p>
        <p className="text-base text-slate-600 dark:text-slate-400">
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

      {/* Sidebar - Cột 1 (Điều hướng) - Tối ưu hóa */}
      <aside
        className={`${
          sidebarOpen 
            ? 'translate-x-0' 
            : '-translate-x-full lg:translate-x-0'
        } ${
          sidebarOpen 
            ? isMobile ? 'w-16' : 'w-56' // Mobile: 64px (icon only), Desktop: 224px
            : 'w-0 lg:w-0'
        } fixed top-[64px] left-0 z-40 flex flex-col transition-all duration-300 border-r border-slate-200/30 dark:border-slate-800/30 bg-white dark:bg-slate-950 flex-shrink-0 h-[calc(100vh-64px)] overflow-hidden`}
        style={{
          position: 'fixed',
          top: '64px',
          left: sidebarOpen ? '0' : (isDesktop ? '0' : isMobile ? '-64px' : '-224px'),
          height: 'calc(100vh - 64px)',
          zIndex: 40,
        }}
      >
        <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ maxHeight: 'calc(100vh - 64px)' }}>
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {leftSidebar ? (
            leftSidebar
          ) : (
            <>
              {/* User Profile Section - Giống Facebook */}
              {!isMobile && user && (
                <div className="px-4 py-3 border-b border-slate-200/30 dark:border-slate-800/30">
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition"
                  >
                    <img
                      src={user?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.displayName}`}
                      alt={user?.displayName}
                      className="h-10 w-10 rounded-full border-2 border-slate-200 dark:border-slate-700 object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 text-base truncate">
                        {user?.displayName || 'Người dùng'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        Xem trang cá nhân
                      </p>
                    </div>
                  </Link>
                </div>
              )}

              {/* Mobile Close Button */}
              {isMobile && (
                <div className="flex items-center justify-end px-3 py-2 border-b border-slate-200/30 dark:border-slate-800/30">
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                    title="Đóng"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Navigation Content - Tối ưu padding */}
              <div className={`py-3 ${isMobile ? 'px-2' : 'px-3'}`}>
                {defaultLeftSidebar}
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Nút mở sidebar - Chỉ hiện trên mobile */}
      {!sidebarOpen && isMobile && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-0 top-20 z-30 p-2 bg-white dark:bg-slate-950 border-r border-b border-slate-200/30 dark:border-slate-800/30 text-slate-600 dark:text-slate-400 hover:text-gemini-blue dark:hover:text-gemini-blue-light transition text-lg"
        >
          ☰
        </button>
      )}

      {/* Main Content - Cột 2 */}
      <main 
        className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 dark:bg-slate-950 flex-shrink scrollbar-hide min-w-0" 
        style={{ 
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          marginLeft: isDesktop && sidebarOpen ? '224px' : (isMobile && sidebarOpen ? '64px' : '0'),
          marginRight: isXlScreen && rightSidebarOpen ? '288px' : '0',
          transition: 'margin-left 0.3s ease, margin-right 0.3s ease',
        }}
      >
        <style>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <div className={`mx-auto px-4 py-6 w-full box-border ${
          location.pathname === '/chat' ? 'max-w-full px-0 py-0' : 'max-w-4xl'
        }`}>
          {children}
        </div>
      </main>

      {/* Nút mở Right Sidebar - Tối giản, tinh tế */}
      {isXlScreen && !rightSidebarOpen && (
        <button
          onClick={() => setRightSidebarOpen(true)}
          className="fixed right-2 top-20 z-30 p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
          title="Mở thông tin"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Right Sidebar - Cột 3 */}
      <aside 
        className={`hidden xl:flex flex-col w-72 border-l border-slate-200/30 dark:border-slate-800/30 bg-white dark:bg-slate-950 flex-shrink-0 overflow-hidden transition-transform duration-300 ${
          rightSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ 
          position: 'fixed',
          top: '64px',
          right: '0',
          height: 'calc(100vh - 64px)',
          zIndex: 30,
        }}
      >
        <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ maxHeight: 'calc(100vh - 64px)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/30 dark:border-slate-800/30">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">Thông tin</h3>
            <button
              onClick={() => setRightSidebarOpen(false)}
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
              title="Thu gọn"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
          <div className="p-4">
            {rightSidebar || defaultRightSidebar}
          </div>
        </div>
      </aside>
    </div>
  )
}
