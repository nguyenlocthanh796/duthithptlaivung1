import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { NotificationBell } from './NotificationBell'
import { ThemeToggle } from './ThemeToggle'
import { isFeatureEnabled } from '../services/remoteConfigService'

export function Navbar() {
  const { user, logout } = useAuth()
  const showLiveQuiz = isFeatureEnabled('enable_live_quiz')
  const showAITutor = isFeatureEnabled('show_ai_tutor')

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <div className="flex w-full items-center justify-between px-4 py-3 md:px-6">
        <Link to="/" className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          DuThi Platform
        </Link>
        <nav className="hidden md:flex items-center gap-4 text-sm">
          <Link
            to="/chat"
            className="text-slate-600 dark:text-slate-400 hover:text-gemini-blue transition"
          >
            AI Chat
          </Link>
          <Link
            to="/exam"
            className="text-slate-600 dark:text-slate-400 hover:text-gemini-blue transition"
          >
            Phòng Thi
          </Link>
          {showLiveQuiz && (
            <Link
              to="/live-quiz"
              className="text-slate-600 dark:text-slate-400 hover:text-gemini-blue transition"
            >
              🎮 Live Quiz
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-4 text-sm">
          <ThemeToggle />
          <NotificationBell />
          <div className="text-right leading-tight">
            <p className="font-semibold text-slate-900 dark:text-slate-100 text-base">{user?.displayName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
          </div>
          <img
            src={user?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.displayName}`}
            alt={user?.displayName}
            className="h-10 w-10 rounded-full border border-slate-200 object-cover"
          />
          <button
            className="border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:border-gemini-blue hover:text-gemini-blue"
            onClick={logout}
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </header>
  )
}