import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { useMeta } from '../MetaContext.jsx'
import { Lakeline, SerpentPeek } from '../components/Serpent.jsx'
import JobCard, { JobCardSkeleton } from '../components/JobCard.jsx'
import AdSlot from '../components/AdSlot.jsx'

export default function Home() {
  const { meta, metaError, refreshMeta } = useMeta()
  const [params, setParams] = useSearchParams()

  const q = params.get('q') || ''
  const cat = params.get('cat') || ''
  const loc = params.get('loc') || ''
  const type = params.get('type') || ''
  const rawPage = Number.parseInt(params.get('page') || '1', 10)
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1

  const [searchInput, setSearchInput] = useState(q)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const debounceRef = useRef(null)
  const resultsHeadingRef = useRef(null)
  const lastLoadedPageRef = useRef(page)

  // Keep the input in sync when filters are cleared elsewhere
  useEffect(() => {
    setSearchInput(q)
  }, [q])

  const updateParams = useCallback(
    (changes, { resetPage = true } = {}) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value)
            else next.delete(key)
          }
          if (resetPage) next.delete('page')
          return next
        },
        { replace: true }
      )
    },
    [setParams]
  )

  function onSearchChange(value) {
    setSearchInput(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateParams({ q: value.trim() })
    }, 350)
  }

  function submitSearch(event) {
    event.preventDefault()
    clearTimeout(debounceRef.current)
    updateParams({ q: searchInput.trim() })
  }

  function clearFilters() {
    clearTimeout(debounceRef.current)
    setSearchInput('')
    setParams({}, { replace: true })
  }

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    api
      .listJobs({ search: q, category: cat, location: loc, type, page })
      .then((d) => {
        if (!alive) return
        setData(d)
        setLoading(false)
      })
      .catch((e) => {
        if (!alive) return
        setError(e)
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [q, cat, loc, type, page])

  useEffect(() => {
    if (loading || !data || data.page === lastLoadedPageRef.current) return
    lastLoadedPageRef.current = data.page
    window.requestAnimationFrame(() => {
      resultsHeadingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      resultsHeadingRef.current?.focus({ preventScroll: true })
    })
  }, [data, loading])

  const hasFilters = Boolean(q || cat || loc || type)
  const categories = meta?.categories || []

  return (
    <>
      <section className="hero">
        <div className="shell">
          <p className="hero-eyebrow mono">Okanagan Valley · free job board</p>
          <h1 className="hero-title">Local jobs.</h1>
          <p className="hero-sub">
            Find work, or find your next hire, anywhere from Osoyoos to Salmon Arm.
            Employer postings and opportunities selected from public careers sites, all in one local board.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/post">Post a job for free</Link>
            <a className="community-link" href="#home-guide-title">How listings are checked</a>
          </div>
          <form className="searchbar" role="search" onSubmit={submitSearch}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="search-icon">
              <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M16 16 L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search jobs, companies, keywords…"
              aria-label="Search jobs"
            />
            {searchInput && (
              <button
                type="button"
                className="search-clear"
                onClick={() => {
                  clearTimeout(debounceRef.current)
                  setSearchInput('')
                  updateParams({ q: '' })
                }}
                aria-label="Clear job search"
              >
                ×
              </button>
            )}
          </form>
        </div>
        <Lakeline />
      </section>

      <section className="shell listing-section">
        {metaError && (
          <div className="notice notice-err filter-notice" role="status">
            <span>Some filters are temporarily unavailable.</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => refreshMeta().catch(() => {})}
            >
              Retry filters
            </button>
          </div>
        )}
        <div className="chiprow" role="group" aria-label="Filter by category">
          <button
            type="button"
            className={'chip' + (!cat ? ' chip-active' : '')}
            aria-pressed={!cat}
            onClick={() => updateParams({ cat: '' })}
          >
            All jobs
          </button>
          {categories.map((c) => (
            <button
              key={c.slug}
              type="button"
              className={'chip' + (cat === c.slug ? ' chip-active' : '')}
              aria-pressed={cat === c.slug}
              onClick={() => updateParams({ cat: cat === c.slug ? '' : c.slug })}
            >
              <span aria-hidden="true">{c.emoji}</span> {c.name}
              {c.jobs > 0 && <span className="chip-count">{c.jobs}</span>}
            </button>
          ))}
        </div>

        <div className="filterbar">
          <select
            className="select"
            value={loc}
            onChange={(e) => updateParams({ loc: e.target.value })}
            aria-label="Filter by location"
          >
            <option value="">All locations</option>
            {(meta?.locations || []).map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={type}
            onChange={(e) => updateParams({ type: e.target.value })}
            aria-label="Filter by job type"
          >
            <option value="">All job types</option>
            {(meta?.job_types || []).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {hasFilters && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                clearFilters()
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading-results" aria-live="polite" aria-busy="true">
            <p className="loading mono">Loading local jobs…</p>
            <div className="grid">
              {Array.from({ length: 6 }, (_, index) => (
                <JobCardSkeleton key={index} />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="notice notice-err">
            <strong>Could not load listings.</strong> {error.message}
            {metaError ? ' The API may be unreachable, see the README for local setup.' : ''}
          </div>
        ) : data && data.jobs.length === 0 ? (
          <div className="empty">
            <SerpentPeek />
            <h2>{hasFilters ? 'No jobs match these filters' : 'The board is ready for its first listing'}</h2>
            <p className="muted">
              {hasFilters
                ? 'Nothing matches those filters. Cast a wider net.'
                : 'Wogopogo is open to Okanagan employers. Posting is free, requires no account, and every listing is reviewed before it appears.'}
            </p>
            {!hasFilters && (
              <Link className="btn btn-primary" to="/post">
                Post a job for free
              </Link>
            )}
          </div>
        ) : data ? (
          <>
            <h2
              ref={resultsHeadingRef}
              className="results-meta mono"
              aria-live="polite"
              tabIndex={-1}
            >
              {data.total} {data.total === 1 ? 'job' : 'jobs'}
              {hasFilters ? ' matching these filters' : ' on the board'}
            </h2>
            <div className="grid">
              {data.jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
            {data.total_pages > 1 && (
              <div className="pager">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={data.page <= 1}
                  onClick={() => updateParams({ page: String(data.page - 1) }, { resetPage: false })}
                >
                  ← Newer
                </button>
                <span className="pager-info mono">
                  Page {data.page} of {data.total_pages}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={data.page >= data.total_pages}
                  onClick={() => updateParams({ page: String(data.page + 1) }, { resetPage: false })}
                >
                  Older →
                </button>
              </div>
            )}
          </>
        ) : null}

        <AdSlot slot="home" />
      </section>

      <section className="home-guide" aria-labelledby="home-guide-title">
        <div className="shell">
          <p className="mono home-guide-kicker">How Wogopogo works</p>
          <h2 id="home-guide-title">Local opportunities. Clear sources.</h2>
          <p className="home-guide-intro">
            Wogopogo brings together employer submissions and selected openings from public
            job boards and employers’ own careers pages. Browse without an account and
            follow each listing to the original application route.
          </p>
          <div className="home-guide-grid">
            <article>
              <h3>Know where a job comes from</h3>
              <p>Sourced listings credit the publisher, link to the original posting, and show the last source check. Our short summaries help you compare local roles.</p>
            </article>
            <article>
              <h3>Checked regularly</h3>
              <p>We review sources every five days, update verified deadlines, and take down jobs confirmed closed. Read the original posting for full requirements and the latest availability.</p>
            </article>
            <article>
              <h3>Built for local employers, too</h3>
              <p>You can post here directly for free. No account is needed, applications go to you, and your private management link lets you close a filled role.</p>
            </article>
          </div>
          <div className="employer-invite">
            <div>
              <h3>Hiring in the Okanagan or Shuswap?</h3>
              <p>Add your opening to the community board. Every submission is reviewed before it appears.</p>
            </div>
            <Link className="btn btn-primary" to="/post">Post your opening</Link>
          </div>
        </div>
      </section>
    </>
  )
}
