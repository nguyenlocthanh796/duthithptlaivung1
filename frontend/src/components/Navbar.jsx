import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { NotificationBell } from './NotificationBell'
import { isFeatureEnabled } from '../services/remoteConfigService'
import { searchPosts, getUserRoles } from '../services/firestore'
import { useSidebar } from '../context/SidebarContext'
import { Search, PanelRightClose, PanelRightOpen, Menu, LogOut, User, Settings } from 'lucide-react'
import logger from '../utils/logger'

export function Navbar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { toggleSidebar, setRightSidebarOpen, rightSidebarOpen } = useSidebar()
  const showLiveQuiz = isFeatureEnabled('enable_live_quiz')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchBar, setShowSearchBar] = useState(false)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [userRoles, setUserRoles] = useState([])
  const [isMobile, setIsMobile] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const searchRef = useRef(null)
  const userMenuRef = useRef(null)

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
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
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
      setSearchResults(results.slice(0, 5))
      setShowSearchDropdown(true)
      
      if (location.pathname !== '/') {
        navigate(`/?q=${encodeURIComponent(searchQuery)}`)
      } else {
        navigate(`/?q=${encodeURIComponent(searchQuery)}`, { replace: true })
      }
    } catch (error) {
      logger.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 z-50 shrink-0 shadow-sm">
      {/* Left: Logo - Mobile/Tablet: toggle menu (trừ trang /chat), Desktop: link về trang chủ */}
      <div className="flex items-center gap-3 md:gap-8">
        {isMobile && location.pathname !== '/chat' ? (
          <button
            onClick={(e) => {
              e.preventDefault()
              // Các trang khác dùng SidebarContext
              toggleSidebar()
            }}
            className="text-2xl font-bold text-blue-600 tracking-tight flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg text-white flex items-center justify-center font-bold text-lg">
              D
            </div>
            DuThi
          </button>
        ) : (
          <Link 
            to="/" 
            className="text-2xl font-bold text-blue-600 tracking-tight flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg text-white flex items-center justify-center font-bold text-lg">
              D
            </div>
            DuThi
          </Link>
        )}
      </div>

      {/* Center: Search Bar (Hidden on small mobile) */}
      <div className="hidden md:flex flex-1 max-w-xl mx-4 relative" ref={searchRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
        <form onSubmit={handleSearch} className="w-full">
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm câu hỏi, bài viết, người dùng..." 
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-transparent focus:bg-white border focus:border-blue-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all" 
          />
        </form>
        {showSearchDropdown && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg z-50 max-h-96 overflow-y-auto shadow-lg">
            {searchResults.map((post) => (
              <Link
                key={post.id}
                to="/"
                onClick={() => {
                  setShowSearchDropdown(false)
                  setSearchQuery('')
                }}
                className="block px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition"
              >
                <p className="text-sm font-medium text-gray-900 line-clamp-2">
                  {post.text?.substring(0, 100)}...
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 md:gap-4">
        <button className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-full">
          <Search size={20}/>
        </button>
        
        <NotificationBell />

        {/* Toggle Right Sidebar Button (Desktop Only) */}
        <button 
          onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
          className={`p-2 rounded-lg transition-colors hidden lg:block ${
            rightSidebarOpen ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
          }`}
          title={rightSidebarOpen ? "Thu gọn cột tiện ích" : "Mở cột tiện ích"}
        >
          {rightSidebarOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
        </button>

        <div className="h-8 w-[1px] bg-gray-200 mx-1 hidden md:block"></div>

        <Link 
          to="/dashboard"
          className="flex items-center justify-center hover:bg-gray-50 p-1.5 rounded-full border border-transparent hover:border-gray-200 transition-all"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full text-white flex items-center justify-center font-bold shadow-sm">
            {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
        </Link>
      </div>
    </header>
  )
}
