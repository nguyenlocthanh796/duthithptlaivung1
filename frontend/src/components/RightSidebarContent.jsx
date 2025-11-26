import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getTrendingPosts, getTeacherNotifications, getUserRoles, watchNotifications } from '../services/firestore'
import { Link, useNavigate } from 'react-router-dom'
import { HelpCircle, Trophy, TrendingUp, Hash, ArrowRight, Medal, Star, Zap, Bell } from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export function RightSidebarContent() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [trendingPosts, setTrendingPosts] = useState([])
  const [teacherNotifications, setTeacherNotifications] = useState([])
  const [userNotifications, setUserNotifications] = useState([])
  const [userRoles, setUserRoles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.uid) {
      getUserRoles(user.uid).then((roles) => {
        setUserRoles(roles)
      })
    }
  }, [user?.uid])

  useEffect(() => {
    setLoading(true)
    // Load trending posts
    getTrendingPosts(20)
      .then(setTrendingPosts)
      .catch(console.error)
      .finally(() => setLoading(false))
    
    // Load teacher/admin notifications if user has those roles
    if (user?.uid) {
      getUserRoles(user.uid).then((roles) => {
        if (roles.includes('teacher') || roles.includes('admin')) {
          getTeacherNotifications(user.uid).then(setTeacherNotifications).catch(console.error)
        }
      })
      
      // Load user notifications (2 most recent)
      const unsub = watchNotifications(user.uid, (notifications) => {
        setUserNotifications(notifications.slice(0, 2))
      })
      return () => unsub()
    }
  }, [user?.uid])

  const isTeacherOrAdmin = userRoles.includes('teacher') || userRoles.includes('admin')

  // Extract trending hashtags from posts
  const extractTrendingHashtags = () => {
    const hashtagCount = {}
    
    trendingPosts.forEach((post) => {
      // Extract from tags array
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach((tag) => {
          const hashtag = `#${tag}`
          hashtagCount[hashtag] = (hashtagCount[hashtag] || 0) + 1
        })
      }
      
      // Extract from text (if contains #)
      if (post.text) {
        const hashtagMatches = post.text.match(/#[\w\u0100-\u1EF9]+/g)
        if (hashtagMatches) {
          hashtagMatches.forEach((hashtag) => {
            hashtagCount[hashtag] = (hashtagCount[hashtag] || 0) + 1
          })
        }
      }
    })
    
    return Object.entries(hashtagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([topic, count]) => ({
        topic,
        posts: count > 1000 ? `${(count / 1000).toFixed(1)}k bài` : `${count} bài`
      }))
  }

  const trendingTopics = extractTrendingHashtags()

  // Leaderboard data (mock for now, can be replaced with real data)
  const leaderboard = [
    { rank: 1, name: "User 1", xp: "1,240 XP" },
    { rank: 2, name: "User 2", xp: "1,240 XP" },
    { rank: 3, name: "User 3", xp: "1,240 XP" }
  ]

  return (
    <div 
      className="w-full h-full space-y-5"
      style={{
        overflow: 'hidden',
        overscrollBehavior: 'none',
        touchAction: 'none',
        paddingTop: '0px',
        paddingLeft: '1px',
        paddingRight: '1px',
        paddingBottom: '1px',
      }}
    >
      {/* Mẹo LaTeX - Gọn gàng, chỉ có link */}
      <div 
        className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100"
        style={{
          paddingTop: '1px',
          paddingLeft: '1px',
          paddingRight: '1px',
          paddingBottom: '1px',
        }}
      >
        <div className="flex items-center justify-between">
          <Link 
            to="/latex-guide"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 transition-colors"
          >
            Xem hướng dẫn LateX <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* Thông báo nhanh - 2 tin gần nhất */}
      {userNotifications.length > 0 && (
        <div>
          <h3 className="font-bold text-gray-800 mb-2.5 text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <Bell size={12} className="text-blue-500" /> Thông báo nhanh
          </h3>
          <div className="space-y-2">
            {userNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-2.5 border rounded-lg transition-all hover:shadow-sm ${
                  notif.read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'
                }`}
              >
                <p className="text-xs font-semibold text-gray-900 mb-1 line-clamp-1">{notif.title || 'Thông báo'}</p>
                <p className="text-[10px] text-gray-600 line-clamp-2 leading-relaxed">{notif.message || ''}</p>
                <p className="text-[10px] text-gray-400 mt-1.5">
                  {dayjs(notif.createdAt?.toDate?.() || notif.createdAt).fromNow()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bảng xếp hạng */}
      <div>
        <h3 className="font-bold text-gray-800 mb-2.5 text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
          <Trophy size={12} className="text-yellow-500" /> Bảng vàng tuần
        </h3>
        <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
          {leaderboard.map((user) => (
            <div key={user.rank} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white transition-colors">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm flex-shrink-0 ${
                user.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500' 
                : user.rank === 2 ? 'bg-gradient-to-br from-gray-400 to-gray-500' 
                : 'bg-gradient-to-br from-orange-400 to-orange-500'
              }`}>
                {user.rank === 1 ? <Medal size={12} /> : user.rank === 2 ? <Star size={12} /> : <Zap size={12} />}
              </div>
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-white shadow-sm flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-gray-700 truncate">{user.name}</div>
                <div className="text-[10px] text-gray-500 font-medium">{user.xp}</div>
              </div>
            </div>
          ))}
          <Link 
            to="/dashboard"
            className="block w-full text-center text-xs font-bold text-gray-500 hover:text-blue-600 mt-2 pt-2 border-t border-gray-200 transition-colors"
          >
            Xem tất cả →
          </Link>
        </div>
      </div>

      {/* Chủ đề nổi bật - Dựa trên hashtag */}
      {trendingTopics.length > 0 && (
        <div>
          <h3 className="font-bold text-gray-800 mb-2.5 text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <TrendingUp size={12} className="text-blue-500" /> Chủ đề nổi bật
          </h3>
          <div className="space-y-1">
            {trendingTopics.map((item, i) => (
              <button
                key={i}
                onClick={() => navigate(`/?q=${encodeURIComponent(item.topic)}`)}
                className="w-full flex justify-between items-center group hover:bg-gray-50 p-2 rounded-lg transition-all"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Hash size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-700 text-xs group-hover:text-blue-600 transition-colors truncate">{item.topic}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{item.posts}</div>
                  </div>
                </div>
                <ArrowRight size={12} className="text-gray-300 group-hover:text-blue-600 transition-colors flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Teacher/Admin Notifications - Nếu có */}
      {isTeacherOrAdmin && teacherNotifications.length > 0 && (
        <div>
          <h3 className="font-bold text-gray-800 mb-2.5 text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <Zap size={12} className="text-blue-500" /> Thông báo giáo viên
          </h3>
          <div className="space-y-2">
            {teacherNotifications.slice(0, 2).map((notif) => (
              <div
                key={notif.id}
                className={`p-2.5 border rounded-lg transition-all hover:shadow-sm ${
                  notif.type?.includes('admin')
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <p className="text-xs font-semibold text-gray-900 mb-1 line-clamp-1">{notif.title || 'Thông báo'}</p>
                <p className="text-[10px] text-gray-600 line-clamp-2 leading-relaxed">{notif.message || ''}</p>
                <p className="text-[10px] text-gray-400 mt-1.5">
                  {dayjs(notif.createdAt?.toDate?.() || notif.createdAt).fromNow()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
