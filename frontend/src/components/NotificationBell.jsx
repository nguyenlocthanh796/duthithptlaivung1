import { useState, useEffect } from 'react'
import { watchNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/firestore'
import { useAuth } from '../hooks/useAuth'

export function NotificationBell() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user?.uid) return

    const unsubscribe = watchNotifications(user.uid, (notifs) => {
      setNotifications(notifs)
      setUnreadCount(notifs.filter((n) => !n.read).length)
    })

    return () => unsubscribe()
  }, [user?.uid])

  const handleMarkAsRead = async (notificationId) => {
    await markNotificationAsRead(notificationId)
  }

  const handleMarkAllAsRead = async () => {
    if (user?.uid) {
      await markAllNotificationsAsRead(user.uid)
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'mention':
        return '👤'
      case 'comment':
        return '💬'
      case 'reply':
        return '↩️'
      case 'solution':
        return '🤖'
      default:
        return '🔔'
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 p-3">
            <h3 className="font-semibold text-slate-900">Thông báo</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-gemini-blue hover:underline"
              >
                Đánh dấu đã đọc tất cả
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">Chưa có thông báo</div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (!notif.read) {
                      handleMarkAsRead(notif.id)
                    }
                    setShowDropdown(false)
                  }}
                  className={`cursor-pointer border-b border-slate-100 p-3 transition hover:bg-slate-50 ${
                    !notif.read ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{getNotificationIcon(notif.type)}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{notif.title}</p>
                      <p className="text-xs text-slate-600">{notif.message}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {notif.createdAt?.toDate
                          ? new Date(notif.createdAt.toDate()).toLocaleString('vi-VN')
                          : 'Vừa xong'}
                      </p>
                    </div>
                    {!notif.read && (
                      <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  )
}

