const root = document.documentElement
const themeButton = document.querySelector('.theme-toggle')
const copyButton = document.querySelector('.copy-command')

function syncThemeLabel() {
  const isLight = root.dataset.theme === 'light'
  themeButton?.setAttribute('aria-label', `Switch to ${isLight ? 'dark' : 'light'} theme`)
}

themeButton?.addEventListener('click', () => {
  root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light'
  try {
    localStorage.setItem('wogo-project-theme', root.dataset.theme)
  } catch {}
  syncThemeLabel()
})

copyButton?.addEventListener('click', async () => {
  const original = copyButton.textContent
  try {
    await navigator.clipboard.writeText(copyButton.dataset.copy)
    copyButton.textContent = 'Clone command copied'
  } catch {
    copyButton.textContent = 'Copy unavailable — select the command above'
  }
  window.setTimeout(() => {
    copyButton.textContent = original
  }, 2200)
})

for (const node of document.querySelectorAll('[data-year]')) {
  node.textContent = String(new Date().getFullYear())
}

syncThemeLabel()

