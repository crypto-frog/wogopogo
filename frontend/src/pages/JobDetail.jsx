import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { copyText, parseUtc, shortDate, timeAgo } from '../util.js'
import { SerpentPeek } from '../components/Serpent.jsx'
import AdSlot from '../components/AdSlot.jsx'
import { applySeo, conciseDescription, removeStructuredData, setStructuredData } from '../seo.js'

const EMPLOYMENT_TYPES = {
  'Full-time': 'FULL_TIME',
  'Part-time': 'PART_TIME',
  Contract: 'CONTRACTOR',
  Seasonal: 'TEMPORARY',
  Casual: 'OTHER',
  Internship: 'INTERN',
}

function isoDate(value) {
  return parseUtc(value)?.toISOString()
}

function jobPostingSchema(job) {
  const isRemote = String(job.location).toLowerCase().startsWith('remote')
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    identifier: {
      '@type': 'PropertyValue',
      name: 'Wogopogo',
      value: String(job.id),
    },
    datePosted: isoDate(job.created_at),
    validThrough: isoDate(job.expires_at),
    employmentType: EMPLOYMENT_TYPES[job.job_type] || job.job_type,
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company,
    },
    url: `https://wogopogo.ca/job/${job.id}`,
  }

  if (isRemote) {
    schema.jobLocationType = 'TELECOMMUTE'
    schema.applicantLocationRequirements = {
      '@type': 'Country',
      name: 'Canada',
    }
  } else {
    schema.jobLocation = {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.location,
        addressRegion: 'BC',
        addressCountry: 'CA',
      },
    }
  }

  return schema
}

export default function JobDetail() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const token = params.get('token') || ''

  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [shareError, setShareError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    api
      .getJob(id, token)
      .then((d) => {
        if (!alive) return
        setJob(d.job)
        setLoading(false)

        const expiry = parseUtc(d.job.expires_at)
        const isLive =
          d.job.status === 'approved' && expiry && expiry.getTime() > Date.now()
        const pathname = `/job/${d.job.id}`
        const description = conciseDescription(
          `${d.job.title} at ${d.job.company} in ${d.job.location}. ${d.job.description}`
        )

        applySeo({
          title: `${d.job.title} at ${d.job.company} | Wogopogo`,
          description,
          pathname,
          robots: isLive
            ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
            : 'noindex, nofollow',
          type: 'article',
        })

        if (isLive) {
          setStructuredData('wogo-job-posting', jobPostingSchema(d.job))
        } else {
          removeStructuredData('wogo-job-posting')
        }
      })
      .catch((e) => {
        if (!alive) return
        setError(e)
        setLoading(false)
        removeStructuredData('wogo-job-posting')
        applySeo({
          title: 'Job Listing Not Found | Wogopogo',
          description: 'This Wogopogo job listing is no longer available.',
          pathname: `/job/${id}`,
          robots: 'noindex, nofollow',
        })
      })
    return () => {
      alive = false
    }
  }, [id, token])

  async function share() {
    setShareError('')
    const url = `${window.location.origin}/job/${id}`
    if (await copyText(url)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      setShareError('The link could not be copied automatically. Copy it from your address bar.')
    }
  }

  if (loading) {
    return (
      <div className="shell page">
        <p className="loading mono">Scanning the lake…</p>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="shell page empty">
        <SerpentPeek />
        <h1>Gone below the surface</h1>
        <p className="muted">
          {error?.message || 'This listing could not be found.'} It may have been filled,
          expired, or removed.
        </p>
        <Link to="/" className="btn btn-primary">
          Back to all jobs
        </Link>
      </div>
    )
  }

  const expiry = parseUtc(job.expires_at)
  const isExpired = job.status === 'approved' && (!expiry || expiry.getTime() <= Date.now())
  const isLive = job.status === 'approved' && !isExpired
  const isPreview = !isLive
  const showApplicationDetails = isLive || job.status === 'pending'
  const statusLabel = isExpired ? 'expired' : job.status

  return (
    <div className="shell page detail">
      <Link to="/" className="back-link mono">
        ← All jobs
      </Link>

      {isPreview && (
        <div className="notice notice-ok">
          <strong>{job.status === 'pending' ? 'Preview.' : 'Applications closed.'}</strong>{' '}
          This listing is {job.status === 'pending' ? 'awaiting review' : statusLabel}
          {job.status === 'pending' ? ' and only visible to you through this link.' : '.'}
        </div>
      )}

      <div className="detail-head">
        <span className="card-cat">
          <span aria-hidden="true">{job.category.emoji}</span> {job.category.name}
        </span>
        {job.tier === 'featured' && <span className="badge-featured mono">Featured</span>}
      </div>

      <h1 className="page-title">{job.title}</h1>
      <p className="detail-company">{job.company}</p>
      <p className="detail-meta mono">
        {job.location} <span className="dot">·</span> {job.job_type}
        {job.pay && (
          <>
            {' '}
            <span className="dot">·</span> {job.pay}
          </>
        )}
        <span className="dot">·</span> posted {timeAgo(job.created_at)}
        <span className="dot">·</span> open until {shortDate(job.expires_at)}
      </p>

      <div className="detail-body">
        <div className="prose">{job.description}</div>

        <aside className="apply-card">
          <h2>{isLive ? 'Apply' : job.status === 'pending' ? 'Application preview' : 'Listing closed'}</h2>
          <div className="apply-actions">
            {showApplicationDetails && job.apply_email && (
                <a
                  className="btn btn-primary"
                  href={`mailto:${job.apply_email}?subject=${encodeURIComponent(
                    'Application: ' + job.title
                  )}`}
                >
                  Apply by email
                </a>
              )}
            {showApplicationDetails && job.apply_url && (
                <a className="btn btn-primary" href={job.apply_url} target="_blank" rel="noopener noreferrer">
                  Apply online ↗
                </a>
              )}
            <button type="button" className="btn btn-ghost" onClick={share}>
              {copied ? 'Link copied' : 'Copy link'}
            </button>
          </div>
          <p className="apply-note muted">
            {isLive
              ? 'Wogopogo never handles applications. You deal directly with the employer.'
              : job.status === 'pending'
                ? 'These application details will become public only after approval.'
                : 'This listing is no longer accepting applications.'}
          </p>
          {shareError && <p className="err" role="alert">{shareError}</p>}
        </aside>
      </div>

      <AdSlot slot="detail" />
    </div>
  )
}
