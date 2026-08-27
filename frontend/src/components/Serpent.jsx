/**
 * The Wogopogo serpent, in three sizes.
 * All strokes use currentColor so the mark follows the theme.
 */

export function SerpentMark({ size = 30 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="serpent-mark"
    >
      <path
        d="M4 32 A6.5 6.5 0 0 1 17 32 M20 32 A5 5 0 0 1 30 32"
        stroke="currentColor"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <path
        d="M33.5 32 C33.5 24.5 35 20.5 39 19.3"
        stroke="currentColor"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <circle cx="40" cy="17.6" r="3.7" fill="currentColor" />
      <circle cx="41.3" cy="16.7" r="1" className="serpent-eye" />
      <path
        d="M1 32 H2 M45 32 H47"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  )
}

/** Wide animated waterline for the home hero. Bobs gently, ripples spread. */
export function Lakeline() {
  return (
    <svg
      viewBox="0 0 640 90"
      className="lakeline"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* the water surface */}
      <path
        d="M0 62 Q40 58 80 62 T160 62 T240 62 T320 62 T400 62 T480 62 T560 62 T640 62"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.28"
      />
      {/* ripples around the sighting */}
      <g className="lake-ripples" opacity="0.35">
        <ellipse cx="200" cy="63" rx="86" ry="5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <ellipse cx="200" cy="63" rx="130" ry="7" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      </g>
      {/* the serpent, mid-surface */}
      <g className="lake-serpent">
        <path
          d="M120 62 A17 17 0 0 1 154 62 M162 62 A13 13 0 0 1 188 62"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M197 62 C197 44 201 35 211 32"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <circle cx="214" cy="28.5" r="8" fill="currentColor" />
        <circle cx="217" cy="26.5" r="2" className="serpent-eye" />
      </g>
      {/* evening glints on the water */}
      <g className="lake-glints" fill="currentColor">
        <circle cx="330" cy="52" r="1.6" opacity="0.5" />
        <circle cx="405" cy="45" r="1.2" opacity="0.35" />
        <circle cx="470" cy="55" r="1.8" opacity="0.45" />
        <circle cx="545" cy="47" r="1.2" opacity="0.3" />
        <circle cx="600" cy="56" r="1.5" opacity="0.4" />
        <circle cx="60" cy="50" r="1.3" opacity="0.35" />
      </g>
    </svg>
  )
}

/** Just the eyes above the surface, for empty states. */
export function SerpentPeek() {
  return (
    <svg viewBox="0 0 160 70" width="160" height="70" aria-hidden="true" className="serpent-peek">
      <path
        d="M6 52 Q30 48 54 52 T102 52 T150 52"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.3"
      />
      <path
        d="M62 52 C62 40 66 33 80 33 C94 33 98 40 98 52"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="73" cy="41" r="2.4" fill="currentColor" />
      <circle cx="87" cy="41" r="2.4" fill="currentColor" />
    </svg>
  )
}
