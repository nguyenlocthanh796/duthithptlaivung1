import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { NotificationBell } from './NotificationBell'
import { ThemeToggle } from './ThemeToggle'
import { isFeatureEnabled } from '../services/remoteConfigService'
import { searchPosts, getUserRoles } from '../services/firestore'
import { useSidebar } from '../context/SidebarContext'
import logger from '../utils/logger'

export function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { toggleSidebar } = useSidebar()
  const showLiveQuiz = isFeatureEnabled('enable_live_quiz')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchBar, setShowSearchBar] = useState(false)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [userRoles, setUserRoles] = useState([])
  const [isMobile, setIsMobile] = useState(false)
  const searchRef = useRef(null)

  // Detect mobile screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // Load user roles
  useEffect(() => {
    if (user?.uid) {
      getUserRoles(user.uid).then(setUserRoles)
    }
  }, [user?.uid])

  // Close search dropdown and bar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false)
        if (!isMobile && !showSearchDropdown) {
          setShowSearchBar(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isMobile, showSearchDropdown])

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const results = await searchPosts({
        query: searchQuery,
        subject: 'all',
        type: 'all',
        time: 'all',
      })
      setSearchResults(results.slice(0, 5)) // Show top 5 results
      setShowSearchDropdown(true)
      
      // Navigate to FeedPage with search params
      if (location.pathname !== '/') {
        navigate(`/?q=${encodeURIComponent(searchQuery)}`)
      } else {
        // If already on FeedPage, trigger search via URL update
        navigate(`/?q=${encodeURIComponent(searchQuery)}`, { replace: true })
      }
    } catch (error) {
      logger.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/30 dark:border-slate-800/30 bg-white dark:bg-slate-950 shadow-sm">
      <div className="flex w-full items-center px-3 md:px-6 py-2.5 md:py-3 gap-2 md:gap-4">
        {/* Logo - Mobile: Toggle sidebar, Desktop: Link to home */}
        {isMobile ? (
          <button
            onClick={toggleSidebar}
            className="text-lg md:text-3xl font-bold tracking-tight text-gemini-blue dark:text-gemini-blue-light flex-shrink-0 hover:opacity-80 transition"
            title="Menu"
          >
            DuThi
          </button>
        ) : (
          <Link 
            to="/" 
            className="text-lg md:text-3xl font-bold tracking-tight text-gemini-blue dark:text-gemini-blue-light flex-shrink-0"
          >
            DuThi
          </Link>
        )}

        {/* Navigation Links - Chỉ hiện trên desktop */}
        <nav className="hidden md:flex items-center gap-3 text-lg flex-1 justify-center">
          <Link
            to="/chat"
            className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-gemini-blue dark:hover:text-gemini-blue-light hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition font-medium"
            title="AI Chat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-lg">AI Chat</span>
          </Link>
          <Link
            to="/exam"
            className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-gemini-blue dark:hover:text-gemini-blue-light hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition font-medium"
            title="Phòng Thi"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-base">Phòng Thi</span>
          </Link>
          {showLiveQuiz && (
            <Link
              to="/live-quiz"
              className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-gemini-blue dark:hover:text-gemini-blue-light hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition font-medium"
              title="Live Quiz"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-base">Live Quiz</span>
            </Link>
          )}
          {/* Teacher/Admin Links - Chỉ hiện với teacher hoặc admin */}
          {(userRoles.includes('teacher') || userRoles.includes('admin')) && (
            <Link
              to="/teacher"
              className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-gemini-blue dark:hover:text-gemini-blue-light hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition font-medium"
              title="Teacher"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="text-base">Teacher</span>
            </Link>
          )}
          {userRoles.includes('admin') && (
            <Link
              to="/admin"
              className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-gemini-blue dark:hover:text-gemini-blue-light hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition font-medium"
              title="Admin"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-base">Admin</span>
            </Link>
          )}
        </nav>

        {/* Search - Mobile: Luôn hiển thị đầy đủ, Desktop: Icon bên phải, expand khi click */}
        <div 
          className={`relative transition-all duration-300 ${
            isMobile 
              ? 'flex-1' 
              : showSearchBar 
                ? 'flex-1 max-w-md' 
                : 'flex-shrink-0'
          }`}
          ref={searchRef}
        >
          {isMobile || showSearchBar ? (
            <form onSubmit={handleSearch} className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm..."
                autoFocus={!isMobile && showSearchBar}
                className="w-full px-3 md:px-4 py-2 pl-9 md:pl-10 pr-8 md:pr-10 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg focus:border-gemini-blue focus:outline-none focus:ring-2 focus:ring-gemini-blue/20 text-sm md:text-base"
              />
              <svg
                className="absolute left-2.5 md:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400 dark:text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {isSearching && (
                <div className="absolute right-8 md:right-10 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 md:h-4 md:w-4 border-b-2 border-gemini-blue"></div>
                </div>
              )}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setShowSearchDropdown(false)
                    if (!isMobile) {
                      setShowSearchBar(false)
                    }
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition"
                  title="Xóa"
                >
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </form>
          ) : (
            <button
              onClick={() => setShowSearchBar(true)}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-gemini-blue dark:hover:text-gemini-blue-light hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              title="Tìm kiếm"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
          )}
          
          {/* Search Dropdown */}
          {showSearchDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200/30 dark:border-slate-800/30 rounded-lg z-50 max-h-96 overflow-y-auto">
              {searchResults.map((post) => (
                <Link
                  key={post.id}
                  to="/"
                  onClick={() => {
                    setShowSearchDropdown(false)
                    setSearchQuery('')
                  }}
                  className="block px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-b-0 transition"
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
                    {post.text?.substring(0, 100)}...
                  </p>
        </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Side - Icons: Luôn hiển thị */}
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <ThemeToggle />
          <NotificationBell />
          
          {/* User Avatar - Chỉ hiện icon */}
          <div className="relative group">
          <img
            src={user?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.displayName}`}
            alt={user?.displayName}
              className="h-9 w-9 md:h-10 md:w-10 rounded-full border-2 border-slate-200 dark:border-slate-700 object-cover cursor-pointer hover:border-gemini-blue dark:hover:border-gemini-blue-light transition"
            />
            {/* Dropdown menu */}
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200/30 dark:border-slate-800/30 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-slate-100 text-base">{user?.displayName}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
              </div>
          <button
            onClick={logout}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Đăng xuất
          </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
