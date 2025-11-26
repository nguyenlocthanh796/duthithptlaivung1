import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useState, useEffect, useRef, memo, useMemo, useCallback, lazy, Suspense } from 'react'
import { Heart, MessageSquare, PenTool, MoreHorizontal, CheckCircle, HelpCircle, CheckCircle2 } from 'lucide-react'
import { renderTextWithLatex } from '../utils/latexRenderer'
import logger from '../utils/logger'

// Lazy load heavy components
const SolutionModal = lazy(() => import('./SolutionModal').then(module => ({ default: module.SolutionModal })))
const ImageModal = lazy(() => import('./ImageModal').then(module => ({ default: module.ImageModal })))
import {
  toggleLike,
  addComment,
  updateCommentSolution,
  flagCommentSolution,
  getUserRoles,
  updatePost,
  solvePost,
  updatePostSolution,
  flagPostSolution,
  deletePostSolution,
  deletePost,
  flagPost,
  approvePost,
  rejectPost,
  createNotification,
  addReplyToComment,
  deleteComment,
  deleteReply,
  updateComment,
  updateReply,
  savePost,
  unsavePost,
  isPostSaved,
} from '../services/firestore'
import { solvePost as solvePostAPI } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { useToast } from './Toast'

dayjs.extend(relativeTime)

function normalizeArray(value) {
  if (Array.isArray(value)) return value
  if (!value) return []
  return Object.values(value)
}


const PostItem = memo(function PostItem({ post, userId, userRoles = [], currentUser }) {
  const { success, error: showError } = useToast()
  const [commentText, setCommentText] = useState('')
  const [editingIndex, setEditingIndex] = useState(null)
  const [editSolution, setEditSolution] = useState('')
  const [isEditingPost, setIsEditingPost] = useState(false)
  const [editPostText, setEditPostText] = useState('')
  const [isSolvingPost, setIsSolvingPost] = useState(false)
  const [showPostSolution, setShowPostSolution] = useState(false)
  const [editingPostSolution, setEditingPostSolution] = useState(false)
  const [editPostSolutionText, setEditPostSolutionText] = useState('')
  // Reply states: { commentIndex: { replyText: '', showReplyForm: false, editingReplyIndex: null, editReplyText: '' } }
  const [replyStates, setReplyStates] = useState({})
  // Comment editing states
  const [editingCommentIndex, setEditingCommentIndex] = useState(null)
  const [editCommentText, setEditCommentText] = useState('')
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [savedPosts, setSavedPosts] = useState(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [showSolutionModal, setShowSolutionModal] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  
  // Load saved posts
  useEffect(() => {
    if (userId && post.id) {
      isPostSaved({ userId, postId: post.id }).then((saved) => {
        if (saved) {
          setSavedPosts((prev) => new Set([...prev, post.id]))
        }
      }).catch(() => {})
    }
  }, [userId, post.id])
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMoreMenu && !event.target.closest('.more-menu-container')) {
        setShowMoreMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMoreMenu])

  const likes = normalizeArray(post.likes)
  const comments = normalizeArray(post.comments)
  const liked = likes.includes(userId)
  const isSaved = savedPosts.has(post.id)
  const isAdmin = userRoles.includes('admin')
  const isTeacher = userRoles.includes('teacher')
  const isModerator = userRoles.includes('moderator') || isAdmin || isTeacher
  const isPostAuthor = post.author?.uid === userId
  const canEditPost = isPostAuthor || isAdmin || isTeacher

  const handleSavePost = async () => {
    if (!userId) {
      showError('Bạn cần đăng nhập để lưu bài viết')
      return
    }
    
    setIsSaving(true)
    try {
      if (isSaved) {
        await unsavePost({ userId, postId: post.id })
        setSavedPosts((prev) => {
          const newSet = new Set(prev)
          newSet.delete(post.id)
          return newSet
        })
        success('Đã bỏ lưu bài viết')
      } else {
        await savePost({ userId, postId: post.id })
        setSavedPosts((prev) => new Set([...prev, post.id]))
        success('Đã lưu bài viết')
      }
    } catch (error) {
      logger.error('Error saving post:', error)
      showError(error.message || 'Không thể lưu bài viết. Vui lòng thử lại.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateSolution = async (commentIndex) => {
    if (!editSolution.trim()) {
      showError('Vui lòng nhập nội dung giải đáp')
      return
    }
    
    if (!userId) {
      showError('Bạn cần đăng nhập để cập nhật giải đáp')
      return
    }
    
    try {
    await updateCommentSolution({
      postId: post.id,
      commentIndex,
        solution: editSolution.trim(),
      updatedBy: userId,
    })
    setEditingIndex(null)
    setEditSolution('')
      success('Đã cập nhật giải đáp thành công!')
    } catch (error) {
      logger.error('Error updating solution:', error)
      showError(error.message || 'Không thể cập nhật giải đáp. Vui lòng thử lại.')
    }
  }

  const handleFlagSolution = async (commentIndex) => {
    if (!confirm('Bạn có chắc muốn đánh dấu giải đáp này là sai?')) return
    
    try {
    await flagCommentSolution({ postId: post.id, commentIndex })
      success('Đã đánh dấu giải đáp là sai')
    } catch (error) {
      logger.error('Error flagging solution:', error)
      showError(error.message || 'Không thể đánh dấu giải đáp. Vui lòng thử lại.')
    }
  }

  const handleEditPost = () => {
    setEditPostText(post.text)
    setIsEditingPost(true)
  }

  const handleUpdatePost = async () => {
    if (!editPostText.trim()) {
      showError('Vui lòng nhập nội dung bài viết')
      return
    }
    
    try {
      await updatePost({ postId: post.id, text: editPostText.trim() })
      setIsEditingPost(false)
      setEditPostText('')
      success('Đã cập nhật bài viết thành công!')
    } catch (error) {
      logger.error('Error saving post:', error)
      showError(error.message || 'Không thể lưu chỉnh sửa. Vui lòng thử lại.')
    }
  }

  const handleDeletePost = async () => {
    if (!confirm('Bạn có chắc muốn xóa bài viết này?')) return
    
      try {
        await deletePost({ postId: post.id })
      success('Đã xóa bài viết thành công!')
      } catch (error) {
        logger.error('Error deleting post:', error)
      showError(error.message || 'Không thể xóa bài viết. Vui lòng thử lại.')
    }
  }

  const handleFlagPost = async () => {
    const reason = prompt('Lý do vi phạm:')
    if (!reason || !reason.trim()) {
      if (reason !== null) showError('Vui lòng nhập lý do vi phạm')
      return
    }
    
    try {
      await flagPost({ postId: post.id, reason: reason.trim() })
      success('Bài viết đã được báo cáo và sẽ được kiểm duyệt.')
      } catch (error) {
        logger.error('Error flagging post:', error)
      showError(error.message || 'Không thể báo cáo bài viết. Vui lòng thử lại.')
    }
  }

  const handleApprovePost = async () => {
    try {
      await approvePost({ postId: post.id })
      success('Đã duyệt bài viết thành công!')
    } catch (error) {
      logger.error('Error approving post:', error)
      showError(error.message || 'Không thể duyệt bài viết. Vui lòng thử lại.')
    }
  }

  const handleRejectPost = async () => {
    if (!confirm('Bạn có chắc muốn xóa bài viết vi phạm này?')) return
    
      try {
        await rejectPost({ postId: post.id })
      success('Đã xóa bài viết vi phạm thành công!')
      } catch (error) {
        logger.error('Error rejecting post:', error)
      showError(error.message || 'Không thể xóa bài viết. Vui lòng thử lại.')
    }
  }

  const handleSolvePost = async () => {
    if (!post.text || post.solution) {
      if (post.solution) {
        showError('Bài viết đã có giải đáp rồi')
      }
      return
    }
    
    if (!userId) {
      showError('Bạn cần đăng nhập để sử dụng tính năng này')
      return
    }
    
    setIsSolvingPost(true)
    try {
      // Gửi cả text và imageUrl nếu có
      const response = await solvePostAPI(post.text || '', post.imageUrl || null)
      
      if (!response?.solution) {
        throw new Error('Không nhận được giải đáp từ server')
      }
      
      await solvePost({
        postId: post.id,
        solution: response.solution,
        solvedBy: userId,
      })
      
      // Tự động mở kết quả sau khi giải
      setShowPostSolution(true)
      
      // Tạo thông báo cho tác giả bài viết
      if (post.author?.uid && post.author.uid !== userId) {
        try {
        await createNotification({
          userId: post.author.uid,
          type: 'solution',
          title: 'Bài viết của bạn đã được giải đáp',
          message: `${currentUser?.displayName || 'Ai đó'} đã giải đáp bài viết của bạn`,
          postId: post.id,
          relatedUserId: userId,
        })
        } catch (notifError) {
          logger.error('Error creating notification:', notifError)
          // Don't fail if notification fails
      }
      }
      
      success('Đã giải bài thành công!')
    } catch (error) {
      logger.error('Error solving post:', error)
      
      // Xử lý các loại lỗi khác nhau
      let errorMsg = 'Không thể giải bài. Vui lòng thử lại.'
      
      if (error.response) {
        // Lỗi từ server
        const status = error.response.status
        const detail = error.response.data?.detail || error.response.data?.message
        
        if (status === 403) {
          errorMsg = detail || 'API key không hợp lệ. Vui lòng liên hệ quản trị viên.'
        } else if (status === 429) {
          errorMsg = detail || 'Đã vượt quá giới hạn API. Vui lòng thử lại sau.'
        } else if (status === 400) {
          errorMsg = detail || 'Nội dung không hợp lệ. Vui lòng kiểm tra lại.'
        } else if (status === 503) {
          errorMsg = detail || 'Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau.'
        } else if (detail) {
          errorMsg = detail
        } else {
          errorMsg = `Lỗi server (${status}). Vui lòng thử lại sau.`
        }
      } else if (error.message) {
        errorMsg = error.message
      }
      
      showError(errorMsg)
    } finally {
      setIsSolvingPost(false)
    }
  }

  const handleUpdatePostSolution = async () => {
    if (!editPostSolutionText.trim()) {
      showError('Vui lòng nhập nội dung giải đáp')
      return
    }
    
    if (!userId) {
      showError('Bạn cần đăng nhập để cập nhật giải đáp')
      return
    }
    
    try {
    await updatePostSolution({
      postId: post.id,
        solution: editPostSolutionText.trim(),
      updatedBy: userId,
    })
    setEditingPostSolution(false)
    setEditPostSolutionText('')
      success('Đã cập nhật giải đáp thành công!')
    } catch (error) {
      logger.error('Error updating post solution:', error)
      showError(error.message || 'Không thể cập nhật giải đáp. Vui lòng thử lại.')
    }
  }

  const handleFlagPostSolution = async () => {
    if (!confirm('Bạn có chắc muốn đánh dấu giải đáp này là sai?')) return
    
    try {
    await flagPostSolution({ postId: post.id })
      success('Đã đánh dấu giải đáp là sai')
    } catch (error) {
      logger.error('Error flagging post solution:', error)
      showError(error.message || 'Không thể đánh dấu giải đáp. Vui lòng thử lại.')
    }
  }

  const handleDeletePostSolution = async () => {
    if (!confirm('Bạn có chắc muốn xóa giải đáp này?')) return
    
    try {
      await deletePostSolution({ postId: post.id })
      setShowPostSolution(false)
      success('Đã xóa giải đáp thành công!')
    } catch (error) {
      logger.error('Error deleting post solution:', error)
      showError(error.message || 'Không thể xóa giải đáp. Vui lòng thử lại.')
    }
  }

  const handleAddComment = async (event) => {
    event.preventDefault()
    if (!commentText.trim()) {
      showError('Vui lòng nhập nội dung bình luận')
      return
    }
    
    if (!userId) {
      showError('Bạn cần đăng nhập để bình luận')
      return
    }
    
    try {
    await addComment({
      postId: post.id,
      comment: {
          text: commentText.trim(),
        authorId: userId,
        authorName: currentUser?.displayName || 'Người dùng',
        authorPhoto: currentUser?.photoURL || null,
        createdAt: new Date().toISOString(),
          replies: [],
      },
    })
    
    // Tạo thông báo cho tác giả bài viết
    if (post.author?.uid && post.author.uid !== userId) {
        try {
      await createNotification({
        userId: post.author.uid,
        type: 'comment',
        title: 'Có người bình luận bài viết của bạn',
        message: `${currentUser?.displayName || 'Ai đó'} đã bình luận: ${commentText.substring(0, 50)}...`,
        postId: post.id,
        relatedUserId: userId,
      })
        } catch (notifError) {
          logger.error('Error creating notification:', notifError)
          // Don't fail the comment if notification fails
        }
    }
    
    setCommentText('')
      success('Đã thêm bình luận thành công!')
    } catch (error) {
      logger.error('Error adding comment:', error)
      showError(error.message || 'Không thể thêm bình luận. Vui lòng thử lại.')
    }
  }

  const handleToggleReplyForm = (commentIndex) => {
    setReplyStates((prev) => ({
      ...prev,
      [commentIndex]: {
        ...prev[commentIndex],
        showReplyForm: !prev[commentIndex]?.showReplyForm,
        replyText: prev[commentIndex]?.replyText || '',
      },
    }))
  }

  const handleAddReply = async (commentIndex, event) => {
    event.preventDefault()
    const replyText = replyStates[commentIndex]?.replyText || ''
    
    if (!replyText.trim()) {
      showError('Vui lòng nhập nội dung trả lời')
      return
    }
    
    if (!userId) {
      showError('Bạn cần đăng nhập để trả lời')
      return
    }
    
    try {
      const comment = comments[commentIndex]
      if (!comment) {
        showError('Bình luận không tồn tại')
        return
      }
      
      await addReplyToComment({
        postId: post.id,
        commentIndex,
        reply: {
          text: replyText.trim(),
          authorId: userId,
          authorName: currentUser?.displayName || 'Người dùng',
          authorPhoto: currentUser?.photoURL || null,
          createdAt: new Date().toISOString(),
        },
      })
      
      // Tạo thông báo cho tác giả bình luận
      if (comment.authorId && comment.authorId !== userId) {
        try {
          await createNotification({
            userId: comment.authorId,
            type: 'reply',
            title: 'Có người trả lời bình luận của bạn',
            message: `${currentUser?.displayName || 'Ai đó'} đã trả lời: ${replyText.substring(0, 50)}...`,
            postId: post.id,
            commentIndex,
            relatedUserId: userId,
          })
        } catch (notifError) {
          logger.error('Error creating notification:', notifError)
        }
      }
      
      // Reset reply form
      setReplyStates((prev) => ({
        ...prev,
        [commentIndex]: {
          ...prev[commentIndex],
          replyText: '',
          showReplyForm: false,
        },
      }))
      
      success('Đã trả lời thành công!')
    } catch (error) {
      logger.error('Error adding reply:', error)
      showError(error.message || 'Không thể thêm trả lời. Vui lòng thử lại.')
    }
  }

  const handleDeleteComment = async (commentIndex) => {
    if (!confirm('Bạn có chắc muốn xóa bình luận này?')) return
    
    try {
      await deleteComment({ postId: post.id, commentIndex })
      success('Đã xóa bình luận thành công!')
    } catch (error) {
      logger.error('Error deleting comment:', error)
      showError(error.message || 'Không thể xóa bình luận. Vui lòng thử lại.')
    }
  }

  const handleDeleteReply = async (commentIndex, replyIndex) => {
    if (!confirm('Bạn có chắc muốn xóa trả lời này?')) return
    
    try {
      await deleteReply({ postId: post.id, commentIndex, replyIndex })
      success('Đã xóa trả lời thành công!')
    } catch (error) {
      logger.error('Error deleting reply:', error)
      showError(error.message || 'Không thể xóa trả lời. Vui lòng thử lại.')
    }
  }

  const handleEditComment = async (commentIndex) => {
    if (!editCommentText.trim()) {
      showError('Vui lòng nhập nội dung bình luận')
      return
    }
    
    try {
      await updateComment({
        postId: post.id,
        commentIndex,
        text: editCommentText.trim(),
      })
      setEditingCommentIndex(null)
      setEditCommentText('')
      success('Đã cập nhật bình luận thành công!')
    } catch (error) {
      logger.error('Error updating comment:', error)
      showError(error.message || 'Không thể cập nhật bình luận. Vui lòng thử lại.')
    }
  }

  const handleEditReply = async (commentIndex, replyIndex) => {
    const editText = replyStates[commentIndex]?.editReplyText || ''
    if (!editText.trim()) {
      showError('Vui lòng nhập nội dung trả lời')
      return
    }
    
    try {
      await updateReply({
        postId: post.id,
        commentIndex,
        replyIndex,
        text: editText.trim(),
      })
      
      setReplyStates((prev) => ({
        ...prev,
        [commentIndex]: {
          ...prev[commentIndex],
          editingReplyIndex: null,
          editReplyText: '',
        },
      }))
      
      success('Đã cập nhật trả lời thành công!')
    } catch (error) {
      logger.error('Error updating reply:', error)
      showError(error.message || 'Không thể cập nhật trả lời. Vui lòng thử lại.')
    }
  }

  // Get user badge color based on role (from post author, not current user)
  const getUserBadgeColor = () => {
    // Default colors - can be enhanced with actual author roles from post
    return 'bg-blue-600'
  }

  // Format likes count for display
  const formatLikesCount = (count) => {
    if (count === 0) return ''
    if (count < 1000) return count.toString()
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`
    return `${(count / 1000000).toFixed(1)}M`
  }

  return (
    <article className="bg-white border-b border-gray-200 overflow-hidden">
      {/* Header - Facebook Style - Tối ưu hóa */}
      <div className="px-3 pt-2.5 pb-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Profile Picture - Smaller like Facebook */}
            <img
              src={post.author?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${post.author?.name || post.author?.displayName || 'User'}`}
              alt={post.author?.name || post.author?.displayName}
              className="w-9 h-9 rounded-full object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-sm text-gray-900 hover:underline cursor-pointer truncate">
                  {post.author?.name || post.author?.displayName || 'Người dùng'}
                </h3>
                {(userRoles.includes('teacher') || userRoles.includes('admin')) && (
                  <CheckCircle size={12} className="text-blue-500 fill-blue-100 flex-shrink-0" />
                )}
                <span className="text-gray-500 text-xs">•</span>
                <span className="text-gray-500 text-xs hover:underline cursor-pointer">
                  {dayjs(post.createdAt?.toDate?.() || post.createdAt).fromNow()}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="text-gray-500 hover:bg-gray-100 p-1 rounded-full transition-colors flex-shrink-0"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
        {/* More Menu Dropdown */}
        {showMoreMenu && (
          <div className="relative">
            {canEditPost && !isEditingPost && (
              <div className="absolute right-0 top-2 bg-white rounded-lg border border-gray-200 py-1 z-50 min-w-[160px] shadow-xl">
              <button
                onClick={() => {
                  handleEditPost()
                  setShowMoreMenu(false)
                }}
                className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left flex items-center gap-2"
              >
                <span>✏️</span>
                <span>Chỉnh sửa</span>
              </button>
              {isPostAuthor && (
                <button
                  onClick={() => {
                    handleDeletePost()
                    setShowMoreMenu(false)
                  }}
                  className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center gap-2 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Xóa bài viết</span>
                </button>
              )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content - Tối ưu hóa spacing */}
      <div className="px-3 pb-2">
        {isEditingPost ? (
          <div className="space-y-2">
            <textarea
              className="w-full border border-slate-200 bg-white p-2 text-sm focus:border-gemini-blue focus:outline-none focus:ring-1 focus:ring-gemini-blue"
              rows="4"
              value={editPostText}
              onChange={(e) => setEditPostText(e.target.value)}
            />
            <div className="flex gap-2 items-center">
              <button
                onClick={handleUpdatePost}
                className="bg-gemini-blue px-4 py-2 text-base font-medium text-white hover:bg-gemini-blue/90 transition shadow-sm"
              >
                💾 Lưu
              </button>
              <button
                onClick={() => {
                  setIsEditingPost(false)
                  setEditPostText('')
                }}
                className="border border-slate-300 px-4 py-2 text-base font-medium hover:bg-slate-50 transition"
              >
                Hủy
              </button>
              {isPostAuthor && (
                <button
                  onClick={handleDeletePost}
                  className="border border-slate-300 dark:border-slate-600 px-4 py-2 text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition rounded flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Xóa</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm leading-relaxed text-gray-900 break-words">
            {renderTextWithLatex(post.text)}
          </div>
        )}
      </div>

      {/* Hiển thị ảnh - Tối ưu hóa - Hỗ trợ nhiều ảnh */}
      {(post.imageUrls && post.imageUrls.length > 0) || post.imageUrl ? (
        <div className="w-full">
          {/* Hiển thị nhiều ảnh */}
          {post.imageUrls && post.imageUrls.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {post.imageUrls.map((url, index) => (
                <div 
                  key={index}
                  className="cursor-pointer relative"
                  onClick={() => {
                    setSelectedImageIndex(index)
                    setShowImageModal(true)
                  }}
                >
                  <img
                    src={url}
                    alt={`Bài viết ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg bg-gray-50"
                  />
                  {post.imageUrls.length > 4 && index === 3 && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                      +{post.imageUrls.length - 4}
                    </div>
                  )}
                </div>
              )).slice(0, 4)}
            </div>
          ) : (
            // Fallback: hiển thị 1 ảnh
            <div className="w-full cursor-pointer" onClick={() => {
              setSelectedImageIndex(0)
              setShowImageModal(true)
            }}>
              <img
                src={post.imageUrl}
                alt="Bài viết"
                className="w-full max-h-[500px] object-contain bg-gray-50 rounded-lg"
              />
            </div>
          )}
        </div>
      ) : null}

      {/* Hiển thị tài liệu - Tối ưu hóa */}
      {post.documentUrl && (
        <a
          href={post.documentUrl}
          target="_blank"
          rel="noreferrer"
          className="mx-3 mb-2 flex items-center gap-2 border border-gray-200 bg-gray-50 px-3 py-2 rounded-lg text-xs text-gray-700 transition hover:bg-gray-100"
        >
          <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span>
            {post.documentType === 'pdf' ? 'Xem tài liệu PDF' : `Xem tài liệu ${post.documentType.toUpperCase()}`}
          </span>
          <svg className="w-4 h-4 text-slate-500 dark:text-slate-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      )}

      {/* Trạng thái vi phạm */}
      {post.isPendingReview && (
        <div className="mx-4 mb-2 p-3 bg-gray-100 border border-gray-300 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">Bài viết đang chờ kiểm duyệt</p>
          </div>
          {isModerator && (
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleApprovePost}
                className="bg-gemini-blue px-3 py-1 text-sm text-white hover:bg-gemini-blue/90 transition rounded"
              >
                <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Duyệt
              </button>
              <button
                onClick={handleRejectPost}
                className="border border-slate-300 dark:border-slate-600 px-3 py-1 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition rounded"
              >
                <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Xóa
              </button>
            </div>
          )}
        </div>
      )}

      {/* Reactions Bar - Facebook Style - Tối ưu hóa */}
      {(likes.length > 0 || comments.length > 0) && (
        <div className="px-3 py-1.5 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            {likes.length > 0 && (
              <>
                <div className="flex items-center -space-x-1">
                  <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center">
                    <span className="text-white text-[8px]">👍</span>
                  </div>
                  <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white flex items-center justify-center">
                    <span className="text-white text-[8px]">❤️</span>
                  </div>
                </div>
                <span className="ml-1">{formatLikesCount(likes.length)}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {comments.length > 0 && (
              <span className="hover:underline cursor-pointer">{comments.length} bình luận</span>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons - Facebook Style - Tối ưu hóa */}
      <div className="px-2 border-t border-gray-200">
        <div className="flex items-center">
          <button 
            onClick={() => toggleLike({ postId: post.id, userId })}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-colors ${
              liked 
                ? 'text-blue-600 hover:bg-blue-50' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Heart size={18} className={liked ? 'fill-blue-600 text-blue-600' : ''} />
            <span className="font-medium text-sm">Thích</span>
          </button>
          <button 
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={() => document.querySelector(`#comment-input-${post.id}`)?.focus()}
          >
            <MessageSquare size={18} />
            <span className="font-medium text-sm">Bình luận</span>
          </button>
          {post.solution ? (
            <button
              onClick={() => setShowSolutionModal(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <CheckCircle2 size={18} />
              <span className="font-medium text-sm">Kết quả</span>
            </button>
          ) : (
            <button
              onClick={handleSolvePost}
              disabled={isSolvingPost}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              <HelpCircle size={18} />
              <span className="font-medium text-sm">{isSolvingPost ? 'Đang giải...' : 'Trợ Giúp'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Comment Input - Facebook Style - Tối ưu hóa */}
      <div className="px-3 py-2 border-t border-gray-200">
        <form onSubmit={handleAddComment} className="flex items-center gap-2">
          <img
            src={currentUser?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser?.displayName || 'User'}`}
            alt={currentUser?.displayName}
            className="h-7 w-7 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5 focus-within:bg-white focus-within:ring-1 focus-within:ring-gray-300 transition">
            <input
              id={`comment-input-${post.id}`}
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-500 focus:outline-none"
              placeholder="Viết bình luận..."
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
            />
            {commentText.trim() && (
              <button
                type="submit"
                className="text-blue-600 font-semibold text-[15px] hover:text-blue-700 transition px-2"
              >
                Đăng
              </button>
            )}
          </div>
        </form>
      </div>
      {/* Comments Section - Facebook Style - Tối ưu hóa */}
      <div className="px-3 pb-2">
        {comments.length > 0 && (
          <div className="space-y-1">
        {comments.map((comment, index) => {
              const replies = normalizeArray(comment.replies || [])
              const isCommentAuthor = comment.authorId === userId
              const canEditComment = isCommentAuthor || isAdmin || isTeacher
              const replyState = replyStates[index] || {}
              const isEditingComment = editingCommentIndex === index
              
          return (
                <div key={`${comment.authorId}-${index}-${comment.createdAt}`} className="group">
                  {/* Main Comment */}
                  <div className="flex items-start gap-2 py-1">
                    <img
                      src={comment.authorPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${comment.authorName}`}
                      alt={comment.authorName}
                      className="h-7 w-7 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="inline-block bg-gray-100 rounded-lg px-2.5 py-1.5 max-w-full">
                        <div className="flex items-baseline gap-1.5 mb-0.5">
                          <span className="text-xs font-semibold text-gray-900 hover:underline cursor-pointer">
                {comment.authorName || 'Người dùng'}
              </span>
                          {comment.editedAt && (
                            <span className="text-[10px] text-gray-400">(đã chỉnh sửa)</span>
                          )}
                        </div>
                        {isEditingComment ? (
                          <div className="space-y-2">
                            <textarea
                              className="w-full border border-slate-300 bg-white p-2 text-sm rounded-lg focus:border-gemini-blue focus:outline-none focus:ring-1 focus:ring-gemini-blue"
                              rows="3"
                              value={editCommentText}
                              onChange={(e) => setEditCommentText(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <button
                                className="bg-gemini-blue px-3 py-1 text-xs text-white hover:bg-gemini-blue/90 transition rounded"
                                onClick={() => handleEditComment(index)}
                              >
                                Lưu
                              </button>
                              <button
                                className="border border-slate-300 px-3 py-1 text-xs hover:bg-slate-50 transition rounded"
                                onClick={() => {
                                  setEditingCommentIndex(null)
                                  setEditCommentText('')
                                }}
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-900 leading-relaxed">
                            {renderTextWithLatex(comment.text)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 px-3">
                        <span className="text-xs text-slate-500 hover:underline cursor-pointer">
                {dayjs(comment.createdAt).fromNow()}
              </span>
                        <button
                          onClick={() => handleToggleReplyForm(index)}
                          className="text-xs text-slate-500 hover:underline font-medium"
                        >
                          Trả lời
                        </button>
                        {canEditComment && !isEditingComment && (
                          <>
                            <button
                              onClick={() => {
                                setEditingCommentIndex(index)
                                setEditCommentText(comment.text)
                              }}
                              className="text-xs text-slate-500 hover:underline"
                            >
                              Chỉnh sửa
                            </button>
                            <button
                              onClick={() => handleDeleteComment(index)}
                              className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>Xóa</span>
                            </button>
                          </>
                        )}
            </div>
                    </div>
                  </div>
                  
                  {/* Hiển thị giải đáp nếu đã có */}
            {comment.solution && (
                <div className="mt-2 border-l-4 border-gemini-blue bg-white p-3 text-sm text-slate-800 rounded">
                <div className="mb-1 font-semibold text-gemini-blue">Giải đáp:</div>
                {editingIndex === index ? (
                  <div className="space-y-2">
                    <textarea
                        className="w-full border border-slate-200 bg-white p-2 text-sm focus:border-gemini-blue focus:outline-none focus:ring-1 focus:ring-gemini-blue rounded"
                      rows="4"
                      value={editSolution}
                      onChange={(e) => setEditSolution(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                          className="bg-gemini-blue px-3 py-1 text-sm text-white hover:bg-gemini-blue/90 transition rounded"
                        onClick={() => handleUpdateSolution(index)}
                      >
                        Lưu
                      </button>
                      <button
                          className="border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50 transition rounded"
                        onClick={() => {
                          setEditingIndex(null)
                          setEditSolution('')
                        }}
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>{renderTextWithLatex(comment.solution)}</div>
                )}
                {comment.isFlagged && (
                  <div className="mt-1 flex items-center gap-1 text-sm font-semibold text-slate-600 dark:text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Đã đánh dấu sai</span>
                  </div>
                )}
                {(isAdmin || isTeacher) && editingIndex !== index && (
                  <div className="mt-2 flex gap-2">
                    <button
                        className="border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 transition rounded"
                      onClick={() => {
                        setEditingIndex(index)
                        setEditSolution(comment.solution)
                      }}
                    >
                      Sửa
                    </button>
                    {!comment.isFlagged && (
                      <button
                          className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition rounded"
                        onClick={() => handleFlagSolution(index)}
                      >
                        Đánh dấu sai
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
              
                  {/* Reply Form */}
                  {replyState.showReplyForm && (
                    <div className="ml-10 mt-2 flex items-start gap-2">
                      <img
                        src={currentUser?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser?.displayName || 'User'}`}
                        alt={currentUser?.displayName}
                        className="h-7 w-7 rounded-full object-cover flex-shrink-0"
                      />
                      <form 
                        onSubmit={(e) => handleAddReply(index, e)} 
                        className="flex-1 flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-gemini-blue/20 transition"
                      >
                        <input
                          className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-500 focus:outline-none"
                          placeholder="Viết trả lời..."
                          value={replyState.replyText || ''}
                          onChange={(e) => {
                            setReplyStates((prev) => ({
                              ...prev,
                              [index]: {
                                ...prev[index],
                                replyText: e.target.value,
                              },
                            }))
                          }}
                        />
                        {(replyState.replyText || '').trim() && (
                          <button 
                            type="submit"
                            className="text-gemini-blue font-semibold text-xs hover:text-gemini-blue/80 transition px-2"
                          >
                            Đăng
                          </button>
                        )}
                      </form>
                    </div>
                  )}
                  
                  {/* Replies - Nested Facebook Style */}
                  {replies.length > 0 && (
                    <div className="ml-10 mt-1 space-y-1">
                      {replies.map((reply, replyIndex) => {
                        const isReplyAuthor = reply.authorId === userId
                        const canEditReply = isReplyAuthor || isAdmin || isTeacher
                        const isEditingReply = replyState.editingReplyIndex === replyIndex
                        
                        return (
                          <div key={`reply-${replyIndex}-${reply.createdAt}`} className="flex items-start gap-2 py-1 hover:bg-slate-50 rounded-lg px-1 -mx-1 transition">
                            <img
                              src={reply.authorPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${reply.authorName}`}
                              alt={reply.authorName}
                              className="h-7 w-7 rounded-full object-cover flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="inline-block bg-gray-100 rounded-lg px-3 py-2 max-w-full">
                                <div className="flex items-baseline gap-2 mb-1">
                                  <span className="text-sm font-semibold text-gray-900 hover:underline cursor-pointer">
                                    {reply.authorName || 'Người dùng'}
                                  </span>
                                  {reply.editedAt && (
                                    <span className="text-xs text-slate-400">(đã chỉnh sửa)</span>
                                  )}
                                </div>
                                {isEditingReply ? (
                                  <div className="space-y-2">
                                    <textarea
                                      className="w-full border border-slate-300 bg-white p-2 text-xs rounded-lg focus:border-gemini-blue focus:outline-none focus:ring-1 focus:ring-gemini-blue"
                                      rows="2"
                                      value={replyState.editReplyText || ''}
                                      onChange={(e) => {
                                        setReplyStates((prev) => ({
                                          ...prev,
                                          [index]: {
                                            ...prev[index],
                                            editReplyText: e.target.value,
                                          },
                                        }))
                                      }}
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        className="bg-gemini-blue px-2 py-1 text-xs text-white hover:bg-gemini-blue/90 transition rounded"
                                        onClick={() => handleEditReply(index, replyIndex)}
                                      >
                                        Lưu
                                      </button>
                                      <button
                                        className="border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 transition rounded"
                                        onClick={() => {
                                          setReplyStates((prev) => ({
                                            ...prev,
                                            [index]: {
                                              ...prev[index],
                                              editingReplyIndex: null,
                                              editReplyText: '',
                                            },
                                          }))
                                        }}
                                      >
                                        Hủy
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-sm text-slate-900 leading-relaxed">
                                    {renderTextWithLatex(reply.text)}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 px-3">
                                <span className="text-xs text-slate-500 hover:underline cursor-pointer">
                                  {dayjs(reply.createdAt).fromNow()}
                                </span>
                                {canEditReply && !isEditingReply && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setReplyStates((prev) => ({
                                          ...prev,
                                          [index]: {
                                            ...prev[index],
                                            editingReplyIndex: replyIndex,
                                            editReplyText: reply.text,
                                          },
                                        }))
                                      }}
                                      className="text-xs text-slate-500 hover:underline"
                                    >
                                      Chỉnh sửa
                                    </button>
                                    <button
                                      onClick={() => handleDeleteReply(index, replyIndex)}
                                      className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition flex items-center gap-1"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                      <span>Xóa</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Solution Modal */}
      <Suspense fallback={null}>
        <SolutionModal
        isOpen={showSolutionModal}
        onClose={() => {
          setShowSolutionModal(false)
          setEditingPostSolution(false)
          setEditPostSolutionText('')
        }}
        solution={post.solution}
        postText={post.text}
        postId={post.id}
        userId={userId}
        userRoles={userRoles}
        onFlagSolution={handleFlagPostSolution}
        onEditSolution={async (newSolution) => {
          try {
            await updatePostSolution({
              postId: post.id,
              solution: newSolution.trim(),
              updatedBy: userId,
            })
            success('Đã cập nhật giải đáp thành công!')
            setShowSolutionModal(false)
            // Reload page or update post state
            window.location.reload()
          } catch (error) {
            logger.error('Error updating solution in modal:', error)
            showError(error.message || 'Không thể cập nhật giải đáp. Vui lòng thử lại.')
          }
        }}
        onDeleteSolution={handleDeletePostSolution}
        isFlagged={post.isFlagged}
        />
      </Suspense>
      <Suspense fallback={null}>
        <ImageModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        imageUrl={(post.imageUrls && post.imageUrls.length > 0) ? post.imageUrls[selectedImageIndex] : post.imageUrl}
        imageUrls={post.imageUrls || (post.imageUrl ? [post.imageUrl] : null)}
        currentIndex={selectedImageIndex}
        onIndexChange={setSelectedImageIndex}
        alt="Bài viết"
        />
      </Suspense>
    </article>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.likes?.length === nextProps.post.likes?.length &&
    prevProps.post.comments?.length === nextProps.post.comments?.length &&
    prevProps.post.text === nextProps.post.text &&
    prevProps.post.solution === nextProps.post.solution &&
    prevProps.userId === nextProps.userId &&
    JSON.stringify(prevProps.userRoles) === JSON.stringify(nextProps.userRoles)
  )
})

export const PostList = memo(function PostList({ posts, userId, userRoles = [], currentUser, lastPostElementRef, loading, onSearch }) {
  // Memoize posts list to prevent unnecessary re-renders
  const memoizedPosts = useMemo(() => posts, [posts])
  
  if (!memoizedPosts.length) {
    return <p className="text-center text-slate-500 text-base">Chưa có bài viết nào.</p>
  }
  
  return (
    <div className="space-y-2 md:space-y-3">
      {memoizedPosts.map((post, index) => {
        const isLastPost = index === memoizedPosts.length - 1
        return (
          <div key={post.id} ref={isLastPost ? lastPostElementRef : null}>
            <PostItem post={post} userId={userId} userRoles={userRoles} currentUser={currentUser} />
          </div>
        )
      })}
      {loading && (
        <div className="text-center py-4 text-slate-500 text-base">Đang tải thêm...</div>
      )}
    </div>
  )
})