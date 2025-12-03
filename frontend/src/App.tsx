/**
 * Main App Component
 * Quản lý routing, authentication, và layout chính
 */
import React, { Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute, Login, RoleSelector } from './components/auth';
import { Navbar, Leftbar, Rightbar } from './components/layout';
import { Toast, AnhThoChatFab } from './components/common';
import { StudentFeed } from './components/feed';
import { Card } from './components/ui';

// Lazy load các component lớn để tối ưu performance
const StudentExam = React.lazy(() => import('./components/student/StudentExam'));
const StudentLibrary = React.lazy(() => import('./components/student/StudentLibrary'));
const StudentProfile = React.lazy(() => import('./components/student/StudentProfile'));
const MinistrySchools = React.lazy(() => import('./components/ministry/MinistrySchools'));
const TeacherGradebook = React.lazy(() => import('./components/teacher/TeacherGradebook'));
const AdminPanel = React.lazy(() => import('./components/admin/AdminPanel'));

// Loading component cho Suspense
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      <p className="text-neutral-500 font-medium">Đang tải...</p>
    </div>
  </div>
);

// Toast state type
interface ToastState {
  message: string;
  type: 'success' | 'error';
}

// Main App Content Component (sau khi đã authenticated)
const AppContent: React.FC = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const { currentUser } = useAuth();
  const [role, setRole] = useState<string>('student');
  const [activeTab, setActiveTab] = useState<string>('feed');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [anhThoContext, setAnhThoContext] = useState<string>('');

  // Sync URL với activeTab
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/student/')) {
      const tab = path.split('/student/')[1] || 'feed';
      setActiveTab(tab);
      setRole('student');
    } else if (path.startsWith('/teacher/')) {
      const tab = path.split('/teacher/')[1] || 'dashboard';
      setActiveTab(tab);
      setRole('teacher');
    } else if (path.startsWith('/ministry/')) {
      const tab = path.split('/ministry/')[1] || 'dashboard';
      setActiveTab(tab);
      setRole('ministry');
    } else if (path.startsWith('/school/')) {
      const tab = path.split('/school/')[1] || 'dashboard';
      setActiveTab(tab);
      setRole('school');
    }
  }, [location]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error: any) {
      showToast('Đăng xuất thất bại: ' + error.message, 'error');
    }
  };

  const applyRole = (selectedRole: string) => {
    setRole(selectedRole);
    setActiveTab('dashboard');
    navigate(`/${selectedRole}/dashboard`);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate(`/${role}/${tab}`);
  };

  const calculateAverage = (scores: any): string => {
    const { m15, m45, mid, end } = scores;
    const weights = { m15: 0.1, m45: 0.2, mid: 0.3, end: 0.4 };
    let total = 0;
    let weightSum = 0;

    if (m15 !== null && m15 !== undefined) {
      total += m15 * weights.m15;
      weightSum += weights.m15;
    }
    if (m45 !== null && m45 !== undefined) {
      total += m45 * weights.m45;
      weightSum += weights.m45;
    }
    if (mid !== null && mid !== undefined) {
      total += mid * weights.mid;
      weightSum += weights.mid;
    }
    if (end !== null && end !== undefined) {
      total += end * weights.end;
      weightSum += weights.end;
    }

    if (weightSum === 0) return 'N/A';
    return (total / weightSum).toFixed(1);
  };

  // Nếu chưa chọn role, hiển thị RoleSelector
  if (!role || role === '') {
    return <RoleSelector onSelect={applyRole} />;
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Navbar - Fixed top */}
      <Navbar
        onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        onLogout={handleLogout}
      />

      {/* Main Layout - Responsive Design */}
      <div className="pt-14 flex relative">
        {/* Leftbar - Fixed left (tablet & desktop) */}
        <div className="hidden lg:block fixed left-0 top-14 bottom-0 z-30">
          <Leftbar
            role={role}
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            onLogout={handleLogout}
          />
        </div>

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm animate-fade-in"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="fixed left-0 top-14 bottom-0 w-[280px] sm:w-[320px] bg-white z-50 lg:hidden overflow-y-auto shadow-large border-r border-neutral-200 animate-slide-right scrollbar-thin">
              <Leftbar
                role={role}
                activeTab={activeTab}
                setActiveTab={(tab) => {
                  handleTabChange(tab);
                  setMobileMenuOpen(false);
                }}
                onLogout={handleLogout}
              />
            </div>
          </>
        )}

        {/* Main Content - Center */}
        <main className="flex-1 min-h-[calc(100vh-3.5rem)] overflow-y-auto lg:ml-[360px] xl:mr-[360px] scrollbar-thin">
          <div className="max-w-full lg:max-w-[680px] xl:max-w-[800px] mx-auto pt-4 sm:pt-6 px-3 sm:px-4 md:px-6 pb-8">

          {/* Content based on role and tab */}
          {role === 'student' && (
            <>
              {activeTab === 'feed' && (
                <StudentFeed
                  showToast={showToast}
                  onAskWithContext={(context) => {
                    setAnhThoContext(context);
                  }}
                />
              )}
              {activeTab === 'exams' && (
                <Suspense fallback={<LoadingFallback />}>
                  <StudentExam showToast={showToast} />
                </Suspense>
              )}
              {activeTab === 'library' && (
                <Suspense fallback={<LoadingFallback />}>
                  <StudentLibrary showToast={showToast} />
                </Suspense>
              )}
              {activeTab === 'profile' && (
                <Suspense fallback={<LoadingFallback />}>
                  <StudentProfile showToast={showToast} />
                </Suspense>
              )}
            </>
          )}

          {role === 'teacher' && (
            <>
              {activeTab === 'dashboard' && (
                <Card className="animate-fade-in">
                  <h1 className="text-2xl font-display font-bold text-neutral-900 mb-2">Chủ nhiệm</h1>
                  <p className="text-neutral-600">Chào mừng giáo viên!</p>
                </Card>
              )}
              {activeTab === 'gradebook' && (
                <Suspense fallback={<LoadingFallback />}>
                  <TeacherGradebook showToast={showToast} calculateAverage={calculateAverage} />
                </Suspense>
              )}
              {activeTab === 'students' && (
                <Card className="animate-fade-in">
                  <h1 className="text-2xl font-display font-bold text-neutral-900 mb-2">Quản lý Học sinh</h1>
                  <p className="text-neutral-600">Danh sách học sinh...</p>
                </Card>
              )}
            </>
          )}

          {role === 'ministry' && (
            <>
              {activeTab === 'dashboard' && (
                <Card className="animate-fade-in">
                  <h1 className="text-2xl font-display font-bold text-neutral-900 mb-2">Tổng quan</h1>
                  <p className="text-neutral-600">Dashboard Bộ Giáo Dục...</p>
                </Card>
              )}
              {activeTab === 'schools' && (
                <Suspense fallback={<LoadingFallback />}>
                  <MinistrySchools showToast={showToast} />
                </Suspense>
              )}
              {activeTab === 'policies' && (
                <Card className="animate-fade-in">
                  <h1 className="text-2xl font-display font-bold text-neutral-900 mb-2">Chính sách</h1>
                  <p className="text-neutral-600">Quản lý chính sách...</p>
                </Card>
              )}
            </>
          )}

          {role === 'school' && (
            <>
              {activeTab === 'dashboard' && (
                <Card className="animate-fade-in">
                  <h1 className="text-2xl font-display font-bold text-neutral-900 mb-2">Dashboard Nhà Trường</h1>
                  <p className="text-neutral-600">Quản lý trường học...</p>
                </Card>
              )}
              {activeTab === 'teachers' && (
                <Card className="animate-fade-in">
                  <h1 className="text-2xl font-display font-bold text-neutral-900 mb-2">Quản lý Giáo viên</h1>
                  <p className="text-neutral-600">Danh sách giáo viên...</p>
                </Card>
              )}
              {activeTab === 'classes' && (
                <Card className="animate-fade-in">
                  <h1 className="text-2xl font-display font-bold text-neutral-900 mb-2">Quản lý Lớp học</h1>
                  <p className="text-neutral-600">Danh sách lớp học...</p>
                </Card>
              )}
            </>
          )}

          {role === 'admin' && (
            <Suspense fallback={<LoadingFallback />}>
              <AdminPanel
                showToast={showToast}
                activeTab={activeTab}
                onTabChange={handleTabChange}
              />
            </Suspense>
          )}
          </div>
        </main>

        {/* Rightbar - Fixed right (desktop only) */}
        <div className="hidden xl:block fixed right-0 top-14 bottom-0">
        <Rightbar role={role} />
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Anh Thơ Chat FAB */}
      <AnhThoChatFab contextText={anhThoContext} />
    </div>
  );
};

// Main App Component với Router
const App: React.FC = () => {
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

