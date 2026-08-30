export const LAKE_DASH_PAD_COUNT = 16
export const LAKE_DASH_SECONDS = 30

export function nextTarget(current, random = Math.random) {
  if (!Number.isInteger(current) || current < 0 || current >= LAKE_DASH_PAD_COUNT) {
    return Math.floor(random() * LAKE_DASH_PAD_COUNT)
  }
  const candidate = Math.floor(random() * (LAKE_DASH_PAD_COUNT - 1))
  return candidate >= current ? candidate + 1 : candidate
}

export function pointsForHit(combo) {
  return 10 + Math.min(40, Math.max(0, combo) * 2)
}

export function targetLifetime(hits) {
  return Math.max(420, 1180 - Math.max(0, hits) * 24)
}
