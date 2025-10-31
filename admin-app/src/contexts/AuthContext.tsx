import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { isAdminEmail } from '@/lib/auth'

interface SimpleUser {
  email: string
}

interface AuthContextType {
  user: SimpleUser | null
  loading: boolean
  signOut: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SimpleUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in via localStorage
    const email = localStorage.getItem('admin_email')
    if (email && isAdminEmail(email)) {
      setUser({ email })
    }
    setLoading(false)
  }, [])

  const signOut = () => {
    localStorage.removeItem('admin_email')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
