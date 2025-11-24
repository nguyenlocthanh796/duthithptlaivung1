import { initializeApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getDatabase } from 'firebase/database'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { getRemoteConfig } from 'firebase/remote-config'
import { getFunctions } from 'firebase/functions'

// Firebase configuration - use environment variables or update with your project details
// Get these values from: Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0581370080',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
}

// Validate required config
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('⚠️ Firebase configuration missing!')
  console.error('Please create frontend/.env file with:')
  console.error('  VITE_FIREBASE_API_KEY=your_api_key')
  console.error('  VITE_FIREBASE_PROJECT_ID=gen-lang-client-0581370080')
  console.error('  VITE_FIREBASE_AUTH_DOMAIN=gen-lang-client-0581370080.firebaseapp.com')
  console.error('  ... (see FIREBASE_SETUP.md for full list)')
  console.error('Get these values from: Firebase Console > Project Settings > General > Your apps')
}

const app = initializeApp(firebaseConfig)

if (typeof window !== 'undefined') {
  isSupported()
    .then((supported) => {
      if (supported && firebaseConfig.measurementId && firebaseConfig.measurementId !== 'G-XXXXXXXXXX') {
        // Only initialize analytics if measurement ID is valid
        getAnalytics(app)
      }
    })
    .catch(() => null)
}

const auth = getAuth(app)
const provider = new GoogleAuthProvider()

// Firestore - for structured data
const db = getFirestore(app)
// Note: Firestore free tier includes:
// - 50K reads/day, 20K writes/day, 20K deletes/day
// - 1GB storage
// - Offline persistence is free and reduces reads

// Realtime Database - for live quiz (low latency, realtime sync)
const rtdb = getDatabase(app)
// Note: RTDB free tier includes:
// - 1GB storage
// - 100 concurrent connections
// - Perfect for live quiz with 100+ users

// Cloud Messaging - for push notifications
let messaging = null
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    messaging = getMessaging(app)
  } catch (e) {
    console.warn('FCM not available:', e)
  }
}

// Remote Config - for dynamic configuration
const remoteConfig = getRemoteConfig(app)
remoteConfig.settings.minimumFetchIntervalMillis = 3600000 // 1 hour cache
// Set default values
remoteConfig.defaultConfig = {
  show_ai_tutor: true,
  enable_live_quiz: true,
  theme_color: '#2563eb',
  maintenance_mode: false,
}

// Cloud Functions
const functions = getFunctions(app)

export { app, auth, provider, db, rtdb, messaging, remoteConfig, functions }
