"use client"

import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { SteamLoginButton } from "@/components/steam-login-button"
import { toast } from "@/hooks/use-toast"

export default function LoginPage() {
  const searchParams = useSearchParams()
  const nextPath = "/dashboard"
  const error = searchParams.get("error")
  const hasHandledSteamLogin = useRef(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [steamError, setSteamError] = useState<string | null>(null)
  useEffect(() => {
    if (!error) return

    if (error === "steam_auth_failed") {
      toast({
        title: "Steam login failed",
        description: "Spróbuj ponownie za chwilę.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Login error",
      description: String(error),
      variant: "destructive",
    })
  }, [error])

  useEffect(() => {
    if (hasHandledSteamLogin.current) return

    const params = new URLSearchParams(window.location.search)
    const claimedId = params.get("openid.claimed_id")
    if (!claimedId) return

    console.log("Steam params:", window.location.search)

    const steamId = claimedId.split("/").filter(Boolean).pop() || null
    console.log("Steam ID:", steamId)

    hasHandledSteamLogin.current = true
    setLoading(true)
    setSteamError(null)

    const exchangeSteamLogin = async () => {
      try {
        if (!steamId) {
          throw new Error("Missing Steam ID")
        }

        const res = await fetch("http://localhost:4000/api/auth/steam/exchange", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            steamId,
          }),
        })

        if (res.ok) {
          console.log("Exchange success")
          window.location.href = "/dashboard"
          return
        }

        console.error("Exchange failed")
        throw new Error("Steam login failed")
      } catch (error) {
        console.error("Exchange failed", error)
        setSteamError("Steam login failed")
        toast({
          title: "Steam login failed",
          description: "Spróbuj ponownie za chwilę.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    void exchangeSteamLogin()
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-lg">
        <div className="mb-8 text-center">
          <div className="mb-6 flex items-center justify-center">
            <div className="rounded-2xl bg-gradient-to-br from-green-500/10 to-transparent p-2">
              <div className="overflow-hidden rounded-xl border border-white/10 shadow-lg shadow-black/30">
                <Image
                  src="/logo.png"
                  alt="SkinFlip logo"
                  width={64}
                  height={64}
                  className="h-16 w-16 object-cover"
                />
              </div>
            </div>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">
            CS2 Skin Flipper
          </h1>
          <p className="text-sm text-muted-foreground">
            Track your skin flips and maximize your ROI
          </p>
        </div>
        {error || steamError ? (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-card p-3 text-sm text-destructive">
            {steamError
              ? steamError
              : error === "steam_auth_failed"
              ? "Steam login failed. Sprobuj ponownie."
              : `Login error: ${error}`}
          </div>
        ) : null}
        <SteamLoginButton
          href={`/api/auth/steam?next=${encodeURIComponent(nextPath)}`}
          anchorClassName="w-full justify-center rounded-lg bg-[#1b2838] px-4 py-2 text-white hover:bg-[#2a475e]"
        />
      </div>
    </div>
  )
}
