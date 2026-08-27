import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { SerpentMark } from './Serpent.jsx'
import { TINTS } from '../theme.js'

export default function Header({ theme, tint, onToggleTheme, onTintChange }) {
  const [tintMenuOpen, setTintMenuOpen] = useState(false)
  const tintMenuRef = useRef(null)
  const tintTriggerRef = useRef(null)
  const selectedTintRef = useRef(null)
  const activeTint = TINTS.find((option) => option.id === tint) || TINTS[0]

  useEffect(() => {
    if (!tintMenuOpen) return undefined

    window.requestAnimationFrame(() => selectedTintRef.current?.focus())

    function closeOnOutsidePress(event) {
      if (!tintMenuRef.current?.contains(event.target)) setTintMenuOpen(false)
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setTintMenuOpen(false)
        window.requestAnimationFrame(() => tintTriggerRef.current?.focus())
      }
    }

    document.addEventListener('pointerdown', closeOnOutsidePress)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [tintMenuOpen])

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link to="/" className="brand" aria-label="Wogopogo home">
          <span className="brand-mark">
            <SerpentMark size={30} />
          </span>
          <span className="brand-word">Wogopogo</span>
        </Link>

        <nav className="nav" aria-label="Main">
          <NavLink to="/" end className="nav-link">
            Browse
          </NavLink>
          <NavLink to="/manage" className="nav-link nav-link-quiet">
            Manage
          </NavLink>
          <div className="tint-menu" ref={tintMenuRef}>
            <button
              ref={tintTriggerRef}
              type="button"
              className="tint-trigger"
              onClick={() => setTintMenuOpen((open) => !open)}
              aria-label={`Choose colour tint. Current tint: ${activeTint.name}`}
              aria-expanded={tintMenuOpen}
              aria-controls="tint-picker"
              title="Colour tint"
            >
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true">
                <path
                  d="M12 3.5c-3.8 4.1-6 7-6 10A6 6 0 0 0 18 13.5c0-3-2.2-5.9-6-10Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="tint-trigger-swatch" style={{ backgroundColor: activeTint.swatch }} />
            </button>

            {tintMenuOpen && (
              <div id="tint-picker" className="tint-popover" role="dialog" aria-label="Colour tint">
                <div className="tint-popover-head">
                  <div>
                    <strong>Colour tint</strong>
                    <span>Applied across the whole interface</span>
                  </div>
                  <button
                    type="button"
                    className="tint-close"
                    onClick={() => {
                      setTintMenuOpen(false)
                      window.requestAnimationFrame(() => tintTriggerRef.current?.focus())
                    }}
                    aria-label="Close colour tint chooser"
                  >
                    ×
                  </button>
                </div>
                <div className="tint-options" role="radiogroup" aria-label="Choose a colour tint">
                  {TINTS.map((option) => (
                    <label
                      key={option.id}
                      className={'tint-option' + (option.id === tint ? ' tint-option-active' : '')}
                    >
                      <input
                        ref={option.id === tint ? selectedTintRef : null}
                        className="tint-radio"
                        type="radio"
                        name="wogo-tint"
                        value={option.id}
                        checked={option.id === tint}
                        onChange={() => onTintChange(option.id)}
                      />
                      <span className="tint-swatch" style={{ backgroundColor: option.swatch }} />
                      <span>{option.name}</span>
                      {option.id === tint && <span className="tint-check" aria-hidden="true">✓</span>}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            className="theme-toggle"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="4.4" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true">
                <path
                  d="M20 13.6A8.2 8.2 0 0 1 10.4 4a8.2 8.2 0 1 0 9.6 9.6Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
          <Link to="/post" className="btn btn-primary">
            Post a job
          </Link>
        </nav>
      </div>
    </header>
  )
}
