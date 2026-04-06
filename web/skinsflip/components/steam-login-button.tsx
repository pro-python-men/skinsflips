import { Button } from "@/components/ui/button"
import { SteamIcon } from "@/components/steam-icon"
import { cn } from "@/lib/utils"

type SteamLoginButtonProps = {
  href: string
  anchorClassName?: string
  buttonClassName?: string
  iconSize?: number
  useButtonWrapper?: boolean
}

export function SteamLoginButton({
  href,
  anchorClassName,
  buttonClassName,
  iconSize = 28,
  useButtonWrapper = false,
}: SteamLoginButtonProps) {
  const content = (
    <div className="flex items-center gap-3">
      <SteamIcon size={iconSize} />
      <span>Login with Steam</span>
    </div>
  )

  if (useButtonWrapper) {
    return (
      <Button asChild className={cn("group", buttonClassName)}>
        <a href={href} className={cn("flex items-center gap-3", anchorClassName)}>
          {content}
        </a>
      </Button>
    )
  }

  return (
    <a href={href} className={cn("group flex items-center gap-3", anchorClassName)}>
      {content}
    </a>
  )
}
