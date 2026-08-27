import test from 'node:test'
import assert from 'node:assert/strict'
import mockApi from '../src/mock.js'
import { TINTS, normalizeTheme, normalizeTint } from '../src/theme.js'
import { parseUtc } from '../src/util.js'

test('appearance preferences have stable, validated options', () => {
  assert.deepEqual(
    TINTS.map((tint) => tint.id),
    ['neutral', 'lake', 'cobalt', 'violet', 'rose', 'ember', 'forest']
  )
  assert.equal(normalizeTint('rose'), 'rose')
  assert.equal(normalizeTint('unknown'), 'neutral')
  assert.equal(normalizeTheme('light'), 'light')
  assert.equal(normalizeTheme('unknown'), 'dark')
})

test('UTC parser rejects malformed values instead of leaking invalid dates', () => {
  assert.equal(parseUtc('not-a-date'), null)
  assert.equal(parseUtc(null), null)
  assert.equal(parseUtc('2026-08-27 12:00:00')?.toISOString(), '2026-08-27T12:00:00.000Z')
})

test('mock posting and moderation follow the production contract', async () => {
  await assert.rejects(
    () =>
      mockApi.postJob({
        title: 'x',
        company: '',
        category_id: 0,
        location: '',
        job_type: '',
        description: 'short',
        apply_email: 'invalid',
        apply_url: 'ftp://example.com',
      }),
    (error) =>
      Boolean(
        error.status === 422 &&
          error.fields.title &&
          error.fields.category_id &&
          error.fields.location &&
          error.fields.job_type &&
          error.fields.apply_email &&
          error.fields.apply_url
      )
  )

  const created = await mockApi.postJob({
    title: '  Test Coordinator  ',
    company: '  Valley Test Co.  ',
    category_id: 11,
    location: 'Kelowna',
    job_type: 'Full-time',
    pay: '$25 per hour',
    description: 'A sufficiently detailed description for a realistic local test listing.',
    apply_email: 'jobs@example.com',
    apply_url: '',
    website: '',
  })

  assert.equal(created.status, 'pending')
  await assert.rejects(() => mockApi.getJob(created.id, ''), (error) => error.status === 404)

  const preview = await mockApi.getJob(created.id, created.manage_token)
  assert.equal(preview.job.title, 'Test Coordinator')
  assert.equal(preview.job.company, 'Valley Test Co.')

  await mockApi.adminAct(created.id, 'approve', 'demo')
  const live = await mockApi.getJob(created.id, '')
  assert.equal(live.job.status, 'approved')

  const search = await mockApi.listJobs({ search: 'test coordinator' })
  assert.equal(search.jobs.some((job) => job.id === created.id), true)
})
