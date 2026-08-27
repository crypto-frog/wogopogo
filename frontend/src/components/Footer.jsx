import { Link } from 'react-router-dom'
import { SerpentMark } from './Serpent.jsx'

export default function Footer() {
  return (
    <footer className="site-footer">
      <svg viewBox="0 0 640 20" className="footer-wave" aria-hidden="true" preserveAspectRatio="none">
        <path
          d="M0 10 Q40 4 80 10 T160 10 T240 10 T320 10 T400 10 T480 10 T560 10 T640 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          opacity="0.3"
        />
      </svg>
      <div className="shell footer-inner">
        <div className="footer-about">
          <span className="footer-mark">
            <SerpentMark size={22} />
          </span>
          <p className="muted">
            Wogopogo is a free community job board for the Okanagan Valley, from Osoyoos to
            Salmon Arm. Listings are posted by local employers and reviewed before they surface.
          </p>
        </div>
        <nav className="footer-links" aria-label="Footer">
          <Link to="/post">Post a job</Link>
          <Link to="/manage">Manage a listing</Link>
          {/* Add a real advertising contact or pricing link here when it is configured.
              The placeholder is intentionally not shown in production. */}
          <Link to="/admin" className="footer-admin">
            Admin
          </Link>
        </nav>
      </div>
      <p className="shell footer-fine mono">Built in the Okanagan · keep an eye on the water</p>
    </footer>
  )
}
