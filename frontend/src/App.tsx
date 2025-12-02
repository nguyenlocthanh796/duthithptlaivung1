/**
 * EduSystem Enterprise - Main App
 * Tích hợp với Backend API và Firebase Auth
 */
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { 
  Users, Building, BookOpen, GraduationCap, BarChart2,
  LogOut, Bell, Search, Menu, X,
  Plus, Download, FileText,
  CheckCircle, AlertTriangle,
  Briefcase, Globe, Home, Clock, Heart, MessageCircle,
  Target, Trash2, Edit3, Save, Trophy
} from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { postsAPI, examsAPI, documentsAPI, Post, Exam, Document } from './services/api';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';

// --- UTILS ---
const calculateAverage = (scores: any) => {
  const { m15, m45, mid, end } = scores;
  let total = 0;
  let count = 0;
  
  if (m15 !== null) { total += Number(m15); count += 1; }
  if (m45 !== null) { total += Number(m45) * 2; count += 2; }
  if (mid !== null) { total += Number(mid) * 2; count += 2; }
  if (end !== null) { total += Number(end) * 3; count += 3; }
  
  return count === 0 ? 0 : (total / count).toFixed(1);
};

// --- COMPONENTS ---

// 1. Toast Notification Component
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => (
  <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right z-[100] ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
    {type === 'success' ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}
    <span className="font-bold">{message}</span>
    <button onClick={onClose}><X size={16} className="opacity-50 hover:opacity-100"/></button>
  </div>
);

// 2. Role Selector
const RoleSelector = ({ onSelect }: { onSelect: (role: string) => void }) => (
  <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat relative">
    <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm"></div>
    <div className="max-w-5xl w-full relative z-10">
      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-[2rem] mb-8 shadow-2xl shadow-indigo-500/30 ring-4 ring-white/10">
          <Globe size={48} className="text-white" />
        </div>
        <h1 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tight">
          EduSystem <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Enterprise</span>
        </h1>
        <p className="text-slate-300 text-xl font-light">Nền tảng quản trị giáo dục & Học tập số 4.0</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { id: 'ministry', label: 'Bộ Giáo Dục', desc: 'Quản trị vĩ mô & Báo cáo', icon: Building, color: 'group-hover:bg-blue-600' },
          { id: 'school', label: 'Nhà Trường', desc: 'Quản lý GV & Lớp học', icon: GraduationCap, color: 'group-hover:bg-green-600' },
          { id: 'teacher', label: 'Giáo Viên', desc: 'Sổ điểm & Giảng dạy', icon: Briefcase, color: 'group-hover:bg-orange-600' },
          { id: 'student', label: 'Học Sinh', desc: 'Học tập & Thi cử', icon: Users, color: 'group-hover:bg-purple-600' },
        ].map((role) => (
          <button
            key={role.id}
            onClick={() => onSelect(role.id)}
            className="bg-white/5 border border-white/10 p-8 rounded-3xl text-left transition-all duration-300 hover:scale-105 hover:bg-white/10 group backdrop-blur-md"
          >
            <div className={`w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 transition-colors text-white ${role.color} shadow-lg`}>
              <role.icon size={28} />
            </div>
            <h3 className="text-white font-bold text-xl mb-2">{role.label}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{role.desc}</p>
          </button>
        ))}
      </div>
    </div>
  </div>
);

// 3. Sidebar
const Sidebar = ({ 
  role, 
  activeTab, 
  setActiveTab, 
  mobileOpen, 
  setMobileOpen, 
  onLogout 
}: {
  role: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  onLogout: () => void;
}) => {
  const getMenu = () => {
    switch(role) {
      case 'ministry': return [
        { id: 'dashboard', label: 'Tổng quan', icon: BarChart2 },
        { id: 'schools', label: 'Quản lý Trường', icon: Building },
        { id: 'policies', label: 'Chính sách', icon: FileText },
      ];
      case 'school': return [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'teachers', label: 'Giáo viên', icon: Users },
        { id: 'classes', label: 'Lớp học', icon: BookOpen },
      ];
      case 'teacher': return [
        { id: 'dashboard', label: 'Chủ nhiệm', icon: Home },
        { id: 'gradebook', label: 'Sổ điểm', icon: FileText },
        { id: 'students', label: 'Học sinh', icon: Users },
      ];
      default: return [
        { id: 'feed', label: 'Bảng tin', icon: Home },
        { id: 'exams', label: 'Thi cử', icon: CheckCircle },
        { id: 'library', label: 'Tài liệu', icon: BookOpen },
      ];
    }
  };

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[280px] bg-[#1E293B] text-white flex flex-col transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-700/50">
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
            <Globe size={18} />
          </div>
          <span className="font-bold text-lg tracking-tight">EduSystem</span>
        </div>
        <div className="flex-1 py-6 px-3 space-y-1">
          {getMenu().map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-slate-700/50">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-slate-800 hover:text-red-300 transition-all font-bold text-sm">
            <LogOut size={20}/> Đăng xuất
          </button>
        </div>
      </aside>
    </>
  );
};

// 4. STUDENT VIEW: FEED (Bảng tin - dùng Posts API)
const StudentFeed = ({ showToast }: { showToast: (msg: string, type: 'success' | 'error') => void }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await postsAPI.getAll({ limit: 20 });
      setPosts(data);
    } catch (error: any) {
      showToast('Không thể tải bảng tin: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      await postsAPI.like(postId);
      await loadPosts();
      showToast('Đã thích bài viết!', 'success');
    } catch (error: any) {
      showToast('Lỗi: ' + error.message, 'error');
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-slate-400">Đang tải bảng tin...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <Home className="text-indigo-600"/> Bảng tin học tập
      </h2>
      {posts.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl text-center text-slate-400">
          Chưa có bài viết nào
        </div>
      ) : (
        posts.map(post => (
          <div key={post.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {post.author_name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1">
                <div className="font-bold text-slate-800">{post.author_name}</div>
                <div className="text-sm text-slate-500">{new Date(post.created_at).toLocaleString('vi-VN')}</div>
              </div>
            </div>
            <p className="text-slate-700 mb-4">{post.content}</p>
            {post.subject && (
              <span className="inline-block bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold mb-4">
                {post.subject}
              </span>
            )}
            <div className="flex items-center gap-6 pt-4 border-t border-slate-100">
              <button 
                onClick={() => handleLike(post.id)}
                className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition"
              >
                <Heart size={20} className={post.likes > 0 ? 'fill-red-500 text-red-500' : ''} />
                <span className="font-medium">{post.likes}</span>
              </button>
              <div className="flex items-center gap-2 text-slate-600">
                <MessageCircle size={20} />
                <span className="font-medium">{post.comments}</span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// 5. STUDENT VIEW: EXAMS (Thi cử - dùng Exams API)
const StudentExam = ({ showToast }: { showToast: (msg: string, type: 'success' | 'error') => void }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [takingExam, setTakingExam] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExams();
  }, []);

  useEffect(() => {
    if (takingExam && !submitted && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && takingExam && !submitted) {
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
    setTimeLeft(exam.duration * 60); // Convert minutes to seconds
    setAnswers({});
    setSubmitted(false);
    setScore(0);
  };

  const handleSubmit = () => {
    // Demo scoring - trong thực tế sẽ gửi lên backend
    const totalQuestions = 10; // Mock
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
            <div className={`text-xl font-mono font-bold px-4 py-1 rounded-lg ${timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-indigo-50 text-indigo-600'}`}>
              {formatTime(timeLeft)}
            </div>
            {!submitted && <button onClick={handleSubmit} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-800">Nộp bài</button>}
          </div>
        </div>

        {submitted && (
          <div className="bg-white p-8 rounded-3xl shadow-lg border-2 border-indigo-100 text-center animate-in zoom-in">
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy size={40} className="text-indigo-600"/>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Kết quả bài thi</h2>
            <p className="text-slate-500 mb-6">Bạn đã hoàn thành bài thi</p>
            <div className="text-5xl font-black text-indigo-600 mb-6">{score.toFixed(1)} <span className="text-lg text-slate-400 font-medium">điểm</span></div>
            <button onClick={() => { setTakingExam(false); setSelectedExam(null); }} className="bg-slate-100 text-slate-700 font-bold px-6 py-2 rounded-xl hover:bg-slate-200">Quay lại</button>
          </div>
        )}

        {!submitted && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-slate-500 text-center">Giao diện làm bài thi (đang phát triển)</p>
            <p className="text-sm text-slate-400 text-center mt-2">Số câu hỏi: {selectedExam.questions_count}</p>
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
          <p className="text-indigo-100 mb-6">Hệ thống thi trắc nghiệm thời gian thực, chống gian lận.</p>
        </div>
        <Target className="absolute top-0 right-0 w-64 h-64 text-white/10 -translate-y-10 translate-x-10"/>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {exams.length === 0 ? (
          <div className="col-span-full bg-white p-10 rounded-2xl text-center text-slate-400">
            Chưa có đề thi nào
          </div>
        ) : (
          exams.map(exam => (
            <div key={exam.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition">
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

// 6. MINISTRY VIEW: SCHOOL MANAGEMENT (Quản lý Trường học)
const MinistrySchools = ({ showToast }: { showToast: (msg: string, type: 'success' | 'error') => void }) => {
  const [schools, setSchools] = useState([
    { id: 1, name: 'THPT Chuyên Lê Hồng Phong', principal: 'TS. Nguyễn Văn A', students: 1200, teachers: 85, status: 'Xuất sắc' },
    { id: 2, name: 'THPT Nguyễn Thượng Hiền', principal: 'ThS. Trần Thị B', students: 1500, teachers: 100, status: 'Tốt' },
    { id: 3, name: 'THPT Gia Định', principal: 'Thầy Lê Văn C', students: 980, teachers: 70, status: 'Khá' },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSchool, setNewSchool] = useState({ name: '', principal: '', students: 0 });

  const handleAddSchool = () => {
    if(!newSchool.name) return;
    setSchools([...schools, { id: Date.now(), ...newSchool, teachers: 0, status: 'Mới' }]);
    setIsModalOpen(false);
    setNewSchool({ name: '', principal: '', students: 0 });
    showToast('Đã thêm trường mới thành công!', 'success');
  };

  const handleDelete = (id: number) => {
    setSchools(schools.filter(s => s.id !== id));
    showToast('Đã xóa trường khỏi hệ thống!', 'error');
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Quản lý Trường học</h2>
        <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-indigo-700 flex items-center gap-2">
          <Plus size={18}/> Thêm trường
        </button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
            <tr>
              <th className="px-6 py-4">Tên trường</th>
              <th className="px-6 py-4">Hiệu trưởng</th>
              <th className="px-6 py-4">Học sinh</th>
              <th className="px-6 py-4">Trạng thái</th>
              <th className="px-6 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {schools.map(s => (
              <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-6 py-4 font-bold text-slate-700">{s.name}</td>
                <td className="px-6 py-4">{s.principal}</td>
                <td className="px-6 py-4">{s.students}</td>
                <td className="px-6 py-4">
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">{s.status}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition">
                    <Trash2 size={18}/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {schools.length === 0 && <div className="p-8 text-center text-slate-500">Không có dữ liệu</div>}
      </div>

      {/* Modal Add School */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-bold mb-4">Thêm trường mới</h3>
            <div className="space-y-3">
              <input 
                className="w-full border border-slate-200 p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                placeholder="Tên trường" 
                value={newSchool.name} 
                onChange={e => setNewSchool({...newSchool, name: e.target.value})} 
              />
              <input 
                className="w-full border border-slate-200 p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                placeholder="Hiệu trưởng" 
                value={newSchool.principal} 
                onChange={e => setNewSchool({...newSchool, principal: e.target.value})} 
              />
              <input 
                className="w-full border border-slate-200 p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                type="number" 
                placeholder="Số lượng học sinh" 
                value={newSchool.students || ''} 
                onChange={e => setNewSchool({...newSchool, students: parseInt(e.target.value) || 0})} 
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-bold">Hủy</button>
              <button onClick={handleAddSchool} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">Lưu lại</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 7. TEACHER VIEW: GRADEBOOK (Sổ điểm)
const TeacherGradebook = ({ showToast }: { showToast: (msg: string, type: 'success' | 'error') => void }) => {
  const [students, setStudents] = useState([
    { id: 1, name: 'Phạm Văn An', scores: { m15: 8, m45: 7.5, mid: 8, end: null } },
    { id: 2, name: 'Lê Thị Bình', scores: { m15: 9, m45: 9.5, mid: 9, end: null } },
    { id: 3, name: 'Trần Văn Cường', scores: { m15: 6, m45: 6.5, mid: 7, end: null } },
    { id: 4, name: 'Hoàng Thị Dung', scores: { m15: 10, m45: 9, mid: 9.5, end: null } },
  ]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [tempScores, setTempScores] = useState<any>({});

  const startEdit = (student: any) => {
    setEditingId(student.id);
    setTempScores({...student.scores});
  };

  const saveEdit = (id: number) => {
    setStudents(students.map(s => s.id === id ? { ...s, scores: tempScores } : s));
    setEditingId(null);
    showToast('Đã lưu điểm thành công!', 'success');
  };

  const handleScoreChange = (key: string, value: string) => {
    setTempScores({ ...tempScores, [key]: value ? parseFloat(value) : null });
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="text-indigo-600"/> Sổ điểm Lớp 12A1
          </h2>
          <button className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">Xuất Excel</button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
              <tr>
                <th className="px-4 py-3">STT</th>
                <th className="px-4 py-3">Họ và Tên</th>
                <th className="px-4 py-3 text-center">15 Phút</th>
                <th className="px-4 py-3 text-center">1 Tiết</th>
                <th className="px-4 py-3 text-center">Giữa Kỳ</th>
                <th className="px-4 py-3 text-center">Cuối Kỳ</th>
                <th className="px-4 py-3 text-center text-indigo-600">TBM</th>
                <th className="px-4 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => {
                const isEditing = editingId === s.id;
                const scores = isEditing ? tempScores : s.scores;
                const avg = calculateAverage(scores);

                return (
                  <tr key={s.id} className={`border-b border-slate-50 transition ${isEditing ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                    <td className="px-4 py-3 text-center">{idx + 1}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{s.name}</td>
                    {['m15', 'm45', 'mid', 'end'].map(key => (
                      <td key={key} className="px-4 py-3 text-center">
                        {isEditing ? (
                          <input 
                            type="number" 
                            className="w-12 text-center border border-indigo-300 rounded p-1 text-indigo-700 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={scores[key] || ''}
                            onChange={(e) => handleScoreChange(key, e.target.value)}
                          />
                        ) : (
                          <span className={scores[key] ? 'text-slate-800' : 'text-slate-300 italic'}>{scores[key] || '-'}</span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center font-bold text-indigo-600">{avg}</td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <div className="flex justify-center gap-2">
                          <button onClick={() => saveEdit(s.id)} className="text-green-600 bg-green-100 p-1.5 rounded hover:bg-green-200">
                            <Save size={16}/>
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-red-600 bg-red-100 p-1.5 rounded hover:bg-red-200">
                            <X size={16}/>
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(s)} className="text-slate-400 hover:text-indigo-600 p-1.5">
                          <Edit3 size={18}/>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 8. STUDENT VIEW: LIBRARY (Tài liệu - dùng Documents API)
const StudentLibrary = ({ showToast }: { showToast: (msg: string, type: 'success' | 'error') => void }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await documentsAPI.getAll({ limit: 50 });
      setDocuments(data);
    } catch (error: any) {
      showToast('Không thể tải tài liệu: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (docId: string) => {
    try {
      await documentsAPI.download(docId);
      showToast('Đã ghi nhận lượt tải xuống!', 'success');
      await loadDocuments();
    } catch (error: any) {
      showToast('Lỗi: ' + error.message, 'error');
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-slate-400">Đang tải tài liệu...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <BookOpen className="text-indigo-600"/> Thư viện Tài liệu
      </h2>
      {documents.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl text-center text-slate-400">
          Chưa có tài liệu nào
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map(doc => (
            <div key={doc.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <FileText className="text-indigo-600" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 mb-1">{doc.title}</h3>
                  <p className="text-xs text-slate-500">{doc.category}</p>
                </div>
              </div>
              {doc.description && (
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">{doc.description}</p>
              )}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="text-xs text-slate-500">
                  <Download size={14} className="inline mr-1" />
                  {doc.downloads} lượt tải
                </div>
                <button 
                  onClick={() => handleDownload(doc.id)}
                  className="text-indigo-600 hover:text-indigo-700 font-bold text-sm flex items-center gap-1"
                >
                  <Download size={16} />
                  Tải xuống
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 7. MAIN APP CONTENT (Inner component that uses hooks)
const AppContent = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load role from localStorage hoặc để user chọn
  useEffect(() => {
    if (currentUser && !role) {
      // Lấy role từ localStorage nếu có (đã chọn trước đó)
      const savedRole = localStorage.getItem('userRole');
      if (savedRole) {
        setRole(savedRole);
        setActiveTab(savedRole === 'student' ? 'feed' : 'dashboard');
      }
      // Nếu không có, sẽ hiển thị RoleSelector để user chọn
    }
  }, [currentUser, role]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setRole(null);
      localStorage.removeItem('userRole'); // Xóa role khi logout
      navigate('/login');
    } catch (error: any) {
      showToast('Lỗi đăng xuất: ' + error.message, 'error');
    }
  };

  if (!currentUser) {
    return null; // Will redirect to login
  }

  if (!role) {
    return <RoleSelector onSelect={(r) => { 
      setRole(r); 
      setActiveTab(r === 'student' ? 'feed' : 'dashboard');
      // Lưu role vào localStorage để nhớ lựa chọn
      localStorage.setItem('userRole', r);
    }} />;
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] font-sans text-slate-800 flex">
      <Sidebar 
        role={role} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen} 
        onLogout={handleLogout} 
      />
      
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <Menu size={24}/>
            </button>
            <h2 className="font-bold text-xl text-slate-800 capitalize hidden sm:block">
              {role === 'ministry' ? 'Cổng thông tin Bộ Giáo Dục' : 
               role === 'school' ? 'Cổng thông tin Nhà Trường' : 
               role === 'teacher' ? 'Không gian Giáo Viên' : 
               'Góc học tập'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center bg-slate-100 rounded-full px-4 py-2 w-64">
              <Search size={18} className="text-slate-400 mr-2"/>
              <input placeholder="Tìm kiếm..." className="bg-transparent w-full outline-none text-sm"/>
            </div>
            <button className="relative p-2 bg-slate-100 rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition">
              <Bell size={20}/>
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold cursor-pointer shadow-md">
              {currentUser.displayName?.charAt(0) || currentUser.email?.charAt(0) || 'U'}
            </div>
          </div>
        </header>

        {/* Content Scrollable Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {/* Student Views */}
            {role === 'student' && activeTab === 'feed' && <StudentFeed showToast={showToast} />}
            {role === 'student' && activeTab === 'exams' && <StudentExam showToast={showToast} />}
            {role === 'student' && activeTab === 'library' && <StudentLibrary showToast={showToast} />}

            {/* Ministry Views */}
            {role === 'ministry' && activeTab === 'schools' && <MinistrySchools showToast={showToast} />}
            {role === 'ministry' && activeTab === 'dashboard' && (
              <div className="p-10 text-center text-slate-400">Dashboard Bộ Giáo Dục (Demo Charts)</div>
            )}
            {role === 'ministry' && activeTab === 'policies' && (
              <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
                <Briefcase size={48} className="mb-4 opacity-50"/>
                <p>Tính năng <b>policies</b> đang được phát triển</p>
              </div>
            )}

            {/* School Views */}
            {role === 'school' && activeTab === 'dashboard' && (
              <div className="p-10 text-center text-slate-400">Dashboard Nhà Trường</div>
            )}
            {role === 'school' && activeTab === 'teachers' && (
              <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
                <Briefcase size={48} className="mb-4 opacity-50"/>
                <p>Tính năng <b>teachers</b> đang được phát triển</p>
              </div>
            )}
            {role === 'school' && activeTab === 'classes' && (
              <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
                <Briefcase size={48} className="mb-4 opacity-50"/>
                <p>Tính năng <b>classes</b> đang được phát triển</p>
              </div>
            )}

            {/* Teacher Views */}
            {role === 'teacher' && activeTab === 'gradebook' && <TeacherGradebook showToast={showToast} />}
            {role === 'teacher' && activeTab === 'dashboard' && (
              <div className="p-10 text-center text-slate-400">Dashboard Lớp Chủ Nhiệm</div>
            )}
            {role === 'teacher' && activeTab === 'students' && (
              <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
                <Briefcase size={48} className="mb-4 opacity-50"/>
                <p>Tính năng <b>students</b> đang được phát triển</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

// 8. MAIN APP WRAPPER (with Router and AuthProvider)
const App = () => {
  return (
    <AuthProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppContent />
              </ProtectedRoute>
            }
          />
          
          {/* Redirect unknown routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
