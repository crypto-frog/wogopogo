import mockApi from './mock.js'

const BASE = import.meta.env.VITE_API_BASE || '/api'
export const IS_MOCK = import.meta.env.VITE_USE_MOCKS === 'true'
const REQUEST_TIMEOUT_MS = 15000

function clean(params) {
  const out = {}
  for (const key of Object.keys(params)) {
    const v = params[key]
    if (v !== '' && v !== null && v !== undefined) out[key] = v
  }
  return out
}

async function request(path, { method = 'GET', body, headers } = {}) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  let res

  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      signal: controller.signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('The server took too long to respond. Please try again.')
    }
    throw new Error('Could not reach Wogopogo. Check your connection and try again.')
  } finally {
    window.clearTimeout(timeout)
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    // Non-JSON reply, usually a hosting misconfiguration
  }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`)
    err.status = res.status
    err.fields = data?.fields || null
    throw err
  }
  if (data === null) {
    throw new Error('The server returned an unreadable response. Please try again.')
  }
  return data
}

const realApi = {
  meta: () => request('/meta'),
  listJobs: (params = {}) =>
    request('/jobs?' + new URLSearchParams(clean(params)).toString()),
  getJob: (id, token) =>
    request(`/jobs/${encodeURIComponent(id)}` + (token ? `?token=${encodeURIComponent(token)}` : '')),
  postJob: (data) => request('/jobs', { method: 'POST', body: data }),
  manageJob: (id, token, action) =>
    request(`/jobs/${encodeURIComponent(id)}/manage`, { method: 'POST', body: { token, action } }),
  adminList: (status, key) =>
    request(`/admin/jobs?status=${encodeURIComponent(status)}`, {
      headers: { 'X-Admin-Key': key },
    }),
  adminAct: (id, action, key) =>
    request(`/admin/jobs/${encodeURIComponent(id)}`, {
      method: 'POST',
      body: { action },
      headers: { 'X-Admin-Key': key },
    }),
}

export const api = IS_MOCK ? mockApi : realApi
