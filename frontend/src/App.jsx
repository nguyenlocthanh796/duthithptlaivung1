import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, lazy, Suspense } from 'react'
import './App.css'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ProtectedLayout } from './components/ProtectedLayout'
import { initializeRemoteConfig, isMaintenanceMode } from './services/remoteConfigService'
import { LoginPage } from './pages/LoginPage'
import logger from './utils/logger'

// Lazy load FeedPage to reduce initial bundle size
const FeedPage = lazy(() => import('./pages/FeedPage').then(module => ({ default: module.FeedPage })))
const ChatPage = lazy(() => import('./pages/ChatPage').then(module => ({ default: module.default })))

// Lazy load heavy components to reduce initial bundle size
const ExamRoomPage = lazy(() => import('./pages/ExamRoomPage').then(module => ({ default: module.ExamRoomPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(module => ({ default: module.DashboardPage })))
const TeacherPage = lazy(() => import('./pages/TeacherPage').then(module => ({ default: module.TeacherPage })))
const AdminPage = lazy(() => import('./pages/AdminPage').then(module => ({ default: module.AdminPage })))
const LiveQuizPage = lazy(() => import('./pages/LiveQuizPage').then(module => ({ default: module.LiveQuizPage })))
const LiveQuizHostPage = lazy(() => import('./pages/LiveQuizHostPage').then(module => ({ default: module.LiveQuizHostPage })))
const DocumentManagerPage = lazy(() => import('./pages/DocumentManagerPage').then(module => ({ default: module.DocumentManagerPage })))
const LaTeXGuidePage = lazy(() => import('./pages/LaTeXGuidePage').then(module => ({ default: module.LaTeXGuidePage })))
const TeacherRoute = lazy(() => import('./components/TeacherRoute').then(module => ({ default: module.TeacherRoute })))
const AdminRoute = lazy(() => import('./components/AdminRoute').then(module => ({ default: module.AdminRoute })))
const ToastContainer = lazy(() => import('./components/Toast').then(module => ({ default: module.ToastContainer })))

// Loading fallback component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gemini-blue"></div>
  </div>
)

// Configure QueryClient with cache settings to reduce Firebase reads
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data is considered fresh for 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes - cache is kept for 30 minutes (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      retry: 1, // Retry failed requests once
    },
  },
})

function App() {
  // Initialize Remote Config on app start
  useEffect(() => {
    initializeRemoteConfig().then(() => {
      if (isMaintenanceMode()) {
        // Could show maintenance page
        logger.warn('Maintenance mode is ON')
      }
    })
  }, [])

  return (
    <div className="w-full overflow-x-hidden">
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              {/* Firebase Auth iframe route - suppress warning */}
              <Route path="/__/auth/iframe" element={null} />
              <Route element={<ProtectedLayout />}>
                <Route 
                  index 
                  element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <FeedPage />
                    </Suspense>
                  } 
                />
                <Route 
                  path="/exam" 
                  element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <ExamRoomPage />
                    </Suspense>
                  } 
                />
                <Route 
                  path="/live-quiz" 
                  element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <LiveQuizPage />
                    </Suspense>
                  } 
                />
                <Route 
                  path="/dashboard" 
                  element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <DashboardPage />
                    </Suspense>
                  } 
                />
                <Route 
                  path="/documents" 
                  element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <DocumentManagerPage />
                    </Suspense>
                  } 
                />
                <Route 
                  path="/latex-guide" 
                  element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <LaTeXGuidePage />
                    </Suspense>
                  } 
                />
                <Route 
                  path="/chat" 
                  element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <ChatPage />
                    </Suspense>
                  } 
                />
                <Route 
                  element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <TeacherRoute />
                    </Suspense>
                  }
                >
                  <Route 
                    path="/teacher" 
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <TeacherPage />
                      </Suspense>
                    } 
                  />
                  <Route 
                    path="/live-quiz/host" 
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <LiveQuizHostPage />
                      </Suspense>
                    } 
                  />
                </Route>
                
                <Route 
                  element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <AdminRoute />
                    </Suspense>
                  }
                >
                  <Route 
                    path="/admin" 
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <AdminPage />
                      </Suspense>
                    } 
                  />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
      <Suspense fallback={null}>
        <ToastContainer />
      </Suspense>
    </div>
  )
}

export default App
