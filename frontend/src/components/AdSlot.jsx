/**
 * Monetization hook: ad placements.
 *
 * This component renders nothing until you flip window.WOGO_ADS_ENABLED
 * to true in index.html. When you are ready to run ads:
 *   1. Paste your ad network snippet (AdSense etc.) below, or swap this
 *      div for the network's component.
 *   2. Set window.WOGO_ADS_ENABLED = true in index.html.
 * Placements already wired up: under the home results and on the job
 * detail page. Add more <AdSlot /> instances wherever you like.
 */
export default function AdSlot({ slot = 'inline' }) {
  if (typeof window === 'undefined' || !window.WOGO_ADS_ENABLED) return null
  return (
    <div className={`ad-slot ad-slot-${slot}`} aria-label="Advertisement">
      <span className="mono muted">Ad space · {slot}</span>
      {/* Your ad code goes here */}
    </div>
  )
}
