import Image from "next/image"

export function SteamIcon({ size = 32 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size }} className="flex items-center justify-center">
      <Image
        src="/steam.png"
        alt="Steam"
        width={size}
        height={size}
        className="h-full w-full object-contain"
      />
    </div>
  )
}
