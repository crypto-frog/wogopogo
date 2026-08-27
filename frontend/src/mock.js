/**
 * Mock API for `npm run dev:mock`.
 * Same interface as the real client, backed by in-memory data, so the
 * whole UI can be explored with no PHP or database running.
 * Admin key in mock mode: "demo"
 */

const CATEGORIES = [
  { id: 1, name: 'Wine & Cideries', slug: 'wine', emoji: '🍇' },
  { id: 2, name: 'Hospitality & Food', slug: 'hospitality', emoji: '🍽️' },
  { id: 3, name: 'Tourism & Recreation', slug: 'tourism', emoji: '⛵' },
  { id: 4, name: 'Orchards & Agriculture', slug: 'agriculture', emoji: '🍑' },
  { id: 5, name: 'Health & Wellness', slug: 'health', emoji: '🩺' },
  { id: 6, name: 'Trades & Construction', slug: 'trades', emoji: '🔧' },
  { id: 7, name: 'Tech & Digital', slug: 'tech', emoji: '💻' },
  { id: 8, name: 'Retail & Sales', slug: 'retail', emoji: '🛍️' },
  { id: 9, name: 'Education & Childcare', slug: 'education', emoji: '📚' },
  { id: 10, name: 'Transport & Logistics', slug: 'transport', emoji: '🚚' },
  { id: 11, name: 'Office & Admin', slug: 'office', emoji: '🗂️' },
  { id: 12, name: 'Arts & Media', slug: 'arts', emoji: '🎨' },
  { id: 13, name: 'General Labour', slug: 'labour', emoji: '💪' },
  { id: 14, name: 'Everything Else', slug: 'other', emoji: '✨' },
]

const LOCATIONS = [
  'Kelowna', 'West Kelowna', 'Lake Country', 'Vernon', 'Penticton',
  'Summerland', 'Peachland', 'Osoyoos', 'Oliver', 'Okanagan Falls',
  'Keremeos', 'Armstrong', 'Enderby', 'Salmon Arm', 'Big White',
  'Silver Star', 'Apex Mountain', 'Remote (Okanagan-based)',
]

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Seasonal', 'Casual', 'Internship']

const hoursAgo = (h) =>
  new Date(Date.now() - h * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ')
const daysAhead = (d) =>
  new Date(Date.now() + d * 86400 * 1000).toISOString().slice(0, 19).replace('T', ' ')

let nextId = 100
let jobs = [
  {
    id: 1, title: 'Cellar Hand', company: 'Quails Hollow Winery', category: CATEGORIES[0],
    location: 'West Kelowna', job_type: 'Seasonal', pay: '$22 to $26 per hour',
    description: 'Crush season is coming and our cellar team needs another set of careful hands.\n\nYou will help with receiving fruit, pump-overs, barrel work, and keeping the cellar spotless. Forklift experience is a bonus, a good attitude at 6 am is essential.\n\nBoots and training provided. Season runs September through November with a shot at year-round work.',
    apply_email: 'jobs@example.com', apply_url: '', tier: 'featured', status: 'approved',
    created_at: hoursAgo(30), expires_at: daysAhead(29),
  },
  {
    id: 2, title: 'Tasting Room Host', company: 'Naramata Bench Cellars', category: CATEGORIES[0],
    location: 'Penticton', job_type: 'Part-time', pay: '$19 per hour plus tips',
    description: 'Pour, chat, and make visitors feel like locals. Weekend availability required, wine knowledge welcome but trainable. Serving It Right certificate needed before your first shift.',
    apply_email: 'hello@example.com', apply_url: '', tier: 'free', status: 'approved',
    created_at: hoursAgo(55), expires_at: daysAhead(28),
  },
  {
    id: 3, title: 'Line Cook', company: 'Lakeshore Social', category: CATEGORIES[1],
    location: 'Kelowna', job_type: 'Full-time', pay: '$21 to $25 per hour',
    description: 'Busy waterfront kitchen looking for a dependable line cook for our summer-to-winter menu change.\n\nYou can hold a station on a Friday night, keep your prep list honest, and take feedback without drama. Extended health after 3 months, staff meals every shift.',
    apply_email: '', apply_url: 'https://example.com/apply', tier: 'free', status: 'approved',
    created_at: hoursAgo(8), expires_at: daysAhead(30),
  },
  {
    id: 4, title: 'Junior Web Developer', company: 'Peachtree Digital', category: CATEGORIES[6],
    location: 'Kelowna', job_type: 'Full-time', pay: '$58k to $70k',
    description: 'Small studio, real clients, no ticket factory.\n\nYou will ship React front ends and the occasional API endpoint, review PRs with the team, and talk to actual humans about what they need. 1 to 2 years experience or a portfolio that says the same. Hybrid, 2 days a week in our downtown Kelowna office.',
    apply_email: '', apply_url: 'https://example.com/careers', tier: 'free', status: 'approved',
    created_at: hoursAgo(47), expires_at: daysAhead(27),
  },
  {
    id: 5, title: 'Ski & Snowboard Instructor', company: 'Big White Snow School', category: CATEGORIES[2],
    location: 'Big White', job_type: 'Seasonal', pay: '$20 to $28 per hour plus pass',
    description: 'Teach beginners to love the mountain. CASI or CSIA Level 1 minimum, Level 2 preferred. Season pass, staff housing lottery, and the best office view in the valley.',
    apply_email: '', apply_url: 'https://example.com/snowschool', tier: 'free', status: 'approved',
    created_at: hoursAgo(26), expires_at: daysAhead(29),
  },
  {
    id: 6, title: 'Barista, Weekend Opener', company: 'Kettle Valley Coffee', category: CATEGORIES[1],
    location: 'Penticton', job_type: 'Part-time', pay: '$17.85 plus tips',
    description: 'Saturday and Sunday 6 am opens. You are reliable, friendly before sunrise, and can steam milk without scorching it. Latte art optional, punctuality is not.',
    apply_email: 'kvcoffee@example.com', apply_url: '', tier: 'free', status: 'approved',
    created_at: hoursAgo(3), expires_at: daysAhead(30),
  },
]

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms))
const cleanText = (value, max) => String(value ?? '').trim().slice(0, max)
const isLive = (job) =>
  job.status === 'approved' && new Date(job.expires_at.replace(' ', 'T') + 'Z').getTime() > Date.now()
const excerptOf = (d) => {
  const flat = d.replace(/\s+/g, ' ')
  return flat.length > 200 ? flat.slice(0, 200) + '…' : flat
}
const listShape = (j) => {
  const { description, apply_email, apply_url, ...rest } = j
  return { ...rest, excerpt: excerptOf(description) }
}
const fail = (message, status, fields = null) => {
  const e = new Error(message)
  e.status = status
  e.fields = fields
  return e
}

const mockApi = {
  async meta() {
    await delay()
    return {
      categories: CATEGORIES.map((c) => ({
        ...c,
        jobs: jobs.filter((j) => isLive(j) && j.category.id === c.id).length,
      })),
      locations: LOCATIONS,
      job_types: JOB_TYPES,
      require_approval: true,
      featured_enabled: true,
    }
  },

  async listJobs(params = {}) {
    await delay()
    let list = jobs.filter(isLive)
    if (params.category) list = list.filter((j) => j.category.slug === params.category)
    if (params.location) list = list.filter((j) => j.location === params.location)
    if (params.type) list = list.filter((j) => j.job_type === params.type)
    if (params.search) {
      const q = String(params.search).toLowerCase()
      list = list.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q)
      )
    }
    list = [...list].sort((a, b) => {
      if (a.tier !== b.tier) return a.tier === 'featured' ? -1 : 1
      return a.created_at < b.created_at ? 1 : -1
    })
    const perPage = 12
    const total = list.length
    const totalPages = Math.max(1, Math.ceil(total / perPage))
    const page = Math.min(totalPages, Math.max(1, parseInt(params.page || 1, 10)))
    return {
      jobs: list.slice((page - 1) * perPage, page * perPage).map(listShape),
      page,
      per_page: perPage,
      total,
      total_pages: totalPages,
    }
  },

  async getJob(id, token) {
    await delay()
    const j = jobs.find((x) => x.id === Number(id))
    const owns = Boolean(j && token && token === j._token)
    if (!j || (!isLive(j) && !owns)) {
      throw fail('This listing is no longer available.', 404)
    }
    const { _token, ...pub } = j
    return { job: pub }
  },

  async postJob(data) {
    await delay(400)
    if (cleanText(data.website, 200)) {
      return { ok: true, id: 0, status: 'pending', manage_token: '' }
    }

    const cleaned = {
      title: cleanText(data.title, 90),
      company: cleanText(data.company, 90),
      category_id: Number(data.category_id) || 0,
      location: cleanText(data.location, 80),
      job_type: cleanText(data.job_type, 40),
      pay: cleanText(data.pay, 90),
      description: cleanText(data.description, 6000),
      apply_email: cleanText(data.apply_email, 160),
      apply_url: cleanText(data.apply_url, 400),
    }
    const fields = {}
    if (cleaned.title.length < 3) fields.title = 'Job title needs at least 3 characters.'
    if (cleaned.company.length < 2) fields.company = 'Company name needs at least 2 characters.'
    if (cleaned.description.length < 30)
      fields.description = 'Tell people a bit more, 30 characters minimum.'
    if (!CATEGORIES.some((category) => category.id === cleaned.category_id))
      fields.category_id = 'Pick a category from the list.'
    if (!LOCATIONS.includes(cleaned.location)) fields.location = 'Pick a location from the list.'
    if (!JOB_TYPES.includes(cleaned.job_type)) fields.job_type = 'Pick a job type from the list.'
    if (cleaned.apply_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned.apply_email))
      fields.apply_email = 'That email address does not look right.'
    if (cleaned.apply_url && !/^https?:\/\/[^\s]+$/i.test(cleaned.apply_url))
      fields.apply_url = 'Application links must start with http:// or https://'
    if (!cleaned.apply_email && !cleaned.apply_url)
      fields.apply_email = 'Give applicants an email or a link, at least one.'
    if (Object.keys(fields).length) throw fail('Please fix the highlighted fields.', 422, fields)

    const cat = CATEGORIES.find((c) => c.id === cleaned.category_id)
    const id = nextId++
    const token = 'mock-' + Math.random().toString(16).slice(2, 10)
    jobs.push({
      id,
      title: cleaned.title,
      company: cleaned.company,
      category: cat,
      location: cleaned.location,
      job_type: cleaned.job_type,
      pay: cleaned.pay,
      description: cleaned.description,
      apply_email: cleaned.apply_email,
      apply_url: cleaned.apply_url,
      tier: 'free',
      status: 'pending',
      created_at: hoursAgo(0),
      expires_at: daysAhead(30),
      _token: token,
    })
    return { ok: true, id, status: 'pending', manage_token: token }
  },

  async manageJob(id, token, action) {
    await delay()
    const j = jobs.find((x) => x.id === Number(id))
    if (!j) throw fail('Listing not found.', 404)
    if (!token || token !== j._token) throw fail('That manage token does not match this listing.', 401)
    if (action === 'close') {
      j.status = 'closed'
      return { ok: true, status: 'closed' }
    }
    if (action === 'delete') {
      jobs = jobs.filter((x) => x.id !== j.id)
      return { ok: true, deleted: true }
    }
    throw fail("Unknown action. Use 'close' or 'delete'.", 400)
  },

  async adminList(status, key) {
    await delay()
    if (key !== 'demo') throw fail('Invalid admin key. In mock mode the key is "demo".', 401)
    let list = status === 'all' ? jobs : jobs.filter((j) => j.status === status)
    list = [...list].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 200)
    return {
      jobs: list.map(({ _token, ...j }) => j),
      status,
    }
  },

  async adminAct(id, action, key) {
    await delay()
    if (key !== 'demo') throw fail('Invalid admin key. In mock mode the key is "demo".', 401)
    const j = jobs.find((x) => x.id === Number(id))
    if (!j) throw fail('Listing not found.', 404)
    if (action === 'approve') {
      j.status = 'approved'
      j.expires_at = daysAhead(30)
    }
    else if (action === 'reject') j.status = 'rejected'
    else if (action === 'close') j.status = 'closed'
    else if (action === 'feature') j.tier = 'featured'
    else if (action === 'unfeature') j.tier = 'free'
    else if (action === 'renew') j.expires_at = daysAhead(30)
    else if (action === 'delete') jobs = jobs.filter((x) => x.id !== j.id)
    else throw fail('Unknown admin action.', 400)
    return { ok: true, action }
  },
}

export default mockApi
