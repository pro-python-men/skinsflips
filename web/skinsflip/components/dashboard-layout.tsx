"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { cn } from "@/lib/utils"

interface DashboardLayoutProps {
  children: React.ReactNode
  title: string
  requireAuth?: boolean
}

export function DashboardLayout({ children, title, requireAuth }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    if (requireAuth) {
      const checkAuth = async () => {
        try {
          const res = await fetch('/api/auth/me', { credentials: 'include' })
          if (res.status === 401) {
            const next = `${window.location.pathname}${window.location.search}`
            window.location.href = `/login?next=${encodeURIComponent(next)}`
            return
          }
          if (res.ok) {
            setAuthorized(true)
          } else {
            setAuthorized(false)
          }
        } catch (e) {
          setAuthorized(false)
        }
      }
      checkAuth()
    } else {
      setAuthorized(true)
    }
  }, [requireAuth])

  if (requireAuth && authorized === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Checking auth...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <div className="hidden lg:block">
        <Sidebar
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
        />
      </div>

      {/* Sidebar - Mobile */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 lg:hidden",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          "transition-transform duration-300"
        )}
      >
        <Sidebar isCollapsed={false} onToggle={() => setIsMobileOpen(false)} />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          title={title}
          onMenuClick={() => setIsMobileOpen(true)}
          showMenuButton
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
