"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary">
            <span className="text-2xl font-bold text-primary-foreground">CS</span>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">Create account</h1>
          <p className="text-sm text-muted-foreground">Start tracking your flips.</p>
        </div>

        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            try {
              const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
              });

              const data = await res.json().catch(() => null);
              if (!res.ok) throw new Error(data?.message || `Register failed (${res.status})`);

              toast({ title: "Account created" });
              router.push("/dashboard");
            } catch (err: any) {
              toast({
                title: "Register failed",
                description: err?.message || "Unknown error",
                variant: "destructive"
              });
            } finally {
              setLoading(false);
            }
          }}
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Email</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Password (min 8 chars)
            </label>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
            />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

