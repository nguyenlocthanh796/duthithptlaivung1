import { createContext, useEffect, useMemo, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, db, provider } from '../firebase'
import { upsertUserProfile } from '../services/firestore'
import { initializeFCM } from '../services/fcmService'

export const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          await upsertUserProfile(firebaseUser)
          const profile = await getDoc(doc(db, 'users', firebaseUser.uid))
          const profileData = profile.data() || {}
          setUser({
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            roles: profileData.roles || [],
          })
          
          // Initialize FCM for push notifications
          try {
            await initializeFCM(firebaseUser.uid)
          } catch (fcmError) {
            console.warn('FCM initialization failed:', fcmError)
            // Non-critical, continue without FCM
          }
        } else {
          setUser(null)
        }
      } finally {
        setLoading(false)
      }
    })
    return () => unsub()
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      loginWithGoogle: () => signInWithPopup(auth, provider),
      logout: () => signOut(auth),
    }),
    [user, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
