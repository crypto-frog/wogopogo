import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { useMeta } from '../MetaContext.jsx'
import { copyText, saveMyPost } from '../util.js'

const EMPTY = {
  title: '',
  company: '',
  category_id: '',
  location: '',
  job_type: '',
  pay: '',
  description: '',
  apply_email: '',
  apply_url: '',
  website: '', // honeypot, humans never see it
}

const FIELD_IDS = {
  title: 'f-title',
  company: 'f-company',
  category_id: 'f-cat',
  location: 'f-loc',
  job_type: 'f-type',
  description: 'f-desc',
  apply_email: 'f-email',
  apply_url: 'f-url',
}

function validate(form) {
  const errors = {}
  if (form.title.trim().length < 3) errors.title = 'Job title needs at least 3 characters.'
  if (form.company.trim().length < 2) errors.company = 'Company name needs at least 2 characters.'
  if (!form.category_id) errors.category_id = 'Choose a category.'
  if (!form.location) errors.location = 'Choose a location.'
  if (!form.job_type) errors.job_type = 'Choose a job type.'
  if (form.description.trim().length < 30)
    errors.description = 'Tell people a bit more, 30 characters minimum.'
  if (form.apply_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.apply_email.trim()))
    errors.apply_email = 'That email address does not look right.'
  if (form.apply_url && !/^https?:\/\/[^\s]+$/i.test(form.apply_url.trim()))
    errors.apply_url = 'Application links must start with http:// or https://'
  if (!form.apply_email.trim() && !form.apply_url.trim())
    errors.apply_email = 'Give applicants an email or a link, at least one.'
  return errors
}

function focusFirstError(errors) {
  const key = Object.keys(FIELD_IDS).find((field) => errors[field])
  if (key) window.requestAnimationFrame(() => document.getElementById(FIELD_IDS[key])?.focus())
}

export default function PostJob() {
  const { meta, metaLoading, metaError, refreshMeta } = useMeta()
  const [form, setForm] = useState(EMPTY)
  const [fieldErrors, setFieldErrors] = useState({})
  const [topError, setTopError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)
  const successHeadingRef = useRef(null)

  useEffect(() => {
    if (result) window.requestAnimationFrame(() => successHeadingRef.current?.focus())
  }, [result])

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
    setFieldErrors((e) => {
      if (!e[key]) return e
      const next = { ...e }
      delete next[key]
      return next
    })
  }

  async function submit(e) {
    e.preventDefault()
    if (submitting) return
    setTopError('')
    const clientErrors = validate(form)
    if (Object.keys(clientErrors).length) {
      setFieldErrors(clientErrors)
      setTopError('Please fix the highlighted fields.')
      focusFirstError(clientErrors)
      return
    }

    const payload = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
    )
    setSubmitting(true)
    try {
      const res = await api.postJob({
        ...payload,
        category_id: Number(payload.category_id) || 0,
      })
      setResult(res)
      saveMyPost({ id: res.id, title: payload.title, token: res.manage_token, ts: Date.now() })
      if (res.status === 'approved') refreshMeta().catch(() => {})
      window.scrollTo(0, 0)
    } catch (err) {
      const errors = err.fields || {}
      setFieldErrors(errors)
      setTopError(err.message || 'Something went wrong. Try again.')
      focusFirstError(errors)
      window.scrollTo(0, 0)
    } finally {
      setSubmitting(false)
    }
  }

  async function copyToken() {
    if (!result) return
    if (await copyText(result.manage_token)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      setTopError('The token could not be copied automatically. Select it and copy it manually.')
    }
  }

  if (result) {
    const pending = result.status === 'pending'
    return (
      <div className="shell page page-narrow">
        <h1 ref={successHeadingRef} className="page-title" tabIndex={-1}>
          {pending ? 'Submitted for review' : 'Your job has surfaced'}
        </h1>
        <p className="lede">
          {pending
            ? 'A human takes a quick look at every listing before it goes live, usually within a day. No further action needed.'
            : 'Your listing is live on the board right now.'}
        </p>

        {topError && (
          <div className="notice notice-err" role="alert">
            {topError}
          </div>
        )}

        <div className="token-box">
          <p>
            <strong>Save your manage token.</strong> It is the only way to close or delete this
            listing later, and it is shown exactly once.
          </p>
          <code className="token-code mono">{result.manage_token}</code>
          <div className="form-actions">
            <button type="button" className="btn btn-primary" onClick={copyToken}>
              {copied ? 'Copied' : 'Copy token'}
            </button>
            <Link className="btn btn-ghost" to={`/jobs/${result.id}/listing?token=${result.manage_token}`}>
              {pending ? 'Preview listing' : 'View listing'}
            </Link>
            <Link className="btn btn-ghost" to={`/manage?id=${result.id}&token=${result.manage_token}`}>
              Manage listing
            </Link>
          </div>
          <p className="muted">
            This browser also remembers it for you on the Manage page, but a copy somewhere safe
            never hurts.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            setResult(null)
            setForm(EMPTY)
            setTopError('')
            setFieldErrors({})
          }}
        >
          Post another job
        </button>
      </div>
    )
  }

  if (metaLoading && !meta) {
    return (
      <div className="shell page page-narrow">
        <h1 className="page-title">Post a job</h1>
        <p className="loading mono" role="status">Preparing the posting form…</p>
      </div>
    )
  }

  if (metaError && !meta) {
    return (
      <div className="shell page page-narrow">
        <h1 className="page-title">Post a job</h1>
        <div className="notice notice-err" role="alert">
          <strong>The posting form could not be loaded.</strong> {metaError.message}
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => refreshMeta().catch(() => {})}
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="shell page page-narrow">
      <h1 className="page-title">Post a job</h1>
      <p className="lede">
        Free, no account needed. Fill this in, get a manage token, done.
        {meta?.require_approval ? ' Listings are reviewed before going live.' : ''}
      </p>

      {topError && (
        <div className="notice notice-err" role="alert">
          {topError}
        </div>
      )}

      <form className="form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="f-title">Job title</label>
          <input
            id="f-title"
            className="input"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            maxLength={90}
            placeholder="e.g. Tasting Room Host"
            required
            aria-invalid={Boolean(fieldErrors.title)}
            aria-describedby={fieldErrors.title ? 'f-title-error' : undefined}
          />
          {fieldErrors.title && <p className="err" id="f-title-error">{fieldErrors.title}</p>}
        </div>

        <div className="field">
          <label htmlFor="f-company">Company or employer</label>
          <input
            id="f-company"
            className="input"
            value={form.company}
            onChange={(e) => set('company', e.target.value)}
            maxLength={90}
            placeholder="e.g. Naramata Bench Cellars"
            required
            aria-invalid={Boolean(fieldErrors.company)}
            aria-describedby={fieldErrors.company ? 'f-company-error' : undefined}
          />
          {fieldErrors.company && <p className="err" id="f-company-error">{fieldErrors.company}</p>}
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="f-cat">Category</label>
            <select
              id="f-cat"
              className="select"
              value={form.category_id}
              onChange={(e) => set('category_id', e.target.value)}
              required
              aria-invalid={Boolean(fieldErrors.category_id)}
              aria-describedby={fieldErrors.category_id ? 'f-cat-error' : undefined}
            >
              <option value="">Choose…</option>
              {(meta?.categories || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
            {fieldErrors.category_id && <p className="err" id="f-cat-error">{fieldErrors.category_id}</p>}
          </div>

          <div className="field">
            <label htmlFor="f-loc">Location</label>
            <select
              id="f-loc"
              className="select"
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              required
              aria-invalid={Boolean(fieldErrors.location)}
              aria-describedby={fieldErrors.location ? 'f-loc-error' : undefined}
            >
              <option value="">Choose…</option>
              {(meta?.locations || []).map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            {fieldErrors.location && <p className="err" id="f-loc-error">{fieldErrors.location}</p>}
          </div>

          <div className="field">
            <label htmlFor="f-type">Job type</label>
            <select
              id="f-type"
              className="select"
              value={form.job_type}
              onChange={(e) => set('job_type', e.target.value)}
              required
              aria-invalid={Boolean(fieldErrors.job_type)}
              aria-describedby={fieldErrors.job_type ? 'f-type-error' : undefined}
            >
              <option value="">Choose…</option>
              {(meta?.job_types || []).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {fieldErrors.job_type && <p className="err" id="f-type-error">{fieldErrors.job_type}</p>}
          </div>
        </div>

        <div className="field">
          <label htmlFor="f-pay">
            Pay <span className="optional">optional, but listings with pay get more applicants</span>
          </label>
          <input
            id="f-pay"
            className="input"
            value={form.pay}
            onChange={(e) => set('pay', e.target.value)}
            maxLength={90}
            placeholder="e.g. $22 to $26 per hour"
          />
        </div>

        <div className="field">
          <label htmlFor="f-desc">Description</label>
          <textarea
            id="f-desc"
            className="textarea"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={9}
            maxLength={6000}
            placeholder={'What the job is, what you are looking for, hours, perks.\n\nPlain text, line breaks are kept.'}
            required
            aria-invalid={Boolean(fieldErrors.description)}
            aria-describedby={fieldErrors.description ? 'f-desc-error' : 'f-desc-count'}
          />
          <div className="field-meta">
            {fieldErrors.description ? (
              <p className="err" id="f-desc-error">{fieldErrors.description}</p>
            ) : (
              <span />
            )}
            <span className="mono" id="f-desc-count">{form.description.length} / 6000</span>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="f-email">
              Application email <span className="optional">either this or a link</span>
            </label>
            <input
              id="f-email"
              className="input"
              type="email"
              value={form.apply_email}
              onChange={(e) => set('apply_email', e.target.value)}
              maxLength={160}
              placeholder="hiring@yourcompany.ca"
              aria-invalid={Boolean(fieldErrors.apply_email)}
              aria-describedby={fieldErrors.apply_email ? 'f-email-error' : undefined}
            />
            {fieldErrors.apply_email && <p className="err" id="f-email-error">{fieldErrors.apply_email}</p>}
          </div>
          <div className="field">
            <label htmlFor="f-url">
              Application link <span className="optional">optional</span>
            </label>
            <input
              id="f-url"
              className="input"
              type="url"
              value={form.apply_url}
              onChange={(e) => set('apply_url', e.target.value)}
              maxLength={400}
              placeholder="https://yourcompany.ca/careers"
              aria-invalid={Boolean(fieldErrors.apply_url)}
              aria-describedby={fieldErrors.apply_url ? 'f-url-error' : undefined}
            />
            {fieldErrors.apply_url && <p className="err" id="f-url-error">{fieldErrors.apply_url}</p>}
          </div>
        </div>

        {/* Honeypot: hidden from people, irresistible to bots */}
        <div className="hp" aria-hidden="true">
          <label htmlFor="f-web">Website</label>
          <input
            id="f-web"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(e) => set('website', e.target.value)}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit listing'}
          </button>
        </div>
      </form>
    </div>
  )
}
