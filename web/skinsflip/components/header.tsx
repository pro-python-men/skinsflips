"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, LogOut, User as UserIcon, Settings, X } from "lucide-react"
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
import { cn } from "@/lib/utils"

interface HeaderProps {
  title: string
  onMenuClick?: () => void
  onMobileClose?: () => void
  showMenuButton?: boolean
  isMobileMenuOpen?: boolean
}

const navItems = [
  { href: "/dashboard", label: "Best Flips" },
  { href: "/history", label: "Tracking" },
  { href: "/inventory", label: "Inventory" },
]

export function Header({
  title,
  onMenuClick,
  onMobileClose,
  showMenuButton,
  isMobileMenuOpen = false,
}: HeaderProps) {
  const pathname = usePathname()
  const { user, isLoading, setUser } = useAuth()

  const logout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" })
    } finally {
      setUser(null)
      window.location.href = "/dashboard"
    }
  }

  const renderAccount = () => {
    if (isLoading) return null

    if (user === null) {
      return (
        <SteamLoginButton
          href="/api/auth/steam"
          iconSize={22}
          useButtonWrapper
          buttonClassName="rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          anchorClassName="px-0 py-0"
        />
      )
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-11 items-center gap-3 rounded-full border border-white/8 bg-white/4 px-3 hover:bg-white/7"
          >
            <Avatar className="h-8 w-8 border border-white/10">
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
            <span className="hidden text-sm font-medium text-foreground md:inline">
              {user.displayName ??
                (user.email?.endsWith("@local") ? null : user.email) ??
                "User"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-52 rounded-2xl border-white/10 bg-card/98 text-card-foreground"
        >
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
    )
  }

  const renderNavLinks = (mobile = false) => (
    <nav
      className={cn(
        "flex items-center gap-1",
        mobile ? "flex-col items-stretch gap-2" : "hidden lg:flex"
      )}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={mobile ? onMobileClose : undefined}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              mobile
                ? isActive
                  ? "bg-white/10 text-foreground"
                  : "text-muted-foreground hover:bg-white/6 hover:text-foreground"
                : isActive
                  ? "bg-white/8 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 topbar-blur">
      <div className="content-frame">
        <div className="flex min-h-[74px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            {showMenuButton ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={onMenuClick}
                className="h-10 w-10 rounded-full border border-white/8 bg-white/4 lg:hidden"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            ) : null}

            <Link href="/dashboard" className="flex items-center gap-3">
              <Image
                src="/stronka.png"
                alt="SkinFlip logo"
                width={144}
                height={36}
                className="h-8 w-auto object-contain"
              />
            </Link>

            <div className="hidden xl:block">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                CS2 Trading Workspace
              </div>
              <div className="text-sm font-medium text-foreground">{title}</div>
            </div>
          </div>

          {renderNavLinks()}

          <div className="flex items-center gap-3">{renderAccount()}</div>
        </div>

        {isMobileMenuOpen ? (
          <div className="border-t border-white/8 py-4 lg:hidden">
            <div className="space-y-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Current view
                </div>
                <div className="mt-1 text-sm font-medium text-foreground">{title}</div>
              </div>
              {renderNavLinks(true)}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  )
}
