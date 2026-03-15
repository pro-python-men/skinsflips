"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get("next") || "/dashboard"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

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

        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setLoading(true)
            try {
              const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
              })

              const data = await res.json().catch(() => null)
              if (!res.ok) throw new Error(data?.message || `Login failed (${res.status})`)

              toast({ title: "Logged in" })
              router.push(nextPath)
            } catch (err: any) {
              toast({
                title: "Login failed",
                description: err?.message || "Unknown error",
                variant: "destructive",
              })
            } finally {
              setLoading(false)
            }
          }}
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Email
            </label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Password
            </label>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Logging in…" : "Login"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            No account?{" "}
            <Link href="/register" className="underline">
              Register
            </Link>
          </p>
        </form>

        <div className="mt-8 rounded-lg bg-muted/50 p-4">
          <h3 className="mb-2 text-sm font-medium text-foreground">Tip</h3>
          <p className="text-xs text-muted-foreground">
            You can keep Steam login later; email/password is enabled now.
          </p>
        </div>
      </div>
    </div>
  )
}
