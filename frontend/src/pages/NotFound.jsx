import { Link } from 'react-router-dom'
import { SerpentPeek } from '../components/Serpent.jsx'

export default function NotFound() {
  return (
    <div className="shell page empty">
      <SerpentPeek />
      <h1>404, as elusive as the lake monster</h1>
      <p className="muted">This page does not exist, or it slipped back under the surface.</p>
      <Link to="/" className="btn btn-primary">
        Back to the board
      </Link>
    </div>
  )
}
