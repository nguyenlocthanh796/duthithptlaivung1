/**
 * Firebase Cloud Messaging (FCM) Service
 * Thông báo thông minh - Re-engagement
 */

import { getToken, onMessage } from 'firebase/messaging'
import { messaging } from '../firebase'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

/**
 * Check if service worker is available and registered
 */
async function checkServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    return !!registration
  } catch (error) {
    console.warn('Service Worker check failed:', error)
    return false
  }
}

/**
 * Register service worker if not already registered
 */
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers are not supported in this browser')
    return false
  }

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/firebase-cloud-messaging-push-scope',
    })
    console.log('Service Worker registered:', registration)
    return true
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    return false
  }
}

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission() {
  if (!messaging) {
    console.warn('FCM not available')
    return null
  }

  // Check if service worker is registered
  let swRegistered = await checkServiceWorker()
  
  // Try to register if not already registered
  if (!swRegistered) {
    swRegistered = await registerServiceWorker()
  }

  if (!swRegistered) {
    console.warn('Service Worker not available. FCM requires a service worker.')
    return null
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FCM_VAPID_KEY || '',
      })
      
      if (token) {
        console.log('FCM Token:', token)
        return token
      }
    } else {
      console.warn('Notification permission denied')
    }
  } catch (error) {
    console.error('Error getting FCM token:', error)
    // Don't throw, just log the error
  }

  return null
}

/**
 * Save FCM token to user profile
 */
export async function saveFCMToken(userId, token) {
  if (!token || !userId) return

  try {
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      fcmToken: token,
      fcmTokenUpdatedAt: new Date().toISOString(),
    })
    console.log('FCM token saved to user profile')
  } catch (error) {
    console.error('Error saving FCM token:', error)
  }
}

/**
 * Listen for foreground messages (when app is open)
 */
export function onForegroundMessage(callback) {
  if (!messaging) {
    console.warn('FCM not available')
    return () => {}
  }

  return onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload)
    callback(payload)
  })
}

/**
 * Initialize FCM for user
 * This should be called after user login
 */
export async function initializeFCM(userId) {
  // Only initialize if service workers are supported
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers not supported. FCM will not work.')
    return null
  }

  try {
    // First, ensure service worker is registered
    const swRegistered = await checkServiceWorker()
    if (!swRegistered) {
      const registered = await registerServiceWorker()
      if (!registered) {
        console.warn('Could not register service worker. FCM will not work.')
        return null
      }
      // Wait a bit for service worker to be ready
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    const token = await requestNotificationPermission()
    if (token) {
      await saveFCMToken(userId, token)
      return token
    }
  } catch (error) {
    console.error('Error initializing FCM:', error)
    // Don't throw - FCM is not critical for app functionality
  }
  return null
}

