import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { PostComposer } from '../components/PostComposer'
import { PostList } from '../components/PostList'
import { SearchBar } from '../components/SearchBar'
import { ThreeColumnLayout } from '../components/ThreeColumnLayout'
import { RightSidebarContent } from '../components/RightSidebarContent'
import { watchPosts, getUserRoles, getMorePosts, searchPosts } from '../services/firestore'

export function FeedPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [userRoles, setUserRoles] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [searchFilters, setSearchFilters] = useState(null)
  const observerRef = useRef(null)
  const lastPostRef = useRef(null)

  useEffect(() => {
    if (isSearching && searchFilters) {
      // Search mode
      setLoading(true)
      searchPosts(searchFilters).then((results) => {
        setPosts(results)
        setHasMore(false)
        setLoading(false)
      }).catch((error) => {
        console.error('Search error:', error)
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
      console.error('Error loading more posts:', error)
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

  const handleSearch = (filters) => {
    setIsSearching(true)
    setSearchFilters(filters)
  }

  const handleFilterChange = (filters) => {
    if (isSearching) {
      setSearchFilters(filters)
    }
  }

  const handleClearSearch = () => {
    setIsSearching(false)
    setSearchFilters(null)
  }

  return (
    <ThreeColumnLayout rightSidebar={<RightSidebarContent />}>
      <div className="space-y-4">
        <section className="bg-white p-6 border border-slate-200 rounded-lg">
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">News Feed</p>
          <h2 className="text-2xl font-semibold text-slate-900">
            Xin chào, {user.displayName?.split(' ')[0] || ''}!
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Cập nhật tài liệu, hỏi đáp và chia sẻ kinh nghiệm luyện thi cùng cộng đồng.
          </p>
        </section>
        
        <SearchBar onSearch={handleSearch} onFilterChange={handleFilterChange} />
        
        {isSearching && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm text-blue-800">
              Đang tìm kiếm: {searchFilters?.query || 'Tất cả'} 
              {searchFilters?.subject !== 'all' && ` • Môn: ${searchFilters.subject}`}
              {searchFilters?.type !== 'all' && ` • Loại: ${searchFilters.type}`}
            </span>
            <button
              onClick={handleClearSearch}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Xóa bộ lọc
            </button>
          </div>
        )}
        
        {!isSearching && <PostComposer user={user} />}
        
        <PostList 
          posts={posts} 
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
