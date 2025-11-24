import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import './App.css'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ProtectedLayout } from './components/ProtectedLayout'
import { initializeRemoteConfig, isMaintenanceMode } from './services/remoteConfigService'
import { LoginPage } from './pages/LoginPage'
import { FeedPage } from './pages/FeedPage'
import { ChatPage } from './pages/ChatPage'
import { ExamRoomPage } from './pages/ExamRoomPage'
import { DashboardPage } from './pages/DashboardPage'
import { TeacherPage } from './pages/TeacherPage'
import { AdminPage } from './pages/AdminPage'
import { LiveQuizPage } from './pages/LiveQuizPage'
import { LiveQuizHostPage } from './pages/LiveQuizHostPage'
import { TeacherRoute } from './components/TeacherRoute'
import { AdminRoute } from './components/AdminRoute'
import { ToastContainer } from './components/Toast'

const queryClient = new QueryClient()

function App() {
  // Initialize Remote Config on app start
  useEffect(() => {
    initializeRemoteConfig().then(() => {
      if (isMaintenanceMode()) {
        // Could show maintenance page
        console.warn('Maintenance mode is ON')
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
              <Route element={<ProtectedLayout />}>
                <Route index element={<FeedPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/exam" element={<ExamRoomPage />} />
                <Route path="/live-quiz" element={<LiveQuizPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route element={<TeacherRoute />}>
                  <Route path="/teacher" element={<TeacherPage />} />
                  <Route path="/live-quiz/host" element={<LiveQuizHostPage />} />
                </Route>
                
                <Route element={<AdminRoute />}>
                  <Route path="/admin" element={<AdminPage />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
      <ToastContainer />
    </div>
  )
}

export default App
