import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { api, IS_MOCK } from './api.js'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import JobDetail from './pages/JobDetail.jsx'
import PostJob from './pages/PostJob.jsx'
import Manage from './pages/Manage.jsx'
import Admin from './pages/Admin.jsx'
import NotFound from './pages/NotFound.jsx'
import { applyAppearance, normalizeTheme, normalizeTint } from './theme.js'
import { MetaContext } from './MetaContext.jsx'
import { applySeo, removeStructuredData } from './seo.js'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    window.requestAnimationFrame(() => {
      document.getElementById('main-content')?.focus({ preventScroll: true })
      window.scrollTo(0, 0)
    })
  }, [pathname])
  return null
}

function RouteSeo() {
  const { pathname } = useLocation()

  useEffect(() => {
    removeStructuredData('wogo-job-posting')

    if (pathname === '/') {
      applySeo()
      return
    }

    if (pathname === '/post') {
      applySeo({
        title: 'Post an Okanagan Job for Free | Wogopogo',
        description:
          'Reach local candidates across the Okanagan Valley. Post a job on Wogopogo for free, with no employer account required.',
        pathname: '/post',
        robots: 'noindex, follow',
      })
      return
    }

    if (/^\/jobs\/\d+\/[a-z0-9-]+$/.test(pathname)) {
      applySeo({
        title: 'Okanagan Job Listing | Wogopogo',
        description: 'View this current Okanagan Valley job opportunity on Wogopogo.',
        pathname,
        type: 'article',
      })
      return
    }

    const privateRoute = pathname === '/manage' || pathname === '/admin'
    applySeo({
      title:
        pathname === '/manage'
          ? 'Manage a Listing | Wogopogo'
          : pathname === '/admin'
            ? 'Moderation | Wogopogo'
            : 'Page Not Found | Wogopogo',
      description: privateRoute
        ? 'Private Wogopogo listing-management utility.'
        : 'This page could not be found on Wogopogo.',
      pathname,
      robots: 'noindex, nofollow',
    })
  }, [pathname])

  return null
}

export default function App() {
  const [theme, setTheme] = useState(
    () => normalizeTheme(document.documentElement.dataset.theme)
  )
  const [tint, setTint] = useState(
    () => normalizeTint(document.documentElement.dataset.tint)
  )
  const [meta, setMeta] = useState(null)
  const [metaLoading, setMetaLoading] = useState(true)
  const [metaError, setMetaError] = useState(null)
  const metaRequest = useRef(0)

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  const selectTint = useCallback((nextTint) => {
    setTint(normalizeTint(nextTint))
  }, [])

  useEffect(() => {
    applyAppearance(theme, tint)
  }, [theme, tint])

  useEffect(() => {
    function syncAppearance(event) {
      if (event.key === 'wogo-theme') setTheme(normalizeTheme(event.newValue))
      if (event.key === 'wogo-tint') setTint(normalizeTint(event.newValue))
    }
    window.addEventListener('storage', syncAppearance)
    return () => window.removeEventListener('storage', syncAppearance)
  }, [])

  const refreshMeta = useCallback(async () => {
    const request = ++metaRequest.current
    setMetaLoading(true)
    setMetaError(null)
    try {
      const nextMeta = await api.meta()
      if (request === metaRequest.current) setMeta(nextMeta)
      return nextMeta
    } catch (error) {
      if (request === metaRequest.current) setMetaError(error)
      throw error
    } finally {
      if (request === metaRequest.current) setMetaLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshMeta().catch(() => {})
    return () => {
      metaRequest.current += 1
    }
  }, [refreshMeta])

  const metaValue = useMemo(
    () => ({ meta, metaLoading, metaError, refreshMeta }),
    [meta, metaLoading, metaError, refreshMeta]
  )

  return (
    <BrowserRouter>
      <MetaContext.Provider value={metaValue}>
        <ScrollToTop />
        <RouteSeo />
        <a className="skip-link" href="#main-content">Skip to main content</a>
        {IS_MOCK && (
          <div className="mock-banner mono">
            Demo mode: sample data only, nothing is saved. Admin key is "demo".
          </div>
        )}
        <Header
          theme={theme}
          tint={tint}
          onToggleTheme={toggleTheme}
          onTintChange={selectTint}
        />
        <main id="main-content" className="site-main" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/jobs/:id/:slug" element={<JobDetail />} />
            <Route path="/post" element={<PostJob />} />
            <Route path="/manage" element={<Manage />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </MetaContext.Provider>
    </BrowserRouter>
  )
}
