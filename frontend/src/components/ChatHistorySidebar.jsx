import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { 
  getUserChatSessions, 
  deleteChatSession, 
  updateChatSessionTitle,
  watchUserChatSessions 
} from '../services/firestore'
import { useToast } from './Toast'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export function ChatHistorySidebar({ onSelectSession, currentSessionId }) {
  const { user } = useAuth()
  const { success, error: showError } = useToast()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false)
      return
    }

    let unsubscribe = null
    
    try {
      unsubscribe = watchUserChatSessions(
        user.uid,
        (newSessions) => {
          setSessions(newSessions)
          setLoading(false)
        },
        (error) => {
          console.error('Error watching chat sessions:', error)
          setLoading(false)
          // Nếu lỗi permission, thử load một lần (không real-time)
          getUserChatSessions(user.uid)
            .then(setSessions)
            .catch((err) => {
              console.error('Error loading chat sessions:', err)
              setSessions([])
            })
        }
      )
    } catch (error) {
      console.error('Error setting up chat sessions watch:', error)
      setLoading(false)
      // Fallback: load một lần (không real-time)
      getUserChatSessions(user.uid)
        .then(setSessions)
        .catch((err) => {
          console.error('Error loading chat sessions:', err)
          setSessions([])
        })
    }

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [user?.uid])

  const handleDeleteSession = async (sessionId, event) => {
    event.stopPropagation()
    if (!confirm('Bạn có chắc muốn xóa cuộc trò chuyện này?')) return

    try {
      await deleteChatSession(sessionId)
      success('Đã xóa cuộc trò chuyện')
      if (currentSessionId === sessionId) {
        onSelectSession(null)
      }
    } catch (error) {
      console.error('Error deleting session:', error)
      showError('Không thể xóa cuộc trò chuyện. Vui lòng thử lại.')
    }
  }

  const handleEditTitle = async (sessionId, currentTitle, event) => {
    event.stopPropagation()
    setEditingId(sessionId)
    setEditTitle(currentTitle)
  }

  const handleSaveTitle = async (sessionId, event) => {
    event.stopPropagation()
    if (!editTitle.trim()) {
      setEditingId(null)
      return
    }

    try {
      await updateChatSessionTitle({ sessionId, title: editTitle.trim() })
      setEditingId(null)
      success('Đã cập nhật tiêu đề')
    } catch (error) {
      console.error('Error updating title:', error)
      showError('Không thể cập nhật tiêu đề. Vui lòng thử lại.')
    }
  }

  const handleNewChat = () => {
    onSelectSession(null)
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-950">
      {/* Header */}
      <div className="p-4 border-b border-slate-200/30 dark:border-slate-800/30">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-700 dark:text-slate-300"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="font-medium">Cuộc trò chuyện mới</span>
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-2">
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
            <p>Chưa có cuộc trò chuyện nào</p>
            <p className="text-xs mt-2">Bắt đầu trò chuyện để lưu lịch sử</p>
          </div>
        ) : (
          <div className="space-y-1">
            {sessions.map((session) => {
              const isActive = currentSessionId === session.id
              const lastMessage = session.messages?.[session.messages.length - 1]
              const preview = lastMessage?.content?.substring(0, 60) || 'Cuộc trò chuyện trống'
              
              return (
                <div
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={`group relative p-3 rounded-lg cursor-pointer transition ${
                    isActive
                      ? 'bg-gemini-blue/10 border border-gemini-blue/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                  }`}
                >
                  {editingId === session.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={(e) => handleSaveTitle(session.id, e)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveTitle(session.id, e)
                          } else if (e.key === 'Escape') {
                            setEditingId(null)
                          }
                        }}
                        className="w-full px-2 py-1 text-sm border border-gemini-blue rounded focus:outline-none focus:ring-1 focus:ring-gemini-blue"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {session.title || 'Cuộc trò chuyện mới'}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {preview}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            {session.updatedAt?.toDate 
                              ? dayjs(session.updatedAt.toDate()).fromNow()
                              : 'Vừa xong'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={(e) => handleEditTitle(session.id, session.title, e)}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition"
                            title="Đổi tên"
                          >
                            <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => handleDeleteSession(session.id, e)}
                            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition"
                            title="Xóa"
                          >
                            <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

