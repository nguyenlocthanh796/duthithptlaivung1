import React, { useEffect, useState } from 'react';
import { BookOpen, Clock, FileText, Target, Trophy } from 'lucide-react';
import { Exam, examsAPI } from '../services/api';

interface StudentExamProps {
  showToast: (msg: string, type: 'success' | 'error') => void;
}

const StudentExam: React.FC<StudentExamProps> = ({ showToast }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [takingExam, setTakingExam] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadExams();
  }, []);

  useEffect(() => {
    if (takingExam && !submitted && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
    if (timeLeft === 0 && takingExam && !submitted) {
      handleSubmit();
    }
  }, [takingExam, submitted, timeLeft]);

  const loadExams = async () => {
    try {
      setLoading(true);
      const data = await examsAPI.getAll({ limit: 50 });
      setExams(data);
    } catch (error: any) {
      showToast('Không thể tải danh sách đề thi: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const startExam = (exam: Exam) => {
    setSelectedExam(exam);
    setTakingExam(true);
    setTimeLeft(exam.duration * 60);
    setAnswers({});
    setSubmitted(false);
    setScore(0);
  };

  const handleSubmit = () => {
    const totalQuestions = 10;
    const correctAnswers = Object.keys(answers).length;
    setScore((correctAnswers / totalQuestions) * 10);
    setSubmitted(true);
    showToast('Đã nộp bài thi thành công!', 'success');
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  if (takingExam && selectedExam) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-in slide-in-from-bottom">
        <div className="sticky top-20 z-30 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800">{selectedExam.title}</h3>
            <p className="text-xs text-slate-500">Môn: {selectedExam.subject}</p>
          </div>
          <div className="flex items-center gap-4">
            <div
              className={`text-xl font-mono font-bold px-4 py-1 rounded-lg ${
                timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-indigo-50 text-indigo-600'
              }`}
            >
              {formatTime(timeLeft)}
            </div>
            {!submitted && (
              <button
                onClick={handleSubmit}
                className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-800"
              >
                Nộp bài
              </button>
            )}
          </div>
        </div>

        {submitted && (
          <div className="bg-white p-8 rounded-3xl shadow-lg border-2 border-indigo-100 text-center animate-in zoom-in">
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy size={40} className="text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Kết quả bài thi</h2>
            <p className="text-slate-500 mb-6">Bạn đã hoàn thành bài thi</p>
            <div className="text-5xl font-black text-indigo-600 mb-6">
              {score.toFixed(1)}{' '}
              <span className="text-lg text-slate-400 font-medium">điểm</span>
            </div>
            <button
              onClick={() => {
                setTakingExam(false);
                setSelectedExam(null);
              }}
              className="bg-slate-100 text-slate-700 font-bold px-6 py-2 rounded-xl hover:bg-slate-200"
            >
              Quay lại
            </button>
          </div>
        )}

        {!submitted && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-slate-500 text-center">Giao diện làm bài thi (đang phát triển)</p>
            <p className="text-sm text-slate-400 text-center mt-2">
              Số câu hỏi: {selectedExam.questions_count}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-10 text-slate-400">Đang tải đề thi...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">Phòng thi Trực tuyến</h2>
          <p className="text-indigo-100 mb-6">
            Hệ thống thi trắc nghiệm thời gian thực, chống gian lận.
          </p>
        </div>
        <Target className="absolute top-0 right-0 w-64 h-64 text-white/10 -translate-y-10 translate-x-10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {exams.length === 0 ? (
          <div className="col-span-full bg-white p-10 rounded-2xl text-center text-slate-400">
            Chưa có đề thi nào
          </div>
        ) : (
          exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition"
            >
              <h3 className="font-bold text-lg text-slate-800 mb-2">{exam.title}</h3>
              <div className="space-y-2 text-sm text-slate-600 mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} />
                  <span>{exam.subject}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  <span>{exam.duration} phút</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText size={16} />
                  <span>{exam.questions_count} câu hỏi</span>
                </div>
              </div>
              <button
                onClick={() => startExam(exam)}
                className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                Bắt đầu làm bài
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StudentExam;


