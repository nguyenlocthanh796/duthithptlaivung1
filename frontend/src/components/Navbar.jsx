import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { NotificationBell } from './NotificationBell'
import { ThemeToggle } from './ThemeToggle'
import { isFeatureEnabled } from '../services/remoteConfigService'
import { searchPosts, getUserRoles } from '../services/firestore'
import logger from '../utils/logger'

export function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const showLiveQuiz = isFeatureEnabled('enable_live_quiz')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchBar, setShowSearchBar] = useState(false)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [userRoles, setUserRoles] = useState([])
  const searchRef = useRef(null)

  // Load user roles
  useEffect(() => {
    if (user?.uid) {
      getUserRoles(user.uid).then(setUserRoles)
    }
  }, [user?.uid])

  // Close search bar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        if (!showSearchDropdown) {
          setShowSearchBar(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSearchDropdown])

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
      <div className="flex w-full items-center px-4 py-3 md:px-6 gap-4">
        {/* Logo - Rút gọn */}
        <Link to="/" className="text-xl md:text-2xl font-bold tracking-tight text-gemini-blue dark:text-gemini-blue-light flex-shrink-0">
          DuThi
        </Link>

        {/* Navigation Links - Căn giữa */}
        <nav className="hidden md:flex items-center gap-3 text-base flex-1 justify-center">
          <Link
            to="/chat"
            className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-gemini-blue dark:hover:text-gemini-blue-light hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition font-medium"
            title="AI Chat"
          >
            <span className="text-xl">💬</span>
            <span className="text-base">AI Chat</span>
          </Link>
          <Link
            to="/exam"
            className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-gemini-blue dark:hover:text-gemini-blue-light hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition font-medium"
            title="Phòng Thi"
          >
            <span className="text-xl">📝</span>
            <span className="text-base">Phòng Thi</span>
          </Link>
          {showLiveQuiz && (
            <Link
              to="/live-quiz"
              className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-gemini-blue dark:hover:text-gemini-blue-light hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition font-medium"
              title="Live Quiz"
            >
              <span className="text-xl">🎮</span>
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
              <span className="text-xl">👨‍🏫</span>
              <span className="text-base">Teacher</span>
            </Link>
          )}
          {userRoles.includes('admin') && (
            <Link
              to="/admin"
              className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-gemini-blue dark:hover:text-gemini-blue-light hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition font-medium"
              title="Admin"
            >
              <span className="text-xl">⚙️</span>
              <span className="text-base">Admin</span>
            </Link>
          )}
        </nav>

        {/* Search - Icon only, click to expand */}
        <div className="max-w-xs relative" ref={searchRef}>
          {!showSearchBar ? (
            // Search Icon Button
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
          ) : (
            // Search Bar (expanded)
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm bài viết, câu hỏi..."
                autoFocus
                className="w-full px-4 py-2 pl-10 pr-10 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg focus:border-gemini-blue focus:outline-none focus:ring-2 focus:ring-gemini-blue/20 text-base"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500"
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
                <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gemini-blue"></div>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowSearchBar(false)
                  setSearchQuery('')
                  setShowSearchDropdown(false)
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                title="Đóng"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </form>
          )}
          
          {/* Search Dropdown */}
          {showSearchDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200/30 dark:border-slate-800/30 rounded z-50 max-h-96 overflow-y-auto">
              {searchResults.map((post) => (
                <Link
                  key={post.id}
                  to="/"
                  onClick={() => {
                    setShowSearchDropdown(false)
                    setShowSearchBar(false)
                  }}
                  className="block px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
                    {post.text?.substring(0, 100)}...
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Side - Icons only */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <ThemeToggle />
          <NotificationBell />
          
          {/* User Avatar - Chỉ hiện icon */}
          <div className="relative group">
            <img
              src={user?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.displayName}`}
              alt={user?.displayName}
              className="h-10 w-10 rounded-full border-2 border-slate-200 dark:border-slate-700 object-cover cursor-pointer hover:border-gemini-blue dark:hover:border-gemini-blue-light transition"
            />
            {/* Dropdown menu */}
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200/30 dark:border-slate-800/30 rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
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
