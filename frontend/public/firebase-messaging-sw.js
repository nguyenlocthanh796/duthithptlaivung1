/**
 * Firebase Cloud Messaging Service Worker
 * Handles background push notifications
 * 
 * Note: Firebase will automatically inject the app config when messaging is initialized
 */

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

// Initialize Firebase in Service Worker
// Firebase will use the same config as the main app automatically
// If you need explicit config, update these values from your Firebase Console
firebase.initializeApp({
  apiKey: 'AIzaSyCyTTwdzDDor6qp1Ky5gLAMjqAe9cPxfcM', // Update from .env if needed
  projectId: 'gen-lang-client-0581370080',
  messagingSenderId: '626004693464', // Update from .env if needed
  appId: '1:626004693464:web:your_app_id', // Update from .env if needed
})

const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload)
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'Thông báo mới'
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'Bạn có thông báo mới từ DuThi Platform',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.data?.tag || 'default',
    requireInteraction: false,
    silent: false,
    data: payload.data || {},
  }

  return self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.')
  
  event.notification.close()
  
  // Get the URL from notification data or default to home
  const urlToOpen = event.notification.data?.url || '/'
  
  // Open app when notification is clicked
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus()
        }
      }
      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

