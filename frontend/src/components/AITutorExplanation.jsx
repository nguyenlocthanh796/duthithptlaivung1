/**
 * AI Tutor Explanation Component
 * Giai đoạn 1: "Gia sư AI" - Giải thích tại sao học sinh sai
 */

import { useState } from 'react'
import { getAIExplanation } from '../services/aiTutorService'
import { useToast } from './Toast'

export function AITutorExplanation({ question, studentAnswer, correctAnswer, subject = 'Toán' }) {
  const [loading, setLoading] = useState(false)
  const [explanation, setExplanation] = useState(null)
  const [hints, setHints] = useState([])
  const { success, error: showError } = useToast()

  const handleExplain = async () => {
    if (!question || !studentAnswer || !correctAnswer) {
      showError('Thiếu thông tin để giải thích')
      return
    }

    setLoading(true)
    try {
      const result = await getAIExplanation(question, studentAnswer, correctAnswer, subject)
      setExplanation(result.explanation)
      setHints(result.hints || [])
      success('Đã tạo lời giải thích!')
    } catch (error) {
      console.error('Error getting AI explanation:', error)
      showError(error.message || 'Không thể lấy lời giải thích. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  if (explanation) {
    return (
      <div className="mt-4 p-4 rounded-lg bg-gemini-blue/5 dark:bg-gemini-blue/10 border border-gemini-blue/20 dark:border-gemini-blue/30">
        <div className="flex items-start gap-3">
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
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-gemini-blue dark:text-gemini-blue-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h4 className="text-lg font-semibold text-gemini-blue dark:text-gemini-blue-light">
                Gia sư AI giải thích
              </h4>
            </div>
            <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {explanation}
            </p>
            
            {hints.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gemini-blue/20 dark:border-gemini-blue/30">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-gemini-blue dark:text-gemini-blue-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <h5 className="text-sm font-semibold text-gemini-blue dark:text-gemini-blue-light">
                    Mẹo nhớ:
                  </h5>
                </div>
                <ul className="space-y-1">
                  {hints.map((hint, index) => (
                    <li key={index} className="text-sm text-slate-600 dark:text-slate-400">
                      • {hint}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => {
                setExplanation(null)
                setHints([])
              }}
              className="mt-4 text-sm text-gemini-blue dark:text-gemini-blue-light hover:text-gemini-blue/80 dark:hover:text-gemini-blue-light/80 transition"
            >
              Ẩn giải thích
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={handleExplain}
      disabled={loading}
      className="mt-2 px-4 py-2 bg-gemini-blue text-white rounded-lg hover:bg-gemini-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Đang tạo lời giải thích...</span>
        </>
      ) : (
        <>
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
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Tại sao tôi sai?</span>
        </>
      )}
    </button>
  )
}

