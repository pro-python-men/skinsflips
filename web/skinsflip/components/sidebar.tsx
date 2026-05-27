"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Package,
  TrendingUp,
  History,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

const navItems = [
  { href: "/dashboard", label: "Best Flips", icon: TrendingUp },
  { href: "/history", label: "Tracking", icon: History },
  { href: "/inventory", label: "Inventory", icon: Package },
]

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-white/8 bg-[linear-gradient(180deg,rgba(6,8,9,0.98)_0%,rgba(8,11,12,0.98)_100%)] transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-white/8 px-4">
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center">
            <Image
              src="/stronka.png"
              alt="CS Skin Flipper logo"
              width={160}
              height={40}
              className="h-9 w-auto object-contain lg:h-10"
            />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-white/8 text-sidebar-primary"
                  : "text-muted-foreground hover:bg-white/6 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
