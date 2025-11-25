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
      { to: '/', label: 'News Feed', icon: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      )},
      { to: '/chat', label: 'Chat AI', icon: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )},
      { to: '/exam', label: 'Exam Room', icon: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )},
      { to: '/documents', label: 'Tài liệu', icon: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )},
    ]
    
    const teacherLinks = []
    if (userRoles.includes('teacher') || userRoles.includes('admin')) {
      teacherLinks.push({ to: '/teacher', label: 'Teacher', icon: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )})
    }
    
    const otherLinks = [
      { to: '/dashboard', label: 'Dashboard', icon: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )},
    ]
    
    if (userRoles.includes('admin')) {
      otherLinks.push({ to: '/admin', label: 'Admin', icon: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )})
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
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/30 dark:border-slate-700/30 rounded">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p className="text-base font-medium text-slate-900 dark:text-slate-100">Mẹo học tập</p>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Sử dụng LaTeX để viết công thức: $x^2$ hoặc $$\int_0^1 x dx$$
        </p>
      </div>
      <div className="p-4 bg-gemini-blue/5 dark:bg-gemini-blue/10 border border-gemini-blue/20 dark:border-gemini-blue/30 rounded">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-gemini-blue dark:text-gemini-blue-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p className="text-base font-medium text-gemini-blue dark:text-gemini-blue-light">AI Hỗ trợ</p>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Click "AI Giải bài tập" để nhận giải đáp tự động cho câu hỏi của bạn.
        </p>
      </div>
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/30 dark:border-slate-700/30 rounded">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-base font-medium text-slate-900 dark:text-slate-100">Lịch học</p>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
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
