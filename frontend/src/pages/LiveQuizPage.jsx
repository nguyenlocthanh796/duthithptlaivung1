/**
 * Live Quiz Page - Đấu Trường Trực Tuyến
 * 100 học sinh cùng thi, realtime updates
 */

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/Toast'
import {
  watchQuiz,
  watchQuizStatus,
  watchLeaderboard,
  submitAnswer,
  getQuiz,
} from '../services/liveQuizService'
import { ThreeColumnLayout } from '../components/ThreeColumnLayout'

export function LiveQuizPage() {
  const { user } = useAuth()
  const { success, error: showError } = useToast()
  const [quizId, setQuizId] = useState(null)
  const [quizData, setQuizData] = useState(null)
  const [status, setStatus] = useState('waiting') // waiting, question_1, question_2, ..., finished
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [leaderboard, setLeaderboard] = useState([])
  const [userAnswer, setUserAnswer] = useState(null)
  const [quizPassword, setQuizPassword] = useState('')
  const timerRef = useRef(null)

  // Watch quiz status changes
  useEffect(() => {
    if (!quizId) return

    const unsubscribeStatus = watchQuizStatus(quizId, (newStatus) => {
      setStatus(newStatus)
      
      if (newStatus.startsWith('question_')) {
        const questionNum = parseInt(newStatus.split('_')[1])
        loadQuestion(questionNum)
      }
    })

    const unsubscribeQuiz = watchQuiz(quizId, (data) => {
      setQuizData(data)
      if (data?.status) {
        setStatus(data.status)
        if (data.status.startsWith('question_')) {
          const questionNum = parseInt(data.status.split('_')[1])
          loadQuestion(questionNum)
        }
      }
    })

    const unsubscribeLeaderboard = watchLeaderboard(quizId, (board) => {
      setLeaderboard(board)
    })

    return () => {
      unsubscribeStatus()
      unsubscribeQuiz()
      unsubscribeLeaderboard()
    }
  }, [quizId])

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0 && status.startsWith('question_')) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
    } else if (timeLeft === 0 && status.startsWith('question_')) {
      // Time's up - auto submit if not submitted
      if (selectedAnswer && !userAnswer) {
        handleSubmitAnswer()
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [timeLeft, status, selectedAnswer, userAnswer])

  const loadQuestion = (questionNum) => {
    if (!quizData?.questions) return

    const question = quizData.questions[questionNum]
    if (question) {
      setCurrentQuestion({
        number: questionNum,
        ...question,
      })
      setTimeLeft(quizData.settings?.timePerQuestion || 30)
      setSelectedAnswer(null)
      setUserAnswer(null)
    }
  }

  const joinQuiz = async () => {
    if (!quizPassword.trim()) {
      showError('Vui lòng nhập mã quiz')
      return
    }

    try {
      // In production, validate quiz password and get quizId
      // For now, assume quizId = quizPassword
      const id = quizPassword.trim()
      const quiz = await getQuiz(id)
      
      if (!quiz) {
        showError('Không tìm thấy quiz. Kiểm tra lại mã quiz.')
        return
      }

      setQuizId(id)
      setQuizData(quiz)
      setStatus(quiz.status || 'waiting')
      success('Đã tham gia quiz thành công!')
    } catch (error) {
      console.error('Error joining quiz:', error)
      showError('Không thể tham gia quiz. Vui lòng thử lại.')
    }
  }

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || !currentQuestion || userAnswer) return

    try {
      await submitAnswer(quizId, user.uid, currentQuestion.number, selectedAnswer)
      setUserAnswer(selectedAnswer)
      success('Đã gửi đáp án!')
    } catch (error) {
      console.error('Error submitting answer:', error)
      showError('Không thể gửi đáp án. Vui lòng thử lại.')
    }
  }

  const rightSidebar = (
    <div className="space-y-4">
      <div>
        <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
          🏆 Bảng xếp hạng
        </h4>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có dữ liệu</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.slice(0, 10).map((entry, index) => (
              <div
                key={entry.userId}
                className={`p-2 rounded-lg ${
                  entry.userId === user?.uid
                    ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500'
                    : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                      #{index + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {entry.name || 'Anonymous'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {entry.score || 0}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">
                      ({entry.correct || 0}/{entry.total || 0})
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  if (!quizId) {
    return (
      <ThreeColumnLayout rightSidebar={rightSidebar}>
        <div className="max-w-md mx-auto">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              🎮 Đấu Trường Trực Tuyến
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Nhập mã quiz để tham gia cuộc thi trực tuyến với 100 học sinh khác!
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Mã Quiz
                </label>
                <input
                  type="text"
                  value={quizPassword}
                  onChange={(e) => setQuizPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && joinQuiz()}
                  placeholder="Nhập mã quiz..."
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <button
                onClick={joinQuiz}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-indigo-600 transition"
              >
                Tham gia Quiz
              </button>
            </div>
          </div>
        </div>
      </ThreeColumnLayout>
    )
  }

  if (status === 'waiting') {
    return (
      <ThreeColumnLayout rightSidebar={rightSidebar}>
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
            <svg
              className="w-10 h-10 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Đang chờ bắt đầu...
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Giáo viên sẽ bắt đầu quiz sớm. Hãy chờ đợi!
          </p>
        </div>
      </ThreeColumnLayout>
    )
  }

  if (status === 'finished') {
    const userRank = leaderboard.findIndex((e) => e.userId === user?.uid) + 1
    const userScore = leaderboard.find((e) => e.userId === user?.uid)

    return (
      <ThreeColumnLayout rightSidebar={rightSidebar}>
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-8 text-center">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              🎉 Quiz đã kết thúc!
            </h2>
            
            {userScore && (
              <div className="mt-6">
                <p className="text-lg text-slate-700 dark:text-slate-300 mb-2">
                  Xếp hạng của bạn:
                </p>
                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  #{userRank || 'N/A'}
                </p>
                <p className="text-xl text-slate-600 dark:text-slate-400">
                  Điểm: <span className="font-bold">{userScore.score || 0}</span> (
                  {userScore.correct || 0}/{userScore.total || 0} câu đúng)
                </p>
              </div>
            )}
          </div>
        </div>
      </ThreeColumnLayout>
    )
  }

  if (!currentQuestion) {
    return (
      <ThreeColumnLayout rightSidebar={rightSidebar}>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Đang tải câu hỏi...</p>
        </div>
      </ThreeColumnLayout>
    )
  }

  return (
    <ThreeColumnLayout rightSidebar={rightSidebar}>
      <div className="max-w-3xl mx-auto">
        {/* Question Header */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Câu {currentQuestion.number}
            </h3>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {timeLeft}s
                </div>
                <div className="text-xs text-slate-500">Thời gian còn lại</div>
              </div>
            </div>
          </div>

          <p className="text-base text-slate-800 dark:text-slate-200 mb-6">
            {currentQuestion.text}
          </p>

          {/* Answer Options */}
          <div className="grid gap-3 md:grid-cols-2">
            {currentQuestion.options?.map((option, index) => {
              const isSelected = selectedAnswer === option
              const isSubmitted = userAnswer === option

              return (
                <button
                  key={index}
                  onClick={() => !userAnswer && setSelectedAnswer(option)}
                  disabled={!!userAnswer}
                  className={`p-4 rounded-lg border-2 text-left transition ${
                    isSubmitted
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
                  } ${userAnswer ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        isSelected || isSubmitted
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="text-slate-900 dark:text-slate-100">{option}</span>
                    {isSubmitted && (
                      <span className="ml-auto text-green-600 dark:text-green-400">✓</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Submit Button */}
          {!userAnswer && selectedAnswer && (
            <button
              onClick={handleSubmitAnswer}
              className="mt-6 w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-indigo-600 transition"
            >
              Gửi đáp án
            </button>
          )}

          {userAnswer && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                ✓ Đã gửi đáp án: <span className="font-semibold">{userAnswer}</span>
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Chờ câu hỏi tiếp theo...
              </p>
            </div>
          )}
        </div>
      </div>
    </ThreeColumnLayout>
  )
}

