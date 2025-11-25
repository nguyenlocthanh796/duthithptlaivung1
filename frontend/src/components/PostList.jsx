import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { renderTextWithLatex } from '../utils/latexRenderer'
import { SolutionModal } from './SolutionModal'
import logger from '../utils/logger'
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
import { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react'
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
      const response = await solvePostAPI(post.text)
      
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

  return (
    <article className="bg-white dark:bg-slate-800 rounded border border-slate-200/30 dark:border-slate-700/30 overflow-hidden">
      {/* Post Header - Facebook Style */}
      <header className="px-4 pt-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
        <img
          src={post.author?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${post.author?.name}`}
          alt={post.author?.name}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-100 hover:ring-gemini-blue/50 transition cursor-pointer"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 hover:underline cursor-pointer">
                  {post.author?.name}
                </h3>
                {post.editedAt && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">(đã chỉnh sửa)</span>
                )}
          </div>
              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <span>{dayjs(post.createdAt?.toDate?.() || post.createdAt).fromNow()}</span>
                <span>·</span>
                <span>🌐</span>
        </div>
            </div>
          </div>
          
          {/* Tags */}
          {post.tags && Array.isArray(post.tags) && post.tags.length > 0 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-block bg-gemini-blue/10 text-gemini-blue px-2 py-0.5 rounded text-xs font-medium hover:bg-gemini-blue/20 cursor-pointer transition"
                  onClick={() => {
                    // Filter by tag - trigger search with tag
                    if (onSearch) {
                      onSearch({ query: tag, subject: '', type: '', time: '' })
                    }
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
          
          <div className="relative more-menu-container">
        {canEditPost && !isEditingPost && (
          <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition"
                title="Tùy chọn"
          >
                <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
          </button>
        )}
            {showMoreMenu && (
              <div className="absolute right-0 top-10 bg-white rounded border border-slate-200/30 dark:border-slate-800/30 py-1 z-10 min-w-[160px]">
                <button
                  onClick={() => {
                    handleEditPost()
                    setShowMoreMenu(false)
                  }}
                  className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left flex items-center gap-2"
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
                    className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left flex items-center gap-2"
                  >
                    <span>🗑️</span>
                    <span>Xóa bài viết</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
      
      <div className="mt-3">
        {isEditingPost ? (
          <div className="space-y-3">
            <textarea
              className="w-full border border-slate-200 bg-white p-3 text-base focus:border-gemini-blue focus:outline-none focus:ring-1 focus:ring-gemini-blue"
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
                  className="border border-gemini-red px-4 py-2 text-base font-medium text-gemini-red hover:bg-gemini-red/10 transition"
                >
                  🗑️ Xóa
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="px-4 pb-3">
            <div className="text-[15px] leading-relaxed text-slate-900 dark:text-slate-100">
              {renderTextWithLatex(post.text)}
            </div>
          </div>
        )}
      </div>

      {/* Hiển thị ảnh */}
      {post.imageUrl && (
        <div className="mt-3">
          <img
            src={post.imageUrl}
            alt="Bài viết"
            className="max-h-96 w-full border border-slate-200 object-contain"
          />
        </div>
      )}

      {/* Hiển thị tài liệu */}
      {post.documentUrl && (
        <a
          href={post.documentUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex items-center gap-2 border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 transition hover:border-gemini-blue hover:bg-gemini-blue/5"
        >
          <span className="text-lg">
            {post.documentType === 'pdf' ? '📄' : '📝'}
          </span>
          <span>
            {post.documentType === 'pdf' ? 'Xem tài liệu PDF' : `Xem tài liệu ${post.documentType.toUpperCase()}`}
          </span>
          <span className="ml-auto">🔗</span>
        </a>
      )}

      {/* Trạng thái vi phạm */}
      {post.isPendingReview && (
        <div className="mt-3 p-3 bg-gemini-yellow/10 border border-gemini-yellow/20">
          <p className="text-sm text-gemini-yellow font-medium">⚠️ Bài viết đang chờ kiểm duyệt</p>
          {isModerator && (
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleApprovePost}
                className="bg-gemini-green px-3 py-1 text-sm text-white hover:bg-gemini-green/90 transition"
              >
                ✓ Duyệt
              </button>
              <button
                onClick={handleRejectPost}
                className="border border-gemini-red px-3 py-1 text-sm text-gemini-red hover:bg-gemini-red/10 transition"
              >
                ✕ Xóa
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action Bar - Facebook Style */}
      <div className="px-4 py-2 border-t border-slate-200/30 dark:border-slate-800/30">
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-sm mb-2">
          <div className="flex items-center gap-1">
            {likes.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-red-500">❤️</span>
                <span className="text-slate-600 dark:text-slate-400">{likes.length}</span>
              </div>
            )}
            {comments.length > 0 && (
              <div className="flex items-center gap-1 ml-4">
                <span>{comments.length}</span>
                <span>bình luận</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Action Buttons - 1 hàng: Tym, Bình luận, Giải đáp/Kết quả */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => toggleLike({ postId: post.id, userId })}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg transition ${
              liked 
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className={liked ? 'text-red-500' : ''}>❤️</span>
            <span className="text-sm font-medium">Thích</span>
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            onClick={() => document.querySelector(`#comment-input-${post.id}`)?.focus()}
          >
            <span>💬</span>
            <span className="text-sm font-medium">Bình luận</span>
          </button>
          {post.solution ? (
            <button
              onClick={() => setShowSolutionModal(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-gemini-blue dark:text-gemini-blue-light hover:bg-gemini-blue/10 dark:hover:bg-gemini-blue/20 transition"
            >
              <span>📋</span>
              <span className="text-sm font-medium">Kết quả</span>
            </button>
          ) : (
            <button
              onClick={handleSolvePost}
              disabled={isSolvingPost}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-gemini-blue dark:text-gemini-blue-light hover:bg-gemini-blue/10 dark:hover:bg-gemini-blue/20 transition disabled:opacity-50"
            >
              <span>{isSolvingPost ? '⏳' : '🤖'}</span>
              <span className="text-sm font-medium">{isSolvingPost ? 'Đang giải...' : 'Giải đáp'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Comment Input - Facebook Style */}
      <div className="px-4 pb-3 border-t border-slate-100">
        <form onSubmit={handleAddComment} className="flex items-start gap-2 pt-3">
          <img
            src={currentUser?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser?.displayName || 'User'}`}
            alt={currentUser?.displayName}
            className="h-8 w-8 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1 flex items-center gap-2 bg-slate-100 rounded-full px-3 py-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-gemini-blue/20 transition">
        <input
              id={`comment-input-${post.id}`}
              className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-500 focus:outline-none"
          placeholder="Viết bình luận..."
          value={commentText}
          onChange={(event) => setCommentText(event.target.value)}
        />
            {commentText.trim() && (
              <button
                type="submit"
                className="text-gemini-blue font-semibold text-sm hover:text-gemini-blue/80 transition px-2"
              >
                Đăng
              </button>
            )}
          </div>
      </form>
      </div>
      {/* Comments Section - Facebook Style */}
      <div className="px-4 pb-4">
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
                  <div className="flex items-start gap-2 py-1 hover:bg-slate-50 rounded-lg px-1 -mx-1 transition">
                    <img
                      src={comment.authorPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${comment.authorName}`}
                      alt={comment.authorName}
                      className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="inline-block bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-2 max-w-full">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-sm font-semibold text-slate-900 hover:underline cursor-pointer">
                {comment.authorName || 'Người dùng'}
              </span>
                          {comment.editedAt && (
                            <span className="text-xs text-slate-400">(đã chỉnh sửa)</span>
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
                          <div className="text-sm text-slate-900 leading-relaxed">
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
                              className="text-xs text-red-500 hover:underline"
                            >
                              Xóa
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
                  <div className="mt-1 text-sm font-semibold text-red-600">⚠️ Đã đánh dấu sai</div>
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
                          className="border border-gemini-red px-2 py-1 text-xs text-gemini-red hover:bg-gemini-red/10 transition rounded"
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
                              <div className="inline-block bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-2 max-w-full">
                                <div className="flex items-baseline gap-2 mb-1">
                                  <span className="text-sm font-semibold text-slate-900 hover:underline cursor-pointer">
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
                                      className="text-xs text-red-500 hover:underline"
                                    >
                                      Xóa
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
    <div className="space-y-4">
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