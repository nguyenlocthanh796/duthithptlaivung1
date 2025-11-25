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
import { uploadImage, uploadDocument } from '../services/storageService'
import logger from '../utils/logger'

export function ChatPanel({ sessionId: initialSessionId, onSessionChange, hideHistorySidebar = false }) {
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
  const [attachedFile, setAttachedFile] = useState(null)
  const [attachedFileUrl, setAttachedFileUrl] = useState(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

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

      // Always use gemini-2.5-flash-lite
      const modelToUse = 'gemini-2.5-flash-lite'

      // Get AI response (include imageUrl if attached)
      const response = await chatWithAI(userMessage, { 
        model: modelToUse, 
        ...(attachedFileUrl && { imageUrl: attachedFileUrl })
      })
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
      setAttachedFile(null)
      setAttachedFileUrl(null)
      inputRef.current?.focus()
    }
  }

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const fileType = file.type.toLowerCase()
    const isImage = fileType.startsWith('image/')
    const isPDF = fileType === 'application/pdf'
    const isDocument = fileType.includes('word') || fileType.includes('document')

    if (!isImage && !isPDF && !isDocument) {
      showError('Chỉ hỗ trợ file: PNG, JPG, PDF, DOC, DOCX')
      return
    }

    setUploadingFile(true)
    try {
      let url
      if (isImage) {
        url = await uploadImage(file)
      } else {
        url = await uploadDocument(file)
      }
      setAttachedFile(file)
      setAttachedFileUrl(url)
      success('Đã tải file lên thành công!')
    } catch (error) {
      logger.error('Error uploading file:', error)
      showError('Không thể tải file. Vui lòng thử lại.')
    } finally {
      setUploadingFile(false)
      // Reset input
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const handleCameraCapture = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click()
    }
  }

  const removeAttachedFile = () => {
    setAttachedFile(null)
    setAttachedFileUrl(null)
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
    <div className="flex h-full w-full overflow-hidden flex-col">
      {/* Main Content Area - 100% width */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-y-auto">
        {/* Welcome Section - Chỉ hiện khi chưa có session */}
        {!currentSessionId && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6">
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gemini-blue mb-4">
                Trợ lý AI học tập
              </h1>
              <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Đặt câu hỏi và nhận giải đáp tức thì từ AI được tinh chỉnh cho kiến thức THPT.
              </p>
            </div>
          </div>
        )}

        {/* Chat Panel - Main Content */}
        {currentSessionId && (
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
            {/* Messages Area - Gemini Style */}
            <div
              className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-5"
              style={{ 
                height: '100%',
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
                        <span className="text-slate-600 dark:text-slate-300 text-sm font-semibold">
                          {user?.displayName?.charAt(0)?.toUpperCase() || 'B'}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
              
              {loading && (
                <div className="flex gap-4 justify-start">
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
          </div>
        )}
      </div>

      {/* Input Area - Gemini Style - Luôn hiển thị */}
      {!currentSessionId ? (
        /* Input ở giữa màn hình khi chưa có session - Giống Gemini */
        <div className="flex-shrink-0 p-4 md:p-6 bg-white dark:bg-slate-950">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={sendMessage} className="relative">
              <div className="relative">
                <input
                  id="chat-input"
                  ref={inputRef}
                  type="text"
                  className="w-full rounded-lg border border-slate-300/50 dark:border-slate-600/50 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-3.5 pr-12 text-base focus:border-gemini-blue focus:outline-none focus:ring-1 focus:ring-gemini-blue/30 transition"
                  placeholder="Hỏi AI..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      sendMessage(e)
                    }
                  }}
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gemini-blue text-white hover:bg-gemini-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center"
                  title="Gửi (Enter)"
                >
                  <svg
                    className="w-4 h-4"
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
          </div>
        </div>
      ) : (
        /* Input ở dưới cùng khi đã có session */
        <div className="flex-shrink-0 border-t border-slate-200/30 dark:border-slate-800/30 bg-white dark:bg-slate-900 p-3 md:p-4">
          {/* Attached File Preview */}
          {attachedFile && (
            <div className="max-w-4xl mx-auto mb-2 flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex-1 flex items-center gap-2 min-w-0">
                {attachedFile.type.startsWith('image/') ? (
                  <svg className="w-5 h-5 text-slate-600 dark:text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-slate-600 dark:text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                )}
                <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                  {attachedFile.name}
                </span>
              </div>
              <button
                type="button"
                onClick={removeAttachedFile}
                className="p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                title="Xóa file"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <form onSubmit={sendMessage} className="flex gap-2 items-end max-w-4xl mx-auto">
            {/* File Upload Buttons */}
            <div className="flex gap-1">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile || loading}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition disabled:opacity-50"
                title="Tải file (PDF, PNG, JPG, DOC, DOCX)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              {/* Camera button - chỉ hiện trên mobile */}
              {typeof window !== 'undefined' && window.innerWidth < 768 ? (
                <button
                  type="button"
                  onClick={handleCameraCapture}
                  disabled={uploadingFile || loading}
                  className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition disabled:opacity-50"
                  title="Chụp ảnh"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              ) : null}
            </div>
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
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center max-w-4xl mx-auto">
            AI có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.
          </p>
        </div>
      )}
    </div>
  )
}
