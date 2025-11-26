import { Navigate, Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { useAuth } from '../hooks/useAuth'
import { SidebarProvider } from '../context/SidebarContext'

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
    <SidebarProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-x-hidden w-full flex flex-col">
        <Navbar />
        <main className="w-full overflow-x-hidden flex-1 min-h-0" style={{ paddingTop: '64px' }}>
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  )
}
