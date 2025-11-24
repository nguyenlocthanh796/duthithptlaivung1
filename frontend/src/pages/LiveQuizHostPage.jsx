/**
 * Live Quiz Host Page - Teacher Control Panel
 * Giáo viên điều khiển quiz, bắt đầu câu hỏi, xem leaderboard
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/Toast'
import {
  createLiveQuiz,
  startQuiz,
  nextQuestion,
  endQuiz,
  watchQuiz,
  watchLeaderboard,
  calculateLeaderboard,
} from '../services/liveQuizService'
import { ThreeColumnLayout } from '../components/ThreeColumnLayout'

export function LiveQuizHostPage() {
  const { user } = useAuth()
  const { success, error: showError } = useToast()
  const [quizId, setQuizId] = useState(null)
  const [quizData, setQuizData] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [currentQuestionNum, setCurrentQuestionNum] = useState(0)
  const [quizTitle, setQuizTitle] = useState('')
  const [quizSubject, setQuizSubject] = useState('Toán')
  const [questions, setQuestions] = useState([])
  const [timePerQuestion, setTimePerQuestion] = useState(30)

  useEffect(() => {
    if (!quizId) return

    const unsubscribeQuiz = watchQuiz(quizId, (data) => {
      setQuizData(data)
      if (data?.currentQuestion) {
        setCurrentQuestionNum(data.currentQuestion)
      }
    })

    const unsubscribeLeaderboard = watchLeaderboard(quizId, (board) => {
      setLeaderboard(board)
    })

    return () => {
      unsubscribeQuiz()
      unsubscribeLeaderboard()
    }
  }, [quizId])

  const handleCreateQuiz = async () => {
    if (!quizTitle.trim()) {
      showError('Vui lòng nhập tiêu đề quiz')
      return
    }

    if (questions.length === 0) {
      showError('Vui lòng thêm ít nhất 1 câu hỏi')
      return
    }

    try {
      // Format questions for RTDB
      const questionsObj = {}
      questions.forEach((q, index) => {
        questionsObj[index + 1] = {
          text: q.text,
          options: q.options,
          correctAnswer: q.correctAnswer,
        }
      })

      const id = await createLiveQuiz(user.uid, {
        title: quizTitle,
        subject: quizSubject,
        questions: questionsObj,
        timePerQuestion,
      })

      setQuizId(id)
      success(`Quiz đã được tạo! Mã quiz: ${id}`)
    } catch (error) {
      console.error('Error creating quiz:', error)
      showError('Không thể tạo quiz. Vui lòng thử lại.')
    }
  }

  const handleStartQuiz = async () => {
    try {
      await startQuiz(quizId)
      setCurrentQuestionNum(1)
      success('Quiz đã bắt đầu!')
    } catch (error) {
      console.error('Error starting quiz:', error)
      showError('Không thể bắt đầu quiz.')
    }
  }

  const handleNextQuestion = async () => {
    try {
      const nextNum = currentQuestionNum + 1
      const totalQuestions = Object.keys(quizData?.questions || {}).length

      if (nextNum > totalQuestions) {
        await endQuiz(quizId)
        success('Quiz đã kết thúc!')
      } else {
        await nextQuestion(quizId, nextNum)
        setCurrentQuestionNum(nextNum)
        // Calculate leaderboard after each question
        await calculateLeaderboard(quizId)
        success(`Câu hỏi ${nextNum} đã bắt đầu!`)
      }
    } catch (error) {
      console.error('Error moving to next question:', error)
      showError('Không thể chuyển câu hỏi.')
    }
  }

  const handleEndQuiz = async () => {
    try {
      await endQuiz(quizId)
      await calculateLeaderboard(quizId)
      success('Quiz đã kết thúc!')
    } catch (error) {
      console.error('Error ending quiz:', error)
      showError('Không thể kết thúc quiz.')
    }
  }

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        text: '',
        options: ['', '', '', ''],
        correctAnswer: 'A',
      },
    ])
  }

  const updateQuestion = (index, field, value) => {
    const updated = [...questions]
    if (field === 'options') {
      updated[index].options = value
    } else {
      updated[index][field] = value
    }
    setQuestions(updated)
  }

  const rightSidebar = (
    <div className="space-y-4">
      {quizId && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
            📋 Thông tin Quiz
          </h4>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-slate-600 dark:text-slate-400">Mã Quiz:</span>{' '}
              <span className="font-mono font-semibold">{quizId}</span>
            </p>
            <p>
              <span className="text-slate-600 dark:text-slate-400">Trạng thái:</span>{' '}
              <span className="font-semibold">{quizData?.status || 'waiting'}</span>
            </p>
            <p>
              <span className="text-slate-600 dark:text-slate-400">Câu hỏi hiện tại:</span>{' '}
              <span className="font-semibold">{currentQuestionNum}</span>
            </p>
          </div>
        </div>
      )}

      {leaderboard.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
            🏆 Top 10
          </h4>
          <div className="space-y-1">
            {leaderboard.slice(0, 10).map((entry, index) => (
              <div
                key={entry.userId}
                className="p-2 rounded bg-slate-50 dark:bg-slate-800 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">#{index + 1} {entry.name || 'Anonymous'}</span>
                  <span className="font-bold text-blue-600">{entry.score || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  if (!quizId) {
    return (
      <ThreeColumnLayout rightSidebar={rightSidebar}>
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              🎮 Tạo Live Quiz
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Tiêu đề Quiz
                </label>
                <input
                  type="text"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="Ví dụ: Đua top Toán 12 - Tuần 1"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Môn học
                </label>
                <select
                  value={quizSubject}
                  onChange={(e) => setQuizSubject(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option>Toán</option>
                  <option>Lý</option>
                  <option>Hóa</option>
                  <option>Sinh</option>
                  <option>Văn</option>
                  <option>Anh</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Thời gian mỗi câu (giây)
                </label>
                <input
                  type="number"
                  value={timePerQuestion}
                  onChange={(e) => setTimePerQuestion(parseInt(e.target.value) || 30)}
                  min="10"
                  max="120"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Câu hỏi
                  </label>
                  <button
                    onClick={addQuestion}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Thêm câu hỏi
                  </button>
                </div>

                <div className="space-y-4">
                  {questions.map((q, index) => (
                    <div
                      key={index}
                      className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg"
                    >
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Câu {index + 1}
                        </label>
                        <input
                          type="text"
                          value={q.text}
                          onChange={(e) => updateQuestion(index, 'text', e.target.value)}
                          placeholder="Nhập câu hỏi..."
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
                        />
                      </div>

                      <div className="space-y-2 mb-3">
                        {q.options.map((opt, optIndex) => (
                          <div key={optIndex} className="flex items-center gap-2">
                            <span className="text-xs font-medium w-6">
                              {String.fromCharCode(65 + optIndex)}:
                            </span>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const newOptions = [...q.options]
                                newOptions[optIndex] = e.target.value
                                updateQuestion(index, 'options', newOptions)
                              }}
                              placeholder={`Đáp án ${String.fromCharCode(65 + optIndex)}`}
                              className="flex-1 px-3 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
                            />
                          </div>
                        ))}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Đáp án đúng
                        </label>
                        <select
                          value={q.correctAnswer}
                          onChange={(e) => updateQuestion(index, 'correctAnswer', e.target.value)}
                          className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
                        >
                          {q.options.map((_, optIndex) => (
                            <option key={optIndex} value={String.fromCharCode(65 + optIndex)}>
                              {String.fromCharCode(65 + optIndex)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateQuiz}
                disabled={!quizTitle.trim() || questions.length === 0}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Tạo Quiz
              </button>
            </div>
          </div>
        </div>
      </ThreeColumnLayout>
    )
  }

  const totalQuestions = Object.keys(quizData?.questions || {}).length
  const isFinished = quizData?.status === 'finished'

  return (
    <ThreeColumnLayout rightSidebar={rightSidebar}>
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {quizData?.title || quizTitle}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Mã Quiz: <span className="font-mono font-semibold">{quizId}</span>
          </p>

          <div className="space-y-4">
            {quizData?.status === 'waiting' && (
              <button
                onClick={handleStartQuiz}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-6 rounded-lg font-medium hover:from-green-600 hover:to-emerald-600 transition"
              >
                ▶️ Bắt đầu Quiz
              </button>
            )}

            {quizData?.status?.startsWith('question_') && !isFinished && (
              <div className="space-y-3">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Câu hỏi hiện tại: {currentQuestionNum}/{totalQuestions}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {quizData?.questions?.[currentQuestionNum]?.text || 'Đang tải...'}
                  </p>
                </div>

                <button
                  onClick={handleNextQuestion}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-indigo-600 transition"
                >
                  {currentQuestionNum >= totalQuestions ? 'Kết thúc Quiz' : 'Câu hỏi tiếp theo →'}
                </button>
              </div>
            )}

            {!isFinished && quizData?.status !== 'waiting' && (
              <button
                onClick={handleEndQuiz}
                className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white py-3 px-6 rounded-lg font-medium hover:from-red-600 hover:to-pink-600 transition"
              >
                ⏹️ Kết thúc Quiz ngay
              </button>
            )}

            {isFinished && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  ✅ Quiz đã kết thúc!
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  Xem bảng xếp hạng ở sidebar bên phải.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ThreeColumnLayout>
  )
}

