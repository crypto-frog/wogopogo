// The API stores timestamps as UTC 'YYYY-MM-DD HH:MM:SS'
export function parseUtc(s) {
  if (typeof s !== 'string' || !s) return null
  const date = new Date(s.replace(' ', 'T') + 'Z')
  return Number.isNaN(date.getTime()) ? null : date
}

export function timeAgo(s) {
  const d = parseUtc(s)
  if (!d) return ''
  const sec = Math.max(0, (Date.now() - d.getTime()) / 1000)
  if (sec < 90) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 31) return `${day}d ago`
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

export function shortDate(s) {
  const d = parseUtc(s)
  if (!d) return ''
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    try {
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      ta.setAttribute('readonly', '')
      document.body.appendChild(ta)
      ta.select()
      return document.execCommand('copy')
    } catch {
      return false
    } finally {
      ta.remove()
    }
  }
}

export function slugify(value) {
  const slug = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return slug || 'job'
}

export function jobPath(job) {
  const id = Number(job?.id)
  const safeId = Number.isSafeInteger(id) && id > 0 ? id : 0
  return `/jobs/${safeId}/${slugify(job?.title)}`
}

// Poster convenience: keep the manage tokens for jobs posted from this
// browser so the Manage page can list them.
const MY_POSTS_KEY = 'wogo-my-posts'

export function loadMyPosts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MY_POSTS_KEY) || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (post) =>
        post &&
        Number.isSafeInteger(Number(post.id)) &&
        Number(post.id) > 0 &&
        typeof post.title === 'string' &&
        typeof post.token === 'string' &&
        post.token.length > 0
    )
  } catch {
    return []
  }
}

export function saveMyPost(entry) {
  const posts = [entry, ...loadMyPosts().filter((p) => p.id !== entry.id)].slice(0, 20)
  try {
    localStorage.setItem(MY_POSTS_KEY, JSON.stringify(posts))
  } catch {
    // Storage full or blocked, not fatal
  }
}

export function removeMyPost(id) {
  try {
    localStorage.setItem(
      MY_POSTS_KEY,
      JSON.stringify(loadMyPosts().filter((p) => p.id !== id))
    )
  } catch {
    // ignore
  }
}
