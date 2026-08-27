import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(scriptDirectory, '..')
const docs = path.join(root, 'docs')
const failures = []

function read(name) {
  const file = path.join(docs, name)
  if (!fs.existsSync(file)) {
    failures.push(`Missing project-site file: docs/${name}`)
    return ''
  }
  return fs.readFileSync(file, 'utf8')
}

const html = read('index.html')
const robots = read('robots.txt')
const sitemap = read('sitemap.xml')
const manifestSource = read('site.webmanifest')
read('styles.css')
read('site.js')
read('404.html')
read('favicon.svg')
read('.nojekyll')

for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
  const reference = match[1]
  if (/^(?:https?:|mailto:|tel:|#)/.test(reference)) continue

  const clean = reference.replace(/[?#].*$/, '').replace(/^\.\//, '')
  if (!clean) continue

  if (!fs.existsSync(path.join(docs, clean))) {
    failures.push(`Broken local reference in docs/index.html: ${reference}`)
  }
}

const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]))
for (const match of html.matchAll(/href="#([^"]+)"/g)) {
  if (!ids.has(match[1])) failures.push(`Missing anchor target: #${match[1]}`)
}

try {
  JSON.parse(manifestSource)
} catch {
  failures.push('docs/site.webmanifest is not valid JSON')
}

const canonical = 'https://crypto-frog.github.io/wogopogo/'
if (!html.includes(`rel="canonical" href="${canonical}"`)) {
  failures.push('Project-site canonical URL is missing or incorrect')
}
if (!robots.includes(`Sitemap: ${canonical}sitemap.xml`)) {
  failures.push('Project-site robots.txt does not identify its sitemap')
}
if (!sitemap.includes(`<loc>${canonical}</loc>`)) {
  failures.push('Project-site sitemap does not contain the canonical homepage')
}

if (failures.length) {
  console.error('Project website validation failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Project website validation passed.')
console.log('Verified local assets, anchors, manifest, canonical URL, robots.txt, and sitemap.xml.')

