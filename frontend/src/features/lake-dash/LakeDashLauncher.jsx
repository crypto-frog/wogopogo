import { lazy, Suspense, useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './lake-dash.css'

const loadLakeDash = () => import('./LakeDashDialog.jsx')
const LazyLakeDash = lazy(loadLakeDash)

function LoadingGame({ onClose }) {
  return (
    <div className="lake-dash-backdrop">
      <div className="lake-dash-loading" role="dialog" aria-modal="true" aria-label="Loading Lake Dash">
        <span className="lake-dash-loading-ripple" aria-hidden="true" />
        <strong>Lake Dash</strong>
        <span>Finding Wogopogo…</span>
        <button type="button" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}

export default function LakeDashLauncher() {
  const [open, setOpen] = useState(false)
  const launcherRef = useRef(null)

  const close = useCallback(() => {
    setOpen(false)
    window.requestAnimationFrame(() => launcherRef.current?.focus())
  }, [])

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        className="lake-dash-launcher"
        aria-label="Play Lake Dash"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Play Lake Dash"
        onClick={() => setOpen(true)}
        onPointerEnter={() => { void loadLakeDash() }}
        onFocus={() => { void loadLakeDash() }}
      >
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <ellipse className="lake-dash-launcher-ring ring-one" cx="16" cy="21" rx="11" ry="4" />
          <ellipse className="lake-dash-launcher-ring ring-two" cx="16" cy="21" rx="7" ry="2.4" />
          <path className="lake-dash-launcher-creature" d="M12 21c0-5 1.8-8.2 5.5-8.2 2.7 0 4.5 1.7 4.5 4.6" />
          <circle className="lake-dash-launcher-head" cx="22.2" cy="11.3" r="3.1" />
          <circle className="lake-dash-launcher-eye" cx="23.2" cy="10.4" r=".8" />
        </svg>
        <span className="lake-dash-launcher-spark" aria-hidden="true" />
      </button>
      {open && createPortal(
        <Suspense fallback={<LoadingGame onClose={close} />}>
          <LazyLakeDash onClose={close} />
        </Suspense>,
        document.body
      )}
    </>
  )
}
