import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getTrendingPosts, getTeacherNotifications, getUserRoles } from '../services/firestore'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export function RightSidebarContent() {
  const { user } = useAuth()
  const [trendingPosts, setTrendingPosts] = useState([])
  const [teacherNotifications, setTeacherNotifications] = useState([])
  const [userRoles, setUserRoles] = useState([])

  useEffect(() => {
    if (user?.uid) {
      getUserRoles(user.uid).then((roles) => {
        setUserRoles(roles)
      })
    }
  }, [user?.uid])

  useEffect(() => {
    // Load trending posts
    getTrendingPosts(5).then(setTrendingPosts).catch(console.error)
    
    // Load teacher/admin notifications if user has those roles
    if (user?.uid) {
      getUserRoles(user.uid).then((roles) => {
        if (roles.includes('teacher') || roles.includes('admin')) {
          getTeacherNotifications(user.uid).then(setTeacherNotifications).catch(console.error)
        }
      })
    }
  }, [user?.uid])

  const isTeacherOrAdmin = userRoles.includes('teacher') || userRoles.includes('admin')

  return (
    <div className="space-y-4">
      {/* Hướng dẫn */}
      <div>
        <h4 className="text-sm font-semibold text-slate-900 mb-2">💡 Hướng dẫn</h4>
        <div className="p-3 bg-gemini-green/10 border border-gemini-green/20">
          <p className="text-xs text-slate-600 mb-2">
            <strong className="text-gemini-green">LaTeX:</strong> Sử dụng $x^2$ cho inline, $$\int_0^1 x dx$$ cho block
          </p>
          <p className="text-xs text-slate-600">
            <strong className="text-gemini-green">AI:</strong> Click "AI Giải bài" để nhận giải đáp tự động
          </p>
        </div>
      </div>

      {/* Bài viết đang bàn luận mạnh */}
      <div>
        <h4 className="text-sm font-semibold text-slate-900 mb-2">🔥 Đang bàn luận</h4>
        {trendingPosts.length > 0 ? (
          <div className="space-y-2">
            {trendingPosts.map((post) => {
              const comments = Array.isArray(post.comments) ? post.comments : []
              const likes = Array.isArray(post.likes) ? post.likes : []
              return (
                <Link
                  key={post.id}
                  to="/"
                  className="block p-2.5 bg-slate-50 border border-slate-200 hover:border-gemini-blue hover:bg-gemini-blue/5 transition"
                >
                  <p className="text-xs text-slate-700 line-clamp-2 mb-1.5">
                    {post.text?.substring(0, 80)}...
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>💬 {comments.length}</span>
                    <span>❤️ {likes.length}</span>
                    <span className="ml-auto text-slate-400">
                      {dayjs(post.createdAt?.toDate?.() || post.createdAt).fromNow()}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="p-2.5 bg-slate-50 border border-slate-200">
            <p className="text-xs text-slate-500">Chưa có bài viết nào</p>
          </div>
        )}
      </div>

      {/* Thông báo từ giáo viên/admin */}
      {isTeacherOrAdmin && (
        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-2">📢 Thông báo</h4>
          {teacherNotifications.length > 0 ? (
            <div className="space-y-2">
              {teacherNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-2.5 border ${
                    notif.type?.includes('admin')
                      ? 'bg-gemini-red/10 border-gemini-red/20'
                      : 'bg-gemini-blue/10 border-gemini-blue/20'
                  }`}
                >
                  <p className="text-xs font-medium text-slate-900 mb-1">{notif.title || 'Thông báo'}</p>
                  <p className="text-xs text-slate-600 line-clamp-2">{notif.message || ''}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {dayjs(notif.createdAt?.toDate?.() || notif.createdAt).fromNow()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-2.5 bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500">Chưa có thông báo mới</p>
            </div>
          )}
        </div>
      )}

      {/* Tips chung */}
      <div className="p-2.5 bg-gemini-yellow/10 border border-gemini-yellow/20">
        <p className="text-xs font-medium text-gemini-yellow mb-1">💡 Mẹo</p>
        <p className="text-xs text-slate-600">
          Đặt câu hỏi rõ ràng sẽ nhận được giải đáp tốt hơn từ AI và cộng đồng.
        </p>
      </div>
    </div>
  )
}

