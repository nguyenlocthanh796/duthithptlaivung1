import { useState } from 'react'
import { ChatPanel } from '../components/ChatPanel'
import { ChatHistorySidebar } from '../components/ChatHistorySidebar'
import { ThreeColumnLayout } from '../components/ThreeColumnLayout'
import ErrorBoundary from '../components/ErrorBoundary'

export function ChatPage() {
  const [currentSessionId, setCurrentSessionId] = useState(null)

  const rightSidebar = (
    <div className="space-y-6">
      <div>
        <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">💡 Gợi ý prompt</h4>
        <div className="space-y-2">
          <button
            onClick={() => {
              const input = document.querySelector('#chat-input')
              if (input) {
                input.value = 'Sinh 5 câu hỏi trắc nghiệm Hóa 12 với đáp án giải thích.'
                input.focus()
              }
            }}
            className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gemini-blue hover:bg-gemini-blue/5 transition text-sm text-slate-700 dark:text-slate-300"
          >
            Sinh 5 câu hỏi trắc nghiệm Hóa 12 với đáp án giải thích.
          </button>
          <button
            onClick={() => {
              const input = document.querySelector('#chat-input')
              if (input) {
                input.value = 'Hãy biến đổi câu hỏi này thành 10 biến thể khó hơn.'
                input.focus()
              }
            }}
            className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gemini-blue hover:bg-gemini-blue/5 transition text-sm text-slate-700 dark:text-slate-300"
          >
            Hãy biến đổi câu hỏi này thành 10 biến thể khó hơn.
          </button>
          <button
            onClick={() => {
              const input = document.querySelector('#chat-input')
              if (input) {
                input.value = 'Tóm tắt nhanh kiến thức Cấp số cộng để ôn thi.'
                input.focus()
              }
            }}
            className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gemini-blue hover:bg-gemini-blue/5 transition text-sm text-slate-700 dark:text-slate-300"
          >
            Tóm tắt nhanh kiến thức Cấp số cộng để ôn thi.
          </button>
        </div>
      </div>
      <div className="p-4 rounded-lg bg-gradient-to-br from-gemini-blue/10 to-gemini-green/10 border border-gemini-blue/20">
        <p className="text-sm font-semibold text-gemini-blue mb-2">💡 Mẹo sử dụng</p>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Hãy mô tả rõ môn học, cấp độ, định dạng mong muốn. Trợ lý đã tinh chỉnh cho kiến thức THPT nên có thể trả lời đầy đủ bằng tiếng Việt.
        </p>
      </div>
    </div>
  )

  // Left sidebar shows chat history when sidebar is closed
  const leftSidebar = (
    <ChatHistorySidebar
      onSelectSession={(sessionId) => {
        setCurrentSessionId(sessionId)
      }}
      currentSessionId={currentSessionId}
    />
  )

  return (
    <ThreeColumnLayout leftSidebar={leftSidebar} rightSidebar={rightSidebar}>
      <div className="flex flex-col h-full min-h-[600px]">
        {!currentSessionId && (
          <section className="bg-white dark:bg-slate-800 p-8 border border-slate-200 dark:border-slate-700 rounded-xl mb-4">
          <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-gemini-blue to-gemini-green mb-4 shadow-lg">
                <svg
                  className="w-8 h-8 text-white"
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
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3">
              Trợ lý AI học tập
            </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400">
              Đặt câu hỏi và nhận giải đáp tức thì từ AI được tinh chỉnh cho kiến thức THPT.
            </p>
          </div>
        </section>
        )}
        <div className="flex-1 min-h-0">
          <ErrorBoundary>
            <ChatPanel
              sessionId={currentSessionId}
              onSessionChange={(sessionId) => setCurrentSessionId(sessionId)}
            />
          </ErrorBoundary>
        </div>
      </div>
    </ThreeColumnLayout>
  )
}