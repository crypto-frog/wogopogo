import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { loadMyPosts, removeMyPost } from '../util.js'
import { useMeta } from '../MetaContext.jsx'

export default function Manage() {
  const [params, setParams] = useSearchParams()
  const queryId = params.get('id') || ''
  const queryToken = params.get('token') || ''
  const [jobId, setJobId] = useState(queryId)
  const [token, setToken] = useState(queryToken)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null) // { kind: 'ok' | 'err', text }
  const [myPosts, setMyPosts] = useState(loadMyPosts)
  const { refreshMeta } = useMeta()

  useEffect(() => {
    setJobId(queryId)
    setToken(queryToken)
  }, [queryId, queryToken])

  async function act(action) {
    if (!jobId || !token) {
      setNotice({ kind: 'err', text: 'Enter the listing number and its manage token first.' })
      return
    }
    if (action === 'delete' && !window.confirm('Delete this listing for good? This cannot be undone.')) {
      return
    }
    if (action === 'close' && !window.confirm('Mark this listing as filled and take it off the board?')) {
      return
    }
    setBusy(true)
    setNotice(null)
    try {
      await api.manageJob(jobId, token.trim(), action)
      refreshMeta().catch(() => {})
      if (action === 'delete') {
        removeMyPost(Number(jobId))
        setMyPosts(loadMyPosts())
        setJobId('')
        setToken('')
        setParams({}, { replace: true })
        setNotice({ kind: 'ok', text: 'Listing deleted. Thanks for keeping the board tidy.' })
      } else {
        setNotice({ kind: 'ok', text: 'Listing marked as filled. Congratulations on the hire!' })
      }
    } catch (e) {
      setNotice({ kind: 'err', text: e.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="shell page page-narrow">
      <h1 className="page-title">Manage a listing</h1>
      <p className="lede">
        Use the manage token you received when posting. Position filled? Close the listing.
        Posted by mistake? Delete it.
      </p>

      {notice && (
        <div className={`notice ${notice.kind === 'ok' ? 'notice-ok' : 'notice-err'}`} role="alert">
          {notice.text}
        </div>
      )}

      <div className="form" aria-busy={busy}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="m-id">Listing number</label>
            <input
              id="m-id"
              className="input"
              inputMode="numeric"
              value={jobId}
              onChange={(e) => setJobId(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 42"
            />
          </div>
          <div className="field">
            <label htmlFor="m-token">Manage token</label>
            <input
              id="m-token"
              className="input mono"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="the token from your confirmation"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck="false"
            />
          </div>
        </div>
        <div className="form-actions">
          {jobId ? (
            <Link
              className="btn btn-ghost"
              to={`/job/${jobId}${token ? `?token=${encodeURIComponent(token.trim())}` : ''}`}
            >
              View listing
            </Link>
          ) : (
            <button type="button" className="btn btn-ghost" disabled>
              View listing
            </button>
          )}
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => act('close')}>
            Mark as filled
          </button>
          <button type="button" className="btn btn-danger" disabled={busy} onClick={() => act('delete')}>
            Delete listing
          </button>
        </div>
      </div>

      {myPosts.length > 0 && (
        <div className="mypost-block">
          <h2>Posted from this browser</h2>
          <ul className="mypost-list">
            {myPosts.map((p) => (
              <li key={p.id} className="mypost-item">
                <span>
                  <strong>#{p.id}</strong> {p.title}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setJobId(String(p.id))
                    setToken(p.token)
                    setNotice(null)
                    window.scrollTo(0, 0)
                  }}
                >
                  Fill in details
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
