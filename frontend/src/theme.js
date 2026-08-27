export const TINTS = [
  { id: 'neutral', name: 'Neutral', swatch: '#8b939e', darkChrome: '#111318', lightChrome: '#eeede9' },
  { id: 'lake', name: 'Lake', swatch: '#58baaf', darkChrome: '#101918', lightChrome: '#edefec' },
  { id: 'cobalt', name: 'Cobalt', swatch: '#729bd6', darkChrome: '#111721', lightChrome: '#edeff1' },
  { id: 'violet', name: 'Violet', swatch: '#9a82c9', darkChrome: '#16141e', lightChrome: '#f0eef1' },
  { id: 'rose', name: 'Rose', swatch: '#c781a1', darkChrome: '#1b1418', lightChrome: '#f1edef' },
  { id: 'ember', name: 'Ember', swatch: '#c78c58', darkChrome: '#1a1612', lightChrome: '#f1efec' },
  { id: 'forest', name: 'Forest', swatch: '#6da682', darkChrome: '#111914', lightChrome: '#edefed' },
]

const TINT_IDS = new Set(TINTS.map((tint) => tint.id))

export function normalizeTheme(value) {
  return value === 'light' ? 'light' : 'dark'
}

export function normalizeTint(value) {
  return TINT_IDS.has(value) ? value : 'neutral'
}

export function applyAppearance(themeValue, tintValue, { persist = true } = {}) {
  const theme = normalizeTheme(themeValue)
  const tint = normalizeTint(tintValue)
  const root = document.documentElement

  root.dataset.theme = theme
  root.dataset.tint = tint

  const selectedTint = TINTS.find((option) => option.id === tint) || TINTS[0]
  const themeMeta = document.querySelector('meta[name="theme-color"]')
  if (themeMeta) {
    themeMeta.setAttribute(
      'content',
      theme === 'dark' ? selectedTint.darkChrome : selectedTint.lightChrome
    )
  }

  if (persist) {
    try {
      localStorage.setItem('wogo-theme', theme)
      localStorage.setItem('wogo-tint', tint)
    } catch {
      // Storage may be unavailable in private browsing; the active tab still works.
    }
  }

  return { theme, tint }
}
