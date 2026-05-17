import type { Metadata } from "next"
import { LegalPage } from "@/components/legal-page"

export const metadata: Metadata = {
  title: "Privacy Policy | SkinFlip",
  description: "Privacy Policy for SkinFlip.",
}

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="How SkinFlip handles account, usage, and trading-related information."
      fileName="privacy.md"
    />
  )
}
