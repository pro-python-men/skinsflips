"use client";

import Image from "next/image";
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
    <main className="min-h-screen bg-transparent text-foreground">
      <header className="border-b border-white/8 topbar-blur">
        <div className="content-frame">
          <div className="flex min-h-[74px] items-center justify-between gap-4">
            <Link href="/" className="flex items-center">
              <Image
                src="/stronka.png"
                alt="SkinFlip logo"
                width={144}
                height={36}
                className="h-8 w-auto object-contain"
                priority
              />
            </Link>
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Already have an account?
            </Link>
          </div>
        </div>
      </header>

      <div className="content-frame flex min-h-[calc(100vh-75px)] items-center justify-center py-10">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="surface-panel rounded-[2rem] p-6 lg:hidden">
            <div className="space-y-4">
              <p className="section-heading">Account setup</p>
              <h1 className="max-w-[14ch] text-3xl font-semibold leading-[0.96] tracking-[-0.05em] text-white">
                Create a workspace for your trading data
              </h1>
              <p className="text-sm leading-6 text-muted-foreground">
                Save opportunities, monitor inventory exits, and keep realized results in one place.
              </p>
            </div>
          </section>

          <section className="surface-panel hidden rounded-[2rem] p-8 lg:flex lg:flex-col lg:justify-between">
            <div className="space-y-6">
              <p className="section-heading">Account setup</p>
              <div className="space-y-4">
                <h1 className="max-w-[11ch] text-4xl font-semibold leading-[0.95] tracking-[-0.05em] text-white">
                  Create a workspace for your CS2 trading data
                </h1>
                <p className="max-w-[52ch] text-base leading-7 text-muted-foreground">
                  Save opportunities, monitor inventory exits, and keep your realized trading history in one place.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.4rem] border border-white/8 bg-white/4 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Account</p>
                <p className="mt-2 text-lg font-semibold text-white">Email + password</p>
              </div>
              <div className="rounded-[1.4rem] border border-white/8 bg-white/4 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Tracking</p>
                <p className="mt-2 text-lg font-semibold text-white">Saved opportunities</p>
              </div>
              <div className="rounded-[1.4rem] border border-white/8 bg-white/4 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">History</p>
                <p className="mt-2 text-lg font-semibold text-white">Recorded results</p>
              </div>
            </div>
          </section>

          <section className="surface-panel rounded-[2rem] p-6 sm:p-8">
            <div className="mb-8 text-center">
              <div className="mb-6 flex items-center justify-center">
                <div className="overflow-hidden rounded-[1.2rem] border border-white/8 bg-white/4 p-2">
                  <Image
                    src="/logo.png"
                    alt="SkinFlip logo"
                    width={64}
                    height={64}
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                </div>
              </div>
              <p className="section-heading">Create account</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">Start your account</h2>
              <p className="mt-3 text-sm text-muted-foreground">
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
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="h-12 rounded-2xl border-white/10 bg-white/4"
                />
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
                  className="h-12 rounded-2xl border-white/10 bg-white/4"
                />
              </div>

              <Button
                type="submit"
                className="h-12 w-full gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner className="size-4" />
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </Button>

              <div className="rounded-[1.2rem] border border-white/8 bg-white/4 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  What you unlock
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ranked live deals, saved opportunities, inventory sell planning, and realized history.
                </p>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="font-medium underline underline-offset-4 text-foreground">
                  Log in
                </Link>
              </p>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
