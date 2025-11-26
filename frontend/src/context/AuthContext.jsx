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
          // Try to update user profile, but don't fail if blocked
          try {
            await upsertUserProfile(firebaseUser)
          } catch (profileError) {
            // Log but don't block authentication - upsertUserProfile should not throw for blocked requests
            const errorMessage = profileError?.message || ''
            const errorCode = profileError?.code || ''
            if (!errorMessage.includes('ERR_BLOCKED_BY_CLIENT') && 
                !errorMessage.includes('blocked') &&
                errorCode !== 'unavailable') {
              console.error('Unexpected error updating user profile:', profileError)
            } else {
              console.warn('User profile update skipped (blocked by ad blocker or network issue)')
            }
          }
          
          // Try to get user profile, but use defaults if blocked
          let profileData = {}
          try {
            const profile = await getDoc(doc(db, 'users', firebaseUser.uid))
            if (profile.exists()) {
              profileData = profile.data() || {}
            }
          } catch (profileError) {
            // Handle ERR_BLOCKED_BY_CLIENT and network errors gracefully
            const errorMessage = profileError?.message || ''
            const errorCode = profileError?.code || ''
            if (errorMessage.includes('ERR_BLOCKED_BY_CLIENT') || 
                errorMessage.includes('blocked') ||
                errorMessage.includes('network') ||
                errorCode === 'unavailable') {
              console.warn('User profile fetch skipped (blocked by ad blocker or network issue)')
            } else {
              console.warn('Could not fetch user profile:', profileError)
            }
            // Continue with empty profile data
            profileData = {}
          }
          
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
      } catch (error) {
        // Catch any unexpected errors in the auth flow
        console.error('Unexpected error in auth state change:', error)
        // Still set loading to false to prevent infinite loading
        setLoading(false)
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
