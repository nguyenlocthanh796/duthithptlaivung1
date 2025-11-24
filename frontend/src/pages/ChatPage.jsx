import { useState, useEffect } from 'react'
import { ChatPanel } from '../components/ChatPanel'
import { ChatHistorySidebar } from '../components/ChatHistorySidebar'
import ErrorBoundary from '../components/ErrorBoundary'

export function ChatPage() {
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [historySidebarOpen, setHistorySidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      // Web: mở mặc định, Mobile: đóng mặc định
      if (!mobile) {
        setHistorySidebarOpen(true)
      } else {
        setHistorySidebarOpen(false)
      }
    }
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const handleSelectSession = (sessionId) => {
    setCurrentSessionId(sessionId)
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden relative w-full">
      {/* Chat History Sidebar - Left (Giống Gemini) */}
      <aside
        className={`${
          historySidebarOpen ? 'w-80' : 'w-0'
        } transition-all duration-300 border-r border-slate-200/30 dark:border-slate-800/30 bg-white dark:bg-slate-950 flex-shrink-0 overflow-hidden`}
      >
        {historySidebarOpen && (
          <div className="h-full">
            <ChatHistorySidebar
              onSelectSession={handleSelectSession}
              currentSessionId={currentSessionId}
              onToggle={() => setHistorySidebarOpen(false)}
            />
          </div>
        )}
      </aside>

      {/* Toggle History Sidebar Button - Tối giản, tinh tế */}
      {!historySidebarOpen && (
        <button
          onClick={() => setHistorySidebarOpen(true)}
          className="absolute left-2 top-3 z-30 p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
          title="Mở trình đơn"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Main Chat Area - 100% width */}
      <div 
        className="flex-1 flex flex-col min-w-0"
        style={{
          marginLeft: historySidebarOpen ? '0' : '0',
        }}
      >
        <ErrorBoundary>
          <ChatPanel
            sessionId={currentSessionId}
            onSessionChange={(sessionId) => setCurrentSessionId(sessionId)}
            hideHistorySidebar={true} // Không hiển thị history sidebar trong ChatPanel nữa
          />
        </ErrorBoundary>
      </div>
    </div>
  )
}
