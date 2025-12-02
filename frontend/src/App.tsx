/**
 * EduSystem Enterprise - Main App
 * Tích hợp với Backend API và Firebase Auth
 */
import { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { 
  Users, Building, BookOpen, GraduationCap,
  LogOut, Bell, Search, Menu, Briefcase
} from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import AnhThoChatFab from './components/AnhThoChatFab';
import StudentFeed from './components/StudentFeed';
import Toast from './components/Toast';
import RoleSelector from './components/RoleSelector';
import Sidebar from './components/Sidebar';

// Lazy-loaded khu vực ít truy cập hơn để giảm bundle ban đầu
const StudentExam = lazy(() => import('./components/StudentExam'));
const StudentLibrary = lazy(() => import('./components/StudentLibrary'));
const MinistrySchools = lazy(() => import('./components/MinistrySchools'));
const TeacherGradebook = lazy(() => import('./components/TeacherGradebook'));
const StudentProfile = lazy(() => import('./components/StudentProfile'));

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

// 7. MAIN APP CONTENT (Inner component that uses hooks)
const AppContent = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [anhThoContext, setAnhThoContext] = useState<string | undefined>(undefined);

  // Helper: map role + tab -> path
  const getPathForRoleTab = (r: string, tab: string) => {
    return `/${r}/${tab}`;
  };

  // Đồng bộ role/tab từ URL hoặc localStorage
  useEffect(() => {
    if (!currentUser) return;

    const segments = location.pathname.split('/').filter(Boolean);
    if (segments.length >= 2) {
      const [r, tab] = segments as [string, string];
      setRole(r);
      setActiveTab(tab);
      localStorage.setItem('userRole', r);
      return;
    }

    // Fallback: lấy từ localStorage nếu chưa có role
    if (!role) {
      const savedRole = localStorage.getItem('userRole');
      if (savedRole) {
        const defaultTab = savedRole === 'student' ? 'feed' : 'dashboard';
        setRole(savedRole);
        setActiveTab(defaultTab);
        navigate(getPathForRoleTab(savedRole, defaultTab), { replace: true });
      }
    }
  }, [currentUser, role, location.pathname]);

  const applyRole = (r: string) => {
    setRole(r);
    const defaultTab = r === 'student' ? 'feed' : 'dashboard';
    setActiveTab(defaultTab);
    localStorage.setItem('userRole', r);
    navigate(getPathForRoleTab(r, defaultTab), { replace: true });
  };

  const handleTabChange = (tab: string) => {
    if (!role) return;
    setActiveTab(tab);
    navigate(getPathForRoleTab(role, tab));
  };

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
      applyRole(r);
    }} />;
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] font-sans text-slate-800 flex">
      <Sidebar 
        role={role} 
        activeTab={activeTab} 
        setActiveTab={handleTabChange} 
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
            {/* Quick role switcher */}
            <select
              value={role}
              onChange={(e) => applyRole(e.target.value)}
              className="hidden md:block bg-slate-100 border border-slate-200 text-xs rounded-full px-3 py-1 text-slate-600 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="student">Học sinh</option>
              <option value="teacher">Giáo viên</option>
              <option value="school">Nhà trường</option>
              <option value="ministry">Bộ GD</option>
            </select>

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
            <Suspense fallback={<div className="p-10 text-center text-slate-400">Đang tải nội dung...</div>}>
              {/* Student Views */}
              {role === 'student' && activeTab === 'feed' && (
                <StudentFeed showToast={showToast} onAskWithContext={setAnhThoContext} />
              )}
              {role === 'student' && activeTab === 'exams' && (
                <StudentExam showToast={showToast} />
              )}
              {role === 'student' && activeTab === 'library' && (
                <StudentLibrary showToast={showToast} />
              )}
              {role === 'student' && activeTab === 'profile' && (
                <StudentProfile showToast={showToast} />
              )}

              {/* Ministry Views */}
              {role === 'ministry' && activeTab === 'schools' && (
                <MinistrySchools showToast={showToast} />
              )}
              {role === 'ministry' && activeTab === 'dashboard' && (
                <div className="p-10 text-center text-slate-400">
                  Dashboard Bộ Giáo Dục (Demo Charts)
                </div>
              )}
              {role === 'ministry' && activeTab === 'policies' && (
                <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
                  <Briefcase size={48} className="mb-4 opacity-50" />
                  <p>
                    Tính năng <b>policies</b> đang được phát triển
                  </p>
                </div>
              )}

              {/* School Views */}
              {role === 'school' && activeTab === 'dashboard' && (
                <div className="p-10 text-center text-slate-400">Dashboard Nhà Trường</div>
              )}
              {role === 'school' && activeTab === 'teachers' && (
                <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
                  <Briefcase size={48} className="mb-4 opacity-50" />
                  <p>
                    Tính năng <b>teachers</b> đang được phát triển
                  </p>
                </div>
              )}
              {role === 'school' && activeTab === 'classes' && (
                <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
                  <Briefcase size={48} className="mb-4 opacity-50" />
                  <p>
                    Tính năng <b>classes</b> đang được phát triển
                  </p>
                </div>
              )}

              {/* Teacher Views */}
              {role === 'teacher' && activeTab === 'gradebook' && (
                <TeacherGradebook showToast={showToast} calculateAverage={calculateAverage} />
              )}
              {role === 'teacher' && activeTab === 'dashboard' && (
                <div className="p-10 text-center text-slate-400">Dashboard Lớp Chủ Nhiệm</div>
              )}
              {role === 'teacher' && activeTab === 'students' && (
                <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
                  <Briefcase size={48} className="mb-4 opacity-50" />
                  <p>
                    Tính năng <b>students</b> đang được phát triển
                  </p>
                </div>
              )}
            </Suspense>
          </div>
        </main>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Nút FAB chat Anh Thơ Live */}
      <AnhThoChatFab contextText={anhThoContext} />
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
            path="/*"
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
