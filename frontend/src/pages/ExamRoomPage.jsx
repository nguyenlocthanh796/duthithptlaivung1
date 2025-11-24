import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { useAuth } from '../hooks/useAuth'
import { findExamRoomByPassword, getExamById, saveSubmission, getAllExamRooms } from '../services/firestore'
import { gradeSubmission, pickRandomVariants } from '../utils/exam'
import { ProctoringMonitor } from '../components/ProctoringMonitor'
import { ThreeColumnLayout } from '../components/ThreeColumnLayout'
import { useToast } from '../components/Toast'
import { AITutorExplanation } from '../components/AITutorExplanation'

const shuffleOptions = (options) => [...options].sort(() => Math.random() - 0.5)

export function ExamRoomPage() {
  const { user } = useAuth()
  const { success, error: showError } = useToast()
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('Nhập mật khẩu để vào phòng thi')
  const [currentExam, setCurrentExam] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [submittedAnswers, setSubmittedAnswers] = useState(null) // Store for AI Tutor
  const [alerts, setAlerts] = useState([])
  const [availableRooms, setAvailableRooms] = useState([])
  const [showRoomList, setShowRoomList] = useState(true)
  const [submissionId, setSubmissionId] = useState(null) // Track submission for auto-grading

  useEffect(() => {
    loadAvailableRooms()
  }, [])

  const loadAvailableRooms = async () => {
    try {
      const rooms = await getAllExamRooms()
      setAvailableRooms(rooms)
    } catch (error) {
      console.error('Error loading exam rooms:', error)
    }
  }

  const joinRoom = async (roomPassword = null) => {
    const pwd = roomPassword || password
    if (!pwd || !pwd.trim()) {
      showError('Vui lòng nhập mật khẩu phòng thi')
      return
    }
    
    try {
      setStatus('Đang kiểm tra phòng...')
      const room = await findExamRoomByPassword(pwd.trim())
      if (!room) {
        setStatus('Sai mật khẩu hoặc phòng chưa mở')
        showError('Sai mật khẩu hoặc phòng thi không tồn tại')
        return
      }
      
      // Check if room is within time range
      const now = new Date()
      const startTime = room.startTime?.toDate?.() || new Date(room.startTime)
      const endTime = room.endTime?.toDate?.() || new Date(room.endTime)
      
      if (now < startTime) {
        setStatus(`Phòng thi chưa mở. Bắt đầu lúc: ${dayjs(startTime).format('DD/MM/YYYY HH:mm')}`)
        showError(`Phòng thi chưa mở. Bắt đầu lúc: ${dayjs(startTime).format('DD/MM/YYYY HH:mm')}`)
        return
      }
      
      if (now > endTime) {
        setStatus(`Phòng thi đã đóng. Kết thúc lúc: ${dayjs(endTime).format('DD/MM/YYYY HH:mm')}`)
        showError(`Phòng thi đã đóng. Kết thúc lúc: ${dayjs(endTime).format('DD/MM/YYYY HH:mm')}`)
        return
      }
      
      const exam = await getExamById(room.examId)
      if (!exam) {
        setStatus('Không tìm thấy đề thi')
        showError('Không tìm thấy đề thi. Vui lòng liên hệ giáo viên.')
        return
      }
      if (!exam.variants?.length) {
        setStatus('Đề thi chưa có biến thể')
        showError('Đề thi chưa có biến thể. Vui lòng liên hệ giáo viên.')
        return
      }
      const pool = exam.variants.map((variant) => ({
        prompt: variant,
        options: shuffleOptions([exam.correct_answer, ...(exam.distractors || [])]),
        correct_answer: exam.correct_answer,
      }))
      const selected = pickRandomVariants(pool, 5)
      setCurrentExam(room)
      setQuestions(selected)
      setShowRoomList(false)
      setStatus(`Đang thi phòng ${room.examId}`)
      success('Đã vào phòng thi thành công!')
    } catch (error) {
      console.error('Error joining room:', error)
      setStatus('Không thể vào phòng thi')
      showError(error.message || 'Không thể vào phòng thi. Vui lòng thử lại.')
    }
  }

  const submitAnswers = async () => {
    try {
      const orderedAnswers = questions.map((_, index) => answers[index] || null)
      
      // Calculate local score for immediate display (will be overwritten by Cloud Function)
      const summary = gradeSubmission({ questions, answers: orderedAnswers })
      setResult(summary)
      setSubmittedAnswers(orderedAnswers) // Store for AI Tutor
      
      // Save submission WITHOUT score - Cloud Function will calculate it
      const submission = await saveSubmission({
        examRoomId: currentExam.id,
        examId: currentExam.examId,
        userId: user.uid,
        answers: orderedAnswers,
        // DO NOT send score - Cloud Function will calculate it
      })
      
      setSubmissionId(submission.id)
      setStatus('Đã nộp bài. Đang chấm điểm...')
      success('Đã nộp bài thành công!')
      
      // Listen for auto-grading result (Cloud Function will update submission)
      // Note: In production, use Firestore listener to get real-time score update
    } catch (error) {
      console.error('Error submitting answers:', error)
      setStatus('Không thể nộp bài')
      showError(error.message || 'Không thể nộp bài. Vui lòng thử lại.')
    }
  }

  const rightSidebar = (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-slate-900 mb-2">ℹ️ Lưu ý</h4>
        <div className="space-y-2">
          <div className="p-2.5 bg-gemini-yellow/10 border border-gemini-yellow/20">
            <p className="text-xs font-medium text-gemini-yellow mb-1">⏱️ Thời gian</p>
            <p className="text-xs text-slate-600">
              Làm bài trong thời gian quy định. Hệ thống sẽ tự động nộp bài khi hết giờ.
            </p>
          </div>
          <div className="p-2.5 bg-gemini-red/10 border border-gemini-red/20">
            <p className="text-xs font-medium text-gemini-red mb-1">👁️ Giám thị AI</p>
            <p className="text-xs text-slate-600">
              Hệ thống sẽ theo dõi và cảnh báo nếu phát hiện hành vi bất thường.
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  if (!currentExam) {
    return (
      <ThreeColumnLayout rightSidebar={rightSidebar}>
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 p-6 rounded-lg">
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Exam Room</p>
          <h2 className="text-2xl font-semibold text-slate-900">Tham gia phòng thi</h2>
            <div className="mt-4 space-y-3">
          <input
                className="w-full border border-slate-200 bg-white px-3 py-2 text-sm focus:border-gemini-blue focus:outline-none focus:ring-1 focus:ring-gemini-blue rounded"
            placeholder="Nhập mật khẩu phòng"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
          />
          <button
                className="inline-flex w-full justify-center bg-gemini-blue px-4 py-2 text-sm font-medium text-white transition hover:bg-gemini-blue/90 rounded"
                onClick={() => joinRoom()}
          >
            Vào phòng
          </button>
            </div>
          <p className="mt-3 text-sm text-slate-500">{status}</p>
          </div>
          
          {showRoomList && availableRooms.length > 0 && (
            <div className="bg-white border border-slate-200 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Danh sách phòng thi</h3>
              <div className="space-y-2">
                {availableRooms.map((room) => {
                  const startTime = room.startTime?.toDate?.() || new Date(room.startTime)
                  const endTime = room.endTime?.toDate?.() || new Date(room.endTime)
                  const now = new Date()
                  const isActive = now >= startTime && now <= endTime
                  const isUpcoming = now < startTime
                  
                  return (
                    <div
                      key={room.id}
                      className={`border rounded-lg p-4 ${
                        isActive
                          ? 'border-green-500 bg-green-50'
                          : isUpcoming
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{room.examId}</p>
                          <p className="text-xs text-slate-600 mt-1">
                            Bắt đầu: {dayjs(startTime).format('DD/MM/YYYY HH:mm')}
                          </p>
                          <p className="text-xs text-slate-600">
                            Kết thúc: {dayjs(endTime).format('DD/MM/YYYY HH:mm')}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Mật khẩu: <span className="font-mono">{room.password}</span>
                          </p>
                        </div>
                        <div className="ml-4">
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              isActive
                                ? 'bg-green-500 text-white'
                                : isUpcoming
                                ? 'bg-blue-500 text-white'
                                : 'bg-slate-300 text-slate-700'
                            }`}
                          >
                            {isActive ? 'Đang mở' : isUpcoming ? 'Sắp mở' : 'Đã đóng'}
                          </span>
                          {isActive && (
                            <button
                              className="mt-2 w-full bg-gemini-blue text-white px-3 py-1 text-xs rounded hover:bg-gemini-blue/90 transition"
                              onClick={() => joinRoom(room.password)}
                            >
                              Vào ngay
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          
          {showRoomList && availableRooms.length === 0 && (
            <div className="bg-white border border-slate-200 p-6 rounded-lg">
              <p className="text-sm text-slate-500 text-center">
                Chưa có phòng thi nào. Vui lòng liên hệ giáo viên để tạo phòng thi.
              </p>
            </div>
          )}
        </div>
      </ThreeColumnLayout>
    )
  }

  return (
    <ThreeColumnLayout rightSidebar={rightSidebar}>
      <div className="space-y-4">
      <div className="bg-white border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900">Bài thi phòng {currentExam.examId}</h2>
        {questions.map((question, index) => (
          <div key={index} className="mt-4">
            <p className="text-sm font-medium text-slate-800">
              Câu {index + 1}: {question.prompt}
            </p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {question.options.map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm transition hover:border-slate-400"
                >
                  <input
                    type="radio"
                    name={`question-${index}`}
                    value={option}
                    checked={answers[index] === option}
                    onChange={() => setAnswers((prev) => ({ ...prev, [index]: option }))}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        <button
          className="mt-6 rounded-md bg-emerald-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
          onClick={submitAnswers}
        >
          Nộp bài
        </button>
        {result && (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              <h3 className="font-semibold mb-2">📊 Kết quả</h3>
              <p className="text-base">
                Điểm: <span className="font-bold">{result.score}/{result.total}</span> ({result.percentage}%)
              </p>
              {submissionId && (
                <p className="text-xs text-emerald-600 mt-1">
                  ⚡ Điểm đã được chấm tự động bởi hệ thống (chống hack)
                </p>
              )}
            </div>
            
            {/* AI Tutor - Show explanation for wrong answers */}
            {submittedAnswers && questions.map((question, index) => {
              const studentAnswer = submittedAnswers[index]
              const isCorrect = studentAnswer === question.correct_answer
              
              if (isCorrect) return null // Skip correct answers
              
              return (
                <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-800 mb-2">
                    ❌ Câu {index + 1}: {question.prompt}
                  </p>
                  <p className="text-xs text-slate-600 mb-2">
                    Bạn chọn: <span className="font-semibold text-red-600">{studentAnswer || 'Chưa trả lời'}</span>
                    {' | '}
                    Đáp án đúng: <span className="font-semibold text-green-600">{question.correct_answer}</span>
                  </p>
                  <AITutorExplanation
                    question={question.prompt}
                    studentAnswer={studentAnswer || ''}
                    correctAnswer={question.correct_answer}
                    subject="Toán"
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
        <ProctoringMonitor onAlert={(alert) => setAlerts((prev) => [...prev, { message: alert, time: new Date() }])} />
        {!!alerts.length && (
          <div className="bg-white border border-slate-200 p-4">
            <h3 className="font-semibold text-gemini-red">Cảnh báo</h3>
            <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
              {alerts.map((alert, index) => (
                <li key={index}>{`${alert.time.toLocaleTimeString()} - ${alert.message}`}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ThreeColumnLayout>
  )
}
