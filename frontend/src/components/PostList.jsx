import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { renderTextWithLatex } from '../utils/latexRenderer'
import { SolutionModal } from './SolutionModal'
import { ImageModal } from './ImageModal'
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
  const [showImageModal, setShowImageModal] = useState(false)
  
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
                    className="w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-left flex items-center gap-2 transition"
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
          <div className="px-4 pb-3">
            <div className="text-[15px] leading-relaxed text-slate-900 dark:text-slate-100">
              {renderTextWithLatex(post.text)}
            </div>
          </div>
        )}
      </div>

      {/* Hiển thị ảnh */}
      {post.imageUrl && (
        <div className="mt-3 cursor-pointer" onClick={() => setShowImageModal(true)}>
          <img
            src={post.imageUrl}
            alt="Bài viết"
            className="max-h-96 w-full border border-slate-200 dark:border-slate-700 object-contain hover:opacity-90 transition"
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
        <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded">
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

      {/* Action Bar - Facebook Style */}
      <div className="px-4 py-2 border-t border-slate-200/30 dark:border-slate-800/30">
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-sm mb-2">
          <div className="flex items-center gap-1">
            {likes.length > 0 && (
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4 fill-current text-slate-700 dark:text-slate-300" viewBox="0 0 24 24">
                  <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
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
                ? 'text-slate-900 dark:text-slate-100 bg-slate-200 dark:bg-slate-700' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <svg
              className={`w-5 h-5 ${liked ? 'fill-current' : 'stroke-current'}`}
              fill={liked ? 'currentColor' : 'none'}
              strokeWidth={liked ? 0 : 2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
              />
            </svg>
            <span className="text-sm font-medium">Thích</span>
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            onClick={() => document.querySelector(`#comment-input-${post.id}`)?.focus()}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm font-medium">Bình luận</span>
          </button>
          {post.solution ? (
            <button
              onClick={() => setShowSolutionModal(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-medium">Kết quả</span>
            </button>
          ) : (
            <button
              onClick={handleSolvePost}
              disabled={isSolvingPost}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
            >
              {isSolvingPost ? (
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              )}
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
      <ImageModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        imageUrl={post.imageUrl}
        alt="Bài viết"
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