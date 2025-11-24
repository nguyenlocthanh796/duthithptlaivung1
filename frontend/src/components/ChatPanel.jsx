import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { chatWithAI } from '../services/api'
import {
  createChatSession,
  addMessageToSession,
  getChatSession,
} from '../services/firestore'
import { useToast } from './Toast'
import { renderTextWithLatex } from '../utils/latexRenderer'
import { ChatHistorySidebar } from './ChatHistorySidebar'
import logger from '../utils/logger'

export function ChatPanel({ sessionId: initialSessionId, onSessionChange }) {
  const { user } = useAuth()
  const { success, error: showError } = useToast()
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: 'Xin chào! Mình là trợ lý AI cho việc ôn thi. Mình có thể giúp bạn giải bài tập, tạo đề thi, giải thích kiến thức và nhiều hơn nữa. Hãy đặt câu hỏi bất kỳ!',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState(initialSessionId || null)
  const [loadingSession, setLoadingSession] = useState(false)
  const [historySidebarOpen, setHistorySidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Detect mobile and set default sidebar state
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
    }
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // Set initial state based on screen size: Web mở, Mobile đóng
  useEffect(() => {
    if (isMobile === false) {
      // Web: mở mặc định
      setHistorySidebarOpen(true)
    } else if (isMobile === true) {
      // Mobile: đóng mặc định
      setHistorySidebarOpen(false)
    }
  }, [isMobile])

  // Load session if sessionId is provided
  useEffect(() => {
    if (initialSessionId && initialSessionId !== currentSessionId) {
      loadSession(initialSessionId)
    }
  }, [initialSessionId])

  // Load existing session
  const loadSession = async (sessionId) => {
    if (!sessionId) {
      setMessages([
        {
          role: 'assistant',
          content: 'Xin chào! Mình là trợ lý AI cho việc ôn thi. Mình có thể giúp bạn giải bài tập, tạo đề thi, giải thích kiến thức và nhiều hơn nữa. Hãy đặt câu hỏi bất kỳ!',
        },
      ])
      setCurrentSessionId(null)
      if (onSessionChange) onSessionChange(null)
      return
    }

    setLoadingSession(true)
    try {
      const session = await getChatSession(sessionId)
      if (session && session.messages) {
        setMessages(session.messages)
        setCurrentSessionId(sessionId)
        if (onSessionChange) onSessionChange(sessionId)
      } else {
        showError('Không tìm thấy cuộc trò chuyện')
      }
    } catch (error) {
      logger.error('Error loading session:', error)
      showError('Không thể tải cuộc trò chuyện. Vui lòng thử lại.')
    } finally {
      setLoadingSession(false)
    }
  }

  const scrollToBottom = () => {
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    })
  }

  useEffect(() => {
    // Debounce scroll to prevent layout jumps
    const timeoutId = setTimeout(() => {
      scrollToBottom()
    }, 100)
    
    return () => clearTimeout(timeoutId)
  }, [messages])

  const sendMessage = async (event) => {
    event.preventDefault()
    if (!input.trim() || loading || !user?.uid) return
    
    const userMessage = input.trim()
    const newMessages = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    
    try {
      // Create session if doesn't exist
      let sessionId = currentSessionId
      if (!sessionId) {
        try {
          sessionId = await createChatSession({
            userId: user.uid,
            firstMessage: userMessage,
          })
          setCurrentSessionId(sessionId)
          if (onSessionChange) onSessionChange(sessionId)
        } catch (error) {
          logger.error('Error creating chat session:', error)
          // Continue without saving if session creation fails
          if (error.code === 'permission-denied') {
            showError('Không có quyền tạo cuộc trò chuyện. Vui lòng kiểm tra Firestore rules.')
          }
        }
      } else {
        // Save user message to session
        try {
          await addMessageToSession({
            sessionId,
            role: 'user',
            content: userMessage,
          })
        } catch (error) {
          logger.error('Error saving message to session:', error)
          // Continue without saving if message save fails
        }
      }

      // Get AI response
      const response = await chatWithAI(userMessage)
      // Handle different response formats
      const assistantMessage = response?.answer || response?.response || response?.text || response || 'Xin lỗi, không nhận được phản hồi từ AI.'

      // Add assistant message to state
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: assistantMessage },
      ])

      // Save assistant message to session (if session exists)
      if (sessionId) {
        try {
          await addMessageToSession({
            sessionId,
            role: 'assistant',
            content: assistantMessage,
          })
        } catch (error) {
          logger.error('Error saving assistant message:', error)
          // Continue without saving
        }
      }
    } catch (error) {
      logger.error('Chat error:', error)
      setMessages((prev) => [
        ...prev,
        { 
          role: 'assistant', 
          content:
            'Xin lỗi, AI đang gặp sự cố. Vui lòng thử lại sau hoặc kiểm tra kết nối mạng của bạn.',
        },
      ])
      showError('Không thể kết nối đến AI. Vui lòng thử lại.')
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleSelectSession = (sessionId) => {
    setCurrentSessionId(sessionId)
    if (onSessionChange) {
      onSessionChange(sessionId)
    }
    if (sessionId) {
      loadSession(sessionId)
    } else {
      setMessages([
        {
          role: 'assistant',
          content: 'Xin chào! Mình là trợ lý AI cho việc ôn thi. Mình có thể giúp bạn giải bài tập, tạo đề thi, giải thích kiến thức và nhiều hơn nữa. Hãy đặt câu hỏi bất kỳ!',
        },
      ])
    }
  }

  if (loadingSession) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gemini-blue mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Đang tải cuộc trò chuyện...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full gap-0 overflow-hidden relative">
      {/* Chat History Sidebar - Tích hợp vào ChatPanel */}
      <aside
        className={`${
          historySidebarOpen ? 'w-72' : 'w-0'
        } transition-all duration-300 border-r border-slate-200/30 dark:border-slate-800/30 bg-white dark:bg-slate-950 flex-shrink-0 overflow-hidden`}
      >
        {historySidebarOpen && (
          <div className="h-full">
            <ChatHistorySidebar
              onSelectSession={handleSelectSession}
              currentSessionId={currentSessionId}
            />
          </div>
        )}
      </aside>

      {/* Toggle History Sidebar Button */}
      <button
        onClick={() => setHistorySidebarOpen(!historySidebarOpen)}
        className={`absolute left-0 top-4 z-30 p-2 bg-white dark:bg-slate-950 border-r border-b border-slate-200/30 dark:border-slate-800/30 text-slate-600 dark:text-slate-400 hover:text-gemini-blue dark:hover:text-gemini-blue-light transition shadow-sm text-lg rounded-r ${
          historySidebarOpen ? 'translate-x-72' : 'translate-x-0'
        }`}
        style={{ transition: 'transform 0.3s ease' }}
        title={historySidebarOpen ? 'Ẩn lịch sử' : 'Hiện lịch sử'}
      >
        {historySidebarOpen ? '◀' : '▶'}
      </button>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 border-l border-slate-200/20 dark:border-slate-800/20">
        {/* Welcome Section - Chỉ hiện khi chưa có session */}
        {!currentSessionId && (
          <div className="flex-1 flex items-center justify-center p-4 md:p-6">
            <section className="bg-white dark:bg-slate-900 p-6 md:p-8 border border-slate-200/30 dark:border-slate-800/30 rounded-md max-w-2xl w-full mx-2 md:mx-3">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full bg-gemini-blue mb-6">
                  <svg
                    className="w-10 h-10 md:w-12 md:h-12 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                  Trợ lý AI học tập
                </h1>
                <p className="text-base md:text-lg lg:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                  Đặt câu hỏi và nhận giải đáp tức thì từ AI được tinh chỉnh cho kiến thức THPT.
                </p>
              </div>
            </section>
          </div>
        )}

        {/* Chat Panel - Main Content */}
        {currentSessionId && (
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-md border border-slate-200/30 dark:border-slate-800/30 overflow-hidden mx-2 md:mx-3">
      {/* Messages Area - Gemini Style */}
      <div
        className="flex-1 overflow-y-auto px-4 md:px-5 py-4 md:py-5 space-y-4 md:space-y-5"
        style={{ 
          maxHeight: 'calc(100vh - 180px)',
          minHeight: '300px',
          scrollBehavior: 'smooth',
          contain: 'layout style paint'
        }}
      >
        {messages.map((message, index) => {
          // Safety check for message content
          const safeContent = message?.content || ''
          const safeRole = message?.role || 'assistant'
          
          return (
          <div
            key={`msg-${index}-${safeContent.substring(0, 10)}`}
            className={`flex gap-4 chat-message ${
              safeRole === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {safeRole === 'assistant' && (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gemini-blue flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-lg px-4 py-3 md:px-5 md:py-4 ${
                safeRole === 'user'
                  ? 'bg-gemini-blue text-white'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/30 dark:border-slate-700/30'
              }`}
              style={{ 
                minHeight: 'auto',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                maxWidth: '100%',
                overflow: 'hidden'
              }}
            >
              <div
                className={`text-base leading-relaxed whitespace-pre-wrap ${
                  safeRole === 'user'
                    ? 'text-white'
                    : 'text-slate-800 dark:text-slate-100'
                }`}
                style={{
                  lineHeight: '1.6',
                  minHeight: '1.5em',
                  maxWidth: '100%',
                  overflow: 'hidden'
                }}
              >
                {renderTextWithLatex(safeContent)}
              </div>
            </div>
            {safeRole === 'user' && (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                <span className="text-slate-600 dark:text-slate-300 text-xs font-semibold">
                  {user?.displayName?.charAt(0)?.toUpperCase() || 'B'}
                </span>
              </div>
            )}
          </div>
          )
        })}
        
        {loading && (
          <div className="flex gap-4 justify-start">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-gemini-blue to-gemini-green flex items-center justify-center shadow-md">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200/30 dark:border-slate-600/30 rounded-lg px-5 py-4">
              <div className="flex gap-2">
                <div
                  className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                ></div>
                <div
                  className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                ></div>
                <div
                  className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                ></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Gemini Style */}
      <div className="border-t border-slate-200/30 dark:border-slate-800/30 bg-white dark:bg-slate-900 p-3 md:p-4">
        <form onSubmit={sendMessage} className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              id="chat-input"
              ref={inputRef}
              className="w-full rounded-lg border border-slate-300/50 dark:border-slate-600/50 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-4 py-3 pr-12 text-base focus:border-gemini-blue focus:outline-none focus:ring-2 focus:ring-gemini-blue/20 resize-none"
              placeholder="Nhập câu hỏi hoặc yêu cầu..."
              value={input}
              onChange={(event) => {
                setInput(event.target.value)
                event.target.style.height = 'auto'
                event.target.style.height = `${Math.min(event.target.scrollHeight, 120)}px`
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage(e)
                }
              }}
              rows={1}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-2 bottom-2 w-9 h-9 rounded-full bg-gemini-blue text-white hover:bg-gemini-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center"
              title="Gửi (Enter)"
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
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
        </form>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
          AI có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.
        </p>
      </div>
          </div>
        )}
      </div>
    </div>
  )
}
