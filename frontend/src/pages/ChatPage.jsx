import { useState } from 'react'
import { ChatPanel } from '../components/ChatPanel'
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
            className="w-full text-left p-3 rounded border border-slate-200/30 dark:border-slate-700/30 bg-white dark:bg-slate-800 hover:border-gemini-blue hover:bg-gemini-blue/5 transition text-sm text-slate-700 dark:text-slate-300"
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
            className="w-full text-left p-3 rounded border border-slate-200/30 dark:border-slate-700/30 bg-white dark:bg-slate-800 hover:border-gemini-blue hover:bg-gemini-blue/5 transition text-sm text-slate-700 dark:text-slate-300"
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
            className="w-full text-left p-3 rounded border border-slate-200/30 dark:border-slate-700/30 bg-white dark:bg-slate-800 hover:border-gemini-blue hover:bg-gemini-blue/5 transition text-sm text-slate-700 dark:text-slate-300"
          >
            Tóm tắt nhanh kiến thức Cấp số cộng để ôn thi.
          </button>
        </div>
      </div>
      <div className="p-4 rounded bg-gemini-blue/5 dark:bg-gemini-blue/10 border border-gemini-blue/20">
        <p className="text-sm font-semibold text-gemini-blue mb-2">💡 Mẹo sử dụng</p>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Hãy mô tả rõ môn học, cấp độ, định dạng mong muốn. Trợ lý đã tinh chỉnh cho kiến thức THPT nên có thể trả lời đầy đủ bằng tiếng Việt.
        </p>
      </div>
    </div>
  )

  return (
    <ThreeColumnLayout rightSidebar={rightSidebar}>
      <div className="w-full h-[calc(100vh-64px)] -mx-4 -my-6 -mt-0">
        <ErrorBoundary>
          <ChatPanel
            sessionId={currentSessionId}
            onSessionChange={(sessionId) => setCurrentSessionId(sessionId)}
          />
        </ErrorBoundary>
      </div>
    </ThreeColumnLayout>
  )
}
