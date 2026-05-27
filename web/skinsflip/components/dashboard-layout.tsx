"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-context"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { LegalFooter } from "@/components/legal-footer"
import { cn } from "@/lib/utils"

interface DashboardLayoutProps {
  children: React.ReactNode
  title: string
  requireAuth?: boolean
}

export function DashboardLayout({ children, title, requireAuth }: DashboardLayoutProps) {
  const { user, isAuthenticated, isLoading: isLoadingAuth } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    if (!requireAuth || isLoadingAuth || user) return

    const next = `${window.location.pathname}${window.location.search}`
    window.location.replace(`/login?next=${encodeURIComponent(next)}`)
  }, [isLoadingAuth, requireAuth, user])

  if (requireAuth && (isLoadingAuth || !isAuthenticated)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Checking auth...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
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
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6">{children}</div>
          <LegalFooter />
        </main>
      </div>
    </div>
  )
}
