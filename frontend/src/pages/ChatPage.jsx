import { useState, useRef, useEffect, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { db } from '../firebase'
// Optimized imports - only import what's needed
import { collection, addDoc, onSnapshot, serverTimestamp, deleteDoc, doc, query, where, orderBy, getDoc, updateDoc } from 'firebase/firestore'
import {
  Send,
  Image as ImageIcon,
  Mic,
  Sparkles,
  Calculator,
  BookOpen,
  X,
  MicOff,
  Minimize2,
  Smile,
  Headphones,
} from 'lucide-react'
import { callGeminiMultimodal } from '../services/chatService'
import { callGeminiTTS } from '../services/ttsService'
import { MascotFace } from '../components/MascotFace'
import { renderTextWithLatex } from '../utils/latexRenderer'
import { ThreeColumnLayout } from '../components/ThreeColumnLayout'
import './ChatPage.css'

const chatHistoryCollection = collection(db, 'chatHistory')

export function ChatPage() {
  const { user } = useAuth()
  
  // State Management
  const [sessions, setSessions] = useState([])
  const [messages, setMessages] = useState([])
  const [currentSessionId, setCurrentSessionId] = useState(null)
  
  // UI State
  const [input, setInput] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const fileInputRef = useRef(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false) // Mobile: đóng mặc định
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef(null)
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      // Web: mở sidebar mặc định, Mobile: đóng mặc định
      if (!mobile) {
        setIsSidebarOpen(true)
      } else {
        setIsSidebarOpen(false)
      }
    }
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // Đảm bảo sidebar mở mặc định trên web khi component mount
  useEffect(() => {
    if (!isMobile) {
      setIsSidebarOpen(true)
    }
  }, [isMobile])

  // Lắng nghe custom event từ Navbar để toggle sidebar trên mobile
  useEffect(() => {
    const handleToggleSidebar = () => {
      if (isMobile) {
        setIsSidebarOpen(prev => !prev)
      }
    }

    window.addEventListener('toggleChatSidebar', handleToggleSidebar)
    return () => {
      window.removeEventListener('toggleChatSidebar', handleToggleSidebar)
    }
  }, [isMobile])

  // Live Mode State
  const [isLiveMode, setIsLiveMode] = useState(false)
  const [liveStatus, setLiveStatus] = useState('idle')
  const [audioUrl, setAudioUrl] = useState(null)
  const recognitionRef = useRef(null)
  const audioRef = useRef(null)

  // 2. Real-time Data Sync (Firestore)
  useEffect(() => {
    if (!user?.uid) return

    // Sync Sessions List
    const sessionsQuery = query(
      chatHistoryCollection,
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    )
    const unsubSessions = onSnapshot(sessionsQuery, (snapshot) => {
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      // Sắp xếp theo thời gian tạo mới nhất
      loaded.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || a.createdAt || 0
        const bTime = b.createdAt?.toMillis?.() || b.createdAt || 0
        return bTime - aTime
      })
      setSessions(loaded)
    })

    return () => {
      unsubSessions()
    }
  }, [user?.uid])

  // 3. FEATURE: Auto-load Previous Conversation
  useEffect(() => {
    // Chỉ chạy logic này 1 lần khi sessions vừa load xong và chưa có session nào được chọn
    if (sessions.length > 0 && !currentSessionId && !isSessionLoaded) {
      setCurrentSessionId(sessions[0].id) // Chọn session mới nhất
      setIsSessionLoaded(true) // Đánh dấu đã load
    }
  }, [sessions, currentSessionId, isSessionLoaded])

  // Load messages for current session
  useEffect(() => {
    if (!currentSessionId || !user?.uid) {
      setMessages([])
      return
    }

    const sessionRef = doc(chatHistoryCollection, currentSessionId)
    const unsub = onSnapshot(sessionRef, (snapshot) => {
      if (snapshot.exists()) {
        const sessionData = snapshot.data()
        if (sessionData.userId === user.uid) {
          setMessages(sessionData.messages || [])
        }
      }
    })

    return () => unsub()
  }, [currentSessionId, user?.uid])

  // Filter messages for current session
  const currentMessages = useMemo(() => {
    if (!currentSessionId) return []
    return messages.sort((a, b) => {
      const aTime = a.timestamp?.toMillis?.() || a.timestamp || 0
      const bTime = b.timestamp?.toMillis?.() || b.timestamp || 0
      return aTime - bTime
    })
  }, [messages, currentSessionId])

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [currentMessages, isTyping])

  // --- Actions Handlers ---
  const createNewSession = async () => {
    if (!user?.uid) return

    const ref = await addDoc(chatHistoryCollection, {
      userId: user.uid,
      title: 'Bài học mới',
      messages: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    setCurrentSessionId(ref.id)
    setInput('')
    setSelectedImage(null)
  }

  const deleteSession = async (e, id) => {
    e.stopPropagation()
    if (confirm("Xóa cuộc trò chuyện này?")) {
      await deleteDoc(doc(chatHistoryCollection, id))
      if (currentSessionId === id) {
        setCurrentSessionId(null)
        setMessages([])
      }
    }
  }

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setSelectedImage(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const sendMessage = async (text, isVoice = false) => {
    if ((!text.trim() && !selectedImage) || !user?.uid) return

    const textToSend = text.trim()
    const imageToSend = selectedImage

    // Optimistic UI updates
    setInput('')
    setSelectedImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''

    let activeSessionId = currentSessionId
    if (!activeSessionId) {
      const ref = await addDoc(chatHistoryCollection, {
        userId: user.uid,
        title: textToSend.slice(0, 30) || 'Hình ảnh mới...',
        messages: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      activeSessionId = ref.id
      setCurrentSessionId(activeSessionId)
    }

    setIsTyping(true)
    if (isVoice) setLiveStatus('processing')

    try {
      // Get current session to update
      const sessionRef = doc(chatHistoryCollection, activeSessionId)
      const sessionSnap = await getDoc(sessionRef)
      
      if (!sessionSnap.exists()) {
        throw new Error('Session not found')
      }

      const currentMessages = sessionSnap.data().messages || []
      const now = new Date()

      // Add user message
      const userMessage = {
        role: 'user',
        content: textToSend + (imageToSend ? ' [Đã gửi ảnh]' : ''),
        timestamp: now,
      }

      const updatedMessages = [...currentMessages, userMessage]

      await updateDoc(sessionRef, {
        messages: updatedMessages,
        updatedAt: serverTimestamp(),
      })

      // Get AI response
      const history = currentMessages.slice(-5).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        content: msg.content
      }))

      const responseText = await callGeminiMultimodal(textToSend, imageToSend, history)

      // Add AI message
      const aiMessage = {
        role: 'ai',
        content: responseText,
        timestamp: new Date(),
      }

      await updateDoc(sessionRef, {
        messages: [...updatedMessages, aiMessage],
        updatedAt: serverTimestamp(),
      })

      if (isVoice && isLiveMode) {
        setLiveStatus('processing_audio')
        const audioUrl = await callGeminiTTS(responseText)
        if (audioUrl) {
          setAudioUrl(audioUrl)
          setLiveStatus('speaking')
        } else {
          setLiveStatus('idle')
        }
      } else {
        if (isLiveMode) setLiveStatus('idle')
      }
    } catch (e) {
      console.error(e)
      setLiveStatus('idle')
    } finally {
      setIsTyping(false)
    }
  }

  const toggleLiveMode = () => {
    if (isLiveMode) {
      setIsLiveMode(false)
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      setLiveStatus('idle')
      setAudioUrl(null)
    } else {
      setIsLiveMode(true)
      setIsSidebarOpen(false)
      startListening()
    }
  }

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Trình duyệt không hỗ trợ nhận diện giọng nói.")
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'vi-VN'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => setLiveStatus('listening')
    recognition.onend = () => {
      if (liveStatus === 'listening') {
        setLiveStatus('idle')
      }
    }
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      sendMessage(transcript, true)
    }
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setLiveStatus('idle')
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play()
    }
  }, [audioUrl])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => {
        setLiveStatus('idle')
      }
    }
  }, [audioRef.current])

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gemini-blue mx-auto mb-4"></div>
          <p className="text-slate-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  const toggleMenu = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const closeMenu = () => {
    setIsSidebarOpen(false)
  }

  // Chat content component
  const ChatContent = () => (
    <div className="flex bg-gray-50 font-sans text-gray-800 overflow-hidden relative" style={{ height: 'calc(100vh - 64px)', marginTop: '64px' }}>
      {/* Overlay */}
      <div
        className={`chat-overlay ${isSidebarOpen && !isLiveMode ? 'open' : ''}`}
        onClick={closeMenu}
      />

      {/* SIDEBAR - History List (Gemini Style) */}
      <aside className={`chat-sidebar ${isSidebarOpen && !isLiveMode ? 'open' : ''}`}>
        <div className="flex-1 overflow-y-auto pt-4">
          {/* Nút tạo cuộc trò chuyện mới */}
          <button
            onClick={createNewSession}
            className="nav-item"
            style={{ marginTop: '8px' }}
          >
            <span className="material-symbols-outlined">add</span>
            <span>Cuộc trò chuyện mới</span>
          </button>

          {/* Danh sách sessions */}
          <div style={{ marginTop: '8px' }}>
            {sessions.map((session) => (
              <div key={session.id} className="relative group">
                <button
                  onClick={() => {
                    setCurrentSessionId(session.id)
                    if (isMobile) closeMenu()
                  }}
                  className={`session-item ${currentSessionId === session.id ? 'active' : ''}`}
                >
                  <span className="material-symbols-outlined">
                    {currentSessionId === session.id ? 'chat_bubble' : 'chat_bubble_outline'}
                  </span>
                  <span className="truncate flex-1">{session.title || "Cuộc trò chuyện"}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteSession(e, session.id)
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-gray-200 text-gray-500 hover:text-red-500 transition-all"
                  aria-label="Xóa cuộc trò chuyện"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* MAIN AREA */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col h-full bg-white relative transition-all duration-300">
          {/* Header - Fixed, nằm dưới Navbar (64px) - Cố định hoàn toàn */}
          <header 
            className="h-16 flex items-center justify-between fixed bg-white/90 backdrop-blur-sm z-10 border-b border-gray-100" 
            style={{ 
              top: '64px', 
              left: isMobile && isSidebarOpen ? '256px' : 0, 
              right: 0, 
              paddingLeft: '16px',
              paddingRight: '16px',
              overflow: 'hidden', 
              overscrollBehavior: 'none', 
              touchAction: 'none',
              transition: 'left 0.3s ease',
              width: isMobile && isSidebarOpen ? 'calc(100% - 256px)' : '100%',
              position: 'fixed',
              willChange: 'transform',
              transform: 'translateZ(0)', // Force GPU acceleration
            }}
          >
            <div className="flex items-center gap-3">
              {!isLiveMode && (
                <button
                  onClick={toggleMenu}
                  className="material-btn-icon"
                  aria-label={isSidebarOpen ? "Đóng menu" : "Mở menu"}
                >
                  <span className="material-symbols-outlined">
                    {isSidebarOpen ? 'menu_open' : 'menu'}
                  </span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {!isLiveMode && (
                <button
                  onClick={toggleLiveMode}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-full hover:shadow-lg transition-all shadow-md"
                >
                  <Headphones size={16} /> <span className="text-sm font-bold">Gặp Bạn Học AI</span>
                </button>
              )}
            </div>
          </header>

          {/* Chat Content */}
          <div className="flex-1 overflow-y-auto pb-24 md:pb-32 bg-gray-50" style={{ 
            paddingTop: '128px', 
            paddingLeft: '5px', 
            paddingRight: '5px',
            minHeight: 'calc(100vh - 128px)'
          }}>
            <div className="max-w-3xl mx-auto">
              {!currentSessionId || currentMessages.length === 0 ? (
                <div className="mt-8 md:mt-12 text-center text-gray-400">
                  <Sparkles size={40} className="md:w-12 md:h-12 mx-auto mb-3 md:mb-4 text-blue-200" />
                  <h2 className="text-xl md:text-2xl font-semibold text-gray-600">Sẵn sàng học cùng nhau chưa?</h2>
                  <p className="mb-6 md:mb-8 mt-2 text-sm md:text-base text-gray-500">Tớ là Minh, bạn học cùng lớp cậu đây!</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-6 md:mt-8 text-left">
                    {[
                      {
                        icon: Calculator,
                        color: 'text-blue-500',
                        bg: 'bg-blue-100',
                        title: 'Giải toán cùng tớ',
                        prompt: 'Ê cậu, bài toán này giải sao nhỉ: ...',
                      },
                      {
                        icon: BookOpen,
                        color: 'text-orange-500',
                        bg: 'bg-orange-100',
                        title: 'Soạn văn',
                        prompt: 'Gợi ý cho tớ dàn ý bài văn này với...',
                      },
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => setInput(item.prompt)}
                        className="text-left p-3 md:p-4 rounded-xl bg-white hover:bg-gray-100 border shadow-sm flex items-center gap-2 md:gap-3"
                      >
                        <div className={`p-1.5 md:p-2 rounded-full ${item.bg} ${item.color}`}>
                          <item.icon size={16} className="md:w-[18px] md:h-[18px]" />
                        </div>
                        <span className="font-medium text-sm md:text-base text-gray-700">{item.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                currentMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-2 md:gap-4 mb-4 md:mb-6 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'ai' && (
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-tr from-pink-400 to-orange-400 flex items-center justify-center text-white shrink-0 mt-1">
                        <Smile size={14} className="md:w-4 md:h-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] md:max-w-[85%] rounded-2xl p-3 md:p-4 leading-relaxed whitespace-pre-wrap text-sm md:text-base ${
                        msg.role === 'user'
                          ? 'bg-[#eff3f8] text-gray-800'
                          : 'bg-transparent text-gray-800 px-0'
                      }`}
                    >
                      {renderTextWithLatex(msg.content)}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 mt-1 text-xs md:text-sm">
                        {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                ))
              )}
              {isTyping && !isLiveMode && (
                <div className="text-gray-400 text-sm italic ml-12">Minh đang suy nghĩ...</div>
              )}
              <div ref={scrollRef}></div>
            </div>
          </div>

          {/* Input Area */}
          <div className="fixed md:absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pt-6 md:pt-10 pb-3 md:pb-6 px-3 md:px-4">
            <div className="max-w-3xl mx-auto">
              {selectedImage && (
                <div className="mb-2 inline-block relative animate-in fade-in zoom-in duration-200">
                  <div className="relative">
                    <img
                      src={selectedImage}
                      alt="Selected"
                      className="h-20 md:h-24 rounded-xl border border-gray-200 shadow-md object-cover"
                    />
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 hover:bg-red-500 shadow-sm"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              )}
              <div className="bg-white shadow-lg hover:shadow-xl transition-all rounded-[24px] md:rounded-[28px] p-1.5 md:p-2 relative border border-gray-100">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
                  placeholder={isLiveMode ? "Tớ đang nghe nè..." : "Nhập câu hỏi hoặc gửi ảnh..."}
                  className="w-full bg-transparent border-none focus:ring-0 text-gray-800 px-3 md:px-4 py-2.5 md:py-3 pr-28 md:pr-32 text-sm md:text-base outline-none"
                />
                <div className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 md:gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    className="hidden"
                    accept="image/*"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-1.5 md:p-2 rounded-full transition-colors ${
                      selectedImage
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <ImageIcon size={18} className="md:w-5 md:h-5" />
                  </button>
                  <button
                    onClick={toggleLiveMode}
                    className={`p-1.5 md:p-2 rounded-full transition-colors ${
                      isLiveMode
                        ? 'bg-red-100 text-red-500'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Mic size={18} className="md:w-5 md:h-5" />
                  </button>
                  {(input.trim() || selectedImage) && (
                    <button
                      onClick={() => sendMessage(input)}
                      className="p-1.5 md:p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-sm"
                    >
                      <Send size={16} className="md:w-[18px] md:h-[18px]" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Panel */}
        {isLiveMode && (
          <div className="w-full md:w-[300px] lg:w-[320px] bg-[#fff0f5] border-l border-pink-100 flex flex-col items-center relative animate-in slide-in-from-right duration-300 shadow-2xl z-20 fixed md:relative inset-0 md:inset-auto">
            <div className="w-full flex justify-between items-center p-4">
              <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-bold text-sm text-pink-500">LIVE MODE</span>
              </div>
              <button
                onClick={toggleLiveMode}
                className="p-2 hover:bg-pink-100 rounded-full text-pink-400 transition-colors"
              >
                <Minimize2 size={20} />
              </button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center w-full relative pt-8 md:pt-0">
              <div className="mb-6 md:mb-8">
                <MascotFace status={liveStatus} />
              </div>
              <div className="text-center px-4 md:px-6 min-h-[60px]">
                <p className="text-lg md:text-xl font-bold text-gray-700 mb-2 transition-all">
                  {liveStatus === 'listening' && "Tớ đang nghe nè!"}
                  {liveStatus === 'speaking' && "Minh đang nói..."}
                  {(liveStatus === 'processing' || liveStatus === 'processing_audio') &&
                    "Đợi tớ xíu nha..."}
                  {liveStatus === 'idle' && "Bấm mic để nói chuyện nhé!"}
                </p>
              </div>
            </div>
            <div className="w-full p-4 md:p-6 pb-6 md:pb-8 bg-white/50 backdrop-blur-md border-t border-pink-100">
              <div className="flex justify-center gap-6">
                <button
                  onClick={() => {
                    if (liveStatus === 'listening') {
                      if (recognitionRef.current) recognitionRef.current.stop()
                      setLiveStatus('idle')
                    } else {
                      startListening()
                    }
                  }}
                  className={`p-5 md:p-6 rounded-full transition-all transform hover:scale-110 shadow-xl border-4 ${
                    liveStatus === 'listening'
                      ? 'bg-red-400 border-red-200 text-white'
                      : 'bg-blue-400 border-blue-200 text-white'
                  }`}
                >
                  {liveStatus === 'listening' ? <MicOff size={28} className="md:w-8 md:h-8" /> : <Mic size={28} className="md:w-8 md:h-8" />}
                </button>
              </div>
            </div>
            <audio
              ref={audioRef}
              src={audioUrl || ''}
              onEnded={() => setLiveStatus('idle')}
              className="hidden"
            />
          </div>
        )}
      </div>
    </div>
  )

  // Wrap trong ThreeColumnLayout để có menu sidebar chính
  return (
    <ThreeColumnLayout>
      <ChatContent />
    </ThreeColumnLayout>
  )
}
