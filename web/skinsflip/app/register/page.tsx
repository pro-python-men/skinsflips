"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/hooks/use-toast";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.16),transparent_32%),linear-gradient(180deg,#09110d_0%,#060807_100%)] p-4">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0d1512]/95 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
            <span className="text-2xl font-bold text-emerald-300">CS</span>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">Create account</h1>
          <p className="text-sm text-muted-foreground">
            Create your account to save flips, monitor inventory, and review realized profit.
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            try {
              const data = await apiFetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
              });

              if (!data) throw new Error("Register failed");

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

          <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Spinner className="size-4" />
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium underline underline-offset-4">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
