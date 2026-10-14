import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import { TINTS } from '../src/theme.js'

const source = await readFile(new URL('../src/features/upright/uprightEngine.ts', import.meta.url), 'utf8')
const { UprightEngine, readUprightPalette } = await import(
  `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`
)
const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8')

function installEnvironment(t, tint = 'lake', theme = 'dark') {
  const declarations = css.match(new RegExp(tint === 'neutral' ? ':root \\{([^}]+)' : `:root\\[data-tint='${tint}'\\] \\{([^}]+)`))[1]
  const variables = Object.fromEntries([...declarations.matchAll(/(--[\w-]+):\s*([^;]+)/g)].map((match) => [match[1], match[2]]))
  variables['--bg-raise'] = theme === 'light' ? '#f5f5f5' : '#181818'
  const frames = new Map()
  let nextId = 0
  let time = 1
  t.mock.method(globalThis, 'getComputedStyle', () => ({ getPropertyValue: (name) => variables[name] || '' }))
  t.mock.method(globalThis, 'requestAnimationFrame', (callback) => { frames.set(++nextId, callback); return nextId })
  t.mock.method(globalThis, 'cancelAnimationFrame', (id) => frames.delete(id))
  globalThis.document = { documentElement: { dataset: { theme, tint } } }
  globalThis.window = { devicePixelRatio: 1 }
  const gradient = { addColorStop() {} }
  const context = new Proxy({}, { get: (_, name) => name.startsWith('create') ? () => gradient : () => {}, set: () => true })
  const canvas = { getContext: () => context, getBoundingClientRect: () => ({ width: 420, height: 600 }) }
  return {
    canvas, frames,
    advance(count) {
      for (let i = 0; i < count; i++) {
        const pending = [...frames.values()]
        frames.clear()
        pending.forEach((callback) => callback(time))
        time += 1000 / 60
      }
    },
  }
}

// Browser globals are replaced per test and restored by the test runner.
globalThis.getComputedStyle = () => {}
globalThis.requestAnimationFrame = () => {}
globalThis.cancelAnimationFrame = () => {}

test('all Wogopogo tints reach the canvas palette in both themes', (t) => {
  const keys = new Set()
  for (const tint of TINTS) {
    for (const theme of ['dark', 'light']) {
      installEnvironment(t, tint.id, theme)
      const palette = readUprightPalette()
      assert.equal(palette.isLight, theme === 'light')
      assert.equal(palette.raised, theme === 'light' ? '#f5f5f5' : '#181818')
      assert.equal(palette.blockPaints.length, 6)
      assert.ok(palette.key.startsWith(`${theme}:${tint.id}:`))
      keys.add(palette.key)
    }
  }
  assert.equal(keys.size, 14)
})

test('UPRIGHT clips overhang, collapses on a miss, and preserves best on restart', (t) => {
  const environment = installEnvironment(t)
  const engine = new UprightEngine({ canvas: environment.canvas })
  assert.equal(engine.getSnapshot().phase, 'ready')
  engine.startGame()
  engine.place()
  assert.equal(engine.getSnapshot().score, 1)
  assert.ok(engine.getSnapshot().stability < 100)
  engine.place()
  assert.equal(engine.getSnapshot().score, 2)
  engine.place()
  assert.equal(engine.getSnapshot().phase, 'collapsing')
  engine.startLoop()
  environment.advance(70)
  assert.equal(engine.getSnapshot().phase, 'gameOver')
  engine.startGame()
  assert.equal(engine.getSnapshot().score, 0)
  assert.equal(engine.getSnapshot().best, 2)
  engine.destroy()
  assert.equal(environment.frames.size, 0)
})

test('perfect timing retains width and reduced motion keeps the game playable', (t) => {
  const environment = installEnvironment(t)
  const engine = new UprightEngine({ canvas: environment.canvas, reducedMotion: true })
  engine.startGame()
  engine.startLoop()
  environment.advance(42)
  engine.place()
  assert.equal(engine.getSnapshot().perfects, 1)
  assert.equal(engine.getSnapshot().stability, 100)
  engine.setSuspended(true)
  environment.advance(2)
  assert.equal(environment.frames.size, 0)
  engine.setSuspended(false)
  assert.equal(environment.frames.size, 1)
  engine.destroy()
})
