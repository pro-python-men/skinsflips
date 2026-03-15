import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string
  description?: string
  icon: LucideIcon
  trend?: "up" | "down" | "neutral"
  className?: string
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend = "neutral",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-6 shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p
            className={cn(
              "text-2xl font-bold",
              trend === "up" && "text-accent",
              trend === "down" && "text-destructive",
              trend === "neutral" && "text-foreground"
            )}
          >
            {value}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            trend === "up" && "bg-accent/10 text-accent",
            trend === "down" && "bg-destructive/10 text-destructive",
            trend === "neutral" && "bg-primary/10 text-primary"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}
