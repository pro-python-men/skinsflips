import type { Metadata } from "next"
import { LegalPage } from "@/components/legal-page"

export const metadata: Metadata = {
  title: "Cookie Policy | SkinFlip",
  description: "Cookie Policy for SkinFlip.",
}

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      description="How SkinFlip uses cookies and similar technologies for authentication, preferences, and measurement."
      fileName="cookies.md"
    />
  )
}
