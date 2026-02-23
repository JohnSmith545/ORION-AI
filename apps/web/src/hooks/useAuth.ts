import { useState, useEffect } from 'react'
import { auth, db } from '../lib/firebase'
import { onAuthStateChanged, signOut, User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'

export type UserRole = 'admin' | 'user'

export function useAuth() {
  const [user, setUser] = useState<User | null>(auth.currentUser)
  const [loading, setLoading] = useState(!auth.currentUser)
  const [role, setRole] = useState<UserRole>('user')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Listen to the Firestore user doc for real-time role changes
  useEffect(() => {
    if (!user) {
      setRole('user')
      return
    }

    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      snapshot => {
        const data = snapshot.data()
        setRole((data?.role as UserRole) || 'user')
      },
      () => {
        // On error (e.g. doc doesn't exist yet), default to 'user'
        setRole('user')
      }
    )

    return () => unsubscribe()
  }, [user])

  const logout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return { user, loading, logout, role }
}
