import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const distDirectory = path.resolve(scriptDirectory, '../frontend/dist')
const indexPath = path.join(distDirectory, 'index.html')

if (!fs.existsSync(indexPath)) {
  throw new Error('Build output is missing frontend/dist/index.html')
}

const shell = fs.readFileSync(indexPath, 'utf8')

function replaceRoot(document, fallback) {
  const marker = '<div id="root"></div>'
  if (!document.includes(marker)) throw new Error('Built HTML is missing the React root marker')
  return document.replace(marker, `<div id="root">${fallback}</div>`)
}

function replaceTag(document, pattern, replacement, label) {
  if (!pattern.test(document)) throw new Error(`Built HTML is missing ${label}`)
  return document.replace(pattern, replacement)
}

function pageShell({ title, description, canonical, robots = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' }) {
  let document = shell
  document = replaceTag(document, /<title>.*?<\/title>/is, `<title>${title}</title>`, 'title')
  document = replaceTag(document, /<meta name="description"[^>]*>/i, `<meta name="description" content="${description}" />`, 'description')
  document = replaceTag(document, /<meta name="robots"[^>]*>/i, `<meta name="robots" content="${robots}" />`, 'robots')
  document = replaceTag(document, /<meta name="googlebot"[^>]*>/i, `<meta name="googlebot" content="${robots}" />`, 'googlebot')
  document = replaceTag(document, /<meta property="og:title"[^>]*>/i, `<meta property="og:title" content="${title}" />`, 'Open Graph title')
  document = replaceTag(document, /<meta property="og:description"[^>]*>/i, `<meta property="og:description" content="${description}" />`, 'Open Graph description')
  document = replaceTag(document, /<meta property="og:url"[^>]*>/i, `<meta property="og:url" content="${canonical}" />`, 'Open Graph URL')
  document = replaceTag(document, /<meta name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${title}" />`, 'Twitter title')
  document = replaceTag(document, /<meta name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${description}" />`, 'Twitter description')
  document = replaceTag(document, /<link rel="canonical"[^>]*>/i, `<link rel="canonical" href="${canonical}" />`, 'canonical link')
  document = replaceTag(document, /<link rel="alternate" hreflang="en-CA"[^>]*>/i, `<link rel="alternate" hreflang="en-CA" href="${canonical}" />`, 'language alternate')
  return document
}

const homeFallback = `
      <main id="main-content">
        <section class="hero"><div class="shell">
          <p class="hero-eyebrow mono">Okanagan Valley · free job board</p>
          <h1 class="hero-title">Local jobs in the Okanagan Valley</h1>
          <p class="hero-sub">Browse current work from Osoyoos to Salmon Arm. Wogopogo is free for job seekers and employers, requires no account, and reviews every listing before publication.</p>
          <p><a class="btn btn-primary" href="/post">Post a job for free</a></p>
        </div></section>
        <section class="shell listing-section" aria-labelledby="static-board-title">
          <h2 id="static-board-title">Okanagan job listings</h2>
          <p>Approved, active opportunities appear here and are searchable by keyword, category, location, and job type.</p>
          <p>There are no active listings right now. Employers can submit the first local opportunity for review.</p>
        </section>
        <section class="home-guide" aria-labelledby="static-guide-title"><div class="shell">
          <h2 id="static-guide-title">A straightforward local job board</h2>
          <p>Job seekers browse without an account. Employers post directly, keep a private management token, and close a listing when the position is filled.</p>
        </div></section>
      </main>`

const postDescription = 'Reach local candidates across the Okanagan Valley. Post a job on Wogopogo for free, with no employer account required.'
const postFallback = `
      <main id="main-content" class="shell page page-narrow">
        <h1 class="page-title">Post an Okanagan job for free</h1>
        <p class="lede">Reach local candidates from Osoyoos to Salmon Arm. No employer account is required, and listings are reviewed before they appear.</p>
        <p>The posting form loads here. You will receive a private manage token after submission so you can close or remove the listing later.</p>
        <p><a href="/">Browse current Okanagan jobs</a></p>
      </main>`

const notFoundFallback = `
      <main id="main-content" class="shell page page-narrow">
        <h1 class="page-title">Page not found</h1>
        <p class="lede">That Wogopogo page does not exist or is no longer available.</p>
        <p><a href="/">Browse current Okanagan jobs</a></p>
      </main>`

function privateFallback(title, description) {
  return `
      <main id="main-content" class="shell page page-narrow">
        <h1 class="page-title">${title}</h1>
        <p class="lede">${description}</p>
        <p><a href="/">Return to current Okanagan jobs</a></p>
      </main>`
}

const home = replaceRoot(shell, homeFallback)
const post = replaceRoot(
  pageShell({
    title: 'Post an Okanagan Job for Free | Wogopogo',
    description: postDescription,
    canonical: 'https://wogopogo.ca/post',
    robots: 'noindex, follow',
  }),
  postFallback
)
const notFound = replaceRoot(
  pageShell({
    title: 'Page Not Found | Wogopogo',
    description: 'The requested Wogopogo page does not exist or is no longer available.',
    canonical: 'https://wogopogo.ca/',
    robots: 'noindex, nofollow',
  }),
  notFoundFallback
)
const manage = replaceRoot(
  pageShell({
    title: 'Manage a Listing | Wogopogo',
    description: 'Private Wogopogo listing-management utility.',
    canonical: 'https://wogopogo.ca/manage',
    robots: 'noindex, nofollow',
  }),
  privateFallback('Manage a listing', 'Use the private manage token supplied when the listing was submitted.')
)
const admin = replaceRoot(
  pageShell({
    title: 'Moderation | Wogopogo',
    description: 'Private Wogopogo moderation utility.',
    canonical: 'https://wogopogo.ca/admin',
    robots: 'noindex, nofollow',
  }),
  privateFallback('Moderation', 'This is the private Wogopogo moderation utility.')
)

fs.writeFileSync(indexPath, home)
fs.writeFileSync(path.join(distDirectory, 'post.html'), post)
fs.writeFileSync(path.join(distDirectory, 'manage.html'), manage)
fs.writeFileSync(path.join(distDirectory, 'admin.html'), admin)
fs.writeFileSync(path.join(distDirectory, '404.html'), notFound)

console.log('Generated server-delivered HTML for public, private, and 404 routes.')
