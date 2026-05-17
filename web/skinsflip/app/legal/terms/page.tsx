import type { Metadata } from "next"
import { LegalPage } from "@/components/legal-page"

export const metadata: Metadata = {
  title: "Terms of Service | SkinFlip",
  description: "Terms of Service for SkinFlip.",
}

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title="Terms of Service"
      description="The core terms, responsibilities, and disclaimers for using SkinFlip."
      fileName="terms.md"
    />
  )
}
