import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { timeAgo, shortDate } from '../util.js'
import { useMeta } from '../MetaContext.jsx'

const TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Live' },
  { id: 'closed', label: 'Closed' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
]

export default function Admin() {
  const { refreshMeta } = useMeta()
  const [key, setKey] = useState(() => {
    try {
      return sessionStorage.getItem('wogo-admin-key') || ''
    } catch {
      return ''
    }
  })
  const [unlocked, setUnlocked] = useState(false)
  const [tab, setTab] = useState('pending')
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const loadSequence = useRef(0)
  const activeTab = useRef(tab)
  const requestedJob = Number(new URLSearchParams(window.location.search).get('job'))

  useEffect(() => {
    if (!unlocked || !requestedJob || loading) return
    document.getElementById(`review-job-${requestedJob}`)?.scrollIntoView({ block: 'center' })
  }, [unlocked, requestedJob, loading])

  function lockAdmin() {
    loadSequence.current += 1
    try {
      sessionStorage.removeItem('wogo-admin-key')
    } catch {
      // Already effectively locked if storage is unavailable.
    }
    setUnlocked(false)
    setJobs([])
    setLoading(false)
  }

  async function load(status = tab, adminKey = key) {
    const sequence = ++loadSequence.current
    setLoading(true)
    setError('')
    try {
      const d = await api.adminList(status, adminKey.trim())
      if (sequence !== loadSequence.current) return
      setJobs(d.jobs)
      setUnlocked(true)
      try {
        sessionStorage.setItem('wogo-admin-key', adminKey.trim())
      } catch {
        // Session storage is a convenience, not a requirement.
      }
    } catch (e) {
      if (sequence !== loadSequence.current) return
      setError(e.message)
      if (e.status === 401 || e.status === 403) setUnlocked(false)
    } finally {
      if (sequence === loadSequence.current) setLoading(false)
    }
  }

  async function act(id, action) {
    if (action === 'delete' && !window.confirm(`Delete listing #${id} permanently?`)) return
    setBusyId(id)
    setError('')
    try {
      await api.adminAct(id, action, key.trim())
      refreshMeta().catch(() => {})
      await load(activeTab.current)
    } catch (e) {
      setError(e.message)
      if (e.status === 401 || e.status === 403) lockAdmin()
    } finally {
      setBusyId(null)
    }
  }

  function switchTab(next) {
    activeTab.current = next
    setTab(next)
    load(next)
  }

  function moveTabFocus(event, index) {
    let nextIndex = null
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % TABS.length
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + TABS.length) % TABS.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = TABS.length - 1
    if (nextIndex === null) return

    event.preventDefault()
    const nextTab = TABS[nextIndex]
    switchTab(nextTab.id)
    window.requestAnimationFrame(() => document.getElementById(`moderation-tab-${nextTab.id}`)?.focus())
  }

  if (!unlocked) {
    return (
      <div className="shell page page-narrow">
        <h1 className="page-title">Admin</h1>
        <p className="lede">
          Enter the admin key from <code>api/config.php</code> to review and moderate listings.
        </p>
        {error && (
          <div className="notice notice-err" role="alert">
            {error}
          </div>
        )}
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault()
            load('pending')
          }}
        >
          <div className="field">
            <label htmlFor="a-key">Admin key</label>
            <input
              id="a-key"
              className="input mono"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading || !key.trim()}>
              {loading ? 'Checking…' : 'Unlock'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="shell page">
      <div className="admin-bar">
        <h1 className="page-title">Moderation</h1>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={lockAdmin}
        >
          Lock
        </button>
      </div>

      <div className="tabs" role="tablist" aria-label="Listing status">
        {TABS.map((t, index) => (
          <button
            key={t.id}
            id={`moderation-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls="moderation-results"
            tabIndex={tab === t.id ? 0 : -1}
            className={'tab' + (tab === t.id ? ' tab-active' : '')}
            onClick={() => switchTab(t.id)}
            onKeyDown={(event) => moveTabFocus(event, index)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="notice notice-err" role="alert">
          {error}
        </div>
      )}

      <div
        id="moderation-results"
        role="tabpanel"
        aria-labelledby={`moderation-tab-${tab}`}
        aria-live="polite"
        aria-busy={loading}
      >
        {loading ? (
          <p className="loading mono">Loading…</p>
        ) : jobs.length === 0 ? (
          <p className="muted">Nothing in “{TABS.find((t) => t.id === tab)?.label}”. All clear.</p>
        ) : (
          <ul className="admin-list">
          {jobs.map((j) => (
            <li key={j.id} id={`review-job-${j.id}`} className={`admin-row${j.id === requestedJob ? ' admin-row-requested' : ''}`}>
              <div className="admin-row-head">
                <div>
                  <strong>
                    #{j.id} · {j.title}
                  </strong>{' '}
                  <span className="muted">at {j.company}</span>
                  {j.tier === 'featured' && <span className="badge-featured mono">Featured</span>}
                </div>
                <span className="mono muted">
                  {j.category.emoji} {j.category.name} · {j.location} · {j.job_type} ·{' '}
                  {timeAgo(j.created_at)} · expires {shortDate(j.expires_at)} · {j.status}
                </span>
              </div>
              <details className="admin-desc" open={j.id === requestedJob || undefined}>
                <summary>Description &amp; contact</summary>
                <div className="prose prose-sm">{j.description}</div>
                <p className="mono muted">
                  {j.pay && <>pay: {j.pay} · </>}
                  {j.apply_email && <>email: {j.apply_email} · </>}
                  {j.apply_url && <>link: {j.apply_url}</>}
                </p>
              </details>
              <div className="admin-actions">
                {j.status !== 'approved' && (
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={busyId === j.id}
                    onClick={() => act(j.id, 'approve')}
                  >
                    Approve
                  </button>
                )}
                {j.status === 'pending' && (
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={busyId === j.id}
                    onClick={() => act(j.id, 'reject')}
                  >
                    Reject
                  </button>
                )}
                {j.status === 'approved' && (
                  <>
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={busyId === j.id}
                      onClick={() => act(j.id, j.tier === 'featured' ? 'unfeature' : 'feature')}
                    >
                      {j.tier === 'featured' ? 'Unfeature' : 'Feature'}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={busyId === j.id}
                      onClick={() => act(j.id, 'renew')}
                    >
                      Renew 30d
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={busyId === j.id}
                      onClick={() => act(j.id, 'close')}
                    >
                      Close
                    </button>
                  </>
                )}
                <button
                  className="btn btn-danger btn-sm"
                  disabled={busyId === j.id}
                  onClick={() => act(j.id, 'delete')}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          </ul>
        )}
      </div>
    </div>
  )
}
