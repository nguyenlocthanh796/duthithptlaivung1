import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getUserRoles } from '../services/firestore'
import { NavigationSidebar } from './NavigationSidebar'
import { useSidebar } from '../context/SidebarContext'
import { BookOpen, MessageSquare, Calculator, Trophy, PanelRightClose } from 'lucide-react'

export function ThreeColumnLayout({ children, leftSidebar, rightSidebar }) {
  const { user } = useAuth()
  const location = useLocation()
  const { sidebarOpen, setSidebarOpen, setIsMobile: setContextIsMobile, rightSidebarOpen, setRightSidebarOpen } = useSidebar()
  const [userRoles, setUserRoles] = useState([])
  const [isDesktop, setIsDesktop] = useState(false)
  const [isXlScreen, setIsXlScreen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const leftSidebarRef = useRef(null)
  const rightSidebarRef = useRef(null)
  const leftSidebarContainerRef = useRef(null)
  const rightSidebarContainerRef = useRef(null)
  
  // Sync mobile state với context
  useEffect(() => {
    setContextIsMobile(isMobile)
  }, [isMobile, setContextIsMobile])

  // Ngăn scroll trên cột 1 và cột 3 - Chỉ khóa scroll, không khóa click/touch
  useEffect(() => {
    const preventScroll = (e) => {
      e.preventDefault()
      e.stopPropagation()
      return false
    }

    const preventWheel = (e) => {
      e.preventDefault()
      e.stopPropagation()
      return false
    }

    // Chỉ prevent touchmove (scroll), không prevent touchstart/touchend (click)
    const preventTouchMove = (e) => {
      // Chỉ prevent nếu đang scroll, không prevent nếu đang click
      const target = e.target
      const isClickable = target.closest('a, button, [role="button"], input, select, textarea')
      if (!isClickable) {
        e.preventDefault()
        e.stopPropagation()
      }
      return false
    }

    // Sử dụng setTimeout để đảm bảo refs đã được gán
    const timeoutId = setTimeout(() => {
      const leftSidebar = leftSidebarRef.current
      const rightSidebar = rightSidebarRef.current
      const leftSidebarContainer = leftSidebarContainerRef.current
      const rightSidebarContainer = rightSidebarContainerRef.current

      if (leftSidebarContainer) {
        // Lock scroll trên container sidebar trái
        leftSidebarContainer.addEventListener('wheel', preventWheel, { passive: false })
        leftSidebarContainer.addEventListener('touchmove', preventTouchMove, { passive: false })
        leftSidebarContainer.addEventListener('scroll', preventScroll, { passive: false })
        
        leftSidebarContainer.style.overflow = 'hidden'
        leftSidebarContainer.style.overscrollBehavior = 'none'
        leftSidebarContainer.style.touchAction = 'none'
      }

      if (leftSidebar) {
        // Lock scroll nhưng cho phép click
        leftSidebar.addEventListener('wheel', preventWheel, { passive: false })
        leftSidebar.addEventListener('touchmove', preventTouchMove, { passive: false })
        leftSidebar.addEventListener('scroll', preventScroll, { passive: false })
        
        // Đảm bảo không scroll được nhưng vẫn click được
        leftSidebar.style.overflow = 'hidden'
        leftSidebar.style.overscrollBehavior = 'none'
        leftSidebar.style.touchAction = 'manipulation' // Cho phép click, không cho scroll
      }

      if (rightSidebarContainer) {
        // Lock scroll trên container sidebar phải
        rightSidebarContainer.addEventListener('wheel', preventWheel, { passive: false })
        rightSidebarContainer.addEventListener('touchmove', preventTouchMove, { passive: false })
        rightSidebarContainer.addEventListener('scroll', preventScroll, { passive: false })
        
        rightSidebarContainer.style.overflow = 'hidden'
        rightSidebarContainer.style.overscrollBehavior = 'none'
        rightSidebarContainer.style.touchAction = 'none'
      }

      if (rightSidebar) {
        // Lock scroll nhưng cho phép click
        rightSidebar.addEventListener('wheel', preventWheel, { passive: false })
        rightSidebar.addEventListener('touchmove', preventTouchMove, { passive: false })
        rightSidebar.addEventListener('scroll', preventScroll, { passive: false })
        
        // Đảm bảo không scroll được nhưng vẫn click được
        rightSidebar.style.overflow = 'hidden'
        rightSidebar.style.overscrollBehavior = 'none'
        rightSidebar.style.touchAction = 'manipulation' // Cho phép click, không cho scroll
      }

      // Main content không khóa scroll - để hoạt động bình thường
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      const leftSidebar = leftSidebarRef.current
      const rightSidebar = rightSidebarRef.current
      const leftSidebarContainer = leftSidebarContainerRef.current
      const rightSidebarContainer = rightSidebarContainerRef.current

      if (leftSidebarContainer) {
        leftSidebarContainer.removeEventListener('wheel', preventWheel)
        leftSidebarContainer.removeEventListener('touchmove', preventTouchMove)
        leftSidebarContainer.removeEventListener('scroll', preventScroll)
      }
      if (leftSidebar) {
        leftSidebar.removeEventListener('wheel', preventWheel)
        leftSidebar.removeEventListener('touchmove', preventTouchMove)
        leftSidebar.removeEventListener('scroll', preventScroll)
      }
      if (rightSidebarContainer) {
        rightSidebarContainer.removeEventListener('wheel', preventWheel)
        rightSidebarContainer.removeEventListener('touchmove', preventTouchMove)
        rightSidebarContainer.removeEventListener('scroll', preventScroll)
      }
      if (rightSidebar) {
        rightSidebar.removeEventListener('wheel', preventWheel)
        rightSidebar.removeEventListener('touchmove', preventTouchMove)
        rightSidebar.removeEventListener('scroll', preventScroll)
      }
      // Main content không cần cleanup
    }
  }, [sidebarOpen, rightSidebarOpen]) // Chạy lại khi sidebar mở/đóng
  
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
  // Design mới với lucide-react icons
  const navLinks = useMemo(() => {
    const mainLinks = [
      { to: '/', label: 'Bảng tin', icon: <BookOpen size={20} />, active: location.pathname === '/' },
      { to: '/chat', label: 'Chat AI', icon: <MessageSquare size={20} />, active: location.pathname === '/chat' },
      { to: '/exam', label: 'Phòng thi', icon: <Calculator size={20} />, active: location.pathname === '/exam' },
      { to: '/dashboard', label: 'Thành tích', icon: <Trophy size={20} />, active: location.pathname === '/dashboard' },
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

  // Kiểm tra xem có phải trang /chat không
  const isChatPage = location.pathname === '/chat'
  
  return (
    <div className="flex h-screen overflow-hidden relative w-full">
      {/* Mobile/Tablet Overlay - Chỉ hiển thị khi không phải trang /chat */}
      {!isChatPage && sidebarOpen && (isMobile || (!isDesktop && !isXlScreen)) && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
          style={{ top: '64px' }}
        />
      )}

      {/* Sidebar - Cột 1 (Điều hướng) - Tối ưu hóa */}
      {/* Ẩn cột 1 trên web khi ở trang /chat */}
      {!(isChatPage && !isMobile) && (
        <aside
          ref={leftSidebarContainerRef}
          className={`${
            // Mobile/Tablet: Luôn là overlay (fixed), chỉ translate
            // Desktop: Relative, có thể ẩn bằng width
            isMobile || (!isDesktop && !isXlScreen)
              ? `fixed top-0 left-0 z-50 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
              : `relative ${sidebarOpen ? 'translate-x-0' : 'translate-x-0'}`
          } ${
            sidebarOpen 
              ? isMobile || (!isDesktop && !isXlScreen) ? 'w-64' : 'w-56' // Mobile/Tablet: 256px, Desktop: 224px
              : isMobile || (!isDesktop && !isXlScreen) ? 'w-64' : 'w-0 lg:w-56' // Mobile/Tablet: giữ width khi đóng (để có thể slide), Desktop: co về 0
          } flex flex-col transition-all duration-300 border-r border-slate-200/30 dark:border-slate-800/30 bg-white dark:bg-slate-950 flex-shrink-0 h-screen overflow-hidden`}
        style={{
          overflow: 'hidden',
          overscrollBehavior: 'none',
          touchAction: 'none',
        }}
      >
        {/* Navbar Space - Để tránh che navbar */}
        <div className="h-16 flex-shrink-0"></div>
        <div 
          ref={leftSidebarRef}
          className={`flex-1 min-h-0 overflow-hidden`}
          style={{
            overflow: 'hidden',
            overscrollBehavior: 'none',
            touchAction: 'none',
          }}
        >
          {leftSidebar ? (
            leftSidebar
          ) : (
            <>
              {/* User Profile Section - Giống Facebook */}
              {!isMobile && user && (
                <div className="px-4 py-3 border-b border-slate-200/30 dark:border-slate-800/30 flex-shrink-0">
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

              {/* Mobile Header inside Sidebar */}
              {isMobile && (
                <div className="flex justify-between items-center p-4 border-b border-gray-100 flex-shrink-0">
                  <span className="font-bold text-gray-700">Menu</span>
                  <button onClick={() => setSidebarOpen(false)} className="p-1 text-gray-500">
                    <PanelRightClose size={20}/>
                  </button>
                </div>
              )}

              {/* Navigation Content - Design mới - Hiển thị đầy đủ chân trang */}
              <div 
                className={`flex flex-col ${isMobile ? 'p-2 pb-6' : 'p-4 pb-6'}`}
                style={{
                  overflow: 'hidden',
                  overscrollBehavior: 'none',
                  touchAction: 'none',
                }}
              >
                <nav 
                  className="space-y-1"
                  style={{
                    overflow: 'hidden',
                    overscrollBehavior: 'none',
                    touchAction: 'none',
                  }}
                >
                  {navLinks.mainLinks.map((item, idx) => (
                    <Link
                      key={idx}
                      to={item.to}
                      onClick={() => isMobile && setSidebarOpen(false)}
                      className={`w-full flex items-center ${isMobile ? 'px-3 py-2.5' : 'px-4 py-3'} rounded-xl transition-all font-medium ${
                        item.active 
                          ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span className={`${isMobile ? 'mr-2' : 'mr-3'} ${item.active ? 'text-blue-600' : 'text-gray-400'}`}>
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </>
          )}
        </div>
      </aside>
      )}

      {/* Main Content - Cột 2 - Thu nhỏ và căn giữa - Hoạt động bình thường */}
      <main 
        className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950 flex-shrink min-w-0" 
        style={{ 
          paddingTop: '0px',
          height: '100%',
          // Mobile/Tablet: Không có marginLeft (sidebar là overlay, không làm biến dạng)
          // Desktop: Có marginLeft khi sidebar mở
          // Trang /chat: Không có marginLeft
          marginLeft: isChatPage && !isMobile 
            ? '0' 
            : (isMobile || (!isDesktop && !isXlScreen))
              ? '0' // Mobile/Tablet: Không margin (sidebar là overlay)
              : (isDesktop && sidebarOpen ? '224px' : '0'), // Desktop: Có margin khi sidebar mở
          marginRight: isChatPage && !isMobile 
            ? '0' 
            : (isXlScreen && rightSidebarOpen ? '288px' : '0'),
          transition: 'margin-left 0.3s ease, margin-right 0.3s ease',
        }}
      >
        <div className={`w-full h-full box-border flex justify-center ${
          location.pathname === '/chat' 
            ? 'px-0 py-0 overflow-hidden' 
            : 'px-2 sm:px-3 md:px-4 py-3 md:py-4 overflow-y-auto overflow-x-hidden scrollbar-hide'
        }`}>
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
            .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>
          <div className={`w-full h-full ${
            location.pathname === '/chat' ? 'max-w-full' : 'max-w-2xl'
          }`}>
            {children}
          </div>
        </div>
      </main>

      {/* Nút mở Right Sidebar - Tối giản, tinh tế */}
      {/* Ẩn nút mở right sidebar khi ở trang /chat */}
      {isXlScreen && !rightSidebarOpen && location.pathname !== '/chat' && (
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
      {/* Ẩn cột 3 trên web khi ở trang /chat */}
      {!(location.pathname === '/chat' && !isMobile) && (
        <aside 
          ref={rightSidebarContainerRef}
          className={`hidden xl:flex flex-col w-72 border-l border-slate-200/30 dark:border-slate-800/30 bg-white dark:bg-slate-950 flex-shrink-0 transition-transform duration-300 fixed top-0 right-0 z-30 h-screen overflow-hidden ${
            rightSidebarOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        style={{
          overflow: 'hidden',
          overscrollBehavior: 'none',
          touchAction: 'none',
        }}
      >
        {/* Navbar Space - Để tránh che navbar */}
        <div className="h-16 flex-shrink-0"></div>
        <div 
          ref={rightSidebarRef}
          className="flex-1 min-h-0 overflow-hidden"
          style={{
            overflow: 'hidden',
            overscrollBehavior: 'none',
            touchAction: 'none',
          }}
        >
          <div className="flex items-center px-4 py-3 border-b border-slate-200/30 dark:border-slate-800/30 flex-shrink-0" style={{ paddingTop: '5px', paddingBottom: '5px', paddingRight: '9px', paddingLeft: '9px' }}>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">Thông tin</h3>
          </div>
          <div className="p-4 pb-8">
            {rightSidebar || defaultRightSidebar}
          </div>
        </div>
      </aside>
      )}
    </div>
  )
}
