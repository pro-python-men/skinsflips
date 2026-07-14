import Link from "next/link"

const legalLinks = [
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/cookies", label: "Cookie Policy" },
  { href: "/legal/terms", label: "Terms of Service" },
]

export function LegalFooter() {
  return (
    <footer className="border-t border-white/8 bg-transparent">
      <div className="content-frame flex flex-col gap-4 py-6 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
        <p>&copy; {new Date().getFullYear()} SkinFlip. All rights reserved.</p>
        <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {legalLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
