import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getUserRoles, setUserRole } from '../services/firestore'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { ThreeColumnLayout } from '../components/ThreeColumnLayout'

export function AdminPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [userRoles, setUserRoles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.uid) {
      getUserRoles(user.uid).then((roles) => {
        setUserRoles(roles)
        if (roles.includes('admin')) {
          loadUsers()
        } else {
          setLoading(false)
        }
      })
    }
  }, [user?.uid])

  const loadUsers = async () => {
    try {
      const q = query(collection(db, 'users'), orderBy('displayName'))
      const snapshot = await getDocs(q)
      const usersData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setUsers(usersData)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSetRole = async (userId, newRoles) => {
    try {
      await setUserRole({ userId, roles: newRoles })
      await loadUsers()
      alert('Đã cập nhật quyền thành công')
    } catch (error) {
      console.error('Error setting role:', error)
      alert('Không thể cập nhật quyền')
    }
  }

  if (loading) {
    return <div className="text-center text-slate-500">Đang tải...</div>
  }

  if (!userRoles.includes('admin')) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">Bạn không có quyền truy cập trang này. Chỉ Admin mới được phép.</p>
      </div>
    )
  }

  const rightSidebar = (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-slate-900 mb-2">⚠️ Quyền hạn</h4>
        <div className="space-y-2">
          <div className="p-2.5 bg-gemini-red/10 border border-gemini-red/20">
            <p className="text-xs font-medium text-gemini-red mb-1">Admin</p>
            <p className="text-xs text-slate-600">
              Quản lý toàn bộ hệ thống, cấp quyền, xóa nội dung vi phạm.
            </p>
          </div>
          <div className="p-2.5 bg-gemini-blue/10 border border-gemini-blue/20">
            <p className="text-xs font-medium text-gemini-blue mb-1">Teacher</p>
            <p className="text-xs text-slate-600">
              Tạo đề thi, quản lý phòng thi, xem thống kê, duyệt bài viết.
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <ThreeColumnLayout rightSidebar={rightSidebar}>
      <div className="space-y-6">
        <section className="bg-white p-6 border border-slate-200">
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Admin Panel</p>
          <h2 className="text-2xl font-semibold text-slate-900">Quản lý quyền người dùng</h2>
          <p className="mt-1 text-sm text-slate-600">Cấp quyền Admin, Teacher hoặc Student cho người dùng</p>
        </section>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Tên</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Quyền hiện tại</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">{u.displayName}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {(u.roles || []).map((role) => (
                        <span
                          key={role}
                          className={`rounded px-2 py-1 text-xs font-medium ${
                            role === 'admin'
                              ? 'bg-red-100 text-red-700'
                              : role === 'teacher'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        className="rounded border border-slate-300 bg-white px-3 py-1 text-xs hover:bg-slate-50"
                        onClick={() => handleSetRole(u.id, ['admin'])}
                      >
                        Admin
                      </button>
                      <button
                        className="rounded border border-slate-300 bg-white px-3 py-1 text-xs hover:bg-slate-50"
                        onClick={() => handleSetRole(u.id, ['teacher'])}
                      >
                        Teacher
                      </button>
                      <button
                        className="rounded border border-slate-300 bg-white px-3 py-1 text-xs hover:bg-slate-50"
                        onClick={() => handleSetRole(u.id, ['student'])}
                      >
                        Student
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </ThreeColumnLayout>
  )
}

