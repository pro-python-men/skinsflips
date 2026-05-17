import fs from "node:fs/promises"
import path from "node:path"
import Image from "next/image"
import Link from "next/link"
import { LegalFooter } from "@/components/legal-footer"

type LegalPageProps = {
  title: string
  description: string
  fileName: "privacy.md" | "cookies.md" | "terms.md"
}

type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }

function parseMarkdown(markdown: string) {
  const blocks: MarkdownBlock[] = []
  const lines = markdown.split(/\r?\n/)
  let paragraph: string[] = []
  let list: string[] = []

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    blocks.push({ type: "paragraph", text: paragraph.join(" ") })
    paragraph = []
  }

  const flushList = () => {
    if (list.length === 0) return
    blocks.push({ type: "list", items: list })
    list = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      flushParagraph()
      flushList()
      continue
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line)
    if (heading) {
      flushParagraph()
      flushList()
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2],
      })
      continue
    }

    const listItem = /^[-*]\s+(.+)$/.exec(line)
    if (listItem) {
      flushParagraph()
      list.push(listItem[1])
      continue
    }

    flushList()
    paragraph.push(line)
  }

  flushParagraph()
  flushList()
  return blocks
}

async function getLegalContent(fileName: LegalPageProps["fileName"]) {
  const fullPath = path.join(process.cwd(), "content", "legal", fileName)
  return fs.readFile(fullPath, "utf8")
}

function MarkdownContent({ blocks }: { blocks: MarkdownBlock[] }) {
  return (
    <div className="space-y-7">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          if (block.level === 1) {
            return (
              <h1
                key={index}
                className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
              >
                {block.text}
              </h1>
            )
          }

          if (block.level === 2) {
            return (
              <h2
                key={index}
                className="pt-5 text-2xl font-semibold tracking-tight text-foreground"
              >
                {block.text}
              </h2>
            )
          }

          return (
            <h3 key={index} className="pt-2 text-lg font-semibold text-foreground">
              {block.text}
            </h3>
          )
        }

        if (block.type === "list") {
          return (
            <ul
              key={index}
              className="list-disc space-y-3 pl-6 text-base leading-8 text-muted-foreground"
            >
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )
        }

        return (
          <p key={index} className="text-base leading-8 text-muted-foreground">
            {block.text}
          </p>
        )
      })}
    </div>
  )
}

export async function LegalPage({ title, description, fileName }: LegalPageProps) {
  const markdown = await getLegalContent(fileName)
  const blocks = parseMarkdown(markdown)

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/80 bg-card/70 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center">
            <Image
              src="/stronka.png"
              alt="SkinFlip logo"
              width={156}
              height={40}
              className="h-9 w-auto object-contain"
              priority
            />
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to app
          </Link>
        </div>
      </header>

      <article className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mb-10 border-b border-border pb-8">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            Legal
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
            {description}
          </p>
        </div>

        <MarkdownContent blocks={blocks.filter((block) => block.type !== "heading" || block.level !== 1)} />
      </article>

      <LegalFooter />
    </main>
  )
}
