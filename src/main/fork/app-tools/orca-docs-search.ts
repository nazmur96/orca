import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

export type OrcaDoc = { path: string; title: string; body: string }
export type OrcaDocHit = { path: string; title: string; excerpt: string }

const EXCERPT_CHARS = 700
const MAX_HITS = 3
const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'how',
  'can',
  'this',
  'that',
  'app',
  'with',
  'you',
  'what',
  'does',
  'into',
  'from',
  'orca',
  'use',
  'are',
  'its',
  'there'
])

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9][a-z0-9-]*/g) ?? []
}

function excerptAround(body: string, terms: readonly string[]): string {
  const lower = body.toLowerCase()
  const at = Math.max(0, Math.min(...terms.map((t) => lower.indexOf(t)).filter((i) => i >= 0)))
  const start = Math.max(0, at - 150)
  return body.slice(start, start + EXCERPT_CHARS).trim()
}

/** Rank by how many query terms a doc covers, then dampened hit counts; titles weigh most. */
export function searchOrcaDocs(docs: readonly OrcaDoc[], query: string): OrcaDocHit[] {
  const terms = [...new Set(words(query).filter((t) => t.length > 2 && !STOP_WORDS.has(t)))]
  if (terms.length === 0) {
    return []
  }
  return docs
    .map((doc) => {
      const title = words(doc.title)
      const body = words(doc.body)
      let score = 0
      for (const term of terms) {
        const inTitle = title.filter((w) => w.startsWith(term)).length
        const inBody = body.filter((w) => w.startsWith(term)).length
        if (inTitle + inBody > 0) {
          score += 10 + 5 * Math.min(inTitle, 1) + Math.log1p(inBody)
        }
      }
      return { doc, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_HITS)
    .map(({ doc }) => ({
      path: doc.path,
      title: doc.title,
      excerpt: excerptAround(doc.body, terms)
    }))
}

/** Drop MDX frontmatter and import lines, which carry no prose. */
export function docProse(source: string): string {
  return source
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .replace(/^import .*$/gm, '')
    .trim()
}

function titleOf(source: string, fallback: string): string {
  return source.match(/^title:\s*(.+)$/m)?.[1]?.trim() ?? fallback
}

async function collect(root: string, dir: string, docs: OrcaDoc[]): Promise<void> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      await collect(root, path, docs)
    } else if (/\.mdx?$/.test(entry.name)) {
      const source = await readFile(path, 'utf8')
      docs.push({
        path: relative(root, path),
        title: titleOf(source, entry.name),
        body: docProse(source)
      })
    }
  }
}

/** Packaged builds ship the docs as resources; dev reads the checkout. */
export async function loadOrcaDocs(
  roots: readonly string[] = [
    join(process.resourcesPath ?? '', 'fork-docs'),
    join(process.cwd(), 'docs/site/content/docs')
  ]
): Promise<OrcaDoc[]> {
  const root = roots.find((candidate) => candidate && existsSync(candidate))
  if (!root) {
    return []
  }
  const docs: OrcaDoc[] = []
  await collect(root, root, docs)
  return docs
}
