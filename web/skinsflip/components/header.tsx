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
import { SteamLoginButton } from "@/components/steam-login-button"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/components/auth-context"

interface HeaderProps {
  title: string
  onMenuClick?: () => void
  showMenuButton?: boolean
}

export function Header({ title, onMenuClick, showMenuButton }: HeaderProps) {
  const { user, isLoading, setUser } = useAuth()

  const logout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" })
    } finally {
      setUser(null)
      window.location.href = "/dashboard"
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-white/8 bg-black/22 px-4 backdrop-blur-xl lg:px-6">
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
        <h1 className="text-xl font-semibold tracking-[-0.04em] text-foreground">{title}</h1>
      </div>

      {isLoading ? null : user === null ? (
        <SteamLoginButton
          href="/api/auth/steam"
          iconSize={28}
          useButtonWrapper
          anchorClassName="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-sm transition hover:bg-white/10"
        />
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
