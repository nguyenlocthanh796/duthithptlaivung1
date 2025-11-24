import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const { user, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/')
    }
  }, [user, navigate])

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-16 md:flex-row md:items-center">
        <div className="flex-1 space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-300">DuThi Platform</p>
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            Mạng xã hội học tập <span className="text-slate-300">+ AI luyện thi</span>
          </h1>
          <p className="text-base text-slate-400">
            Đăng nhập để kết nối với giáo viên, bạn bè và trợ lý AI. Mọi tính năng từ news feed, chat AI đến phòng thi
            ma trận đều sẵn sàng.
          </p>
        </div>
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/10 p-8 backdrop-blur">
          <p className="text-sm uppercase tracking-wide text-slate-200">Bắt đầu ngay</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Đăng nhập DuThi Platform</h2>
          <button
            onClick={loginWithGoogle}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-lg border border-white/30 bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-white"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M21.35 11.1H12v2.8h5.35c-.23 1.22-.93 2.26-1.98 2.96v2.46h3.2c1.88-1.73 2.97-4.28 2.97-7.32 0-.7-.07-1.38-.19-2.04z"
              />
              <path
                fill="currentColor"
                d="M12 22c2.7 0 4.96-.9 6.62-2.44l-3.2-2.46c-.89.6-2.03.96-3.42.96-2.64 0-4.87-1.78-5.67-4.18H3.05v2.56C4.68 19.7 8.05 22 12 22z"
              />
              <path
                fill="currentColor"
                d="M6.33 13.88c-.2-.6-.32-1.24-.32-1.88s.12-1.28.32-1.88V7.56H3.05C2.38 9 2 10.47 2 12s.38 3 1.05 4.44l3.28-2.56z"
              />
              <path
                fill="currentColor"
                d="M12 6.4c1.47 0 2.78.51 3.82 1.5l2.86-2.86C16.96 3.52 14.7 2.5 12 2.5 8.05 2.5 4.68 4.8 3.05 7.56l3.28 2.56c.8-2.4 3.03-4.18 5.67-4.18z"
              />
            </svg>
            Đăng nhập với Google
          </button>
        </div>
      </div>
    </div>
  )
}
