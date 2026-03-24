"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get("next") || "/dashboard"
  const error = searchParams.get("error")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary">
            <span className="text-2xl font-bold text-primary-foreground">CS</span>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">
            CS2 Skin Flipper
          </h1>
          <p className="text-sm text-muted-foreground">
            Track your skin flips and maximize your ROI
          </p>
        </div>
        {error ? (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-card p-3 text-sm text-destructive">
            {error === "steam_auth_failed"
              ? "Steam login failed. Sprobuj ponownie."
              : `Login error: ${error}`}
          </div>
        ) : null}
        <a
          href={`/api/auth/steam?next=${encodeURIComponent(nextPath)}`}
          className="w-full flex items-center justify-center gap-3 rounded-lg bg-[#1b2838] hover:bg-[#2a475e] text-white py-2 px-4"
        >
          <img
            src="https://cdn-icons-png.flaticon.com/512/3670/3670157.png"
            alt="Steam"
            className="w-5 h-5"
          />
          Login with Steam
        </a>
      </div>
    </div>
  )
}
