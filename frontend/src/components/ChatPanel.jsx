import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { chatWithAI } from '../services/api'
import {
  createChatSession,
  addMessageToSession,
  getChatSession,
} from '../services/firestore'
import { useToast } from './Toast'
import { InlineMath, BlockMath } from 'react-katex'
import 'katex/dist/katex.min.css'

function renderTextWithLatex(text) {
  if (!text || typeof text !== 'string') return <span></span>
  
  try {
    const parts = []
    let lastIndex = 0
    const blockRegex = /\$\$([^$]+)\$\$/g
    const inlineRegex = /\$([^$]+)\$/g
    const allMatches = []
    let match

    // Reset regex lastIndex
    blockRegex.lastIndex = 0
    inlineRegex.lastIndex = 0

    // Find all block math first (priority)
    try {
      while ((match = blockRegex.exec(text)) !== null) {
        if (match[1] && match[1].trim()) {
          allMatches.push({
            type: 'block',
            start: match.index,
            end: match.index + match[0].length,
            content: match[1].trim(),
          })
        }
      }
    } catch (e) {
      console.warn('Error parsing block math:', e)
    }

    // Then find inline math (avoid overlapping with block math)
    try {
      while ((match = inlineRegex.exec(text)) !== null) {
        const isOverlapping = allMatches.some(
          (bm) => match.index >= bm.start && match.index < bm.end
        )
        if (!isOverlapping && match[1] && match[1].trim()) {
          allMatches.push({
            type: 'inline',
            start: match.index,
            end: match.index + match[0].length,
            content: match[1].trim(),
          })
        }
      }
    } catch (e) {
      console.warn('Error parsing inline math:', e)
    }

    // Sort by start position
    allMatches.sort((a, b) => a.start - b.start)

    // Build parts with error handling
    allMatches.forEach((math) => {
      if (lastIndex < math.start) {
        const textPart = text.substring(lastIndex, math.start)
        if (textPart) {
          parts.push(
            <span key={`text-${lastIndex}`}>{textPart}</span>
          )
        }
      }
      
      // Render LaTeX with error boundary - use React.createElement for safety
      try {
        if (math.type === 'block' && math.content) {
          parts.push(
            <div key={`math-block-${math.start}`} className="my-3 overflow-x-auto" style={{ minHeight: '2em', maxWidth: '100%' }}>
              <BlockMath>{math.content}</BlockMath>
            </div>
          )
        } else if (math.content) {
          parts.push(
            <InlineMath key={`math-inline-${math.start}`}>{math.content}</InlineMath>
          )
        }
      } catch (latexError) {
        // Fallback to plain text if LaTeX fails
        console.warn('LaTeX rendering error:', latexError, math)
        parts.push(
          <span key={`math-error-${math.start}`} className="text-slate-600 dark:text-slate-400">
            {math.type === 'block' ? `$$${math.content}$$` : `$${math.content}$`}
          </span>
        )
      }
      
      lastIndex = math.end
    })

    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex)
      if (remainingText) {
        parts.push(<span key={`text-${lastIndex}`}>{remainingText}</span>)
      }
    }

    return parts.length > 0 ? <>{parts}</> : <span>{text}</span>
  } catch (error) {
    console.error('Error rendering LaTeX:', error)
    // Return plain text as fallback
    return <span className="text-slate-800 dark:text-slate-200">{String(text)}</span>
  }
}

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
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

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
      console.error('Error loading session:', error)
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
          console.error('Error creating chat session:', error)
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
          console.error('Error saving message to session:', error)
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
          console.error('Error saving assistant message:', error)
          // Continue without saving
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
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
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Messages Area - Gemini Style */}
      <div
        className="flex-1 overflow-y-auto px-4 py-6 space-y-6"
        style={{ 
          maxHeight: 'calc(100vh - 200px)',
          minHeight: '400px',
          scrollBehavior: 'smooth'
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
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-5 py-4 ${
                safeRole === 'user'
                  ? 'bg-gradient-to-br from-gemini-blue to-gemini-blue/90 text-white shadow-lg'
                  : 'bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600'
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
            <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl px-5 py-4">
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
      <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <form onSubmit={sendMessage} className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              id="chat-input"
              ref={inputRef}
              className="w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-4 py-3 pr-12 text-base focus:border-gemini-blue focus:outline-none focus:ring-2 focus:ring-gemini-blue/20 resize-none shadow-sm"
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
              className="absolute right-2 bottom-2 w-9 h-9 rounded-full bg-gemini-blue text-white hover:bg-gemini-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center shadow-md"
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
  )
}
