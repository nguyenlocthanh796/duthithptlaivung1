import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useSearchParams } from 'react-router-dom'
import { 
  Image as ImageIcon, 
  Send, 
  Camera, 
  Calculator
} from 'lucide-react'
import { watchPosts, getUserRoles, getMorePosts, searchPosts } from '../services/firestore'
import { createPost } from '../services/firestore'
import { uploadImage, uploadDocument } from '../services/storageService'
import { lazy, Suspense } from 'react'
import { ThreeColumnLayout } from '../components/ThreeColumnLayout'
import { RightSidebarContent } from '../components/RightSidebarContent'

// Lazy load heavy components
const PostList = lazy(() => import('../components/PostList').then(module => ({ default: module.PostList })))
import { useToast } from '../components/Toast'
import logger from '../utils/logger'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export function FeedPage() {
  const { user } = useAuth()
  const { success, error: showError } = useToast()
  // rightSidebarOpen is managed by Navbar, not needed here
  const [searchParams] = useSearchParams()
  const [posts, setPosts] = useState([])
  const [userRoles, setUserRoles] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [searchFilters, setSearchFilters] = useState(null)
  const [selectedFilter, setSelectedFilter] = useState('Tất cả')
  const [postText, setPostText] = useState('')
  const [imageFiles, setImageFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [documentFile, setDocumentFile] = useState(null)
  const [posting, setPosting] = useState(false)
  const observerRef = useRef(null)
  const lastPostRef = useRef(null)

  const filterTabs = ['Tất cả', 'Đại số 12', 'Hình học không gian', 'Vật lý hạt nhân', 'Tiếng Anh', 'Góc học tập']

  // Load user roles
  useEffect(() => {
    if (user?.uid) {
      getUserRoles(user.uid).then(setUserRoles)
    }
  }, [user?.uid])

  // Handle search
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

  // Load posts
  useEffect(() => {
    if (isSearching && searchFilters) {
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

  // Handle image selection
  const handleImageSelect = (e, isCamera = false) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Limit to 5 images total
    const remainingSlots = 5 - imageFiles.length
    if (remainingSlots <= 0) {
      showError('Chỉ có thể đính kèm tối đa 5 ảnh')
      return
    }

    const selectedFiles = files.slice(0, remainingSlots)
    const newFiles = [...imageFiles, ...selectedFiles]
    setImageFiles(newFiles)

    // Create previews
    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file))
    setImagePreviews([...imagePreviews, ...newPreviews])

    // Reset input
    e.target.value = ''
  }

  // Remove image
  const handleRemoveImage = (index) => {
    const newFiles = imageFiles.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)
    
    // Revoke object URL to free memory
    URL.revokeObjectURL(imagePreviews[index])
    
    setImageFiles(newFiles)
    setImagePreviews(newPreviews)
  }

  // Handle post submission
  const handlePostSubmit = async (e) => {
    e.preventDefault()
    if (!postText.trim() && imageFiles.length === 0 && !documentFile) {
      showError('Vui lòng nhập nội dung hoặc đính kèm file')
      return
    }
    
    setPosting(true)
    try {
      let imageUrls = []
      let documentUrl = null
      let documentType = null

      // Upload multiple images
      if (imageFiles.length > 0) {
        imageUrls = await Promise.all(
          imageFiles.map(file => uploadImage(file))
        )
      }

      if (documentFile) {
        documentUrl = await uploadDocument(documentFile)
        documentType = documentFile.type || (documentFile.name.endsWith('.pdf') ? 'application/pdf' : 'application/msword')
      }

      await createPost({
        text: postText,
        imageUrl: imageUrls.length > 0 ? imageUrls[0] : null, // Backward compatible
        imageUrls: imageUrls.length > 0 ? imageUrls : null, // New field for multiple images
        documentUrl,
        documentType,
        author: {
          uid: user.uid,
          displayName: user.displayName || user.email,
          photoURL: user.photoURL,
        },
      })

      success('Đăng bài thành công!')
      setPostText('')
      setImageFiles([])
      // Clean up preview URLs
      imagePreviews.forEach(url => URL.revokeObjectURL(url))
      setImagePreviews([])
      setDocumentFile(null)
    } catch (error) {
      logger.error('Error creating post:', error)
      showError('Không thể đăng bài. Vui lòng thử lại.')
    } finally {
      setPosting(false)
    }
  }

  // Load more posts
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

  const displayPosts = useMemo(() => posts, [posts])

  return (
    <ThreeColumnLayout rightSidebar={<RightSidebarContent />}>
      <div className="space-y-3 max-w-full">
        {/* Composer - Tối ưu hóa */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2.5">
          <div className="flex gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
              {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            <div className="flex-1">
              <form onSubmit={handlePostSubmit}>
                <textarea 
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  placeholder="Bạn đang vướng mắc bài toán nào? (Gõ LaTeX hoặc chụp ảnh)..." 
                  className="w-full resize-none outline-none text-gray-700 text-sm min-h-[45px] placeholder:text-gray-400 bg-transparent"
                ></textarea>
                
                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img 
                          src={preview} 
                          alt={`Preview ${index + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {documentFile && (
                  <div className="mt-2 text-sm text-gray-500">
                    <span>📄 {documentFile.name}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                  <div className="flex gap-1.5">
                    <label className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-xs font-medium transition-colors cursor-pointer">
                      <Camera size={16} />
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handleImageSelect(e, true)}
                        disabled={posting || imageFiles.length >= 5}
                      />
                    </label>
                    <label className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 text-gray-600 rounded-lg hover:bg-green-50 hover:text-green-600 text-xs font-medium transition-colors cursor-pointer">
                      <ImageIcon size={16} />
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        multiple
                        className="hidden"
                        onChange={(e) => handleImageSelect(e, false)}
                        disabled={posting || imageFiles.length >= 5}
                      />
                    </label>
                    <label className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 text-gray-600 rounded-lg hover:bg-purple-50 hover:text-purple-600 text-xs font-medium transition-colors cursor-pointer">
                      <Calculator size={16} />
                      <input
                        type="file"
                        accept="application/pdf,.doc,.docx"
                        className="hidden"
                        onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                        disabled={posting}
                      />
                    </label>
                  </div>
                  <button 
                    type="submit"
                    disabled={posting || (!postText.trim() && imageFiles.length === 0 && !documentFile)}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Đăng bài <Send size={14} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {filterTabs.map((tag, i) => (
            <button 
              key={i} 
              onClick={() => setSelectedFilter(tag)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap font-medium border transition-all ${
                selectedFilter === tag 
                  ? 'bg-gray-800 text-white border-gray-800 shadow-sm' 
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Feed Posts */}
        <Suspense fallback={<div className="text-center py-8 text-gray-500">Đang tải...</div>}>
          <PostList 
            posts={displayPosts} 
            userId={user?.uid} 
            userRoles={userRoles} 
            currentUser={user}
            lastPostElementRef={isSearching ? null : lastPostElementRef}
            loading={loading}
            onSearch={handleSearch}
          />
        </Suspense>
      </div>
    </ThreeColumnLayout>
  )
}
