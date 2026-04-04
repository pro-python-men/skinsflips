"use client"

import { Menu, LogOut, User as UserIcon, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"

type AuthUser = {
  id: number
  email?: string | null
  steamId?: string | null
  displayName?: string | null
  avatarUrl?: string | null
}

interface HeaderProps {
  title: string
  onMenuClick?: () => void
  showMenuButton?: boolean
}

export function Header({ title, onMenuClick, showMenuButton }: HeaderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        const data = await apiFetch("/api/auth/me")
        setUser((data as any)?.user ?? null)
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [])

  const logout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" })
    } finally {
      setUser(null)
      window.location.href = "/dashboard"
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
      <div className="flex items-center gap-4">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      </div>

      {loading ? null : user === null ? (
        <Button asChild>
          <a
            href="/api/auth/steam"
            className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-sm transition"
          >
            <img src="/favicon.ico" alt="Steam" className="w-4 h-4" />
            Login with Steam
          </a>
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={user.avatarUrl ?? "/placeholder-avatar.png"}
                  alt="User avatar"
                />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user.displayName?.[0]?.toUpperCase() ??
                    user.email?.[0]?.toUpperCase() ??
                    "U"}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium text-foreground sm:inline">
                {user.displayName ??
                  (user.email?.endsWith("@local") ? null : user.email) ??
                  "User"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <UserIcon className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onSelect={(e) => {
                e.preventDefault()
                logout()
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  )
}
