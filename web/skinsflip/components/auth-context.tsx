"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { apiFetch } from "@/lib/api"

export type AuthUser = {
  id: number
  email?: string | null
  steamId?: string | null
  displayName?: string | null
  avatarUrl?: string | null
}

type AuthContextValue = {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: AuthUser | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({
  value,
  children,
}: {
  value: AuthContextValue
  children: React.ReactNode
}) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function AuthStateProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadAuth = async () => {
      setIsLoading(true)

      try {
        const data = await apiFetch("/api/auth/me")
        setUser(((data as { user?: AuthUser | null } | null)?.user ?? null) as AuthUser | null)
      } catch {
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadAuth()
  }, [pathname])

  return (
    <AuthProvider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        setUser,
      }}
    >
      {children}
    </AuthProvider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
