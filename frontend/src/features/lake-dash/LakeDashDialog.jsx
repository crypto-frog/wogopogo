import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LAKE_DASH_PAD_COUNT,
  LAKE_DASH_SECONDS,
  nextTarget,
  pointsForHit,
  targetLifetime,
} from './lakeDashLogic.js'

const BEST_KEY = 'wogo-lake-dash-best'

function readBest() {
  try {
    const value = Number(localStorage.getItem(BEST_KEY))
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
  } catch {
    return 0
  }
}

function writeBest(value) {
  try {
    localStorage.setItem(BEST_KEY, String(value))
  } catch {
    // A blocked local store never prevents play.
  }
}

function resultLine(score, best) {
  if (score === 0) return 'The lake was unusually quiet. Try another sweep.'
  if (score < 100) return 'A few quick sightings. The rhythm is there.'
  if (score < 220) return 'Sharp eyes. Wogopogo barely had time to dive.'
  if (score < 380) return 'A legendary lap around the lake.'
  return score >= best ? 'New local best. The lake has a new lookout.' : 'That was seriously quick.'
}

export default function LakeDashDialog({ onClose }) {
  const dialogRef = useRef(null)
  const startButtonRef = useRef(null)
  const boardRef = useRef(null)
  const closeRef = useRef(onClose)
  const restartRef = useRef(() => {})
  const endTimeRef = useRef(0)

  const [phase, setPhase] = useState('ready')
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(readBest)
  const [combo, setCombo] = useState(0)
  const [hits, setHits] = useState(0)
  const [timeLeft, setTimeLeft] = useState(LAKE_DASH_SECONDS)
  const [target, setTarget] = useState(() => nextTarget(-1))
  const [lastHit, setLastHit] = useState(-1)

  closeRef.current = onClose

  useEffect(() => {
    const page = Array.from(document.querySelectorAll('.site-header, .site-main, .site-footer'))
    const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    page.forEach((element) => { element.inert = true })

    const focusable = () => Array.from(dialogRef.current?.querySelectorAll(
      'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    ) || []).filter((element) => !element.hidden)

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
        return
      }
      if (event.key.toLowerCase() === 'r') {
        event.preventDefault()
        restartRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const elements = focusable()
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (!first || !last) {
        event.preventDefault()
        dialogRef.current?.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const focusFrame = window.requestAnimationFrame(() => startButtonRef.current?.focus())
    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', onKeyDown)
      page.forEach((element) => { element.inert = false })
      document.body.style.overflow = previousOverflow
      previousActive?.focus()
    }
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return undefined
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, (endTimeRef.current - performance.now()) / 1000)
      setTimeLeft(remaining)
      if (remaining <= 0) setPhase('finished')
    }, 50)
    return () => window.clearInterval(timer)
  }, [phase])

  useEffect(() => {
    if (phase !== 'playing') return undefined
    const dive = window.setTimeout(() => {
      endTimeRef.current -= 450
      setCombo(0)
      setTarget((current) => nextTarget(current))
      setLastHit(-1)
    }, targetLifetime(hits))
    return () => window.clearTimeout(dive)
  }, [hits, phase, target])

  useEffect(() => {
    if (phase !== 'finished') return
    if (score > best) {
      setBest(score)
      writeBest(score)
    }
    window.requestAnimationFrame(() => startButtonRef.current?.focus())
  }, [best, phase, score])

  const startGame = useCallback(() => {
    setScore(0)
    setCombo(0)
    setHits(0)
    setTimeLeft(LAKE_DASH_SECONDS)
    setLastHit(-1)
    setTarget((current) => nextTarget(current))
    endTimeRef.current = performance.now() + LAKE_DASH_SECONDS * 1000
    setPhase('playing')
    window.requestAnimationFrame(() => boardRef.current?.querySelector('[data-pad]')?.focus())
  }, [])

  restartRef.current = startGame

  const choosePad = useCallback((index) => {
    if (phase !== 'playing') return
    if (index !== target) {
      endTimeRef.current -= 650
      setCombo(0)
      setLastHit(-1)
      return
    }

    setScore((current) => current + pointsForHit(combo))
    setCombo((current) => current + 1)
    setHits((current) => current + 1)
    setLastHit(index)
    endTimeRef.current = Math.min(
      performance.now() + 35000,
      endTimeRef.current + Math.min(260, 100 + combo * 12)
    )
    setTarget((current) => nextTarget(current))
  }, [combo, phase, target])

  function moveFocus(event) {
    const button = event.target.closest('[data-pad]')
    if (!button) return
    const index = Number(button.dataset.pad)
    let next = index
    if (event.key === 'ArrowRight') next = (index + 1) % LAKE_DASH_PAD_COUNT
    else if (event.key === 'ArrowLeft') next = (index + LAKE_DASH_PAD_COUNT - 1) % LAKE_DASH_PAD_COUNT
    else if (event.key === 'ArrowDown') next = (index + 4) % LAKE_DASH_PAD_COUNT
    else if (event.key === 'ArrowUp') next = (index + LAKE_DASH_PAD_COUNT - 4) % LAKE_DASH_PAD_COUNT
    else return
    event.preventDefault()
    boardRef.current?.querySelector(`[data-pad="${next}"]`)?.focus()
  }

  const displayBest = Math.max(best, score)
  const status = phase === 'playing'
    ? `${Math.ceil(timeLeft)} seconds. Score ${score}. Combo ${combo}.`
    : phase === 'finished'
      ? `Run complete. Score ${score}. Best ${displayBest}.`
      : 'Ready to play Lake Dash.'

  return (
    <div
      className="lake-dash-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className="lake-dash-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lake-dash-title"
        aria-describedby="lake-dash-description"
        tabIndex={-1}
      >
        <header className="lake-dash-header">
          <div className="lake-dash-wordmark">
            <span className="lake-dash-mini-mark" aria-hidden="true"><i /><i /></span>
            <span>
              <strong id="lake-dash-title">Lake Dash</strong>
              <small>30-second Wogopogo spotting run</small>
            </span>
          </div>
          <button type="button" className="lake-dash-close" onClick={onClose} aria-label="Close Lake Dash">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" /></svg>
          </button>
        </header>

        <p id="lake-dash-description" className="lake-dash-sr-only">
          Spot Wogopogo in the four by four lake grid before it dives. Correct sightings build a combo. Wrong guesses cost time.
        </p>

        <section className="lake-dash-hud" aria-label="Lake Dash score">
          <div><span>Score</span><strong>{String(score).padStart(3, '0')}</strong></div>
          <div><span>Best</span><strong>{String(displayBest).padStart(3, '0')}</strong></div>
          <div><span>Combo</span><strong>{combo > 1 ? `×${combo}` : '—'}</strong></div>
          <div className="lake-dash-timer"><span>Lake time</span><strong>{Math.ceil(timeLeft)}s</strong><i><b style={{ width: `${Math.min(100, timeLeft / LAKE_DASH_SECONDS * 100)}%` }} /></i></div>
        </section>

        <div className="lake-dash-stage" data-phase={phase}>
          <div
            ref={boardRef}
            className="lake-dash-board"
            role="group"
            aria-label="Lake grid. Use arrow keys to move and Enter or Space to spot."
            onKeyDown={moveFocus}
          >
            {Array.from({ length: LAKE_DASH_PAD_COUNT }, (_, index) => {
              const active = phase === 'playing' && index === target
              const splash = index === lastHit
              return (
                <button
                  key={index}
                  type="button"
                  data-pad={index}
                  className={`lake-dash-pad${active ? ' is-target' : ''}${splash ? ' was-hit' : ''}`}
                  aria-label={`Lake patch ${index + 1}${active ? ', Wogopogo is here' : ''}`}
                  onClick={() => choosePad(index)}
                >
                  <span className="lake-dash-rings" aria-hidden="true"><i /><i /></span>
                  {active && <span className="lake-dash-wogo" aria-hidden="true"><i /><b /><b /></span>}
                </button>
              )
            })}
          </div>

          {phase !== 'playing' && (
            <div className="lake-dash-overlay-card">
              <span className="lake-dash-kicker">ONE TAP · QUICK EYES</span>
              <h2>{phase === 'finished' ? 'Back below the surface.' : 'Spot it before it dives.'}</h2>
              <p>
                {phase === 'finished'
                  ? resultLine(score, displayBest)
                  : 'Follow the glowing ripples and tap Wogopogo. Every clean sighting builds your combo; empty water costs time.'}
              </p>
              {phase === 'finished' && (
                <div className="lake-dash-result">
                  <span><small>Score</small><strong>{score}</strong></span>
                  <span><small>Best</small><strong>{displayBest}</strong></span>
                  <span><small>Sightings</small><strong>{hits}</strong></span>
                </div>
              )}
              <button ref={startButtonRef} type="button" className="lake-dash-start" onClick={startGame}>
                {phase === 'finished' ? 'Dash again' : 'Start spotting'} <span aria-hidden="true">→</span>
              </button>
              <small>Tap · click · arrow keys · Enter · Space</small>
            </div>
          )}
        </div>

        <footer className="lake-dash-footer">
          <span><kbd>R</kbd> restart <i>·</i> <kbd>Esc</kbd> close</span>
          <span>No account. No network. Local best only.</span>
        </footer>
        <p className="lake-dash-sr-only" aria-live="polite" aria-atomic="true">{status}</p>
      </div>
    </div>
  )
}
