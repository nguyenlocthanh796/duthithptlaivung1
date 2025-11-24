import { Navigate, Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { useAuth } from '../hooks/useAuth'

export function ProtectedLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg font-semibold text-slate-600">Đang tải...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden w-full">
      <Navbar />
      <main className="w-full overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  )
}
