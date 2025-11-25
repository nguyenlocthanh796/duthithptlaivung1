import { useState } from 'react'
import { createPortal } from 'react-dom'
import { renderTextWithLatex } from '../utils/latexRenderer'

export function SolutionModal({ 
  isOpen, 
  onClose, 
  solution, 
  postText,
  postId,
  userId,
  userRoles = [],
  onFlagSolution,
  onEditSolution,
  onDeleteSolution,
  isFlagged = false
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(solution || '')
  const isAdmin = userRoles.includes('admin') || userRoles.includes('teacher')

  if (!isOpen) return null

  const handleSaveEdit = () => {
    if (onEditSolution && editText.trim()) {
      onEditSolution(editText)
      setIsEditing(false)
    }
  }

  const handleDelete = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa kết quả này?')) {
      if (onDeleteSolution) {
        onDeleteSolution()
        onClose()
      }
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-slate-200/30 dark:border-slate-800/30">
          <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100">
            Kết quả
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 md:p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            title="Đóng"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-3 md:py-4">
          {/* Post Text (if provided) */}
          {postText && (
            <div className="mb-4 md:mb-6 p-3 md:p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200/30 dark:border-slate-700/30">
              <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Câu hỏi:</p>
              <div className="text-sm md:text-base text-slate-800 dark:text-slate-200 leading-relaxed">
                {renderTextWithLatex(postText)}
              </div>
            </div>
          )}

          {/* Solution */}
          {isEditing ? (
            <div className="space-y-3">
              <textarea
                className="w-full border border-slate-200/30 dark:border-slate-700/30 bg-white dark:bg-slate-700 p-3 text-sm md:text-base rounded-lg focus:border-gemini-blue focus:outline-none focus:ring-1 focus:ring-gemini-blue resize-none"
                rows="10"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 bg-gemini-blue text-white text-sm rounded-lg hover:bg-gemini-blue/90 transition"
                >
                  Lưu
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setEditText(solution || '')
                  }}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm md:text-base text-slate-800 dark:text-slate-200 leading-relaxed">
              {renderTextWithLatex(solution)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-t border-slate-200/30 dark:border-slate-800/30 flex items-center justify-between gap-2">
          <div className="flex gap-2">
            {onFlagSolution && !isFlagged && (
              <button
                onClick={onFlagSolution}
                className="px-3 py-1.5 text-xs md:text-sm text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Báo sai</span>
              </button>
            )}
            {isAdmin && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 text-xs md:text-sm text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Sửa</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="px-3 py-1.5 text-xs md:text-sm text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Xóa</span>
                </button>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 md:py-2 bg-gemini-blue text-white text-sm md:text-base rounded-lg hover:bg-gemini-blue/90 transition font-medium"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

