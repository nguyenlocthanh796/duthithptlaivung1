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
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Hướng dẫn</h4>
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/30 dark:border-slate-700/30 rounded">
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
            <strong className="text-gemini-blue">LaTeX:</strong> Sử dụng $x^2$ cho inline, $$\int_0^1 x dx$$ cho block
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <strong className="text-gemini-blue">AI:</strong> Click "AI Giải bài" để nhận giải đáp tự động
          </p>
        </div>
      </div>

      {/* Bài viết đang bàn luận mạnh */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
          </svg>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Đang bàn luận</h4>
        </div>
        {trendingPosts.length > 0 ? (
          <div className="space-y-2">
            {trendingPosts.map((post) => {
              const comments = Array.isArray(post.comments) ? post.comments : []
              const likes = Array.isArray(post.likes) ? post.likes : []
              return (
                <Link
                  key={post.id}
                  to="/"
                  className="block p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/30 dark:border-slate-700/30 hover:border-gemini-blue hover:bg-gemini-blue/5 dark:hover:bg-gemini-blue/10 transition rounded"
                >
                  <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 mb-1.5">
                    {post.text?.substring(0, 80)}...
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>{comments.length}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                      </svg>
                      <span>{likes.length}</span>
                    </div>
                    <span className="ml-auto text-slate-400 dark:text-slate-500">
                      {dayjs(post.createdAt?.toDate?.() || post.createdAt).fromNow()}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/30 dark:border-slate-700/30 rounded">
            <p className="text-xs text-slate-500 dark:text-slate-400">Chưa có bài viết nào</p>
          </div>
        )}
      </div>

      {/* Thông báo từ giáo viên/admin */}
      {isTeacherOrAdmin && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Thông báo</h4>
          </div>
          {teacherNotifications.length > 0 ? (
            <div className="space-y-2">
              {teacherNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-2.5 border rounded ${
                    notif.type?.includes('admin')
                      ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                      : 'bg-gemini-blue/5 dark:bg-gemini-blue/10 border-gemini-blue/20 dark:border-gemini-blue/30'
                  }`}
                >
                  <p className="text-xs font-medium text-slate-900 dark:text-slate-100 mb-1">{notif.title || 'Thông báo'}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{notif.message || ''}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    {dayjs(notif.createdAt?.toDate?.() || notif.createdAt).fromNow()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/30 dark:border-slate-700/30 rounded">
              <p className="text-xs text-slate-500 dark:text-slate-400">Chưa có thông báo mới</p>
            </div>
          )}
        </div>
      )}

      {/* Tips chung */}
      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/30 dark:border-slate-700/30 rounded">
        <div className="flex items-center gap-1 mb-1">
          <svg className="w-3 h-3 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Mẹo</p>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Đặt câu hỏi rõ ràng sẽ nhận được giải đáp tốt hơn từ AI và cộng đồng.
        </p>
      </div>
    </div>
  )
}

