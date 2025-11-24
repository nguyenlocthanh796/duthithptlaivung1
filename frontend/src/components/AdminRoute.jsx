import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useEffect, useState } from 'react'
import { getUserRoles } from '../services/firestore'

export function AdminRoute() {
  const { user } = useAuth()
  const [userRoles, setUserRoles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.uid) {
      getUserRoles(user.uid).then((roles) => {
        setUserRoles(roles)
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [user?.uid])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg font-semibold text-slate-600">Đang tải...</p>
      </div>
    )
  }

  if (!user || !userRoles.includes('admin')) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

