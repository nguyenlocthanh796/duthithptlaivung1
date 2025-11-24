import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useSearchParams } from 'react-router-dom'
import { PostComposer } from '../components/PostComposer'
import { PostList } from '../components/PostList'
import { ThreeColumnLayout } from '../components/ThreeColumnLayout'
import { RightSidebarContent } from '../components/RightSidebarContent'
import { watchPosts, getUserRoles, getMorePosts, searchPosts } from '../services/firestore'
import logger from '../utils/logger'

export function FeedPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [posts, setPosts] = useState([])
  const [userRoles, setUserRoles] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [searchFilters, setSearchFilters] = useState(null)
  const observerRef = useRef(null)
  const lastPostRef = useRef(null)

  const handleSearch = useCallback((filters) => {
    setIsSearching(true)
    setSearchFilters(filters)
  }, [])

  // Check URL params for search query
  useEffect(() => {
    const query = searchParams.get('q')
    if (query) {
      handleSearch({
        query,
        subject: searchParams.get('subject') || 'all',
        type: searchParams.get('type') || 'all',
        time: searchParams.get('time') || 'all',
      })
    }
  }, [searchParams, handleSearch])

  useEffect(() => {
    if (isSearching && searchFilters) {
      // Search mode
      setLoading(true)
      searchPosts(searchFilters).then((results) => {
        setPosts(results)
        setHasMore(false)
        setLoading(false)
      }).catch((error) => {
        logger.error('Search error:', error)
        setLoading(false)
      })
    } else {
      // Normal feed mode
    const unsub = watchPosts((newPosts) => {
      setPosts(newPosts)
      if (newPosts.length > 0) {
        lastPostRef.current = newPosts[newPosts.length - 1]
      }
        setHasMore(true)
    })
    return () => unsub()
    }
  }, [isSearching, searchFilters])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !lastPostRef.current) return
    
    setLoading(true)
    try {
      const morePosts = await getMorePosts(lastPostRef.current)
      if (morePosts.length === 0) {
        setHasMore(false)
      } else {
        setPosts((prev) => [...prev, ...morePosts])
        lastPostRef.current = morePosts[morePosts.length - 1]
      }
    } catch (error) {
      logger.error('Error loading more posts:', error)
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore])

  const lastPostElementRef = useCallback((node) => {
    if (loading) return
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore()
      }
    })
    if (node) observerRef.current.observe(node)
  }, [loading, hasMore, loadMore])

  useEffect(() => {
    if (user?.uid) {
      getUserRoles(user.uid).then(setUserRoles)
    }
  }, [user?.uid])

  const handleFilterChange = (filters) => {
    if (isSearching) {
      setSearchFilters(filters)
    }
  }

  const handleClearSearch = useCallback(() => {
    setIsSearching(false)
    setSearchFilters(null)
    // Clear URL params
    window.history.replaceState({}, '', '/')
  }, [])

  // Memoize filtered posts to prevent unnecessary re-renders
  const displayPosts = useMemo(() => posts, [posts])

  return (
    <ThreeColumnLayout rightSidebar={<RightSidebarContent />}>
      <div className="space-y-4">
        <section className="bg-white dark:bg-slate-900 p-6 border border-slate-200/50 dark:border-slate-800/50 rounded-lg">
          <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">News Feed</p>
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-slate-100">
            Xin chào, {user.displayName?.split(' ')[0] || ''}!
          </h2>
          <p className="mt-1 text-base text-slate-600 dark:text-slate-400">
            Cập nhật tài liệu, hỏi đáp và chia sẻ kinh nghiệm luyện thi cùng cộng đồng.
          </p>
        </section>
        
        {isSearching && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm md:text-base text-blue-800 dark:text-blue-200">
              Đang tìm kiếm: {searchFilters?.query || 'Tất cả'} 
              {searchFilters?.subject !== 'all' && ` • Môn: ${searchFilters.subject}`}
              {searchFilters?.type !== 'all' && ` • Loại: ${searchFilters.type}`}
            </span>
            <button
              onClick={handleClearSearch}
              className="text-sm md:text-base text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 underline"
            >
              Xóa bộ lọc
            </button>
          </div>
        )}
        
        {!isSearching && <PostComposer user={user} />}
        
        <PostList 
          posts={displayPosts} 
          userId={user.uid} 
          userRoles={userRoles} 
          currentUser={user}
          lastPostElementRef={isSearching ? null : lastPostElementRef}
          loading={loading}
          onSearch={handleSearch}
        />
      </div>
    </ThreeColumnLayout>
  )
}
