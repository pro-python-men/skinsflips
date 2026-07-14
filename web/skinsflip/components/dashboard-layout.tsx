"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-context"
import { Header } from "@/components/header"
import { LegalFooter } from "@/components/legal-footer"

interface DashboardLayoutProps {
  children: React.ReactNode
  title: string
  requireAuth?: boolean
}

export function DashboardLayout({ children, title, requireAuth }: DashboardLayoutProps) {
  const { user, isAuthenticated, isLoading: isLoadingAuth } = useAuth()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    if (!requireAuth || isLoadingAuth || user) return

    const next = `${window.location.pathname}${window.location.search}`
    window.location.replace(`/login?next=${encodeURIComponent(next)}`)
  }, [isLoadingAuth, requireAuth, user])

  if (requireAuth && (isLoadingAuth || !isAuthenticated)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="surface-panel w-full max-w-md rounded-[1.8rem] p-8 text-center">
          <p className="section-heading">Secure access</p>
          <div className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">Checking authentication</div>
          <p className="mt-2 text-sm text-muted-foreground">Preparing your trading workspace.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell min-h-screen bg-transparent">
      <Header
        title={title}
        onMenuClick={() => setIsMobileOpen((current) => !current)}
        onMobileClose={() => setIsMobileOpen(false)}
        showMenuButton
        isMobileMenuOpen={isMobileOpen}
      />

      <main className="content-frame py-6 lg:py-8">
        {children}
      </main>

      <LegalFooter />
    </div>
  )
}
