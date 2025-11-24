import { useState } from 'react'
import dayjs from 'dayjs'
import { cloneQuestion } from '../services/api'
import { extractQuestionsFromFile } from '../services/api'
import { createExamRoom, saveQuestionBank, getExamById } from '../services/firestore'
import { ThreeColumnLayout } from '../components/ThreeColumnLayout'
import { useToast } from '../components/Toast'

export function TeacherPage() {
  const { success, error: showError } = useToast()
  
  // Tab state
  const [activeTab, setActiveTab] = useState('manual') // 'manual' or 'upload'
  
  // Manual input state
  const [questionForm, setQuestionForm] = useState({ question: '', correct_answer: '' })
  const [cloneResult, setCloneResult] = useState(null)
  const [isCloning, setIsCloning] = useState(false)
  
  // File upload state
  const [uploadedFile, setUploadedFile] = useState(null)
  const [extractedQuestions, setExtractedQuestions] = useState([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [selectedQuestions, setSelectedQuestions] = useState([])
  
  // Exam room state
  const [examTitle, setExamTitle] = useState('Đề thi thử THPT')
  const [roomPassword, setRoomPassword] = useState('123456')
  const [startTime, setStartTime] = useState(dayjs().format('YYYY-MM-DDTHH:mm'))
  const [endTime, setEndTime] = useState(dayjs().add(2, 'hour').format('YYYY-MM-DDTHH:mm'))
  const [status, setStatus] = useState('')
  
  // Question bank state
  const [questionBank, setQuestionBank] = useState(null)

  const handleClone = async (event) => {
    event.preventDefault()
    
    if (!questionForm.question.trim()) {
      showError('Vui lòng nhập câu hỏi')
      return
    }
    
    if (!questionForm.correct_answer.trim()) {
      showError('Vui lòng nhập đáp án đúng')
      return
    }
    
    setIsCloning(true)
    setStatus('Đang gọi AI sinh biến thể và đáp án nhiễu...')
    
    try {
      const result = await cloneQuestion({
        question: questionForm.question.trim(),
        correct_answer: questionForm.correct_answer.trim(),
      })
      
      if (!result || (!result.variants?.length && !result.distractors?.length)) {
        throw new Error('AI không tạo được biến thể. Vui lòng thử lại.')
      }
      
      setCloneResult(result)
      setStatus('Đã tạo xong biến thể và đáp án nhiễu!')
      success(`Đã tạo thành công ${result.variants?.length || 0} biến thể và ${result.distractors?.length || 0} đáp án nhiễu!`)
    } catch (error) {
      console.error('Error cloning question:', error)
      const errorMessage = error.response?.data?.detail || 
                          error.message || 
                          'Không thể kết nối đến AI service. Vui lòng kiểm tra backend và thử lại.'
      setStatus('AI bị lỗi, thử lại sau')
      showError(errorMessage)
    } finally {
      setIsCloning(false)
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    
    if (!['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
      showError('Chỉ hỗ trợ file PDF, DOC, hoặc DOCX')
      return
    }
    
    setUploadedFile(file)
    setIsExtracting(true)
    setStatus('Đang phân tích file và trích xuất câu hỏi...')
    
    try {
      const result = await extractQuestionsFromFile(file)
      
      if (result.questions && result.questions.length > 0) {
        setExtractedQuestions(result.questions)
        setSelectedQuestions(result.questions.map((q, idx) => ({ ...q, id: idx, selected: true })))
        setStatus(`Đã trích xuất ${result.questions.length} câu hỏi từ file!`)
        success(`Đã trích xuất thành công ${result.questions.length} câu hỏi từ file!`)
      } else {
        setExtractedQuestions([])
        setStatus('Không tìm thấy câu hỏi trong file. Vui lòng kiểm tra lại file.')
        showError('Không tìm thấy câu hỏi trong file. AI có thể chưa nhận diện được định dạng.')
      }
    } catch (error) {
      console.error('Error extracting questions:', error)
      const errorMessage = error.response?.data?.detail || 
                          error.message || 
                          'Không thể phân tích file. Vui lòng thử lại.'
      setStatus('Lỗi khi phân tích file')
      showError(errorMessage)
    } finally {
      setIsExtracting(false)
    }
  }

  const handleToggleQuestion = (questionId) => {
    setSelectedQuestions(prev => 
      prev.map(q => q.id === questionId ? { ...q, selected: !q.selected } : q)
    )
  }

  const handleEditQuestion = (questionId, field, value) => {
    setSelectedQuestions(prev =>
      prev.map(q => q.id === questionId ? { ...q, [field]: value } : q)
    )
  }

  const handleGenerateDistractors = async (questionId) => {
    const question = selectedQuestions.find(q => q.id === questionId)
    if (!question || !question.correct_answer) {
      showError('Vui lòng nhập đáp án đúng trước')
      return
    }
    
    setIsCloning(true)
    try {
      const result = await cloneQuestion({
        question: question.question,
        correct_answer: question.correct_answer,
      })
      
      if (result.distractors && result.distractors.length > 0) {
        setSelectedQuestions(prev =>
          prev.map(q => q.id === questionId ? { 
            ...q, 
            options: [q.correct_answer, ...result.distractors.slice(0, 3)] 
          } : q)
        )
        success('Đã tạo đáp án nhiễu thành công!')
      }
    } catch (error) {
      showError('Không thể tạo đáp án nhiễu. Vui lòng thử lại.')
    } finally {
      setIsCloning(false)
    }
  }

  const handleSaveQuestions = async () => {
    const questionsToSave = selectedQuestions.filter(q => q.selected)
    
    if (questionsToSave.length === 0) {
      showError('Vui lòng chọn ít nhất một câu hỏi để lưu')
      return
    }
    
    if (!examTitle.trim()) {
      showError('Vui lòng nhập tên đề thi')
      return
    }
    
    try {
      // Convert to question bank format
      const questionBankData = {
        correct_answer: questionsToSave[0].correct_answer, // Use first question's answer as default
        distractors: questionsToSave.flatMap(q => 
          q.options?.filter(opt => opt !== q.correct_answer) || []
        ).slice(0, 10), // Limit distractors
        variants: questionsToSave.map(q => q.question),
      }
      
      await saveQuestionBank({
        examTitle: examTitle.trim(),
        questionPayload: questionBankData,
      })
      
      setQuestionBank(questionBankData)
      setStatus(`Đã lưu ${questionsToSave.length} câu hỏi vào ngân hàng đề!`)
      success(`Đã lưu thành công ${questionsToSave.length} câu hỏi!`)
    } catch (error) {
      console.error('Error saving questions:', error)
      showError(error.message || 'Không thể lưu câu hỏi. Vui lòng kiểm tra quyền truy cập Firestore.')
    }
  }

  const handleSaveExam = async () => {
    if (!cloneResult) {
      showError('Chưa có kết quả để lưu. Vui lòng sinh biến thể trước.')
      return
    }
    
    if (!examTitle.trim()) {
      showError('Vui lòng nhập tên đề thi')
      return
    }
    
    try {
      await saveQuestionBank({
        examTitle: examTitle.trim(),
        questionPayload: cloneResult,
      })
      setQuestionBank(cloneResult)
      setStatus('Đã lưu ngân hàng câu hỏi lên Firestore')
      success('Đã lưu ngân hàng câu hỏi thành công!')
    } catch (error) {
      console.error('Error saving exam:', error)
      const errorMessage = error.message || 'Không thể lưu câu hỏi. Vui lòng kiểm tra quyền truy cập Firestore.'
      setStatus('Không thể lưu câu hỏi')
      showError(errorMessage)
    }
  }

  const handleCreateRoom = async () => {
    if (!examTitle.trim()) {
      showError('Vui lòng nhập tên đề thi')
      return
    }
    
    if (!roomPassword.trim()) {
      showError('Vui lòng nhập mật khẩu phòng thi')
      return
    }
    
    if (!startTime || !endTime) {
      showError('Vui lòng chọn thời gian bắt đầu và kết thúc')
      return
    }
    
    const start = dayjs(startTime)
    const end = dayjs(endTime)
    
    if (end.isBefore(start)) {
      showError('Thời gian kết thúc phải sau thời gian bắt đầu')
      return
    }
    
    // Check if exam exists
    try {
      const exam = await getExamById(examTitle.trim())
      if (!exam) {
        showError('Đề thi chưa được lưu. Vui lòng lưu câu hỏi trước khi tạo phòng thi.')
        return
      }
    } catch (error) {
      showError('Không thể kiểm tra đề thi. Vui lòng thử lại.')
      return
    }
    
    try {
      await createExamRoom({
        examId: examTitle.trim(),
        password: roomPassword.trim(),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      })
      setStatus('Đã tạo phòng thi')
      success(`Đã tạo phòng thi "${examTitle}" với mật khẩu "${roomPassword}" thành công!`)
    } catch (error) {
      console.error('Error creating room:', error)
      const errorMessage = error.message || 'Không thể tạo phòng thi. Vui lòng kiểm tra quyền truy cập Firestore.'
      setStatus('Không thể tạo phòng')
      showError(errorMessage)
    }
  }

  const rightSidebar = (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-slate-900 mb-2">📚 Hướng dẫn</h4>
        <div className="p-2.5 bg-gemini-blue/10 border border-gemini-blue/20 rounded-lg">
          <p className="text-xs text-slate-600 mb-2">
            <strong>Nhập thủ công:</strong> Nhập câu hỏi và đáp án đúng, AI sẽ tự động tạo đáp án nhiễu thông minh và biến thể câu hỏi.
          </p>
          <p className="text-xs text-slate-600 mb-2">
            <strong>Upload file:</strong> Upload PDF/DOC/DOCX, AI sẽ phân tích và trích xuất câu hỏi. Bạn có thể chỉnh sửa và chọn đáp án đúng.
          </p>
          <p className="text-xs text-slate-600">
            Sau khi lưu câu hỏi, bạn có thể tạo phòng thi với mật khẩu và thời gian cụ thể.
          </p>
        </div>
      </div>
      {questionBank && (
        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-2">✅ Đã lưu</h4>
          <div className="p-2.5 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-700">
              Đề thi "{examTitle}" đã được lưu với {questionBank.variants?.length || 0} câu hỏi.
            </p>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <ThreeColumnLayout rightSidebar={rightSidebar}>
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === 'manual'
                ? 'border-b-2 border-gemini-blue text-gemini-blue'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            ✏️ Nhập thủ công
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === 'upload'
                ? 'border-b-2 border-gemini-blue text-gemini-blue'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            📄 Upload file (PDF/DOC/DOCX)
          </button>
        </div>

        {/* Manual Input Tab */}
        {activeTab === 'manual' && (
          <section className="rounded-xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">AI Builder</p>
                <h2 className="text-2xl font-semibold text-slate-900">Nhân bản câu hỏi</h2>
              </div>
              <span className="text-xs text-slate-500">{status || 'Sẵn sàng'}</span>
            </div>
            <form className="mt-4 space-y-4" onSubmit={handleClone}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Câu hỏi</label>
                <textarea
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm focus:border-gemini-blue focus:bg-white focus:outline-none focus:ring-1 focus:ring-gemini-blue"
                  rows="4"
                  placeholder="Nhập câu hỏi trắc nghiệm..."
                  value={questionForm.question}
                  onChange={(event) => setQuestionForm((prev) => ({ ...prev, question: event.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Đáp án đúng</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-gemini-blue focus:outline-none focus:ring-1 focus:ring-gemini-blue"
                  placeholder="Nhập đáp án đúng..."
                  value={questionForm.correct_answer}
                  onChange={(event) => setQuestionForm((prev) => ({ ...prev, correct_answer: event.target.value }))}
                />
                <p className="mt-1 text-xs text-slate-500">
                  AI sẽ tự động tạo các đáp án nhiễu gần đúng để học sinh phải suy nghĩ kỹ
                </p>
              </div>
              <button 
                type="submit"
                disabled={isCloning}
                className="inline-flex items-center gap-2 rounded-md bg-gemini-blue px-4 py-2 text-sm font-medium text-white transition hover:bg-gemini-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCloning ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <span>🤖</span>
                    <span>Sinh biến thể & đáp án nhiễu</span>
                  </>
                )}
              </button>
            </form>
            
            {cloneResult && (
              <div className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">✅ Đáp án nhiễu (AI tạo)</h3>
                  <ul className="space-y-1">
                    {cloneResult.distractors.map((item, index) => (
                      <li key={index} className="text-sm text-slate-700 bg-white p-2 rounded border border-slate-200">
                        {index + 1}. {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">📝 Biến thể câu hỏi ({cloneResult.variants?.length || 0} câu)</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-slate-700">
                    {cloneResult.variants.map((item, index) => (
                      <li key={index} className="bg-white p-2 rounded border border-slate-200">
                        {item}
                      </li>
                    ))}
                  </ol>
                </div>
                <button
                  className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                  onClick={handleSaveExam}
                >
                  💾 Lưu vào ngân hàng đề
                </button>
              </div>
            )}
          </section>
        )}

        {/* Upload File Tab */}
        {activeTab === 'upload' && (
          <section className="rounded-xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">File Upload</p>
                <h2 className="text-2xl font-semibold text-slate-900">Phân tích tài liệu</h2>
              </div>
              <span className="text-xs text-slate-500">{status || 'Sẵn sàng'}</span>
            </div>
            
            <div className="mt-4">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-gemini-blue hover:bg-gemini-blue/5">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isExtracting}
                />
                <div className="flex-1">
                  {isExtracting ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⏳</span>
                      <span className="text-sm text-slate-600">Đang phân tích file...</span>
                    </div>
                  ) : (
                    <>
                      <span className="text-2xl">📄</span>
                      <p className="mt-2 text-sm font-medium text-slate-700">
                        Click để chọn file PDF, DOC, hoặc DOCX
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        AI sẽ tự động phân tích và trích xuất câu hỏi
                      </p>
                    </>
                  )}
                </div>
              </label>
            </div>

            {uploadedFile && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm text-slate-700">
                  <strong>File đã chọn:</strong> {uploadedFile.name}
                </p>
              </div>
            )}

            {extractedQuestions.length > 0 && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Câu hỏi đã trích xuất ({extractedQuestions.length})
                  </h3>
                  <button
                    onClick={handleSaveQuestions}
                    className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                  >
                    💾 Lưu tất cả câu hỏi đã chọn
                  </button>
                </div>
                
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {selectedQuestions.map((question) => (
                    <div
                      key={question.id}
                      className={`rounded-lg border-2 p-4 ${
                        question.selected
                          ? 'border-gemini-blue bg-gemini-blue/5'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={question.selected}
                            onChange={() => handleToggleQuestion(question.id)}
                            className="rounded border-slate-300 text-gemini-blue focus:ring-gemini-blue"
                          />
                          <span className="text-sm font-medium text-slate-700">
                            Câu {question.id + 1}
                          </span>
                        </label>
                        <button
                          onClick={() => handleGenerateDistractors(question.id)}
                          disabled={isCloning}
                          className="text-xs text-gemini-blue hover:text-gemini-blue/80 disabled:opacity-50"
                        >
                          🤖 Tạo đáp án nhiễu
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Câu hỏi
                          </label>
                          <textarea
                            className="w-full rounded border border-slate-200 p-2 text-sm focus:border-gemini-blue focus:outline-none"
                            rows="2"
                            value={question.question}
                            onChange={(e) => handleEditQuestion(question.id, 'question', e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Đáp án đúng
                          </label>
                          <input
                            className="w-full rounded border border-slate-200 p-2 text-sm focus:border-gemini-blue focus:outline-none"
                            value={question.correct_answer || ''}
                            onChange={(e) => handleEditQuestion(question.id, 'correct_answer', e.target.value)}
                            placeholder="Nhập hoặc chọn đáp án đúng..."
                          />
                        </div>
                        
                        {question.options && question.options.length > 0 && (
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Các đáp án
                            </label>
                            <div className="space-y-1">
                              {question.options.map((option, idx) => (
                                <label
                                  key={idx}
                                  className={`flex items-center gap-2 rounded border p-2 text-sm cursor-pointer ${
                                    option === question.correct_answer
                                      ? 'border-green-500 bg-green-50'
                                      : 'border-slate-200'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`correct-${question.id}`}
                                    checked={option === question.correct_answer}
                                    onChange={() => handleEditQuestion(question.id, 'correct_answer', option)}
                                    className="text-green-600"
                                  />
                                  <span>{option}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Exam Room Creation */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Thông tin đề thi</h2>
            <label className="mt-4 block text-xs uppercase tracking-wide text-slate-500">Tên đề</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-gemini-blue focus:outline-none focus:ring-1 focus:ring-gemini-blue"
              value={examTitle}
              onChange={(event) => setExamTitle(event.target.value)}
              placeholder="Nhập tên đề thi..."
            />
            <label className="mt-4 block text-xs uppercase tracking-wide text-slate-500">Mật khẩu phòng thi</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-gemini-blue focus:outline-none focus:ring-1 focus:ring-gemini-blue"
              value={roomPassword}
              onChange={(event) => setRoomPassword(event.target.value)}
              placeholder="Nhập mật khẩu..."
            />
            <label className="mt-4 block text-xs uppercase tracking-wide text-slate-500">Thời gian bắt đầu</label>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-gemini-blue focus:outline-none focus:ring-1 focus:ring-gemini-blue"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
            <label className="mt-4 block text-xs uppercase tracking-wide text-slate-500">Thời gian kết thúc</label>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-gemini-blue focus:outline-none focus:ring-1 focus:ring-gemini-blue"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
            />
            <button
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              onClick={handleCreateRoom}
            >
              🚪 Tạo phòng thi
            </button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Trạng thái</h2>
            <p className="mt-3 text-sm text-slate-500">{status || 'Chưa thao tác'}</p>
            {questionBank && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-xs font-medium text-green-700">
                  ✅ Đã lưu {questionBank.variants?.length || 0} câu hỏi
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </ThreeColumnLayout>
  )
}
