import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, CheckCheck, Trash2, Sparkles, MessageSquare, Heart, UserPlus, AlertCircle } from 'lucide-react';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db, appId as defaultAppId } from '../../services/firebase';

// Get notification icon helper
const getNotificationIcon = (type) => {
  switch (type) {
    case 'like':
      return <Heart className="text-white" size={16} />;
    case 'comment':
      return <MessageSquare className="text-white" size={16} />;
    case 'follow':
      return <UserPlus className="text-white" size={16} />;
    case 'ai':
      return <Sparkles className="text-white" size={16} />;
    default:
      return <AlertCircle className="text-white" size={16} />;
  }
};

// Notification Item Component - Facebook style
const NotificationItem = ({ notification, markAsRead, deleteNotification, formatTime }) => {
  return (
    <div
      className={`
        px-4 py-3 
        active:bg-gray-100 md:hover:bg-gray-50 
        transition-colors cursor-pointer touch-manipulation
        border-b border-gray-100
        ${!notification.read ? 'bg-blue-50/30' : 'bg-white'}
      `}
      onClick={() => {
        if (!notification.read) {
          markAsRead(notification.id);
        }
      }}
    >
      <div className="flex items-start gap-3">
        {/* Avatar with icon overlay - Facebook style */}
        <div className="relative shrink-0">
          <div className={`
            w-12 h-12 md:w-10 md:h-10 
            rounded-full 
            bg-gradient-to-br from-purple-500 to-blue-500 
            flex items-center justify-center
            ${!notification.read ? 'opacity-100' : 'opacity-70'}
          `}>
            {getNotificationIcon(notification.type)}
          </div>
          {/* Icon overlay - smaller icon in bottom right */}
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 md:w-4 md:h-4 bg-white rounded-full flex items-center justify-center border-2 border-white shadow-sm">
            {getNotificationIcon(notification.type)}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`
            text-sm 
            ${!notification.read ? 'text-gray-900 font-semibold' : 'text-gray-700'}
            leading-snug
          `}>
            {notification.title || 'Thông báo mới'}
          </p>
          {notification.message && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
              {notification.message}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <p className="text-xs text-gray-400">
              {formatTime(notification.createdAt)}
            </p>
            {!notification.read && (
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationDropdown = ({ user, appId = defaultAppId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'unread'
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Load notifications from Firestore
  useEffect(() => {
    if (!user || !db) {
      setIsLoading(false);
      return;
    }

    const notificationsPath = `artifacts/${appId}/public/data/notifications`;
    const q = query(
      collection(db, notificationsPath),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const loadedNotifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
        }));
        
        setNotifications(loadedNotifications);
        setUnreadCount(loadedNotifications.filter(n => !n.read).length);
        setIsLoading(false);
      },
      (error) => {
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, appId, db]);

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    if (!db || !user) return;
    
    try {
      const notificationRef = doc(db, `artifacts/${appId}/public/data/notifications`, notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp()
      });
    } catch (error) {
      // Error handling
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!db || !user) return;
    
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      const promises = unreadNotifications.map(n => {
        const notificationRef = doc(db, `artifacts/${appId}/public/data/notifications`, n.id);
        return updateDoc(notificationRef, {
          read: true,
          readAt: serverTimestamp()
        });
      });
      await Promise.all(promises);
    } catch (error) {
      // Error handling
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    if (!db || !user) return;
    
    try {
      const notificationRef = doc(db, `artifacts/${appId}/public/data/notifications`, notificationId);
      await deleteDoc(notificationRef);
    } catch (error) {
      // Error handling
    }
  };


  // Format time (Facebook style)
  const formatTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return new Date(date).toLocaleDateString('vi-VN');
  };

  // Group notifications by time (Facebook style)
  const groupNotificationsByTime = (notifs) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = {
      new: [],
      today: [],
      earlier: []
    };

    notifs.forEach(notif => {
      const notifDate = new Date(notif.createdAt);
      const hoursDiff = (now - notifDate) / (1000 * 60 * 60);
      
      if (hoursDiff < 24 && !notif.read) {
        groups.new.push(notif);
      } else if (notifDate >= today) {
        groups.today.push(notif);
      } else {
        groups.earlier.push(notif);
      }
    });

    return groups;
  };

  // Filter notifications based on active tab
  const filteredNotifications = activeTab === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  const groupedNotifications = groupNotificationsByTime(filteredNotifications);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="
          p-2 
          text-gray-500 
          active:bg-gray-100 md:hover:bg-gray-100 
          rounded-xl 
          relative 
          transition-all
          touch-manipulation
        "
        title="Thông báo"
        aria-label={`Thông báo${unreadCount > 0 ? ` (${unreadCount} mới)` : ''}`}
      >
        <Bell size={20} className="md:w-[22px] md:h-[22px]" />
        {unreadCount > 0 && (
          <>
            {/* Pulse indicator */}
            <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
            {/* Count badge - Better visibility on mobile */}
            <span className="absolute -top-0.5 -right-0.5 md:-top-1 md:-right-1 min-w-[18px] md:min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] md:text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white">
              {unreadCount > 99 ? '99+' : unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </>
        )}
      </button>

      {isOpen && (
        <>
          {/* Mobile: Overlay */}
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsOpen(false)}></div>
          
          {/* Dropdown - Responsive positioning */}
          <div className={`
            fixed md:absolute 
            md:right-0 md:top-full md:mt-2
            bottom-0 md:bottom-auto left-0 md:left-auto
            w-full md:w-96 
            max-w-full md:max-w-[calc(100vw-2rem)]
            bg-white rounded-t-3xl md:rounded-2xl 
            shadow-2xl border border-gray-200 
            overflow-hidden z-50
            animate-in fade-in slide-in-from-bottom-4 md:slide-in-from-top-2 
            duration-300
            h-[70vh] md:max-h-[600px]
            flex flex-col
          `}>
            {/* Header - Facebook style */}
            <div className="bg-white border-b border-gray-200 shrink-0">
              {/* Title bar */}
              <div className="px-4 py-3 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Thông báo</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="p-2 active:bg-gray-100 rounded-full transition-colors text-gray-600 touch-manipulation"
                      title="Đánh dấu tất cả đã đọc"
                      aria-label="Đánh dấu tất cả đã đọc"
                    >
                      <CheckCheck size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 active:bg-gray-100 rounded-full transition-colors text-gray-600 touch-manipulation"
                    aria-label="Đóng"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              
              {/* Tabs - Facebook style */}
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`flex-1 py-3 text-center font-semibold text-sm relative ${
                    activeTab === 'all' 
                      ? 'text-blue-600' 
                      : 'text-gray-600'
                  }`}
                >
                  Tất cả
                  {activeTab === 'all' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('unread')}
                  className={`flex-1 py-3 text-center font-semibold text-sm relative ${
                    activeTab === 'unread' 
                      ? 'text-blue-600' 
                      : 'text-gray-600'
                  }`}
                >
                  Chưa đọc
                  {unreadCount > 0 && (
                    <span className="ml-1 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                  {activeTab === 'unread' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                  )}
                </button>
              </div>
            </div>

            {/* Notifications List - Optimized scroll */}
            <div className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain">
            {isLoading ? (
              <div className="p-6 md:p-8 text-center text-gray-500">
                <div className="inline-block w-5 h-5 md:w-6 md:h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                <p className="text-xs md:text-sm">Đang tải thông báo...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-6 md:p-8 text-center text-gray-500">
                <Bell size={40} className="md:w-12 md:h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-xs md:text-sm font-medium">Chưa có thông báo nào</p>
                <p className="text-[10px] md:text-xs mt-1">Các thông báo mới sẽ xuất hiện ở đây</p>
              </div>
            ) : (
              <div>
                {/* New Section */}
                {groupedNotifications.new.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                      <p className="text-xs font-semibold text-gray-600 uppercase">Mới</p>
                    </div>
                    {groupedNotifications.new.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        markAsRead={markAsRead}
                        deleteNotification={deleteNotification}
                        formatTime={formatTime}
                      />
                    ))}
                  </div>
                )}

                {/* Today Section */}
                {groupedNotifications.today.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                      <p className="text-xs font-semibold text-gray-600 uppercase">Hôm nay</p>
                    </div>
                    {groupedNotifications.today.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        markAsRead={markAsRead}
                        deleteNotification={deleteNotification}
                        formatTime={formatTime}
                      />
                    ))}
                  </div>
                )}

                {/* Earlier Section */}
                {groupedNotifications.earlier.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                      <p className="text-xs font-semibold text-gray-600 uppercase">Trước đó</p>
                    </div>
                    {groupedNotifications.earlier.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        markAsRead={markAsRead}
                        deleteNotification={deleteNotification}
                        formatTime={formatTime}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer - Facebook style */}
          {filteredNotifications.length > 0 && (
            <div className="border-t border-gray-200 p-3 bg-white shrink-0">
              <button
                onClick={() => {
                  // Clear all read notifications
                  const readNotifications = filteredNotifications.filter(n => n.read);
                  readNotifications.forEach(n => deleteNotification(n.id));
                }}
                className="
                  w-full 
                  text-sm
                  text-blue-600 
                  active:text-blue-700 md:hover:text-blue-700 
                  text-center 
                  py-2
                  touch-manipulation
                  font-medium
                  active:bg-gray-50 md:hover:bg-gray-50
                  transition-colors
                  rounded-lg
                "
              >
                Xóa tất cả đã đọc
              </button>
            </div>
          )}
        </div>
      </>
      )}
    </div>
  );
};

export default NotificationDropdown;

